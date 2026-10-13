import './globals.css';
import PWA from '@/components/PWA';

export const metadata = {
  title: 'מאור - ניהול בית כנסת',
  description: 'לוח דיגיטלי חכם וניהול בית כנסת',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'מאור', statusBarStyle: 'black-translucent' },
};
export const viewport = { themeColor: '#0b1226', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=David+Libre:wght@400;700&family=Amatic+SC:wght@700&family=Frank+Ruhl+Libre:wght@500;700;900&family=Heebo:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}<PWA /></body>
    </html>
  );
}
