#!/usr/bin/env node
/**
 * UI build script using esbuild - replaces Vite
 * Bundles src/ui/main.ts for the browser and copies index.html
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, '..', 'src', 'ui');
const outDir = path.join(__dirname, '..', 'dist', 'ui', 'dist');

// Ensure output directory exists
fs.mkdirSync(outDir, { recursive: true });

// Copy index.html
const srcHtml = path.join(srcDir, 'index.html');
const outHtml = path.join(outDir, 'index.html');
fs.copyFileSync(srcHtml, outHtml);
console.log('  Copied index.html');

// Bundle main.ts with esbuild
const entryPoint = path.join(srcDir, 'main.ts');
const outFile = path.join(outDir, 'main.js');

const esbuildCmd = [
  'npx esbuild',
  JSON.stringify(entryPoint),
  '--bundle',
  '--platform=browser',
  '--target=es2020',
  '--format=esm',
  '--minify',
  `--outfile=${JSON.stringify(outFile)}`,
].join(' ');

console.log('  Bundling src/ui/main.ts...');
execSync(esbuildCmd, { stdio: 'inherit' });
console.log('  UI build complete -> dist/ui/dist/');
