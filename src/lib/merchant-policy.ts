import 'server-only';
import { prisma } from '@/lib/prisma';
import { EMPTY_MERCHANT_POLICY, MERCHANT_POLICY_KEY, MERCHANT_POLICY_PUBLIC_KEY, parseMerchantPolicyState } from './merchant-policy-rules';

export async function getMerchantPolicies() {
  // Fail visibly on a database error; never silently claim a saved policy was verified.
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: [MERCHANT_POLICY_KEY, MERCHANT_POLICY_PUBLIC_KEY] } },
    select: { key: true, value: true },
  });
  return parseMerchantPolicyState(
    rows.find((row) => row.key === MERCHANT_POLICY_KEY)?.value,
    rows.find((row) => row.key === MERCHANT_POLICY_PUBLIC_KEY)?.value,
  );
}

export async function getMerchantPolicy() {
  const { published } = await getMerchantPolicies();
  return published ?? { ...EMPTY_MERCHANT_POLICY };
}
