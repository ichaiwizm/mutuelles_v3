/**
 * Credentials Utility
 * ====================
 *
 * Load platform credentials from database.
 */

import type { Database } from 'better-sqlite3';

function fromEnv(platform: string): { username: string; password: string } | null {
  const key = platform.toUpperCase();
  const user = process.env[`${key}_USERNAME`];
  const pass = process.env[`${key}_PASSWORD`];
  if (user && pass) return { username: user, password: pass };
  return null;
}

/**
 * Get credentials for a platform
 */
export function getCredentialsForPlatform(db: Database, platform: string): any {
  try {
    // 1) Prefer environment variables (works in CLI sans chiffrement Electron)
    const envCreds = fromEnv(platform);
    if (envCreds) return envCreds;

    // Try to get credentials from platform_credentials table
    const stmt = db.prepare(`
      SELECT pc.username, pc.password_encrypted
      FROM platform_credentials pc
      JOIN platforms_catalog p ON p.id = pc.platform_id
      WHERE p.slug = ?
    `);

    const row = stmt.get(platform) as any;

    if (!row) {
      console.warn(`⚠️  No credentials found for platform: ${platform}`);
      return { username: '', password: '' };
    }

    // In CLI, password_encrypted may be plain (seeded with CLI_ENCODED) or binary
    // We cannot decrypt Electron safeStorage here; advise to pass via env if needed
    const enc = row.password_encrypted;
    let password = '';
    if (typeof enc === 'string') {
      password = enc.startsWith('CLI_ENCODED:') ? enc.slice('CLI_ENCODED:'.length) : enc;
    } else if (Buffer.isBuffer(enc)) {
      // best effort: detect embedded CLI_ENCODED marker
      const s = enc.toString('utf8');
      password = s.startsWith('CLI_ENCODED:') ? s.slice('CLI_ENCODED:'.length) : '';
    }

    return { username: row.username, password };
  } catch (error: any) {
    console.warn(`⚠️  Error loading credentials: ${error.message}`);
    return { username: '', password: '' };
  }
}
