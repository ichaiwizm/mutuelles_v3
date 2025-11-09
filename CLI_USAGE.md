# CLI Usage Guide

## 🚀 Quick Start

### Run a Flow with a Lead

```bash
npm run flow:run <platform/flow> -- --lead <leadId> [options]
```

### Example

```bash
npm run flow:run alptis/sante-select -- --lead 3e0dc672-2069-45e3-93b2-0ff8a30c8ca6 --headless
```

### Options

- `--lead <id>` (required) - Lead ID from database
- `--headless` (default: true) - Run browser in headless mode
- `--trace <mode>` - Playwright trace mode: `on`, `retain-on-failure`, or `off`
- `--output <path>` - Path to save execution logs

---

## 🔧 WSL/Windows Compatibility

The CLI automatically detects if you're running in WSL and **executes via Windows** to avoid binary compatibility issues with `better-sqlite3`.

### How it Works

```
WSL Terminal → runner.mjs detects WSL → spawns PowerShell → runs Windows Node → uses Windows binaries ✓
```

### Initial Setup (One-Time)

If you get `NODE_MODULE_VERSION` errors on first run from WSL:

**Option 1: Run rebuild script (Recommended)**

From **PowerShell** (not WSL):
```powershell
cd C:\Users\ichai\Desktop\mutuelles_v3
.\scripts\rebuild-native-windows.ps1
```

**Option 2: Manual rebuild**

1. Close all Electron apps and terminals
2. From **PowerShell**:
   ```powershell
   cd C:\Users\ichai\Desktop\mutuelles_v3
   npm rebuild better-sqlite3
   ```

After this one-time setup, you can run the CLI from WSL without issues!

---

## 📝 Available Flows

### Alptis
- `alptis/sante-select` - Alptis Santé Select flow

### SwissLife One
- `swisslifeone/slsis` - Swiss Life SIS flow

---

## 🗄️ Getting Lead IDs

List all available leads:

```bash
npm run leads:list
```

This will show all leads with their IDs, names, emails, etc.

---

## 💡 Examples

### Run Alptis flow in headless mode
```bash
npm run flow:run alptis/sante-select -- --lead abc-123 --headless
```

### Run with browser visible (debugging)
```bash
npm run flow:run alptis/sante-select -- --lead abc-123 --headless=false
```

### Run with full tracing
```bash
npm run flow:run swisslifeone/slsis -- --lead xyz-789 --trace on --output ./logs/trace.log
```

---

## 🐛 Troubleshooting

### Error: "Database not found"

Make sure the database exists:
```bash
npm run db:reset:seed
```

### Error: "NODE_MODULE_VERSION mismatch"

Run the rebuild script from PowerShell (see Setup section above).

### Error: "Flow not found"

Check available flows in `platforms/*/flows/` or verify the slug format: `<platform>/<flow-name>`

### CLI hangs or doesn't respond

Press `Ctrl+C` to cancel. Make sure no other processes are using the database.

---

## ℹ️ Technical Details

### Architecture

```
cli/
├── index.ts         # CLI entry point (Commander.js)
├── runner.mjs       # Cross-platform wrapper (WSL detection)
├── commands/
│   └── run.ts       # Flow execution logic
└── utils/
    ├── flow-loader.ts     # Dynamic flow loading
    ├── db-connection.ts   # Database access
    └── credentials.ts     # Credential management
```

### Flow Loading

Flows are loaded dynamically from `platforms/<platform>/index.ts`:

```typescript
// Example: alptis/sante-select
import { santeSelect } from './flows/sante-select';
export { santeSelect };
```

### Database

Uses SQLite3 database at `dev-data/mutuelles.sqlite3` (shared with Electron app).

---

## 📚 Related Commands

- `npm run leads:list` - List all leads
- `npm run db:reset:seed` - Reset and seed database
- `npm run db:status` - Show database status
