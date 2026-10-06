import './globals.css';

export const metadata = { title: 'לוח דיגיטלי חכם לבית הכנסת' };

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=David+Libre:wght@400;700&family=Amatic+SC:wght@700&family=Frank+Ruhl+Libre:wght@500;700;900&family=Heebo:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
