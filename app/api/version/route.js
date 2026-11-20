export const dynamic = 'force-dynamic';
/** Build id of the running deployment: an open TV page compares it with its own and reloads itself after a new deploy. */
export function GET() {
  return Response.json({ b: process.env.NEXT_PUBLIC_BUILD_ID || '' }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
