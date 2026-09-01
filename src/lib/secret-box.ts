import crypto from 'node:crypto';

function encryptionKey() {
  const secret = process.env.CHANNEL_CREDENTIAL_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CHANNEL_CREDENTIAL_KEY가 설정되지 않았습니다.');
    }
    return null;
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export function sealSecret(value: string) {
  if (!value) return '';
  const key = encryptionKey();
  if (!key) return `plain:${value}`;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function openSecret(value: string) {
  if (!value) return '';
  if (value.startsWith('plain:')) return value.slice(6);
  if (!value.startsWith('v1:')) return value; // 기존 설치의 평문 값을 재저장할 수 있게 호환
  const key = encryptionKey();
  if (!key) throw new Error('암호화된 채널 인증정보를 열 키가 없습니다.');
  const [, ivRaw, tagRaw, bodyRaw] = value.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(bodyRaw, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
