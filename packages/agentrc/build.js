#!/usr/bin/env node

/**
 * Simple build script for kuuzuki plugin
 * Bundles imports into a single file for OpenCode compatibility
 */

import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
const entryFile = path.join(srcDir, 'index.js');
const outputFile = path.join(distDir, 'kuuzuki-agentrc.js');

// Create dist directory
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('🏗️  Building kuuzuki plugin...');

// Simple module bundler
function bundleModules(filePath, bundled = new Set()) {
  const content = fs.readFileSync(filePath, 'utf8');
  const dir = path.dirname(filePath);
  
  // Find all local imports (including multi-line imports)
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]\.\/([^'"]+)['"];?/gs;
  const imports = [];
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const [fullMatch, namedImports, modulePath] = match;
    const fullModulePath = path.resolve(dir, modulePath);
    
    // Handle .js extension
    let actualPath = fullModulePath;
    if (!actualPath.endsWith('.js')) {
      actualPath += '.js';
    }
    
    if (fs.existsSync(actualPath) && !bundled.has(actualPath)) {
      bundled.add(actualPath);
      imports.push({
        fullMatch,
        namedImports,
        modulePath,
        actualPath,
        content: fs.readFileSync(actualPath, 'utf8')
      });
    }
  }
  
  // Start with imported modules
  let result = '';
  for (const imp of imports) {
    console.log(`   📦 Bundling: ${path.relative(srcDir, imp.actualPath)}`);
    
    // Remove export keywords and add the module content
    const moduleContent = imp.content
      .replace(/export\s+const\s+/g, 'const ')
      .replace(/export\s+function\s+/g, 'function ')
      .replace(/export\s+\{[^}]+\}\s*;?\s*$/gm, '')
      .trim();
    
    result += `// === Module: ${imp.modulePath} ===\n${moduleContent}\n\n`;
  }
  
  // Add main file content without imports (comment out entire multi-line imports)
  const mainContent = content.replace(importRegex, (match) => {
    return match.split('\n').map(line => line.trim() ? `// ${line}` : '//').join('\n');
  });
  result += `// === Main Module ===\n${mainContent}`;
  
  return result;
}

async function buildPlugin() {
  try {
    console.log(`   📁 Entry: ${path.relative(__dirname, entryFile)}`);
    
    const bundledContent = bundleModules(entryFile);
    
    const finalContent = `/**
 * 🌸 Kuuzuki OpenCode Plugin
 * Built from: ${new Date().toISOString()}
 * Repository: https://github.com/moikas-code/kuuzuki-plugins
 */

${bundledContent}`;

    fs.writeFileSync(outputFile, finalContent);
    
    console.log('✅ Plugin built successfully!');
    console.log(`   📄 Output: ${path.relative(__dirname, outputFile)}`);
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    throw error;
  }
}

// Watch mode
if (process.argv.includes('--watch')) {
  console.log('👀 Watching for changes...');
  
  const watcher = fs.watch(srcDir, { recursive: true }, async (eventType, filename) => {
    if (filename && filename.endsWith('.js')) {
      console.log(`🔄 Rebuilding due to change in ${filename}...`);
      try {
        await buildPlugin();
        console.log('✅ Rebuilt!');
      } catch (error) {
        console.error('❌ Rebuild failed:', error.message);
      }
    }
  });
  
  // Handle cleanup
  process.on('SIGINT', () => {
    watcher.close();
    process.exit(0);
  });
  
  // Initial build
  await buildPlugin();
} else {
  // Single build
  await buildPlugin();
}