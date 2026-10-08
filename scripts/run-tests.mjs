/**
 * Master Enterprise Test Runner
 * Executes all real unit and integration test suites using Node.js native test runner.
 */

import { spawn } from 'node:child_process';

const testFiles = [
  'packages/core/tests/result.test.ts',
  'packages/core/tests/errors.test.ts',
  'packages/core/tests/context.test.ts',
  'packages/core/tests/logging.test.ts',
  'packages/core/tests/config.test.ts',
  'packages/core/tests/money.test.ts',
  'packages/core/tests/runtime.test.ts',
  'packages/core/tests/runtime-integration.test.ts',
  'packages/core/tests/container.test.ts',
  'packages/core/tests/health.test.ts',
  'packages/core/tests/http.test.ts',
  'packages/core/tests/metrics.test.ts',
  'packages/contracts/tests/events.test.ts',
];

console.log('🧪 Executing Phase 1 & 2 Platform Foundation Test Suites...\n');

const child = spawn(
  process.execPath,
  ['--experimental-strip-types', '--test', ...testFiles],
  {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' },
  },
);

child.on('exit', (code) => {
  if (code === 0) {
    console.log('\n✅ All test suites PASSED with 100% assertions satisfied.');
    process.exit(0);
  } else {
    console.error(`\n❌ Test execution failed with exit code ${code}.`);
    process.exit(code ?? 1);
  }
});
