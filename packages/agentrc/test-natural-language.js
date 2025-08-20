#!/usr/bin/env node

import { KuuzukiAgentrcPlugin } from './src/index.js';

const mockApp = { path: { root: process.cwd(), config: '/tmp' } };
const mockClient = { baseUrl: 'http://localhost' };
const mock$ = async () => ({ stdout: '', stderr: '', exitCode: 0 });

console.log('🗣️ Testing natural language memory commands...\n');

const testMessages = [
  'remember: always validate user input',
  'remember this: use constants for magic numbers',
  'note: prefer map() over forEach() for transformations',
  'add rule: log all database queries in development',
  'keep in mind: cache expensive calculations',
  "don't forget: update documentation when changing APIs",
  'rules',
  'show rules',
  'what are the rules'
];

try {
  const hooks = await KuuzukiAgentrcPlugin({ app: mockApp, client: mockClient, $: mock$ });

  for (const testMsg of testMessages) {
    console.log(`\n💬 Input: "${testMsg}"`);
    
    const testMessage = { message: { content: testMsg } };
    
    if (hooks['chat.message']) {
      await hooks['chat.message']({}, testMessage);
      const response = testMessage.message.content;
      
      if (response.includes('Rule Added') || response.includes('Project Rules') || response.includes('already exists')) {
        console.log(`✅ Understood: ${response.split('\n')[0]}`);
      } else {
        console.log(`❓ No response - message not recognized`);
      }
    }
  }
  
  console.log('\n🎉 Natural language test completed!');

} catch (error) {
  console.error('❌ Test failed:', error.message);
}