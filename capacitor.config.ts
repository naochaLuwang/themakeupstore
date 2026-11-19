import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.themakeupstorewangkhei.twa',
  appName: 'The Makeup Store',
  webDir: '.next',
  server: {
    url: 'https://themakeupstorewangkhei.com',
    cleartext: false,
    hostname: 'themakeupstorewangkhei.com',
    androidScheme: 'https',
    allowNavigation: [
      'wa.me',
      'instagram.com',
      'facebook.com',
      'api.whatsapp.com',
    ],
  },
  plugins: {
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FFFFFF',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DEFAULT',
      backgroundColor: '#FFFFFF',
      overlaysWebView: false,
    },
    Haptics: {
      notificationDuration: 200,
      vibrateDuration: 100,
    },
  },
};

// Always select a platform for commands that copy native configuration. A bare
// `cap sync` could otherwise apply one platform's settings to the other project.
const args = process.argv.slice(2);
if (args.some(arg => ['sync', 'copy', 'update', 'run', 'build'].includes(arg)) &&
    !args.includes('android') && !args.includes('ios')) {
  throw new Error('Select a platform: npx cap sync android (or ios).');
}

const android = args.includes('android');
export default android ? {
  ...config,
  webDir: 'native/android',
  zoomEnabled: true,
  loggingBehavior: 'debug',
  server: {
    url: config.server!.url,
    hostname: 'localhost',
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: [],
    errorPath: 'offline.html',
  },
  plugins: {
    ...config.plugins,
    // MainActivity owns the native splash handoff; don't add a second timed hold.
    SplashScreen: { ...config.plugins!.SplashScreen, launchShowDuration: 0 },
  },
} satisfies CapacitorConfig : args.includes('ios') ? {
  ...config,
  webDir: 'native/ios',
  zoomEnabled: true,
  loggingBehavior: 'debug',
  backgroundColor: '#FFFFFF',
  server: {
    url: config.server!.url,
    hostname: 'localhost',
    iosScheme: 'capacitor',
    cleartext: false,
    allowNavigation: [],
    errorPath: 'offline.html',
  },
  ios: {
    includePlugins: [
      '@capacitor-community/apple-sign-in', '@capacitor-firebase/messaging',
      '@capacitor/app', '@capacitor/camera', '@capacitor/device',
      '@capacitor/filesystem', '@capacitor/haptics', '@capacitor/local-notifications',
      '@capacitor/network', '@capacitor/share', '@capacitor/splash-screen', '@capacitor/status-bar',
    ],
  },
  experimental: { ios: { spm: { packageOptions: { '@capacitor-firebase/messaging': { symlink: true } } } } },
  plugins: {
    ...config.plugins,
    SplashScreen: { ...config.plugins!.SplashScreen, launchShowDuration: 0 },
    // The storefront uses white surfaces in both system appearances.
    StatusBar: { ...config.plugins!.StatusBar, style: 'LIGHT' },
  },
} satisfies CapacitorConfig : config;
