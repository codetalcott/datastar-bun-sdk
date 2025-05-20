#!/usr/bin/env bun

/**
 * Custom build script for Datastar Bun SDK
 * This script handles the build process for the library with special handling to exclude test files.
 */

import { spawnSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

console.log('🛠️ Starting build process for Datastar Bun SDK...');

// Run the clean script first
console.log('🧹 Cleaning project...');
const cleanResult = spawnSync('bun', ['run', 'clean'], { stdio: 'inherit' });
if (cleanResult.status !== 0) {
  console.error('❌ Clean script failed');
  process.exit(1);
}

// Bundle with Bun
console.log('📦 Bundling with Bun...');
const bundleResult = spawnSync(
  'bun', 
  ['build', './src/index.ts', '--outdir', './dist'], 
  { stdio: 'inherit' }
);
if (bundleResult.status !== 0) {
  console.error('❌ Bundling failed');
  process.exit(1);
}

// Create a temporary tsconfig for the build
const tempTsConfigPath = join(process.cwd(), 'tsconfig.build.json');

// Create build config from scratch, but based on the main tsconfig settings
const buildConfig = {
  compilerOptions: {
    lib: ["ESNext"],
    target: "ESNext",
    module: "ESNext",
    moduleDetection: "force",
    jsx: "react-jsx",
    allowJs: true,
    moduleResolution: "bundler",
    allowImportingTsExtensions: true,
    verbatimModuleSyntax: true,
    declaration: true,
    emitDeclarationOnly: true,
    outDir: "./dist",
    strict: true,
    skipLibCheck: true,
    noFallthroughCasesInSwitch: true,
    noUncheckedIndexedAccess: true,
    noUnusedLocals: false,
    noUnusedParameters: false,
    noPropertyAccessFromIndexSignature: false
  },
  include: ["src/**/*"],
  exclude: [
    "src/test/**/*",
    "examples/**/*",
    "scripts/**/*"
  ]
};

// Write the temporary config
writeFileSync(tempTsConfigPath, JSON.stringify(buildConfig, null, 2));

// Generate declaration files with TypeScript compiler using the temporary config
console.log('📝 Generating TypeScript declaration files...');
const tscResult = spawnSync(
  'tsc', 
  ['--project', tempTsConfigPath], 
  { stdio: 'inherit' }
);

// Clean up the temporary config
if (existsSync(tempTsConfigPath)) {
  unlinkSync(tempTsConfigPath);
}

if (tscResult.status !== 0) {
  console.error('❌ TypeScript declaration generation failed');
  process.exit(1);
}

console.log('✅ Build completed successfully!');