#!/usr/bin/env node

import { KuuzukiAgentrcPlugin } from './src/index.js';
import path from 'path';

const mockApp = {
  path: {
    root: process.cwd(),
    config: '/tmp'
  }
};

const mockClient = { baseUrl: 'http://localhost' };
const mock$ = async () => ({ stdout: '', stderr: '', exitCode: 0 });

console.log('🧪 Testing chat.message memory functionality...\n');

try {
  const hooks = await KuuzukiAgentrcPlugin({
    app: mockApp,
    client: mockClient,
    $: mock$
  });

  // Test chat message parsing for memory commands
  console.log('✅ Plugin loaded with chat.message hook');

  // Test memory command via chat message
  const testMessage = {
    message: {
      content: 'memory action=add rule="Follow a hybrid approach to functional and OOP programming"'
    }
  };

  if (hooks['chat.message']) {
    console.log('🧠 Testing memory command via chat message...');
    await hooks['chat.message']({}, testMessage);
    console.log('📨 Chat response:', testMessage.message.content);
  } else {
    console.log('❌ No chat.message hook found');
  }

  // Test listing rules
  const listMessage = {
    message: {
      content: 'memory action=list'
    }
  };

  if (hooks['chat.message']) {
    console.log('\n📋 Testing list command via chat message...');
    await hooks['chat.message']({}, listMessage);
    console.log('📨 Chat response preview:', listMessage.message.content.substring(0, 200) + '...');
  }

  console.log('\n🎉 Chat memory functionality test completed!');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Stack:', error.stack);
}