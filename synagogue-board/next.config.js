/** Security headers for every response. CSP: Next.js needs inline scripts/styles; Firebase, Google Fonts and the few public APIs we call are listed explicitly. */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://nominatim.openstreetmap.org https://api.open-meteo.com https://www.sefaria.org https://www.hebcal.com",
  "frame-src https://*.firebaseapp.com https://*.googleapis.com",
  "worker-src 'self' blob:",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'",
].join('; ');
const SEC = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];
/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true, poweredByHeader: false, transpilePackages: ['kosher-zmanim'],
  experimental: { serverComponentsExternalPackages: ['firebase-admin', 'nodemailer'] },
  async headers() {
    return [
      { source: '/(.*)', headers: SEC },
      { source: '/(admin|super-admin|login)(.*)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, { key: 'Cache-Control', value: 'no-store' }] },
      { source: '/api/auth/(.*)', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
};
