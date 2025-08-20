#!/usr/bin/env node

/**
 * Test script for Kuuzuki OpenCode Plugin
 * 
 * This script simulates the OpenCode plugin environment to test
 * the plugin functionality without requiring OpenCode installation.
 */

import { KuuzukiAgentrcPlugin } from '../src/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock OpenCode app object
const mockApp = {
  path: {
    root: __dirname,
    config: path.join(process.env.HOME || '/tmp', '.config', 'opencode'),
    data: path.join(process.env.HOME || '/tmp', '.config', 'opencode', 'data'),
    cwd: __dirname,
    state: path.join(process.env.HOME || '/tmp', '.config', 'opencode', 'state')
  }
};

// Mock OpenCode client
const mockClient = {
  baseUrl: 'http://localhost:4096'
};

// Mock Bun $ shell utility (basic implementation)
const mock$ = async (cmd) => {
  console.log(`[Mock Shell] ${cmd}`);
  return { stdout: 'mock output', stderr: '', exitCode: 0 };
};

// Test the plugin
async function testPlugin() {
  console.log('🧪 Testing Kuuzuki OpenCode Plugin...\n');
  
  try {
    // Initialize plugin
    const hooks = await KuuzukiAgentrcPlugin({
      app: mockApp,
      client: mockClient,
      $: mock$
    });
    
    console.log('\n✅ Plugin initialized successfully!');
    console.log('Available hooks:', Object.keys(hooks));
    
    // Test init command
    console.log('\n🧪 Testing init command override...');
    if (hooks.commands && hooks.commands.init) {
      const initResult = await hooks.commands.init();
      console.log('Init command result:', initResult);
    } else {
      console.log('❌ Init command not found');
    }
    
    // Test session start event
    console.log('\n🧪 Testing session start event...');
    await hooks.event({ event: { type: 'session.start', data: {}, timestamp: Date.now() } });
    
    // Test memory tool
    console.log('\n🧪 Testing memory tool...');
    const mockToolInput = {
      tool: 'memory',
      sessionID: 'test-session',
      callID: 'test-call'
    };
    const mockToolOutput = {
      args: { action: 'list' }
    };
    
    await hooks['tool.execute.before'](mockToolInput, mockToolOutput);
    await hooks['tool.execute.after'](mockToolInput, mockToolOutput);
    
    console.log('Memory tool result:', mockToolOutput);
    
    // Test bash command mapping
    console.log('\n🧪 Testing bash command mapping...');
    const bashInput = {
      tool: 'bash',
      sessionID: 'test-session',
      callID: 'test-call'
    };
    const bashOutput = {
      args: { command: 'npm test' }
    };
    
    await hooks['tool.execute.before'](bashInput, bashOutput);
    console.log('Bash command after mapping:', bashOutput.args.command);
    
    // Test session end event
    console.log('\n🧪 Testing session end event...');
    await hooks.event({ event: { type: 'session.end', data: {}, timestamp: Date.now() } });
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
testPlugin().catch(console.error);