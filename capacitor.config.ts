import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.insurancenewsai.app',
  appName: 'The Brief',
  webDir: 'dist',
  ios: {
    // Enable scrolling but we'll control bounce via CSS
    scrollEnabled: true,
    // Prefer mobile content width
    preferredContentMode: 'mobile',
    // Disable link previews
    allowsLinkPreview: false,
  },
  server: {
    // Use capacitor:// scheme for iOS
    iosScheme: 'capacitor',
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
    Keyboard: {
      // Resize content when keyboard appears
      resize: 'body',
      // iOS keyboard style
      style: 'LIGHT',
    },
    FirebaseAuthentication: {
      // Use native Firebase Auth SDK for native platforms
      skipNativeAuth: false,
      // Auth providers - phone and Google
      providers: ['phone', 'google.com'],
    },
  },
};

export default config;
