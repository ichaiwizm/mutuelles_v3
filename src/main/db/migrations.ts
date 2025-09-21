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

  // Migration incrémentale: platform_pages.url (depuis url_template) + drop meta_json
  try {
    const cols = db.prepare("PRAGMA table_info(platform_pages)").all() as Array<{ name: string }>
    const hasUrl = cols.some(c => c.name === 'url')
    const hasUrlTemplate = cols.some(c => c.name === 'url_template')
    const hasMeta = cols.some(c => c.name === 'meta_json')
    if (!hasUrl || hasMeta || hasUrlTemplate) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS __platform_pages_new (
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
        INSERT INTO __platform_pages_new(id, platform_id, slug, name, type, url, status, order_index, active)
        SELECT id, platform_id, slug, name, type,
               COALESCE(url, url_template), status, order_index, active
        FROM platform_pages;
        DROP TABLE platform_pages;
        ALTER TABLE __platform_pages_new RENAME TO platform_pages;
      `)
    }
  } catch {}

  // Migration incrémentale: platform_fields drop help
  try {
    const cols = db.prepare("PRAGMA table_info(platform_fields)").all() as Array<{ name: string }>
    const hasHelp = cols.some(c => c.name === 'help')
    if (hasHelp) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS __platform_fields_new (
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
        INSERT INTO __platform_fields_new(id, page_id, key, label, type, required, secure, order_index)
        SELECT id, page_id, key, label, type, required, secure, order_index FROM platform_fields;
        DROP TABLE platform_fields;
        ALTER TABLE __platform_fields_new RENAME TO platform_fields;
      `)
    }
  } catch {}

  // Migration incrémentale: flow_steps drop wait_for & meta_json
  try {
    const cols = db.prepare("PRAGMA table_info(flow_steps)").all() as Array<{ name: string }>
    const hasWaitFor = cols.some(c => c.name === 'wait_for')
    const hasMeta = cols.some(c => c.name === 'meta_json')
    if (hasWaitFor || hasMeta) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS __flow_steps_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          flow_id INTEGER NOT NULL REFERENCES flows_catalog(id) ON DELETE CASCADE,
          order_index INTEGER NOT NULL,
          type TEXT NOT NULL,
          selector TEXT,
          value TEXT,
          url TEXT,
          screenshot_label TEXT,
          timeout_ms INTEGER,
          assert_text TEXT
        );
        INSERT INTO __flow_steps_new(id, flow_id, order_index, type, selector, value, url, screenshot_label, timeout_ms, assert_text)
        SELECT id, flow_id, order_index, type, selector, value, url, screenshot_label, timeout_ms, assert_text
        FROM flow_steps;
        DROP TABLE flow_steps;
        ALTER TABLE __flow_steps_new RENAME TO flow_steps;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_flow_steps_order ON flow_steps(flow_id, order_index);
      `)
    }
  } catch {}

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
      assert_text TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_flow_steps_order ON flow_steps(flow_id, order_index);

    -- Index divers
    CREATE INDEX IF NOT EXISTS idx_user_platforms_platform_id ON user_platforms(platform_id);
    CREATE INDEX IF NOT EXISTS idx_platform_credentials_platform_id ON platform_credentials(platform_id);
    CREATE INDEX IF NOT EXISTS idx_platform_pages_platform_id ON platform_pages(platform_id);
    CREATE INDEX IF NOT EXISTS idx_platform_fields_page_id ON platform_fields(page_id);
    CREATE INDEX IF NOT EXISTS idx_flows_platform ON flows_catalog(platform_id);
    
    -- Historique d'exécution des flux
    CREATE TABLE IF NOT EXISTS flows_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flow_id INTEGER NOT NULL REFERENCES flows_catalog(id) ON DELETE CASCADE,
      run_uid TEXT NOT NULL UNIQUE,
      flow_slug TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL, -- running|success|error
      screenshots_dir TEXT,
      json_path TEXT,
      steps_total INTEGER,
      ok_steps INTEGER,
      error_message TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_flows_runs_flow ON flows_runs(flow_id, started_at DESC);
  `)
}

export function seedCatalog(db: Database.Database) {
  const row = db.prepare('SELECT COUNT(*) as c FROM platforms_catalog').get() as { c: number }
  if (row.c > 0) return

  const insertPlatform = db.prepare(`INSERT INTO platforms_catalog(slug, name, status) VALUES(?, ?, 'ready')`)
  const insertPage = db.prepare(`INSERT INTO platform_pages(platform_id, slug, name, type, url, status, order_index) VALUES(?, ?, ?, ?, ?, 'ready', ?)`)
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
      const loginUrl = p.slug === 'alptis' ? 'https://pro.alptis.org/' : null
      const loginInfo = insertPage.run(pid, 'login', 'Connexion', 'login', loginUrl, 1)
      const loginId = Number(loginInfo.lastInsertRowid)
      insertField.run(loginId, 'username', 'Identifiant', 'text', 1, 0, 1)
      insertField.run(loginId, 'password', 'Mot de passe', 'password', 1, 1, 2)
      // quote form page
      insertPage.run(pid, 'quote_form', 'Formulaire de devis', 'quote_form', null, 2)
    }
  })()
}

// Seed des flows (à appeler après seedCatalog)
export function seedFlows(db: Database.Database) {
  const has = db.prepare("SELECT COUNT(*) as c FROM flows_catalog").get() as { c: number }
  if (has.c > 0) return

  const getPlatform = db.prepare('SELECT id FROM platforms_catalog WHERE slug = ?')
  const insertFlow = db.prepare('INSERT INTO flows_catalog(platform_id, slug, name, active) VALUES(?, ?, ?, ?)')
  const insertStep = db.prepare(`INSERT INTO flow_steps(flow_id, order_index, type, selector, value, url, screenshot_label, timeout_ms, assert_text)
                                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`)

  db.transaction(() => {
    // Flow connexion Alptis (dev-only)
    const alptis = getPlatform.get('alptis') as { id?: number }
    if (alptis?.id) {
      const finfo = insertFlow.run(alptis.id, 'alptis_login', 'Connexion Alptis', 1)
      const fid = Number(finfo.lastInsertRowid)
      let i = 1
      insertStep.run(fid, i++, 'goto', null, null, 'https://pro.alptis.org/', 'accueil', 15000, null)
      insertStep.run(fid, i++, 'waitFor', '#username', null, null, 'login-form', 10000, null)
      insertStep.run(fid, i++, 'fill', '#username', '{username}', null, 'fill-user', 0, null)
      insertStep.run(fid, i++, 'fill', '#password', '{password}', null, 'fill-pass', 0, null)
      insertStep.run(fid, i++, 'click', 'button[type="submit"]', null, null, 'submit', 0, null)
      insertStep.run(fid, i++, 'screenshot', null, null, null, 'after-submit', 0, null)
    }
  })()
}

