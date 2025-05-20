import { spawn, type SpawnOptions } from 'child_process';
import { join } from 'path';
import fs from 'fs';

// Configuration options
const DATASTAR_REPO_URL = 'https://github.com/starfederation/datastar.git';
const TEMP_DIR = join(process.cwd(), 'temp_datastar_tests');
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
 * Get the Git hash of the repository
 */
async function getGitHash(repoPath: string): Promise<string> {
  return (await runCommand('git', ['rev-parse', 'HEAD'], { cwd: repoPath })).trim();
}

/**
 * Clone the Datastar repository
 */
async function cloneDatastarRepo(): Promise<void> {
  console.log(`Cloning Datastar repository to ${TEMP_DIR}...`);
  
  if (fs.existsSync(TEMP_DIR)) {
    console.log('Removing existing temporary directory...');
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
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
 * Ensure compliance directory exists
 */
function ensureComplianceDir(): void {
  if (!fs.existsSync(COMPLIANCE_DIR)) {
    console.log(`Creating compliance directory at ${COMPLIANCE_DIR}...`);
    fs.mkdirSync(COMPLIANCE_DIR, { recursive: true });
  }

  if (!fs.existsSync(join(COMPLIANCE_DIR, 'get-cases'))) {
    fs.mkdirSync(join(COMPLIANCE_DIR, 'get-cases'), { recursive: true });
  }

  if (!fs.existsSync(join(COMPLIANCE_DIR, 'post-cases'))) {
    fs.mkdirSync(join(COMPLIANCE_DIR, 'post-cases'), { recursive: true });
  }
}

/**
 * Copy test files from cloned repository to compliance directory
 */
async function copyTestFiles(): Promise<void> {
  console.log('Copying test files...');
  
  // Copy get-cases
  const getCasesDir = join(TEMP_DIR, 'sdk', 'test', 'get-cases');
  const getCasesDestDir = join(COMPLIANCE_DIR, 'get-cases');
  
  // Clear destination directory first
  if (fs.existsSync(getCasesDestDir)) {
    fs.rmSync(getCasesDestDir, { recursive: true, force: true });
  }
  fs.mkdirSync(getCasesDestDir, { recursive: true });
  
  // Copy each get case directory
  const getCases = fs.readdirSync(getCasesDir);
  for (const caseDir of getCases) {
    const casePath = join(getCasesDir, caseDir);
    if (fs.statSync(casePath).isDirectory()) {
      fs.mkdirSync(join(getCasesDestDir, caseDir), { recursive: true });
      const caseFiles = fs.readdirSync(casePath);
      for (const file of caseFiles) {
        fs.copyFileSync(join(casePath, file), join(getCasesDestDir, caseDir, file));
      }
    }
  }
  
  // Copy post-cases
  const postCasesDir = join(TEMP_DIR, 'sdk', 'test', 'post-cases');
  const postCasesDestDir = join(COMPLIANCE_DIR, 'post-cases');
  
  // Clear destination directory first
  if (fs.existsSync(postCasesDestDir)) {
    fs.rmSync(postCasesDestDir, { recursive: true, force: true });
  }
  fs.mkdirSync(postCasesDestDir, { recursive: true });
  
  // Copy each post case directory
  const postCases = fs.readdirSync(postCasesDir);
  for (const caseDir of postCases) {
    const casePath = join(postCasesDir, caseDir);
    if (fs.statSync(casePath).isDirectory()) {
      fs.mkdirSync(join(postCasesDestDir, caseDir), { recursive: true });
      const caseFiles = fs.readdirSync(casePath);
      for (const file of caseFiles) {
        fs.copyFileSync(join(casePath, file), join(postCasesDestDir, caseDir, file));
      }
    }
  }
  
  // Copy test scripts
  const scripts = ['test-all.sh', 'test-get.sh', 'test-post.sh', 'normalize.sh', 'README.md'];
  for (const script of scripts) {
    fs.copyFileSync(join(TEMP_DIR, 'sdk', 'test', script), join(COMPLIANCE_DIR, script));
  }
  
  console.log('Test files copied successfully.');
}

/**
 * Create a version stamp file
 */
async function createVersionStamp(): Promise<void> {
  const gitHash = await getGitHash(TEMP_DIR);
  const currentDate = new Date().toISOString().split('T')[0];
  
  const versionContent = `Tests copied from Datastar repository on ${currentDate}
Git commit: ${gitHash}

These test cases are used to verify compliance with the Datastar specification.
Update these tests by running:
  bun run test:compliance:update
`;
  
  fs.writeFileSync(join(COMPLIANCE_DIR, 'VERSION'), versionContent);
  console.log(`Created version stamp with Git hash: ${gitHash}`);
}

/**
 * Main function to update compliance tests
 */
async function main(): Promise<void> {
  try {
    await cloneDatastarRepo();
    ensureComplianceDir();
    await copyTestFiles();
    await createVersionStamp();
    
    // Clean up
    console.log('Cleaning up temporary files...');
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    
    console.log('Compliance tests updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to update compliance tests:', error);
    process.exit(1);
  }
}

// Run the main function
main();