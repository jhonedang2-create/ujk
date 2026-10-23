import 'server-only';
import { prisma } from '@/lib/prisma';
import { PRIVACY_DRAFT_KEY, PRIVACY_PUBLIC_KEY, parsePrivacyDocument } from './privacy-document-rules';
export async function getPrivacyDocuments() {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: [PRIVACY_DRAFT_KEY, PRIVACY_PUBLIC_KEY] } }, select: { key: true, value: true } });
  return { draft: parsePrivacyDocument(rows.find((r) => r.key === PRIVACY_DRAFT_KEY)?.value), published: parsePrivacyDocument(rows.find((r) => r.key === PRIVACY_PUBLIC_KEY)?.value) };
}
