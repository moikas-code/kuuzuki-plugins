#!/usr/bin/env node

import { KuuzukiAgentrcPlugin } from './src/index.js';
import path from 'path';
import fs from 'fs/promises';

// Test the init command on the root project (has lerna.json, multiple packages)
const mockApp = {
  path: {
    root: '/home/moika/Documents/code/kuuzuki-plugins',
    config: path.join(process.env.HOME || '/tmp', '.config', 'opencode'),
  }
};

const mockClient = { baseUrl: 'http://localhost:4096' };
const mock$ = async (cmd) => ({ stdout: 'mock output', stderr: '', exitCode: 0 });

console.log('🧪 Testing .agentrc generation for root kuuzuki-plugins project...');

try {
  const hooks = await KuuzukiAgentrcPlugin({
    app: mockApp,
    client: mockClient,
    $: mock$
  });
  
  // Clean up any existing .agentrc
  await fs.unlink('/home/moika/Documents/code/kuuzuki-plugins/.agentrc').catch(() => {});
  
  // Test init command
  const result = await hooks.commands.init();
  console.log('Result:', result);
  
  // Show the generated .agentrc
  const agentrc = await fs.readFile('/home/moika/Documents/code/kuuzuki-plugins/.agentrc', 'utf-8');
  console.log('\n📄 Generated .agentrc for kuuzuki-plugins:');
  console.log(agentrc);
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}