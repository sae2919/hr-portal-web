'use client';

import { Quote as QuoteIcon, Sparkles } from 'lucide-react';
import TodaySpecialCard from '@/components/events/TodaySpecialCard';
import { Birthday, Anniversary } from '@/services/eventService';

interface Props {
  dailyQuote: { quote: string; author?: string } | null;
  todaySpecial: { birthdays: Birthday[]; anniversaries: Anniversary[] };
}

export default function QuoteAndTodaySpecial({ dailyQuote, todaySpecial }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

      {/* Left half — Daily Quote */}
      {dailyQuote && (
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 border border-amber-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <QuoteIcon size={14} className="text-amber-600" />
            </div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-1">
              <Sparkles size={11} className="text-amber-500" />
              Quote of the Day
            </span>
          </div>
          <p className="text-sm text-slate-700 italic leading-relaxed flex-1">
            "{dailyQuote.quote}"
          </p>
          {dailyQuote.author && (
            <p className="text-xs text-amber-600 mt-3 font-medium">— {dailyQuote.author}</p>
          )}
        </div>
      )}

      {/* Right half — Today's Special with wishes */}
      <TodaySpecialCard todaySpecial={todaySpecial} />

    </div>
  );
}