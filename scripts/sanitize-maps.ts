#!/usr/bin/env bun

/**
 * Strip absolute paths from source maps
 * This script ensures no personal file paths leak into the package
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const outDir = join(process.cwd(), 'dist');

// Get list of source map files
const sourceMapFiles = readdirSync(outDir)
  .filter(file => file.endsWith('.map'));

console.log(`🔍 Found ${sourceMapFiles.length} source map files to sanitize`);

// Get username to find and replace
const homePath = process.env.HOME || process.env.USERPROFILE || '';
const username = homePath.split('/').pop() || homePath.split('\\').pop() || '';

// Get the project directory as absolute path
const projectDir = process.cwd();

// Process each source map
for (const file of sourceMapFiles) {
  const filePath = join(outDir, file);
  console.log(`Processing ${file}...`);
  
  // Read source map
  let content = readFileSync(filePath, 'utf8');
  
  // Create a regex to match absolute paths to the project directory
  const projectDirRegex = new RegExp(projectDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  
  // Create regexes to match home directory paths
  const homePathRegexes = [
    new RegExp(`/Users/${username}`, 'g'),
    new RegExp(`/home/${username}`, 'g'),
    new RegExp(`C:\\\\Users\\\\${username}`, 'g'),
  ];
  
  // Replace project dir with relative path
  content = content.replace(projectDirRegex, '.');
  
  // Replace home paths
  for (const regex of homePathRegexes) {
    content = content.replace(regex, '~');
  }
  
  // Write back sanitized content
  writeFileSync(filePath, content);
  console.log(`✅ Sanitized ${file}`);
}

console.log('🎉 All source maps sanitized!');
