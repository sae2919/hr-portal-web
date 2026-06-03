'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { quoteService, Quote } from '@/services/quoteService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, Search, Edit, Trash2, Loader2, Sparkles, Quote as QuoteIcon, 
  Bookmark, X, Eye, EyeOff, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

type QuoteCategory = 'motivational' | 'funny' | 'inspirational' | 'daily';

export default function QuotesPage() {
  const { user, hasPermission } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [dailyQuote, setDailyQuote] = useState<{ quote: string; author: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [formData, setFormData] = useState({
    quote: '',
    author: '',
    category: 'motivational' as QuoteCategory,
  });
  const [submitPending, setSubmitPending] = useState(false);

  // Guards
  const isAdmin = mounted && (
    user?.role === 'super_admin' || 
    user?.role === 'admin' || 
    user?.role === 'hr' ||
    hasPermission('manage quotes')
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchQuotes();
      fetchDailyQuote();
    }
  }, [mounted]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await quoteService.getAllQuotes();
      if (res && Array.isArray(res.data)) {
        setQuotes(res.data);
      } else if (res && Array.isArray(res)) {
        setQuotes(res);
      }
    } catch (err) {
      console.error('Failed to load quotes:', err);
      toast.error('Failed to load quotes library');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyQuote = async () => {
    try {
      const res = await quoteService.getQuoteOfTheDay();
      if (res && res.success && res.data) {
        setDailyQuote(res.data);
      }
    } catch (err) {
      console.error('Failed to load daily quote:', err);
    }
  };

  const handleOpenAddModal = () => {
    setEditingQuote(null);
    setFormData({
      quote: '',
      author: '',
      category: 'motivational',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (q: Quote) => {
    setEditingQuote(q);
    setFormData({
      quote: q.quote,
      author: q.author || '',
      category: (q.category || 'motivational') as QuoteCategory,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.quote.trim()) {
      toast.error('Quote text is required');
      return;
    }

    setSubmitPending(true);
    try {
      if (editingQuote) {
        const payload: Partial<Quote> = {
          quote: formData.quote,
          author: formData.author || undefined,
          category: formData.category,
        };
        await quoteService.updateQuote(editingQuote.id, payload);
        toast.success('Quote updated successfully');
      } else {
        await quoteService.createQuote(formData);
        toast.success('Quote created successfully');
      }
      fetchQuotes();
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save quote');
    } finally {
      setSubmitPending(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this quote from the library?')) return;

    try {
      await quoteService.deleteQuote(id);
      toast.success('Quote deleted successfully');
      fetchQuotes();
    } catch (err) {
      toast.error('Failed to delete quote');
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await quoteService.toggleQuoteStatus(id);
      toast.success('Status updated successfully');
      fetchQuotes();
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  // Categories list
  const categories = ['All', 'motivational', 'funny', 'inspirational', 'daily'];

  // Filtered quotes
  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = 
      q.quote.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (q.author && q.author.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'All' || q.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-md mx-auto my-12">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-red-800">Access Denied</h2>
        <p className="text-sm text-red-600 mt-2">Only administrators or HR personnel can manage the quotes library.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 id="quotes-title" className="text-2xl font-bold text-slate-800">Quotes Library</h1>
          <p className="text-sm text-slate-400">Manage motivational thoughts and daily inspirations displayed in user workspaces.</p>
        </div>
        <Button onClick={handleOpenAddModal} className="bg-blue-600 hover:bg-blue-500 text-white gap-2 shadow-sm rounded-xl">
          <Plus size={16} /> Add Quote
        </Button>
      </div>

      {/* Quote of the Day banner */}
      {dailyQuote && (
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-3xl p-6 shadow-md overflow-hidden border border-blue-500/10 transition-all duration-300 hover:shadow-lg">
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10">
            <QuoteIcon size={200} />
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-md border border-white/15">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                Active Quote of the Day
              </span>
              <p className="italic text-base md:text-lg leading-relaxed font-medium pt-1">
                "{dailyQuote.quote}"
              </p>
              <p className="text-xs text-blue-100 font-medium">
                — {dailyQuote.author || 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters & search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search quotes or authors..."
            className="pl-9 h-10 border-slate-200 rounded-xl"
            id="quote-search"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 whitespace-nowrap capitalize ${
                filterCategory === c
                  ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of quotes */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
          <Bookmark className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 text-sm">No quotes found matching your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQuotes.map((q) => {
            const isActive = q.is_active;
            return (
              <div 
                key={q.id}
                className="group relative bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      {q.category || 'General'}
                    </span>
                    
                    <button
                      onClick={() => handleToggleStatus(q.id)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all duration-200 ${
                        isActive 
                          ? 'bg-green-50 text-green-600 border-green-200/50 hover:bg-green-100'
                          : 'bg-slate-50 text-slate-400 border-slate-200/50 hover:bg-slate-100'
                      }`}
                      title={isActive ? 'Deactivate Quote' : 'Activate Quote'}
                    >
                      {isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>

                  <p className="text-slate-700 italic font-medium leading-relaxed text-sm">
                    "{q.quote}"
                  </p>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                  <p className="text-xs font-semibold text-slate-500">
                    — {q.author || 'Unknown'}
                  </p>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditModal(q)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Edit Quote"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete Quote"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-over Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-md mx-4 p-6 overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                  <QuoteIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    {editingQuote ? 'Edit Quote' : 'Add New Quote'}
                  </h2>
                  <p className="text-xs text-slate-400">Save quotes to motivate the workspace.</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Quote Text <span className="text-red-500">*</span></Label>
                <textarea
                  value={formData.quote}
                  onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                  placeholder="Enter the inspirational quote..."
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Author</Label>
                <Input
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="e.g. Steve Jobs, Winston Churchill (optional)"
                  className="h-10 border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Category</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as QuoteCategory })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm h-10 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="motivational">Motivational</option>
                  <option value="funny">Funny</option>
                  <option value="inspirational">Inspirational</option>
                  <option value="daily">Daily</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1 rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitPending} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm">
                  {submitPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingQuote ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
