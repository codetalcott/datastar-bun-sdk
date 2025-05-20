/**
 * Clean script that removes build directories and artifacts
 * Using native Bun/Node.js APIs instead of rimraf
 */
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

// Directories to clean
const DIRS_TO_CLEAN = ['dist', 'coverage', '.tmp'];

async function clean() {
  console.log('🧹 Cleaning project directories...');
  
  for (const dir of DIRS_TO_CLEAN) {
    try {
      // Get absolute path to ensure we're operating in the correct location
      const dirPath = join(import.meta.dir, '..', dir);
      
      // Force and recursive options are equivalent to rm -rf
      await rm(dirPath, { recursive: true, force: true });
      console.log(`✅ Removed ${dir}`);
    } catch (err: any) {
      // ENOENT means the directory didn't exist, which is fine
      if (err.code !== 'ENOENT') {
        console.error(`❌ Failed to remove ${dir}: ${err.message}`);
      } else {
        console.log(`⚠️  Directory ${dir} did not exist, nothing to clean`);
      }
    }
  }
  
  console.log('✨ Clean complete!');
}

// Execute the clean function
clean().catch(err => {
  console.error('❌ Clean script error:', err);
  process.exit(1);
});
