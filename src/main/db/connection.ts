/**
 * Database connection wrapper for Electron main process
 * Re-exports functions from shared DB module
 */

export { initDatabase, getDb, getDbPath, closeDb } from '../../shared/db/connection'
