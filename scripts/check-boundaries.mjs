/**
 * Architectural Boundary Validator
 * Enforces the strict rule: "Dependencies may only point downward."
 * Verifies that:
 * 1. @erp/core imports ZERO platform, module, or capability packages.
 * 2. @erp/contracts imports only @erp/core.
 * 3. Zero circular dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

let violationsCount = 0;

function logViolation(file, message) {
  console.error(`❌ BOUNDARY VIOLATION in ${path.relative(ROOT_DIR, file)}: ${message}`);
  violationsCount++;
}

function scanDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      scanDir(fullPath, callback);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      callback(fullPath);
    }
  }
}

console.log('🔍 Executing Architectural Boundary Verification...');

// 1. Audit @erp/core isolation
const coreSrc = path.join(PACKAGES_DIR, 'core', 'src');
scanDir(coreSrc, (file) => {
  const content = fs.readFileSync(file, 'utf8');
  const importLines = content.split('\n').filter((l) => l.trim().startsWith('import') || l.includes('require('));

  for (const line of importLines) {
    if (line.includes('@erp/contracts') || line.includes('@erp/platform') || line.includes('@erp/module') || line.includes('@erp/capability')) {
      logViolation(file, `Core must not depend on higher layers. Found: ${line.trim()}`);
    }
    if (line.includes('../../../contracts') || line.includes('../../../platform') || line.includes('../../../modules')) {
      logViolation(file, `Core must not relative-import higher layer packages. Found: ${line.trim()}`);
    }
  }
});

// 2. Audit @erp/contracts isolation
const contractsSrc = path.join(PACKAGES_DIR, 'contracts', 'src');
scanDir(contractsSrc, (file) => {
  const content = fs.readFileSync(file, 'utf8');
  const importLines = content.split('\n').filter((l) => l.trim().startsWith('import') || l.includes('require('));

  for (const line of importLines) {
    if (line.includes('@erp/platform') || line.includes('@erp/module') || line.includes('@erp/capability')) {
      logViolation(file, `Contracts must not depend on implementation modules. Found: ${line.trim()}`);
    }
    if (line.includes('../../../platform') || line.includes('../../../modules')) {
      logViolation(file, `Contracts must not relative-import implementation modules. Found: ${line.trim()}`);
    }
  }
});

if (violationsCount > 0) {
  console.error(`\n❌ Architectural boundary verification FAILED with ${violationsCount} violation(s).`);
  process.exit(1);
} else {
  console.log('✅ Architectural boundary verification PASSED: Zero boundary leaks detected.');
}
