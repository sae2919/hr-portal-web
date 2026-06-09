'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { useForgotPassword } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AxiosError } from 'axios';
import { ApiError } from '@/types/auth';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState('');
  
  const [branding, setBranding] = useState({
    name: 'Techsprout',
    logo: '/logo-brand.png',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedName = localStorage.getItem('company_name');
      const cachedLogo = localStorage.getItem('company_logo');
      if (cachedName || cachedLogo) {
        setBranding({
          name: cachedName || 'Techsprout',
          logo: cachedLogo || '/logo-brand.png',
        });
      }
    }
  }, []);

  const { mutate: sendLink, isPending, error, isError } = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    sendLink(data, {
      onSuccess: () => {
        setSentTo(data.email);
        setSent(true);
      },
    });
  };

  const getErrorMessage = () => {
    const axiosError = error as AxiosError<ApiError>;
    return (
      axiosError?.response?.data?.message || 'Something went wrong.'
    );
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl mb-4 p-2 overflow-hidden shadow-lg shadow-blue-500/5">
            <img src={branding.logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
          <p className="text-slate-400 text-sm mt-1">
            {sent ? 'Check your inbox' : "We'll send you a reset link"}
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">

          {sent ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-500/10 rounded-full">
                <MailCheck className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Email sent!</p>
                <p className="text-slate-400 text-sm mt-1">
                  Reset link sent to{' '}
                  <span className="text-white">{sentTo}</span>
                </p>
              </div>
              <p className="text-slate-500 text-xs">
                Didn't get it?{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-blue-400 hover:underline"
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            <>
              {isError && (
                <Alert className="mb-5 border-red-500/30 bg-red-500/10">
                  <AlertDescription className="text-red-400 text-sm">
                    {getErrorMessage()}
                  </AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200 text-sm">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    {...register('email')}
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-11"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-xs">
                      {errors.email.message}
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
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            </>
          )}

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
      </div>
    </div>
  );
}