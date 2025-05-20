#!/usr/bin/env bun

/**
 * Pre-publish validation script
 * This script runs before publishing to npm to ensure no absolute paths are included
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 Running pre-publish validation...');

// Get your username to check for personal paths
const homePath = process.env.HOME || process.env.USERPROFILE || '';
const username = homePath.split('/').pop() || homePath.split('\\').pop() || '';
console.log(`👤 Detected username: ${username}`);

const outDir = join(process.cwd(), 'dist');
console.log(`📁 Checking directory: ${outDir}`);

// Check if dist directory exists
if (!existsSync(outDir)) {
  console.error('❌ Error: dist directory does not exist. Run `bun run build` first.');
  process.exit(1);
}

// Create a function to check a file for absolute paths
function checkFileForAbsolutePaths(filePath: string): string[] {
  console.log(`🔎 Checking file: ${filePath}`);
  const content = readFileSync(filePath, 'utf8');
  const paths: string[] = [];
  
  // Look for common absolute path patterns
  const absolutePathPatterns = [
    // UNIX-style home paths
    new RegExp(`/Users/${username}`, 'g'),
    new RegExp(`/home/${username}`, 'g'),
    // Windows-style paths
    new RegExp(`C:\\\\Users\\\\${username}`, 'g'),
    // Project absolute path
    new RegExp(process.cwd().replace(/\\/g, '\\\\'), 'g'),
  ];
  
  for (const pattern of absolutePathPatterns) {
    console.log(`  - Checking for pattern: ${pattern.toString()}`);
    if (pattern.test(content)) {
      paths.push(`Found pattern ${pattern.toString()} in ${filePath}`);
    }
  }
  
  return paths;
}

// Check all files in the dist directory
try {
  const distFiles = readdirSync(outDir);
  console.log(`📚 Found ${distFiles.length} files to check: ${distFiles.join(', ')}`);
  
  let foundPaths: string[] = [];

  for (const file of distFiles) {
    const filePath = join(outDir, file);
    
    // Only check text files, not binaries
    if (file.endsWith('.js') || file.endsWith('.d.ts') || file.endsWith('.map')) {
      const paths = checkFileForAbsolutePaths(filePath);
      foundPaths = [...foundPaths, ...paths];
    } else {
      console.log(`⏭️ Skipping file: ${file} (not a text file)`);
    }
  }

  if (foundPaths.length > 0) {
    console.error('❌ Error: Found absolute paths in build files:');
    for (const path of foundPaths) {
      console.error(`  - ${path}`);
    }
    console.error('These will leak your personal file system information when published.');
    console.error('Please rebuild the package to fix this issue.');
    process.exit(1);
  } else {
    console.log('✅ No absolute paths found in build files');
  }

  console.log('✅ Package validation passed!');
} catch (error) {
  console.error('❌ Validation failed:', error);
  console.error(error);
  process.exit(1);
}
