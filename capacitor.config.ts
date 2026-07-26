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

export default config;
