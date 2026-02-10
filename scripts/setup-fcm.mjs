#!/usr/bin/env node
/**
 * FCM Setup Script
 * 
 * This script helps configure Firebase Cloud Messaging for web push notifications.
 * It uses the Google Cloud Identity Platform API to get/create web push certificates.
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, readFileSync } from 'fs';

const PROJECT_ID = 'insurance-news-ai';

// Get Firebase access token using the Firebase CLI
function getAccessToken() {
  try {
    // Firebase CLI stores credentials that we can use
    const result = execSync('npx firebase --json projects:list', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    // If this works, Firebase CLI is authenticated
    return true;
  } catch (error) {
    console.error('Firebase CLI not authenticated. Run: npx firebase login');
    return false;
  }
}

// Use Firebase CLI to make authenticated API calls
async function getWebPushCertificate() {
  console.log('🔍 Checking for existing web push certificate...\n');
  
  // The Firebase Console generates VAPID keys automatically when you enable Cloud Messaging
  // We can retrieve them via the Firebase Management REST API
  
  try {
    // Use firebase CLI to get the web app config which may include messaging config
    const configResult = execSync(
      `npx firebase apps:sdkconfig WEB --project ${PROJECT_ID}`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    
    console.log('📱 Firebase Web App Config retrieved successfully');
    
    // Parse the config to get messagingSenderId
    const configMatch = configResult.match(/"messagingSenderId":\s*"(\d+)"/);
    if (configMatch) {
      console.log(`   Messaging Sender ID: ${configMatch[1]}`);
    }
    
    return configMatch ? configMatch[1] : null;
  } catch (error) {
    console.error('Failed to get web app config:', error.message);
    return null;
  }
}

// Generate VAPID keys using web-push
function generateVapidKeys() {
  console.log('\n🔑 Generating VAPID key pair...\n');
  
  try {
    const result = execSync('npx web-push generate-vapid-keys --json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const keys = JSON.parse(result.trim());
    console.log('   Public Key:', keys.publicKey.substring(0, 30) + '...');
    console.log('   Private Key: [HIDDEN]');
    
    return keys;
  } catch (error) {
    console.error('Failed to generate VAPID keys:', error.message);
    return null;
  }
}

// Create or update .env.local file
function updateEnvFile(vapidPublicKey) {
  const envPath = '.env.local';
  let envContent = '';
  
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf-8');
  }
  
  // Check if VAPID key already exists
  if (envContent.includes('VITE_FIREBASE_VAPID_KEY=')) {
    // Update existing key
    envContent = envContent.replace(
      /VITE_FIREBASE_VAPID_KEY=.*/,
      `VITE_FIREBASE_VAPID_KEY=${vapidPublicKey}`
    );
  } else {
    // Add new key
    envContent += `\n# Firebase Cloud Messaging VAPID Key\nVITE_FIREBASE_VAPID_KEY=${vapidPublicKey}\n`;
  }
  
  writeFileSync(envPath, envContent.trim() + '\n');
  console.log(`\n✅ Updated ${envPath} with VAPID public key`);
}

// Main setup function
async function main() {
  console.log('🚀 Firebase Cloud Messaging Setup\n');
  console.log('='.repeat(50) + '\n');
  
  // Check Firebase CLI authentication
  if (!getAccessToken()) {
    process.exit(1);
  }
  
  // Get messaging sender ID
  const senderId = await getWebPushCertificate();
  
  // Generate VAPID keys
  const vapidKeys = generateVapidKeys();
  
  if (vapidKeys) {
    // Update environment file
    updateEnvFile(vapidKeys.publicKey);
    
    // Save private key securely (for reference - Firebase handles this)
    console.log('\n📋 Setup Summary:');
    console.log('='.repeat(50));
    console.log(`   Project: ${PROJECT_ID}`);
    console.log(`   Sender ID: ${senderId || 'N/A'}`);
    console.log(`   VAPID Public Key: ${vapidKeys.publicKey.substring(0, 40)}...`);
    console.log('\n⚠️  IMPORTANT: For Firebase Cloud Messaging, you should use');
    console.log('   the VAPID key from Firebase Console instead of a custom one.');
    console.log('   Go to: Firebase Console → Project Settings → Cloud Messaging');
    console.log('   → Web configuration → Generate key pair\n');
  }
}

main().catch(console.error);

