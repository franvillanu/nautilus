#!/usr/bin/env node

/**
 * Update Development Variables
 *
 * This script runs after git checkout to ensure local development
 * environment variables are properly configured for Cloudflare Workers.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function updateDevVars() {
  const projectRoot = path.resolve(__dirname, '..');
  const devVarsPath = path.join(projectRoot, '.dev.vars');
  const wranglerTomlPath = path.join(projectRoot, 'wrangler.toml');

  log('📝 Updating local development variables...', colors.blue);

  // Check if wrangler.toml exists
  if (!fs.existsSync(wranglerTomlPath)) {
    log('⚠️  wrangler.toml not found, skipping dev vars update', colors.yellow);
    return;
  }

  // Create .dev.vars if it doesn't exist
  if (!fs.existsSync(devVarsPath)) {
    log('✨ Creating .dev.vars file...', colors.green);
    const defaultVars = `# Local development environment variables
# This file is for local development only and should not be committed
# Add your local environment variables here

# Example:
# API_KEY=your-dev-api-key
# DEBUG=true
`;
    fs.writeFileSync(devVarsPath, defaultVars);
    log('✅ .dev.vars created successfully', colors.green);
  } else {
    log('✓ .dev.vars already exists', colors.gray);
  }

  // Ensure .dev.vars is in .gitignore
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignoreContent.includes('.dev.vars')) {
      log('📝 Adding .dev.vars to .gitignore...', colors.blue);
      fs.appendFileSync(gitignorePath, '\n# Local development variables\n.dev.vars\n');
      log('✅ .gitignore updated', colors.green);
    }
  }

  log('✅ Development variables updated successfully', colors.green);
}

try {
  updateDevVars();
} catch (error) {
  log(`❌ Error updating dev vars: ${error.message}`, colors.yellow);
  // Don't exit with error code to avoid blocking git operations
  process.exit(0);
}
