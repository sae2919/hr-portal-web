'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CompanySettings {
  pf_enabled: boolean;
  pt_enabled: boolean;
  pf_percentage: number;
  company_name?: string;
  company_logo?: string;
}

const PF_PRESETS = [8, 10, 12];
const PREVIEW_SALARIES = [20000, 30000, 50000];

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>({
    pf_enabled: true,
    pt_enabled: true,
    pf_percentage: 12,
    company_name: 'Techsprout',
    company_logo: '/logo-brand.png',
  });
  const [saved, setSaved] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const isDirty =
    saved !== null &&
    (settings.pf_enabled !== saved.pf_enabled ||
      settings.pt_enabled !== saved.pt_enabled ||
      settings.pf_percentage !== saved.pf_percentage ||
      settings.company_name !== saved.company_name ||
      logoFile !== null);

  // ── Fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/settings');
        const data = res.data;
        const normalized = {
          pf_enabled: String(data.pf_enabled) === '1' || data.pf_enabled === true,
          pt_enabled: String(data.pt_enabled) === '1' || data.pt_enabled === true,
          pf_percentage: Number(data.pf_percentage) || 12,
          company_name: data.company_name || 'Techsprout',
          company_logo: data.company_logo || '/logo-brand.png',
        };
        setSettings(normalized);
        setSaved(normalized);
        setLogoPreview(normalized.company_logo);
      } catch {
        toast.error('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('_method', 'PUT'); // Laravel request compatibility
      formData.append('pf_enabled', settings.pf_enabled ? '1' : '0');
      formData.append('pt_enabled', settings.pt_enabled ? '1' : '0');
      formData.append('pf_percentage', String(settings.pf_percentage));
      formData.append('company_name', settings.company_name || '');
      if (logoFile) {
        formData.append('company_logo', logoFile);
      }

      await api.post('/settings', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const refreshed = await api.get('/settings');
      const data = refreshed.data;
      const normalized = {
        pf_enabled: String(data.pf_enabled) === '1' || data.pf_enabled === true,
        pt_enabled: String(data.pt_enabled) === '1' || data.pt_enabled === true,
        pf_percentage: Number(data.pf_percentage) || 12,
        company_name: data.company_name || 'Techsprout',
        company_logo: data.company_logo || '/logo-brand.png',
      };
      setSettings(normalized);
      setSaved(normalized);
      setLogoPreview(normalized.company_logo);
      setLogoFile(null);

      localStorage.setItem('company_name', normalized.company_name);
      localStorage.setItem('company_logo', normalized.company_logo);

      toast.success('Branding and settings saved successfully.');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }, [settings, logoFile]);

  // ── Helpers ────────────────────────────────────────────────────────────
  const pfAmount = (basic: number) =>
    settings.pf_enabled
      ? `₹${((basic * settings.pf_percentage) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
      : '—';

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be under 2MB.');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 p-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-4 w-72 bg-slate-100 rounded" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Settings</h1>
        <p className="text-slate-500 mt-1">Configure system parameters and application preferences</p>
      </div>

      {/* Unsaved changes banner */}
      {isDirty && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <span className="text-amber-500 text-lg">⚠</span>
          You have unsaved changes.
        </div>
      )}

      {/* ── Company Branding card ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-base">Company Branding</h2>
          <p className="text-xs text-slate-400 mt-0.5">Customize your company's name and logo shown in the system</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Company Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Company Name</label>
            <input
              type="text"
              value={settings.company_name || ''}
              onChange={e => setSettings(s => ({ ...s, company_name: e.target.value }))}
              placeholder="e.g. Techsprout"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 transition-all"
            />
          </div>

          {/* Company Logo */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Company Logo</label>
            <div className="flex items-center gap-5">
              <div className="relative h-20 w-20 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center p-2 overflow-hidden shadow-inner group">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-full w-full object-contain transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="text-xs text-slate-400 text-center font-medium">No Logo</div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                    Upload new
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                  {logoFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview(settings.company_logo || '/logo-brand.png');
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Recommended: Square image, transparent background PNG or SVG. Max 2MB.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Payroll Deductions card ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-base">Payroll Deductions</h2>
          <p className="text-xs text-slate-400 mt-0.5">Applied globally when generating payroll</p>
        </div>

        <div className="divide-y divide-slate-100">
          {/* PF toggle */}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Provident Fund (PF)</p>
              <p className="text-xs text-slate-400 mt-0.5">Employee + employer PF contribution</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings(s => ({ ...s, pf_enabled: !s.pf_enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                settings.pf_enabled ? 'bg-slate-800' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  settings.pf_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* PF percentage — visible when PF is enabled */}
          {settings.pf_enabled && (
            <div className="px-6 py-5 space-y-4 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">PF Percentage</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    value={settings.pf_percentage}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v >= 0 && v <= 20)
                        setSettings(s => ({ ...s, pf_percentage: v }));
                    }}
                    className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={0}
                max={20}
                step={0.5}
                value={settings.pf_percentage}
                onChange={e =>
                  setSettings(s => ({ ...s, pf_percentage: parseFloat(e.target.value) }))
                }
                className="w-full accent-slate-800"
              />

              {/* Presets */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Quick set:</span>
                {PF_PRESETS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, pf_percentage: p }))}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      settings.pf_percentage === p
                        ? 'bg-slate-800 border-slate-800 text-white'
                        : 'border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>

              {/* Live preview */}
              <div>
                <p className="text-xs text-slate-400 mb-2">Live preview — PF deduction on basic salary</p>
                <div className="grid grid-cols-3 gap-2">
                  {PREVIEW_SALARIES.map(sal => (
                    <div
                      key={sal}
                      className="bg-white border border-slate-200 rounded-xl p-3 text-center"
                    >
                      <p className="text-xs text-slate-400">
                        ₹{(sal / 1000).toFixed(0)}k basic
                      </p>
                      <p className="text-base font-semibold text-slate-800 mt-0.5">
                        {pfAmount(sal)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PT toggle */}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Professional Tax (PT)</p>
              <p className="text-xs text-slate-400 mt-0.5">Statutory state-level professional tax</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings(s => ({ ...s, pt_enabled: !s.pt_enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                settings.pt_enabled ? 'bg-slate-800' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  settings.pt_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Save / Discard buttons */}
      <div className="flex justify-end gap-3">
        {isDirty && (
          <button
            type="button"
            onClick={() => saved && setSettings(saved)}
            className="px-4 py-2 text-sm rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Discard
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="inline-flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}