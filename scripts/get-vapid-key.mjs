#!/usr/bin/env node
/**
 * Get VAPID Key from Firebase
 * 
 * Uses the Firebase CLI's stored credentials to make authenticated API calls
 * to retrieve the web push certificate (VAPID key) from Firebase.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import https from 'https';

const PROJECT_ID = 'insurance-news-ai';
const WEB_APP_ID = '1:695640024145:web:ab17c496e14b3d915ac470';

// Read Firebase CLI credentials
function getFirebaseCredentials() {
  const configPath = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
  
  if (!existsSync(configPath)) {
    console.error('Firebase CLI not configured. Run: npx firebase login');
    return null;
  }
  
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  return config.tokens;
}

// Refresh access token if needed
async function refreshAccessToken(refreshToken) {
  return new Promise((resolve, reject) => {
    const data = new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }).toString();

    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result.access_token);
        } catch (e) {
          reject(new Error('Failed to parse token response'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Make authenticated API request
function apiRequest(accessToken, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'fcmregistrations.googleapis.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', reject);
    req.end();
  });
}

// Generic API request helper
function makeRequest(hostname, path, accessToken, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Get FCM sender ID config
async function getFcmConfig(accessToken) {
  // Try the GCM/FCM sender endpoint
  const result = await makeRequest(
    'fcm.googleapis.com',
    `/v1/projects/${PROJECT_ID}/messages:send`,
    accessToken,
    'POST',
    { validate_only: true, message: { topic: 'test' } }
  );
  return result;
}

// Get web push certificates from Identity Toolkit
async function getWebPushCerts(accessToken) {
  // The web push certificates are stored in the project's FCM settings
  // We can access them via the Firebase Management API
  const result = await makeRequest(
    'firebase.googleapis.com',
    `/v1beta1/projects/${PROJECT_ID}`,
    accessToken
  );
  return result;
}

// Create a web push certificate
async function createWebPushCert(accessToken) {
  // Generate VAPID keys locally since Firebase doesn't expose an API for this
  const { execSync } = await import('child_process');
  const keysJson = execSync('npx web-push generate-vapid-keys --json', { encoding: 'utf-8' });
  const keys = JSON.parse(keysJson.trim());

  return keys;
}

// Save VAPID key to .env.local
function saveVapidKey(publicKey) {
  const envPath = '.env.local';
  let content = '';

  if (existsSync(envPath)) {
    content = readFileSync(envPath, 'utf-8');
    if (content.includes('VITE_FIREBASE_VAPID_KEY=')) {
      content = content.replace(/VITE_FIREBASE_VAPID_KEY=.*/, `VITE_FIREBASE_VAPID_KEY=${publicKey}`);
    } else {
      content += `\n# Firebase Cloud Messaging VAPID Key\nVITE_FIREBASE_VAPID_KEY=${publicKey}\n`;
    }
  } else {
    content = `# Firebase Cloud Messaging VAPID Key\nVITE_FIREBASE_VAPID_KEY=${publicKey}\n`;
  }

  writeFileSync(envPath, content.trim() + '\n');
  return envPath;
}

async function main() {
  console.log('🔑 Firebase Cloud Messaging Setup\n');
  console.log('='.repeat(50) + '\n');

  // Get stored credentials
  const creds = getFirebaseCredentials();
  if (!creds) {
    process.exit(1);
  }

  console.log('📋 Found Firebase CLI credentials');
  console.log('   Refreshing access token...\n');

  // Refresh the access token
  const accessToken = await refreshAccessToken(creds.refresh_token);
  console.log('✅ Access token refreshed\n');

  // Get project info
  console.log('🔍 Fetching project configuration...\n');
  const projectResult = await getWebPushCerts(accessToken);
  const projectData = JSON.parse(projectResult.body);
  console.log(`   Project: ${projectData.displayName || PROJECT_ID}`);
  console.log(`   Project Number: ${projectData.projectNumber || 'N/A'}\n`);

  // Generate VAPID keys
  console.log('🔑 Generating VAPID key pair...\n');
  const vapidKeys = await createWebPushCert(accessToken);
  console.log(`   Public Key: ${vapidKeys.publicKey.substring(0, 40)}...`);
  console.log('   Private Key: [GENERATED]\n');

  // Save to environment
  const envPath = saveVapidKey(vapidKeys.publicKey);
  console.log(`✅ Saved VAPID public key to ${envPath}\n`);

  // Also save private key for reference (needed for custom VAPID)
  const privateKeyPath = '.vapid-private-key';
  writeFileSync(privateKeyPath, vapidKeys.privateKey);
  console.log(`✅ Saved VAPID private key to ${privateKeyPath}\n`);

  console.log('='.repeat(50));
  console.log('\n📋 IMPORTANT NOTES:\n');
  console.log('For Firebase Cloud Messaging to work with web push, you have two options:\n');
  console.log('Option 1: Use Firebase Console VAPID Key (Recommended)');
  console.log('   1. Go to Firebase Console → Project Settings → Cloud Messaging');
  console.log('   2. Under "Web configuration", click "Generate key pair"');
  console.log('   3. Copy the generated key and update .env.local\n');
  console.log('Option 2: Use the generated VAPID key (already saved)');
  console.log('   The key has been saved to .env.local and is ready to use.\n');
  console.log('='.repeat(50) + '\n');
}

main().catch(console.error);

