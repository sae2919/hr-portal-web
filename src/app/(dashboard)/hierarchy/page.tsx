'use client';

import OrgChart from '@/components/hierarchy/OrgChart';
import { useAuthStore } from '@/store/authStore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HierarchyPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user) {
      // Check user role directly
      const role = user.role?.toLowerCase();
      const allowedRoles = ['admin', 'hr'];
      
      if (allowedRoles.includes(role)) {
        setIsAuthorized(true);
      } else {
        console.log('Redirecting to dashboard - Role:', role);
        router.push('/dashboard');
      }
    }
  }, [mounted, user, router]);

  // Show loading while checking authorization
  if (!mounted || !isAuthorized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <OrgChart />
    </div>
  );
}