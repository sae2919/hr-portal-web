'use client';

import { useState, useRef, useEffect } from 'react';
import { eventService, Wish, Birthday, Anniversary } from '@/services/eventService';
import { useAuthStore } from '@/store/authStore';
import {
  Cake, PartyPopper, Sparkles, Send, Trash2,
  ChevronDown, ChevronUp, MessageCircle, Heart, Loader2,
} from 'lucide-react';

// ─── Emoji picker (quick row) ─────────────────────────────────────────────────
const QUICK_EMOJIS = ['🎂', '🎉', '🥳', '🎊', '❤️', '🌟', '🙏', '👏', '🎁', '✨'];

// ─── Quick wish templates ─────────────────────────────────────────────────────
const BIRTHDAY_TEMPLATES = [
  'Happy Birthday! 🎂 Wishing you a wonderful day!',
  'Many happy returns of the day! 🎉',
  'Hope your birthday is as amazing as you are! 🌟',
  'Wishing you joy, health, and success on your special day! 🥳',
];
const ANNIVERSARY_TEMPLATES = [
  'Congratulations on another great year with the team! 🎊',
  'Thank you for your dedication and hard work! 🌟',
  "Here's to many more years of success together! 🥂",
  'Your contributions make a real difference. Happy work anniversary! 🙏',
];

