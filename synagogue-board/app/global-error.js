'use client';
import { useEffect } from 'react';
import { reloadSafely } from '@/lib/recover';
/** Last line of defence: an error outside every boundary (root layout) -> the TV retries by itself. */
export default function GlobalError() {
  useEffect(() => { const t = setInterval(() => reloadSafely('global-error'), 15000); reloadSafely('global-error'); return () => clearInterval(t); }, []);
  return (<html lang="he" dir="rtl"><body style={{ background: '#0b1226', color: '#fff', textAlign: 'center', paddingTop: '20vh', font: '32px sans-serif' }}>מתעדכן… המסך יחזור תוך רגע</body></html>);
}
