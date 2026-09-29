export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({ status: 'ok', service: 'woojeonggim' }, { headers: { 'Cache-Control': 'no-store' } });
}
