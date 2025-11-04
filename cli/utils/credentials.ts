/**
 * Credentials Utility
 * ====================
 *
 * Load platform credentials from database.
 */

import type { Database } from 'better-sqlite3';

/**
 * Get credentials for a platform
 */
export function getCredentialsForPlatform(db: Database, platform: string): any {
  try {
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

    return {
      username: row.username,
      password: row.password_encrypted, // TODO: Decrypt if encrypted
    };
  } catch (error: any) {
    console.warn(`⚠️  Error loading credentials: ${error.message}`);
    return { username: '', password: '' };
  }
}
