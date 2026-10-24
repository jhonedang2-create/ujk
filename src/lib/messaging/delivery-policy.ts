import { prisma } from '@/lib/prisma';
import { DELIVERY_POLICY_KEY, parseDeliveryPolicy } from './delivery-rules';

/** Read per submission. Do not cache a global stop switch. DB failure fails closed. */
export async function getDeliveryPolicy() {
  const row = await prisma.siteSetting.findUnique({
    where: { key: DELIVERY_POLICY_KEY }, select: { value: true },
  });
  return parseDeliveryPolicy(row?.value);
}
