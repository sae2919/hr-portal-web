'use client';

import { Suspense, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useResetPassword } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AxiosError } from 'axios';
import { ApiError } from '@/types/auth';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    password_confirmation: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  });

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const searchParams = useSearchParams();

  const [branding, setBranding] = useState({
    name: 'Techsprout',
    logo: '/logo.png',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedName = localStorage.getItem('company_name');
      const cachedLogo = localStorage.getItem('company_logo');
      if (cachedName || cachedLogo) {
        setBranding({
          name: cachedName || 'Techsprout',
          logo: cachedLogo || '/logo.png',
        });
      }
    }
  }, []);

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const { mutate: resetPassword, isPending, error, isError } = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    resetPassword({ ...data, token, email });
  };

  const getErrorMessage = () => {
    const axiosError = error as AxiosError<ApiError>;
    const apiErrors = axiosError?.response?.data?.errors;
    if (apiErrors) return Object.values(apiErrors).flat()[0];
    return axiosError?.response?.data?.message || 'Something went wrong.';
  };

  if (!token || !email) {
    return (
      <div className="text-center">
        <p className="text-red-400 mb-4">Invalid or expired reset link.</p>
        <Link href="/forgot-password" className="text-blue-400 hover:underline text-sm">
          Request a new one
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl mb-4 p-2 overflow-hidden shadow-lg shadow-blue-500/5">
          <img src={branding.logo} alt="Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-white">Set New Password</h1>
        <p className="text-slate-400 text-sm mt-1">
          For <span className="text-slate-300">{email}</span>
        </p>
      </div>

      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        {isError && (
          <Alert className="mb-5 border-red-500/30 bg-red-500/10">
            <AlertDescription className="text-red-400 text-sm">
              {getErrorMessage()}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-slate-200 text-sm">New Password</Label>
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                {...register('password')}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200 text-sm">Confirm Password</Label>
            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat your password"
                {...register('password_confirmation')}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password_confirmation && (
              <p className="text-red-400 text-xs">
                {errors.password_confirmation.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <Suspense fallback={
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}