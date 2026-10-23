import 'server-only';
import { prisma } from '@/lib/prisma';
import { MERCHANT_POLICY_KEY, parseMerchantPolicy } from './merchant-policy-rules';

export async function getMerchantPolicy() {
  // Fail visibly on a database error; never silently claim a saved policy was verified.
  const row = await prisma.siteSetting.findUnique({ where: { key: MERCHANT_POLICY_KEY }, select: { value: true } });
  return parseMerchantPolicy(row?.value);
}
