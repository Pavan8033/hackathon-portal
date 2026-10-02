/**
 * Utility for hashing participant credentials securely.
 * Uses the Web Cryptography API (SubtleCrypto) with SHA-256 and an application salt.
 * Ensures raw passwords are never stored in Cloud Firestore per Part 3.
 */

const CREDENTIAL_SALT = 'hackathon_portal_sec_salt_v2';

export async function hashCredential(value: string, salt: string = CREDENTIAL_SALT): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const textBuffer = new TextEncoder().encode(`${salt}:${normalized}`);
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', textBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Resilient fallback for environments without subtle crypto
  let hash = 0;
  const str = `${salt}:${normalized}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `h_${Math.abs(hash).toString(16)}`;
}
