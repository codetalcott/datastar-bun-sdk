import { spawn, type SpawnOptions } from 'child_process';
import { join } from 'path';
import fs from 'fs';

// Configuration options
const DATASTAR_REPO_URL = 'https://github.com/starfederation/datastar.git';
const TEST_SERVER_PORT = 3000;
const TEST_SERVER_URL = `http://localhost:${TEST_SERVER_PORT}`;
const TEMP_DIR = join(process.cwd(), 'temp_datastar_tests');

/**
 * Run a command and return its output
 */
async function runCommand(command: string, args: string[], options: SpawnOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      ...options,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });
    
    let stdout = '';
    let stderr = '';
    
    if (process.stdout) {
      process.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(data.toString());
      });
    }
    
    if (process.stderr) {
      process.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(data.toString());
      });
    }
    
    process.on('error', (error) => {
      reject(error);
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
  });
}

/**
 * Clone the Datastar repository
 */
async function cloneDatastarRepo(): Promise<void> {
  console.log(`Cloning Datastar repository to ${TEMP_DIR}...`);
  
  if (fs.existsSync(TEMP_DIR)) {
    console.log('Repository already exists, skipping clone.');
    return;
  }
  
  try {
    await runCommand('git', ['clone', DATASTAR_REPO_URL, TEMP_DIR]);
    console.log('Repository cloned successfully.');
  } catch (error) {
    console.error('Failed to clone repository:', error);
    throw error;
  }
}

/**
 * Start the test server
 */
async function startTestServer(): Promise<any> {
  console.log('Starting test server...');
  
  const serverProcess = spawn('bun', ['run', join(process.cwd(), 'src/test/testServer.ts')], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });
  
  // Wait for server to start
  return new Promise((resolve, reject) => {
    let output = '';
    
    if (serverProcess.stdout) {
      serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log(data.toString());
        
        // Check if server is ready
        if (output.includes(`Test server running at http://localhost:${TEST_SERVER_PORT}`)) {
          console.log('Test server started successfully.');
          resolve(serverProcess);
        }
      });
    }
    
    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (data) => {
        console.error(data.toString());
      });
    }
    
    serverProcess.on('error', (error) => {
      console.error('Failed to start test server:', error);
      reject(error);
    });
    
    // Set a timeout in case the server doesn't start properly
    setTimeout(() => {
      reject(new Error('Timeout waiting for test server to start'));
    }, 10000);
  });
}

/**
 * Run the Datastar test suite
 */
async function runDatastarTests(): Promise<void> {
  console.log('Running Datastar test suite...');
  
  try {
    const testDir = join(TEMP_DIR, 'sdk', 'test');
    await runCommand('bash', ['./test-all.sh', TEST_SERVER_URL], { cwd: testDir });
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test suite failed:', error);
    throw error;
  }
}

/**
 * Clean up resources
 */
function cleanup(serverProcess: any): void {
  console.log('Cleaning up...');
  
  if (serverProcess) {
    console.log('Stopping test server...');
    // Kill process and all children
    process.kill(-serverProcess.pid);
  }
}

/**
 * Main function to run all steps
 */
async function main(): Promise<void> {
  let serverProcess = null;
  
  try {
    await cloneDatastarRepo();
    serverProcess = await startTestServer();
    
    // Give the server a moment to fully initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await runDatastarTests();
    
    console.log('All tests passed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to run tests:', error);
    process.exit(1);
  } finally {
    if (serverProcess) {
      cleanup(serverProcess);
    }
  }
}

// Run the main function
main();