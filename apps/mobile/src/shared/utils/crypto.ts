export function generateNonce(): { raw: string } {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let raw = '';
  for (let i = 0; i < 64; i++) {
    raw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return { raw };
}
