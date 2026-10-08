/**
 * Universal ERP Architectural Boundary & Dependency Graph Validator
 * 
 * Performs authentic AST analysis via the TypeScript Compiler API.
 * Enforces:
 * 1. Downward-Only Layer Invariant (Core -> Contracts -> Platform -> Modules -> Capabilities)
 * 2. Public API Encapsulation (Strictly rejects deep imports like @erp/core/src/*)
 * 3. Formal Cycle Detection on the Directed Dependency Graph (DFS 3-color graph traversal)
 * 4. Automatic Extensibility for Future Packages across all tiers
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT_DIR = process.cwd();
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

// Architectural Layer Tier Hierarchy (Lower numbers may NEVER depend on higher numbers)
const TIER_HIERARCHY = {
  core: 1,
  contracts: 2,
  platform: 3,
  modules: 4,
  capabilities: 5,
  applications: 6,
};

const violations = [];

function recordViolation(file, line, column, rule, message) {
  violations.push({ file, line, column, rule, message });
}

/**
 * Determines the architectural tier of a file or package name.
 */
function getTier(target) {
  const normalized = target.replace(/\\/g, '/');
  
  if (normalized.includes('packages/core') || target === '@erp/core') {
    return { tier: TIER_HIERARCHY.core, name: 'Core' };
  }
  if (normalized.includes('packages/contracts') || target === '@erp/contracts') {
    return { tier: TIER_HIERARCHY.contracts, name: 'Contracts' };
  }
  if (normalized.includes('packages/platform') || target.startsWith('@erp/platform-')) {
    return { tier: TIER_HIERARCHY.platform, name: 'Platform Services' };
  }
  if (normalized.includes('packages/modules') || target.startsWith('@erp/module-')) {
    return { tier: TIER_HIERARCHY.modules, name: 'Domain Modules' };
  }
  if (normalized.includes('packages/capabilities') || target.startsWith('@erp/capability-')) {
    return { tier: TIER_HIERARCHY.capabilities, name: 'Capabilities' };
  }
  if (normalized.includes('artifacts/') || normalized.includes('apps/')) {
    return { tier: TIER_HIERARCHY.applications, name: 'Applications' };
  }
  
  return { tier: 99, name: 'External/Other' };
}

/**
 * Finds all TypeScript/JavaScript source files in a directory recursively.
 */
function findSourceFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        files.push(...findSourceFiles(fullPath));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Parses a source file into an AST and extracts all imported/exported module specifiers.
 */
