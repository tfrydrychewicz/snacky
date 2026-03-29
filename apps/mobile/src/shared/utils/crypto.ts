const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Decode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  let result = '';
  let bits = 0;
  let value = 0;

  for (const ch of padded) {
    if (ch === '=') break;
    const idx = BASE64.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      result += String.fromCharCode((value >>> bits) & 0xff);
    }
  }
  return result;
}

/**
 * Decode the nonce claim from a JWT ID token without verifying the signature.
 * Returns `undefined` when the token has no nonce.
 */
export function decodeJwtNonce(jwt: string): string | undefined {
  const payload = jwt.split('.')[1];
  if (!payload) return undefined;

  const json = base64Decode(payload);
  const claims = JSON.parse(json) as { nonce?: string };
  return claims.nonce;
}
