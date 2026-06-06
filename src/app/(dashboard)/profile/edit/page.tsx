'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { toast } from 'sonner';
import { User, Mail, Phone, Lock, Eye, EyeOff, Loader2, Save, Camera } from 'lucide-react';

export default function ProfileEditPage() {
  const { user, setUser } = useAuthStore();

  const [loadingSave, setLoadingSave]   = useState(false);
  const [loadingPass, setLoadingPass]   = useState(false);
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  const [profile, setProfile] = useState({
    name:  '',
    email: '',
    phone: '',
  });

  const [passwords, setPasswords] = useState({
    current_password:       '',
    new_password:           '',
    new_password_confirmation: '',
  });

  const isEditable = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'super_admin';

  useEffect(() => {
    if (user) {
      setProfile({
        name:  user.name  || '',
        email: user.email || '',
        phone: (user as any).phone || '',
      });
    }
  }, [user]);

  // ── Save profile ──────────────────────────────────────────────
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoadingSave(true);
    try {
      const res = await api.put('/profile', profile);
      setUser(res.data.data ?? res.data);
      toast.success('Profile updated successfully.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoadingSave(false);
    }
  }

  // ── Change password ───────────────────────────────────────────
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (passwords.new_password !== passwords.new_password_confirmation) {
      toast.error('New passwords do not match.');
      return;
    }

    setLoadingPass(true);
    try {
      await api.put('/profile/password', passwords);
      toast.success('Password changed successfully.');
      setPasswords({ current_password: '', new_password: '', new_password_confirmation: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoadingPass(false);
    }
  }

  const initials = profile.name
    ? profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Edit Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your personal information and account security</p>
      </div>

      {/* Avatar + name banner */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold select-none">
            {initials}
          </div>
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-lg">{profile.name || '—'}</p>
          <p className="text-sm text-slate-500">{profile.email}</p>
          <span className="mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 capitalize">
            {(user as any)?.role || 'employee'}
          </span>
        </div>
      </div>

      {/* Profile info form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <User size={16} className="text-slate-400" /> Personal Information
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Full Name</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                placeholder="Your full name"
                required
                disabled={!isEditable}
              />
            </div>
            {!isEditable && (
              <p className="text-xs text-slate-400 mt-1">To change your name, please contact an Administrator.</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Email Address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                placeholder="your@email.com"
                required
                disabled={!isEditable}
              />
            </div>
            {!isEditable && (
              <p className="text-xs text-slate-400 mt-1">To change your email address, please contact an Administrator.</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+91 00000 00000"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loadingSave}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition shadow-sm disabled:opacity-60"
            >
              {loadingSave ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Change password form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <Lock size={16} className="text-slate-400" /> Change Password
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Current password */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Current Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showCurrent ? 'text' : 'password'}
                value={passwords.current_password}
                onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter current password"
                required
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">New Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showNew ? 'text' : 'password'}
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new password"
                required
                minLength={8}
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm new password */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Confirm New Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={passwords.new_password_confirmation}
                onChange={(e) => setPasswords({ ...passwords, new_password_confirmation: e.target.value })}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm new password"
                required
                minLength={8}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {passwords.new_password && passwords.new_password_confirmation && passwords.new_password !== passwords.new_password_confirmation && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loadingPass}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition shadow-sm disabled:opacity-60"
            >
              {loadingPass ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}