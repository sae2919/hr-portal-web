'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  id: number | string | '';
  label: string;
  sublabel?: string;
  department?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: number | string | '';
  onChange: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  disabled = false,
  className
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside behavior
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search when opening
  useEffect(() => {
    if (isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.id === value);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    (opt.sublabel && opt.sublabel.toLowerCase().includes(search.toLowerCase())) ||
    (opt.department && opt.department.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full border border-slate-200 rounded-lg px-3 py-0 text-sm h-9 flex items-center justify-between bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-left disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed",
          className
        )}
      >
        <span className="truncate text-slate-700">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden flex flex-col max-h-64 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search box */}
          <div className="relative p-2 border-b border-slate-100 flex-shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* List of options */}
          <div className="overflow-y-auto py-1 flex-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">No options found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.id === value;
                return (
                  <button
                    key={String(opt.id)}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center justify-between ${
                      isSelected ? 'bg-blue-50/50 text-blue-600 font-medium' : 'text-slate-700'
                    }`}
                  >
                    <div className="truncate pr-4">
                      <span>{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">{opt.sublabel}</span>
                      )}
                    </div>
                    {isSelected && <Check size={12} className="text-blue-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