function extractImports(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true, // setParentNodes
  );

  const imports = [];

  function visit(node) {
    let specifier;

    // 1. Static import: import ... from '...'
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specifier = node.moduleSpecifier.text;
    }
    // 2. Export declaration: export ... from '...'
    else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specifier = node.moduleSpecifier.text;
    }
    // 3. Dynamic import: import('...')
    else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifier = node.arguments[0].text;
    }
    // 4. CommonJS require: require('...')
    else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require' &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifier = node.arguments[0].text;
    }

    if (specifier) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      imports.push({
        specifier,
        sourceFile: filePath,
        line: line + 1,
        column: character + 1,
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

/**
 * Cycle Detection on the Directed Dependency Graph using DFS 3-Color Algorithm.
 */
function detectCycles(graph) {
  const visited = new Map(); // 0: White (unvisited), 1: Gray (in-progress), 2: Black (done)
  const cycles = [];
  const pathStack = [];

  for (const node of graph.keys()) {
    visited.set(node, 0);
  }

  function dfs(current) {
    visited.set(current, 1);
    pathStack.push(current);

    const neighbors = graph.get(current) || new Set();
    for (const neighbor of neighbors) {
      const state = visited.get(neighbor) ?? 0;
      if (state === 1) {
        // Cycle detected
        const cycleStartIndex = pathStack.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          cycles.push([...pathStack.slice(cycleStartIndex), neighbor]);
        }
      } else if (state === 0) {
        dfs(neighbor);
      }
    }

    pathStack.pop();
    visited.set(current, 2);
  }

  for (const node of graph.keys()) {
    if ((visited.get(node) ?? 0) === 0) {
      dfs(node);
    }
  }

  return cycles;
}

// ---------------------------------------------------------
// MAIN EXECUTION
// ---------------------------------------------------------
console.log('🏛️ Universal ERP Architectural Boundary & Dependency Graph Validator');
console.log('   Parser: TypeScript Compiler API (Full AST Analysis)');
console.log('   Engine: Directed Graph Traversal & Cycle Detection\n');

const LIB_DIR = path.join(ROOT_DIR, 'lib');
const allSourceFiles = [
  ...findSourceFiles(PACKAGES_DIR),
  ...findSourceFiles(LIB_DIR),
];
console.log(`📂 Discovered ${allSourceFiles.length} source files across packages and libraries.`);

const fileGraph = new Map();
const packageGraph = new Map();

let totalImportsAnalyzed = 0;

for (const file of allSourceFiles) {
  const imports = extractImports(file);
  totalImportsAnalyzed += imports.length;

  const sourceTier = getTier(file);
  const relativeSource = path.relative(ROOT_DIR, file).replace(/\\/g, '/');

  // Initialize graph node
  if (!fileGraph.has(relativeSource)) {
    fileGraph.set(relativeSource, new Set());
  }

  const sourcePackage = relativeSource.split('/')[1] || 'unknown';
  if (!packageGraph.has(sourcePackage)) {
    packageGraph.set(sourcePackage, new Set());
  }

  for (const imp of imports) {
    const specifier = imp.specifier;

    // Check 1: Deep Imports Violation
    // Banned: e.g. importing @erp/core/src/*, @erp/core/dist/*, @erp/contracts/src/*
    if (
      (specifier.startsWith('@erp/core/') && specifier !== '@erp/core') ||
      (specifier.startsWith('@erp/contracts/') && specifier !== '@erp/contracts') ||
      (specifier.startsWith('@erp/platform-') && specifier.includes('/src/')) ||
      (specifier.startsWith('@erp/module-') && specifier.includes('/src/'))
    ) {
      recordViolation(
        file,
        imp.line,
        imp.column,
        'RULE_NO_DEEP_IMPORTS',
        `Deep import prohibited: "${specifier}". Packages must be imported exclusively through their public API entry point.`,
      );
    }

    // Check 2: Relative Escape Violation
    // Files inside packages/core or packages/contracts must not traverse outside their package root via relative paths
    if (specifier.startsWith('..')) {
      const resolvedTarget = path.resolve(path.dirname(file), specifier);
      
      // If a file in packages/core resolves outside packages/core
      if (file.includes('packages/core') && !resolvedTarget.startsWith(path.join(PACKAGES_DIR, 'core'))) {
        recordViolation(
          file,
          imp.line,
          imp.column,
          'RULE_NO_PACKAGE_ESCAPE',
          `Relative import escapes package boundary to: "${specifier}". Inter-package dependencies must use package names.`,
        );
      }
      if (file.includes('packages/contracts') && !resolvedTarget.startsWith(path.join(PACKAGES_DIR, 'contracts'))) {
        recordViolation(
          file,
          imp.line,
          imp.column,
          'RULE_NO_PACKAGE_ESCAPE',
          `Relative import escapes package boundary to: "${specifier}". Inter-package dependencies must use package names.`,
        );
      }

      // Add to internal file dependency graph for cycle detection
      const possibleExtensions = ['', '.ts', '.js', '/index.ts', '/index.js'];
      for (const ext of possibleExtensions) {
        const candidate = resolvedTarget + ext;
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          const targetRelative = path.relative(ROOT_DIR, candidate).replace(/\\/g, '/');
          fileGraph.get(relativeSource).add(targetRelative);
          break;
        }
      }
    }

    // Check 3: Downward-Only Architectural Invariant
    if (specifier.startsWith('@erp/') || specifier.startsWith('@workspace/')) {
      const targetTier = getTier(specifier);
      const targetPackage = specifier.replace('@erp/', '').replace('@workspace/', '').split('/')[0];

      packageGraph.get(sourcePackage).add(targetPackage);

      if (sourceTier.tier < targetTier.tier) {
        recordViolation(
          file,
          imp.line,
          imp.column,
          'RULE_DOWNWARD_ONLY_DEPENDENCY',
          `Layer violation: Tier ${sourceTier.tier} (${sourceTier.name}) may NOT import Tier ${targetTier.tier} (${targetTier.name}). Import: "${specifier}".`,
        );
      }

      // Special rule: Tier 1 (Core) may not import Tier 2 (Contracts) or any higher tier
      if (sourceTier.tier === TIER_HIERARCHY.core && targetTier.tier > TIER_HIERARCHY.core) {
        recordViolation(
          file,
          imp.line,
          imp.column,
          'RULE_CORE_PURITY',
          `Core Purity violation: @erp/core must remain completely agnostic of higher tiers. Prohibited import: "${specifier}".`,
        );
      }
    }
  }
}

// Check 4: Cycle Detection
console.log(`🔬 Analyzing dependency graph with ${fileGraph.size} nodes and ${totalImportsAnalyzed} import edges...`);

const packageCycles = detectCycles(packageGraph);
for (const cycle of packageCycles) {
  recordViolation(
    'packages',
    1,
    1,
    'RULE_NO_CIRCULAR_PACKAGES',
    `Circular package dependency cycle detected: ${cycle.join(' -> ')}`,
  );
}

const fileCycles = detectCycles(fileGraph);
for (const cycle of fileCycles) {
  recordViolation(
    cycle[0],
    1,
    1,
    'RULE_NO_CIRCULAR_DEPENDENCIES',
    `Circular source file dependency cycle detected: ${cycle.join(' -> ')}`,
  );
}

// ---------------------------------------------------------
// REPORTING
// ---------------------------------------------------------
console.log('\n--- VERIFICATION AUDIT RESULTS ---');
console.log(`Source Files Audited:       ${allSourceFiles.length}`);
console.log(`AST Import Nodes Analyzed:  ${totalImportsAnalyzed}`);
console.log(`Package Cycles Detected:    ${packageCycles.length}`);
console.log(`File Cycles Detected:       ${fileCycles.length}`);
console.log(`Boundary Violations Found:  ${violations.length}\n`);

if (violations.length > 0) {
  console.error('❌ Architectural Boundary Validation FAILED:\n');
  for (const v of violations) {
    const relFile = path.relative(ROOT_DIR, v.file);
    console.error(`  [${v.rule}] ${relFile}:${v.line}:${v.column}`);
    console.error(`    ↳ ${v.message}\n`);
  }
  process.exit(1);
} else {
  console.log('✅ Architectural Boundary & Dependency Graph Validation PASSED.');
  console.log('   - Downward-only dependencies verified across all tiers.');
  console.log('   - Public API encapsulation confirmed (zero deep imports).');
  console.log('   - Zero circular dependencies in package and file graphs.');
  process.exit(0);
}
