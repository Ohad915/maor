'use client';
import { useEffect } from 'react';
import { reloadSafely } from '@/lib/recover';
/** Route-level crash (display, login, admin): retry by itself instead of Next's dead "Application error" screen. */
export default function RouteError({ error, reset }) {
  useEffect(() => { try { console.error('[maor] route error:', error?.message); } catch {} const a = setTimeout(() => reset(), 4000), b = setInterval(() => { if (location.pathname.indexOf('/display') === 0) reloadSafely('route-error'); }, 15000); return () => { clearTimeout(a); clearInterval(b); }; }, []); // eslint-disable-line
  return <div className="dp" style={{ width: '100vw', height: '100vh' }}><p style={{ margin: 'auto', textAlign: 'center' }}>מתעדכן… המסך יחזור תוך רגע</p></div>;
}
