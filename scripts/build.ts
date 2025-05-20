#!/usr/bin/env bun

/**
 * Optimized build script for Datastar Bun SDK
 * Uses Bun's built-in build capabilities for faster, more optimized builds.
 */

import { spawnSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { build } from 'bun';

console.log('🛠️ Starting build process for Datastar Bun SDK...');

// Run the clean script first
console.log('🧹 Cleaning project...');
const cleanResult = spawnSync('bun', ['run', 'clean'], { stdio: 'inherit' });
if (cleanResult.status !== 0) {
  console.error('❌ Clean script failed');
  process.exit(1);
}

// Define source entry point and output directory
const sourcePath = join(process.cwd(), 'src', 'index.ts');
const outDir = join(process.cwd(), 'dist');

// Step 1: Use Bun's build API for the JavaScript output
console.log('📦 Building JavaScript bundle with Bun...');
try {
  const result = await build({
    entrypoints: [sourcePath],
    outdir: outDir,
    target: 'node',
    minify: false, // Usually better to leave unminified for libraries
    sourcemap: 'external', // Generate source maps
    splitting: true, // Enable code splitting for better tree-shaking
    format: 'esm', // Explicitly specify ESM format
    root: process.cwd(), // Use the project root to ensure relative paths in sourcemaps
  });

  console.log(`✅ Bun build completed. Generated ${result.outputs.length} files.`);
} catch (error) {
  console.error('❌ Bun build failed:', error);
  process.exit(1);
}

// Step 2: Generate TypeScript declaration files
console.log('📝 Generating TypeScript declaration files...');

// Create a temporary tsconfig for the build
const tempTsConfigPath = join(process.cwd(), 'tsconfig.build.json');

// Read the existing tsconfig.json
const tsConfigPath = join(process.cwd(), 'tsconfig.json');
let tsConfig;
try {
  // Read the file contents
  const tsConfigContent = readFileSync(tsConfigPath, 'utf8');
  
  // Strip comments (both line and block comments) from the JSON
  const jsonContent = tsConfigContent
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .trim();
  
  // Parse the resulting JSON
  tsConfig = JSON.parse(jsonContent);
} catch (error) {
  console.error('❌ Failed to read tsconfig.json:', error);
  process.exit(1);
}

// Create build config from scratch, but based on the main tsconfig settings
const buildConfig = {
  extends: './tsconfig.json',
  compilerOptions: {
    ...tsConfig.compilerOptions,
    // Ensure these specific settings for declaration files
    declaration: true,
    emitDeclarationOnly: true,
    outDir: './dist',
  },
  // Only include source files, exclude tests
  include: ['src/**/*.ts'],
  exclude: ['src/**/*.test.ts', 'src/test/**/*'],
};

// Write the temporary tsconfig
writeFileSync(tempTsConfigPath, JSON.stringify(buildConfig, null, 2));
console.log('📄 Created temporary build tsconfig.json');

// Run TypeScript compiler for declaration files only
const tscResult = spawnSync(
  'tsc', 
  ['--project', tempTsConfigPath], 
  { stdio: 'inherit' }
);

// Clean up the temporary tsconfig
if (existsSync(tempTsConfigPath)) {
  unlinkSync(tempTsConfigPath);
}

// Step 3: Sanitize source maps to remove absolute paths
console.log('🧹 Sanitizing source maps to remove absolute paths...');
const sanitizeResult = spawnSync('bun', ['run', 'scripts/sanitize-maps.ts'], { stdio: 'inherit' });
if (sanitizeResult.status !== 0) {
  console.error('❌ Source map sanitization failed');
  process.exit(1);
}

// Step 4: Validate the built files for absolute paths
console.log('🔍 Validating built files for absolute paths...');

// Get your username to check for personal paths
const homePath = process.env.HOME || process.env.USERPROFILE || '';
const username = homePath.split('/').pop() || homePath.split('\\').pop() || '';

// Create a function to check a file for absolute paths
async function checkFileForAbsolutePaths(filePath: string): Promise<string[]> {
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
    if (pattern.test(content)) {
      paths.push(`Found pattern ${pattern.toString()} in ${filePath}`);
    }
  }
  
  return paths;
}

// Check all files in the dist directory
const distFiles = readdirSync(outDir);
let foundPaths: string[] = [];

for (const file of distFiles) {
  const filePath = join(outDir, file);
  
  // Only check text files, not binaries
  if (file.endsWith('.js') || file.endsWith('.d.ts') || file.endsWith('.map')) {
    const paths = await checkFileForAbsolutePaths(filePath);
    foundPaths = [...foundPaths, ...paths];
  }
}

if (foundPaths.length > 0) {
  console.error('⚠️ Warning: Found potential absolute paths in build files:');
  for (const path of foundPaths) {
    console.error(`  - ${path}`);
  }
  console.error('These might leak your personal file system information when published.');
  console.error('Consider updating your build process to avoid these paths.');
  
  // Don't exit with error to allow the build to continue
  // but make sure it's very visible to the user
  console.error('\n❗ Build completed with warnings ❗\n');
} else {
  console.log('✅ No absolute paths found in build files');
}

console.log('🎉 Build completed successfully!');
