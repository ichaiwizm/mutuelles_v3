#!/usr/bin/env node
/**
 * CLI Runner - Cross-platform (WSL/Windows)
 * ===========================================
 *
 * This wrapper detects if running in WSL and automatically uses Windows Node
 * to avoid WSL/Windows binary compatibility issues with better-sqlite3.
 *
 * Usage: node cli/runner.mjs flow:run <flowSlug> --lead <id>
 */

import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

// Detect if running in WSL
function isWSL() {
  try {
    return fs.existsSync('/proc/version') &&
           fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');
  } catch {
    return false;
  }
}

// Get Windows path from current WSL path
function getWindowsPath() {
  try {
    const winPath = execSync('wslpath -w "$(pwd)"', { encoding: 'utf8' }).trim();
    return winPath;
  } catch {
    return null;
  }
}

function runCLI() {
  if (isWSL()) {
    const winPath = getWindowsPath();

    if (!winPath) {
      console.error('❌ Failed to get Windows path from WSL');
      process.exit(1);
    }

    // Run via Windows Node from WSL
    console.log('🔄 Running from WSL → Executing via Windows to avoid binary compatibility issues\n');

    // Use PowerShell for better argument handling
    const psCommand = `
      Set-Location '${winPath}';
      npx tsx cli/index.ts ${args.join(' ')}
    `.trim();

    const child = spawn('powershell.exe', ['-NoProfile', '-Command', psCommand], {
      stdio: 'inherit',
      windowsHide: false
    });

    child.on('error', (err) => {
      console.error('❌ Failed to spawn Windows command:', err.message);
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  } else {
    // Running natively on Windows or Linux (not WSL)
    const cliPath = path.join(__dirname, 'index.ts');
    const child = spawn('npx', ['tsx', cliPath, ...args], {
      stdio: 'inherit',
      shell: true
    });

    child.on('error', (err) => {
      console.error('❌ Failed to spawn tsx:', err.message);
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  }
}

runCLI();
