'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/lib/hooks';

export default function Home() {
  const r = useRouter(), { loading, profile } = useProfile();
  useEffect(() => {
    if (loading) return;
    if (!profile) r.replace('/login');
    else r.replace(profile.role === 'super_admin' ? '/super-admin' : '/admin');
  }, [loading, profile, r]);
  return <p style={{ padding: 20 }}>טוען…</p>;
}
