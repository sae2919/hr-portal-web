import api from '@/lib/api';

export interface Quote {
  id: number;
  quote: string;
  author?: string;
  category: 'motivational' | 'funny' | 'inspirational' | 'daily';
  is_active: boolean;
  display_order: number;
}

// ─── Local date-keyed cache (survives re-renders, resets next day) ────────────
const CACHE_KEY = 'daily_quote_cache';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // "2025-06-01"
}

function getCachedQuote() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { date, quote } = JSON.parse(raw);
    if (date === getTodayKey()) return quote;
  } catch { /* ignore */ }
  return null;
}

function setCachedQuote(quote: any) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: getTodayKey(), quote }));
  } catch { /* ignore */ }
}

// ─── Public quote APIs (tried in order) ──────────────────────────────────────
async function fetchFromPublicAPI(): Promise<{ quote: string; author: string } | null> {
  // 1. ZenQuotes (most reliable, no key needed)
  try {
    const res = await fetch('https://zenquotes.io/api/today', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.[0]?.q && data[0].q !== 'Too many requests') {
        return { quote: data[0].q, author: data[0].a };
      }
    }
  } catch { /* try next */ }

  // 2. Quotable (backup)
  try {
    const res = await fetch('https://api.quotable.io/quotes/random?maxLength=180', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.[0]?.content) {
        return { quote: data[0].content, author: data[0].author };
      }
    }
  } catch { /* try next */ }

  // 3. Type.fit (backup)
  try {
    const res = await fetch('https://type.fit/api/quotes', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const all = await res.json();
      // Deterministic pick by day-of-year so everyone sees the same quote today
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const item = all[dayOfYear % all.length];
      if (item?.text) return { quote: item.text, author: item.author || 'Unknown' };
    }
  } catch { /* all failed */ }

  return null;
}

// ─── Hard fallbacks (only if every network call fails) ───────────────────────
const hardFallbacks = [
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { quote: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { quote: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { quote: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
  { quote: "You are never too old to set another goal or dream a new dream.", author: "C.S. Lewis" },
];

function getDailyFallback() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return hardFallbacks[dayOfYear % hardFallbacks.length];
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const quoteService = {

  // ── Main method used by dashboards ──
  // Priority: localStorage cache → public API → your backend → hard fallback
  getQuoteOfTheDay: async () => {
    // 1. Return cached if already fetched today
    const cached = getCachedQuote();
    if (cached) return { success: true, data: cached };

    // 2. Try public APIs
    const publicQuote = await fetchFromPublicAPI();
    if (publicQuote) {
      setCachedQuote(publicQuote);
      return { success: true, data: publicQuote };
    }

    // 3. Try your own backend
    try {
      const res = await api.get('/quotes/daily', { timeout: 5000 });
      if (res.data?.success && res.data?.data) {
        setCachedQuote(res.data.data);
        return res.data;
      }
    } catch { /* fall through */ }

    // 4. Hard fallback — deterministic by day so all users see the same quote
    const fallback = getDailyFallback();
    setCachedQuote(fallback);
    return { success: true, data: fallback };
  },

  // Keep getRandomQuote as alias so existing code doesn't break
  getRandomQuote: async () => {
    return quoteService.getQuoteOfTheDay();
  },

  // ── Admin-only CRUD (unchanged) ──
  getAllQuotes: async () => {
    try {
      const response = await api.get('/quotes');
      return response.data;
    } catch {
      return { success: true, data: [] };
    }
  },

  createQuote: async (data: { quote: string; author?: string; category: string }) => {
    const response = await api.post('/quotes', data);
    return response.data;
  },

  updateQuote: async (id: number, data: Partial<Quote>) => {
    const response = await api.put(`/quotes/${id}`, data);
    return response.data;
  },

  deleteQuote: async (id: number) => {
    const response = await api.delete(`/quotes/${id}`);
    return response.data;
  },

  toggleQuoteStatus: async (id: number) => {
    const response = await api.patch(`/quotes/${id}/toggle`);
    return response.data;
  },
};