/**
 * Configure Firebase Phone Authentication
 *
 * This script configures phone auth settings including:
 * - Test phone numbers for development
 * - Authorized domains
 *
 * Run with: npx ts-node --esm src/scripts/configure-phone-auth.ts
 */

import { GoogleAuth } from "google-auth-library"
import * as path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROJECT_ID = "insurance-news-ai"
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "../../service-account.json")

// Test phone numbers for development (bypasses reCAPTCHA)
const TEST_PHONE_NUMBERS: Record<string, string> = {
  "+15555550100": "123456",
  "+15555550101": "123456",
  "+15555550102": "123456",
}

// Authorized domains for production (reference only - used when configuring Identity Platform):
// "insurance-news-ai.firebaseapp.com", "insurance-news-ai.web.app", "localhost"

async function getAccessToken(): Promise<string> {
  const googleAuth = new GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    scopes: ["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/firebase"],
  })
  const client = await googleAuth.getClient()
  const tokenResponse = await client.getAccessToken()
  if (!tokenResponse.token) {
    throw new Error("Failed to get access token")
  }
  return tokenResponse.token
}

async function getIdentityPlatformConfig(accessToken: string) {
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get config: ${response.status} ${error}`)
  }
  
  return response.json()
}

async function updateIdentityPlatformConfig(accessToken: string, config: object) {
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=signIn`
  
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update config: ${response.status} ${error}`)
  }
  
  return response.json()
}

async function main() {
  console.log("🔧 Configuring Firebase Phone Authentication...")
  console.log(`   Project: ${PROJECT_ID}`)
  
  try {
    // Get access token
    console.log("\n📝 Getting access token...")
    const accessToken = await getAccessToken()
    console.log("   ✅ Access token obtained")
    
    // Get current config
    console.log("\n📖 Fetching current Identity Platform config...")
    const currentConfig = await getIdentityPlatformConfig(accessToken)
    console.log("   Current config:", JSON.stringify(currentConfig, null, 2))
    
    // Prepare updated config with test phone numbers
    const updatedConfig = {
      signIn: {
        ...currentConfig.signIn,
        phoneNumber: {
          enabled: true,
          testPhoneNumbers: TEST_PHONE_NUMBERS,
        },
      },
    }
    
    console.log("\n🔄 Updating config with test phone numbers...")
    console.log("   Test numbers:", Object.keys(TEST_PHONE_NUMBERS).join(", "))
    
    const result = await updateIdentityPlatformConfig(accessToken, updatedConfig)
    console.log("   ✅ Config updated successfully")
    console.log("   Result:", JSON.stringify(result, null, 2))
    
    console.log("\n✅ Phone auth configuration complete!")
    console.log("\n📱 Test phone numbers configured:")
    for (const [phone, code] of Object.entries(TEST_PHONE_NUMBERS)) {
      console.log(`   ${phone} → code: ${code}`)
    }
    console.log("\n💡 Use these numbers on localhost to bypass reCAPTCHA")
    
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

main()

