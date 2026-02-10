import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.insurancenewsai.app',
  appName: 'P&C Brief',
  webDir: 'dist',
  ios: {
    // Respect iOS safe areas automatically
    contentInset: 'automatic',
    scrollEnabled: true,
    // Prefer mobile content width
    preferredContentMode: 'mobile',
    // Allow the webview to extend behind status bar and home indicator
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    StatusBar: {
      // Light style = dark text on light background
      style: 'LIGHT',
      backgroundColor: '#ffffff',
    },
    PushNotifications: {
      // Present push notifications when app is in foreground
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
