/**
 * Master Test Runner
 * Executes the complete automated test suite and concurrency test
 */
const { spawn } = require('child_process');
const path = require('path');

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test script ${path.basename(scriptPath)} failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  console.log('🚀 Starting Full Test Suite Execution...');
  try {
    await runScript(path.join(__dirname, 'test-suite.js'));
    await runScript(path.join(__dirname, 'concurrency-test.js'));
    console.log('\n🏆 ALL AUTOMATED TESTS AND CONCURRENCY VERIFICATIONS COMPLETED SUCCESSFULLY!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test run failed:', error.message);
    process.exit(1);
  }
}

main();
