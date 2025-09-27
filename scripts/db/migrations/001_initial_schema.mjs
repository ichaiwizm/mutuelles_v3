#!/usr/bin/env node
export default {
  version: '001',
  name: 'initial_schema',
  description: 'Create initial database schema with core tables',

  up(db) {
    db.exec(`
      -- Settings table
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      -- Profiles table for Chrome profiles
      CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        user_data_dir TEXT NOT NULL,
        browser_channel TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        initialized_at TEXT
      );

      -- Catalog of platforms managed by the app
      CREATE TABLE IF NOT EXISTS platforms_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ready',
        base_url TEXT,
        website_url TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- User selection of platforms
      CREATE TABLE IF NOT EXISTS user_platforms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_id INTEGER NOT NULL UNIQUE REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        selected INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Pages per platform (login, quote_form, ...)
      CREATE TABLE IF NOT EXISTS platform_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        url TEXT,
        status TEXT NOT NULL DEFAULT 'ready',
        order_index INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(platform_id, slug)
      );

      -- Field definitions per page
      CREATE TABLE IF NOT EXISTS platform_fields (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id INTEGER NOT NULL REFERENCES platform_pages(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        label TEXT NOT NULL,
        type TEXT NOT NULL,
        required INTEGER NOT NULL DEFAULT 0,
        secure INTEGER NOT NULL DEFAULT 0,
        order_index INTEGER NOT NULL DEFAULT 0,
        UNIQUE(page_id, key)
      );

      -- One credential per selected platform (username + password)
      CREATE TABLE IF NOT EXISTS platform_credentials (
        platform_id INTEGER PRIMARY KEY REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        password_encrypted BLOB NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `)
  },

  down(db) {
    db.exec(`
      DROP TABLE IF EXISTS platform_credentials;
      DROP TABLE IF EXISTS platform_fields;
      DROP TABLE IF EXISTS platform_pages;
      DROP TABLE IF EXISTS user_platforms;
      DROP TABLE IF EXISTS platforms_catalog;
      DROP TABLE IF EXISTS profiles;
      DROP TABLE IF EXISTS settings;
    `)
  }
}