import { readStoredImage } from '@/lib/image-storage';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await context.params;
    return await readStoredImage(name);
  } catch {
    return new Response('Storage unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
