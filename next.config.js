/** @type {import('next').NextConfig} */
module.exports = { reactStrictMode: true, transpilePackages: ['kosher-zmanim'], experimental: { serverComponentsExternalPackages: ['firebase-admin', 'nodemailer'] } };
