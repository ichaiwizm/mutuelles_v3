-- ============================================================
-- Database Schema v2 - Simplified & Fingerprint-based
-- ============================================================
--
-- Key changes from v1:
-- - Fingerprint-based deduplication (UNIQUE constraint)
-- - Simplified tables (no redundant manifest data)
-- - JSON data storage (canonical ISO format)
-- - Step-level logging (run_steps table)
--

-- ============================================================
-- LEADS
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  -- Primary key
  id TEXT PRIMARY KEY,

  -- Lead data (canonical JSON, ISO format)
  data TEXT NOT NULL CHECK(json_valid(data)),

  -- Fingerprints for deduplication
  fingerprint_primary TEXT NOT NULL UNIQUE,
  fingerprint_email TEXT,
  fingerprint_phone TEXT,

  -- Metadata
  metadata TEXT CHECK(json_valid(metadata)),

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_leads_fingerprint_email ON leads(fingerprint_email);
CREATE INDEX IF NOT EXISTS idx_leads_fingerprint_phone ON leads(fingerprint_phone);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- ============================================================
-- EXECUTION RUNS
-- ============================================================

CREATE TABLE IF NOT EXISTS runs (
  -- Primary key
  id TEXT PRIMARY KEY,

  -- Run status
  status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

  -- Timestamps
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,

  -- Metadata (concurrency, mode, settings snapshot)
  meta TEXT CHECK(json_valid(meta))
);

CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at);

-- ============================================================
-- EXECUTION ITEMS (lead + platform + flow)
-- ============================================================

CREATE TABLE IF NOT EXISTS run_items (
  -- Primary key
  id TEXT PRIMARY KEY,

  -- References
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Execution context
  platform TEXT NOT NULL,
  flow_slug TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'failed', 'skipped')),

  -- Summary (error message, duration, step count, etc.)
  summary TEXT CHECK(json_valid(summary)),

  -- Timestamps
  started_at TEXT,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_run_items_run_id ON run_items(run_id);
CREATE INDEX IF NOT EXISTS idx_run_items_lead_id ON run_items(lead_id);
CREATE INDEX IF NOT EXISTS idx_run_items_status ON run_items(status);

-- ============================================================
-- EXECUTION STEPS (detailed step logging)
-- ============================================================

CREATE TABLE IF NOT EXISTS run_steps (
  -- Foreign key
  item_id TEXT NOT NULL REFERENCES run_items(id) ON DELETE CASCADE,

  -- Step identification
  idx INTEGER NOT NULL,
  type TEXT NOT NULL,

  -- Field & selector
  field TEXT,
  selector TEXT,

  -- Values
  raw TEXT,
  mapped TEXT,

  -- Execution result
  ok INTEGER NOT NULL CHECK(ok IN (0, 1)),
  ms INTEGER NOT NULL,
  error TEXT,

  -- Artifacts
  screenshot TEXT,

  -- Composite primary key
  PRIMARY KEY (item_id, idx)
);

CREATE INDEX IF NOT EXISTS idx_run_steps_item_id ON run_steps(item_id);
CREATE INDEX IF NOT EXISTS idx_run_steps_ok ON run_steps(ok);

-- ============================================================
-- TRIGGERS (auto-update updated_at)
-- ============================================================

CREATE TRIGGER IF NOT EXISTS leads_updated_at
  AFTER UPDATE ON leads
  FOR EACH ROW
BEGIN
  UPDATE leads SET updated_at = datetime('now') WHERE id = NEW.id;
END;