// ─── Single person wish panel ─────────────────────────────────────────────────
function WishPanel({
  employeeId,
  employeeName,
  wishType,
}: {
  employeeId: number;
  employeeName: string;
  wishType: 'birthday' | 'anniversary';
}) {
  const { user } = useAuthStore();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loadingWishes, setLoadingWishes] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [hasSent, setHasSent] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check if current user already wished this person today
  useEffect(() => {
    if (!expanded) return;
    loadWishes();
  }, [expanded]);

  const loadWishes = async () => {
    setLoadingWishes(true);
    const res = await eventService.getWishes(employeeId, wishType);
    if (res.success) {
      setWishes(res.data);
      // Check if already wished
      const alreadySent = res.data.some((w) => w.sender_id === user?.id);
      setHasSent(alreadySent);
    }
    setLoadingWishes(false);
  };

  const handleTemplate = (t: string) => {
    setMessage(t);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!message.trim()) { setError('Please type a message.'); return; }
    setSending(true);
    setError('');
    const res = await eventService.sendWish({
      employee_id: employeeId,
      wish_type: wishType,
      message: message.trim(),
      emoji: selectedEmoji || undefined,
    });
    if (res.success && res.data) {
      setWishes((prev) => [res.data!, ...prev]);
      setMessage('');
      setSelectedEmoji('');
      setHasSent(true);
    } else {
      setError(res.message || 'Could not send wish. Try again.');
    }
    setSending(false);
  };

  const handleDelete = async (wishId: number) => {
    const res = await eventService.deleteWish(wishId);
    if (res.success) {
      setWishes((prev) => prev.filter((w) => w.id !== wishId));
      if (wishes.filter((w) => w.id !== wishId).every((w) => w.sender_id !== user?.id)) {
        setHasSent(false);
      }
    }
  };

  const templates = wishType === 'birthday' ? BIRTHDAY_TEMPLATES : ANNIVERSARY_TEMPLATES;

  return (
    <div className="mt-2">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-pink-600 transition font-medium"
      >
        <MessageCircle size={13} />
        {expanded ? 'Hide wishes' : `Wish ${employeeName.split(' ')[0]}`}
        {!expanded && wishes.length === 0 && null}
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">

          {/* Existing wishes */}
          {loadingWishes ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 size={12} className="animate-spin" /> Loading wishes…
            </div>
          ) : wishes.length > 0 ? (
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {wishes.map((w) => (
                <div key={w.id} className="flex items-start gap-2 bg-white/80 rounded-xl p-2.5 group">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {w.sender_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-slate-700">{w.sender_name}</span>
                      {w.emoji && <span className="text-sm">{w.emoji}</span>}
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {new Date(w.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{w.message}</p>
                  </div>
                  {/* Delete — only sender or admin */}
                  {(w.sender_id === user?.id || user?.role === 'admin' || user?.role === 'hr') && (
                    <button
                      onClick={() => handleDelete(w.id)}
                      className="opacity-0 group-hover:opacity-100 transition text-slate-300 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No wishes yet. Be the first!</p>
          )}

          {/* Compose — hide if already wished (unless admin) */}
          {(!hasSent || user?.role === 'admin' || user?.role === 'hr') && (
            <div className="bg-white/70 rounded-xl p-3 space-y-2 border border-pink-100">
              {/* Quick templates */}
              <div className="flex flex-wrap gap-1">
                {templates.map((t) => (
                  <button
                    key={t}
                    onClick={() => handleTemplate(t)}
                    className="text-[10px] bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-full px-2 py-0.5 transition border border-pink-100"
                  >
                    {t.length > 30 ? t.slice(0, 30) + '…' : t}
                  </button>
                ))}
              </div>

              {/* Emoji row */}
              <div className="flex gap-1 flex-wrap">
                {QUICK_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setSelectedEmoji((prev) => (prev === e ? '' : e))}
                    className={`text-base rounded-lg p-1 transition ${selectedEmoji === e ? 'bg-pink-200 ring-1 ring-pink-400' : 'hover:bg-pink-50'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={`Write a wish for ${employeeName.split(' ')[0]}…`}
                  rows={2}
                  className="flex-1 text-xs rounded-xl border border-pink-200 bg-white px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-pink-300 text-slate-700 placeholder:text-slate-300"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !message.trim()}
                  className="w-9 h-9 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition shrink-0"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
              {error && <p className="text-[10px] text-red-500">{error}</p>}
            </div>
          )}

          {hasSent && user?.role !== 'admin' && user?.role !== 'hr' && (
            <p className="text-[10px] text-emerald-600 flex items-center gap-1">
              <Heart size={10} className="fill-emerald-500 text-emerald-500" />
              You already sent a wish today!
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Person row (birthday or anniversary) ────────────────────────────────────
function PersonRow({
  person,
  type,
}: {
  person: Birthday | Anniversary;
  type: 'birthday' | 'anniversary';
}) {
  const yearsLabel =
    type === 'anniversary'
      ? `${(person as Anniversary).years_of_service} yr${(person as Anniversary).years_of_service > 1 ? 's' : ''}`
      : `Turning ${(person as Birthday).age}`;

  return (
    <div className="bg-white/70 rounded-xl px-3 py-2.5 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xl">{type === 'birthday' ? '🎂' : '🎊'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{person.name}</p>
          <p className="text-xs text-slate-400">{yearsLabel}{person.department ? ` · ${person.department}` : ''}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
          type === 'birthday' ? 'bg-pink-100 text-pink-600' : 'bg-violet-100 text-violet-600'
        }`}>
          {type === 'birthday' ? 'Birthday' : 'Anniversary'}
        </span>
      </div>

      <WishPanel
        employeeId={person.id}
        employeeName={person.name}
        wishType={type}
      />
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
export default function TodaySpecialCard({
  todaySpecial,
}: {
  todaySpecial: { birthdays: Birthday[]; anniversaries: Anniversary[] };
}) {
  const hasTodaySpecial = todaySpecial.birthdays.length > 0 || todaySpecial.anniversaries.length > 0;

  return (
    <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-5 border border-pink-200 shadow-sm flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
          <Cake size={14} className="text-pink-500" />
        </div>
        <span className="text-xs font-semibold text-pink-600 uppercase tracking-wide flex items-center gap-1">
          <Sparkles size={11} className="text-pink-400" />
          Today's Special
        </span>
      </div>

      {hasTodaySpecial ? (
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[420px] pr-0.5">
          {todaySpecial.birthdays.map((b) => (
            <PersonRow key={`b-${b.id}`} person={b} type="birthday" />
          ))}
          {todaySpecial.anniversaries.map((a) => (
            <PersonRow key={`a-${a.id}`} person={a} type="anniversary" />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <PartyPopper size={28} className="text-pink-200 mb-2" />
          <p className="text-xs text-slate-400">No birthdays or anniversaries today</p>
        </div>
      )}
    </div>
  );
}