import { sha256 } from 'js-sha256';

export function generateNonce(): { raw: string; hashed: string } {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let raw = '';
  for (let i = 0; i < 64; i++) {
    raw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const hashed = sha256(raw);
  return { raw, hashed };
}
