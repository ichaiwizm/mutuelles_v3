import type Database from 'better-sqlite3'

export function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
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
      url_template TEXT,
      status TEXT NOT NULL DEFAULT 'ready',
      order_index INTEGER NOT NULL DEFAULT 0,
      meta_json TEXT,
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
      help TEXT,
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

    -- Nettoyage des anciennes tables obsolètes
    DROP TABLE IF EXISTS credentials;
    DROP TABLE IF EXISTS platforms;
    DROP TABLE IF EXISTS credential_values;
    DROP TABLE IF EXISTS credential_sets;
  `)

  // Ajustements de schéma pour bases existantes
  try {
    const cols = db.prepare("PRAGMA table_info(profiles)").all() as Array<{ name: string }>
    if (!cols.some(c => c.name === 'initialized_at')) {
      db.exec("ALTER TABLE profiles ADD COLUMN initialized_at TEXT")
    }
  } catch (e) {
    // log silencieux
  }

  // Extensions flows (idempotent)
  db.exec(`
    CREATE TABLE IF NOT EXISTS flows_catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS flow_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flow_id INTEGER NOT NULL REFERENCES flows_catalog(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL,
      type TEXT NOT NULL,
      selector TEXT,
      value TEXT,
      url TEXT,
      screenshot_label TEXT,
      timeout_ms INTEGER,
      assert_text TEXT,
      wait_for TEXT,
      meta_json TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_flow_steps_order ON flow_steps(flow_id, order_index);

    -- Index divers
    CREATE INDEX IF NOT EXISTS idx_user_platforms_platform_id ON user_platforms(platform_id);
    CREATE INDEX IF NOT EXISTS idx_platform_credentials_platform_id ON platform_credentials(platform_id);
    CREATE INDEX IF NOT EXISTS idx_platform_pages_platform_id ON platform_pages(platform_id);
    CREATE INDEX IF NOT EXISTS idx_platform_fields_page_id ON platform_fields(page_id);
    CREATE INDEX IF NOT EXISTS idx_flows_platform ON flows_catalog(platform_id);
  `)
}

export function seedCatalog(db: Database.Database) {
  const row = db.prepare('SELECT COUNT(*) as c FROM platforms_catalog').get() as { c: number }
  if (row.c > 0) return

  const insertPlatform = db.prepare(`INSERT INTO platforms_catalog(slug, name, status) VALUES(?, ?, 'ready')`)
  const insertPage = db.prepare(`INSERT INTO platform_pages(platform_id, slug, name, type, status, order_index) VALUES(?, ?, ?, ?, 'ready', ?)`)
  const insertField = db.prepare(`INSERT INTO platform_fields(page_id, key, label, type, required, secure, order_index) VALUES(?, ?, ?, ?, ?, ?, ?)`)

  const platforms = [
    { slug: 'swisslife', name: 'Swisslife' },
    { slug: 'alptis', name: 'Alptis' }
  ]

  db.transaction(() => {
    for (const p of platforms) {
      const info = insertPlatform.run(p.slug, p.name)
      const pid = Number(info.lastInsertRowid)
      // login page
      const loginInfo = insertPage.run(pid, 'login', 'Connexion', 'login', 1)
      const loginId = Number(loginInfo.lastInsertRowid)
      insertField.run(loginId, 'username', 'Identifiant', 'text', 1, 0, 1)
      insertField.run(loginId, 'password', 'Mot de passe', 'password', 1, 1, 2)
      // quote form page
      insertPage.run(pid, 'quote_form', 'Formulaire de devis', 'quote_form', 2)
    }
  })()
}

// Seed des flows (à appeler après seedCatalog)
export function seedFlows(db: Database.Database) {
  const has = db.prepare("SELECT COUNT(*) as c FROM flows_catalog").get() as { c: number }
  if (has.c > 0) return

  const getPlatform = db.prepare('SELECT id FROM platforms_catalog WHERE slug = ?')
  const insertFlow = db.prepare('INSERT INTO flows_catalog(platform_id, slug, name, active) VALUES(?, ?, ?, ?)')
  const insertStep = db.prepare(`INSERT INTO flow_steps(flow_id, order_index, type, selector, value, url, screenshot_label, timeout_ms, assert_text, wait_for, meta_json)
                                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

  db.transaction(() => {
    // Flow connexion Alptis (dev-only)
    const alptis = getPlatform.get('alptis') as { id?: number }
    if (alptis?.id) {
      const finfo = insertFlow.run(alptis.id, 'alptis_login', 'Connexion Alptis', 1)
      const fid = Number(finfo.lastInsertRowid)
      let i = 1
      insertStep.run(fid, i++, 'goto', null, null, 'https://pro.alptis.org/', 'accueil', 15000, null, null, null)
      insertStep.run(fid, i++, 'waitFor', '#username', null, null, 'login-form', 10000, null, null, null)
      insertStep.run(fid, i++, 'fill', '#username', '{username}', null, 'fill-user', 0, null, null, null)
      insertStep.run(fid, i++, 'fill', '#password', '{password}', null, 'fill-pass', 0, null, null, null)
      insertStep.run(fid, i++, 'click', 'button[type="submit"]', null, null, 'submit', 0, null, null, null)
      insertStep.run(fid, i++, 'screenshot', null, null, null, 'after-submit', 0, null, null, null)
    }
  })()
}
