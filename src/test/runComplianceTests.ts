import { spawn, type SpawnOptions } from 'child_process';
import { join } from 'path';
import fs from 'fs';

// Configuration options
let TEST_SERVER_PORT = 3000; // This will be updated when the server starts
let TEST_SERVER_URL = `http://localhost:${TEST_SERVER_PORT}`;
const COMPLIANCE_DIR = join(process.cwd(), 'src/test/compliance');

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
 * Verify compliance test directory exists
 */
async function verifyComplianceTestsExist(): Promise<void> {
  if (!fs.existsSync(COMPLIANCE_DIR)) {
    throw new Error(`Compliance test directory not found at ${COMPLIANCE_DIR}`);
  }
  
  const requiredFiles = [
    'test-all.sh', 
    'test-get.sh', 
    'test-post.sh', 
    'normalize.sh'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(join(COMPLIANCE_DIR, file))) {
      throw new Error(`Required compliance test file ${file} not found`);
    }
  }
  
  if (!fs.existsSync(join(COMPLIANCE_DIR, 'get-cases')) || 
      !fs.existsSync(join(COMPLIANCE_DIR, 'post-cases'))) {
    throw new Error('Test case directories missing from compliance tests');
  }
  
  console.log('Compliance test files verified.');
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
        
        // Check if server is ready and extract the port
        const serverUrlMatch = output.match(/Test server running at http:\/\/localhost:(\d+)/);
        if (serverUrlMatch) {
          TEST_SERVER_PORT = parseInt(serverUrlMatch[1], 10);
          TEST_SERVER_URL = `http://localhost:${TEST_SERVER_PORT}`;
          console.log(`Test server started successfully on port ${TEST_SERVER_PORT}.`);
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
 * Run the compliance test suite
 */
async function runComplianceTests(): Promise<void> {
  console.log('Running Datastar compliance test suite...');
  
  try {
    await runCommand('bash', ['./test-all.sh', TEST_SERVER_URL], { cwd: COMPLIANCE_DIR });
    console.log('All compliance tests completed successfully!');
  } catch (error) {
    console.error('Compliance test suite failed:', error);
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
    await verifyComplianceTestsExist();
    serverProcess = await startTestServer();
    
    // Give the server a moment to fully initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await runComplianceTests();
    
    console.log('All compliance tests passed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to run compliance tests:', error);
    process.exit(1);
  } finally {
    if (serverProcess) {
      cleanup(serverProcess);
    }
  }
}

// Run the main function
main();