#!/usr/bin/env bun

/**
 * Optimized build script for Datastar Bun SDK
 * Uses Bun's built-in build capabilities for faster, more optimized builds.
 */

import { spawnSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
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

if (tscResult.status !== 0) {
  console.error('❌ TypeScript declaration generation failed');
  process.exit(1);
}

console.log('✨ Build completed successfully!');
