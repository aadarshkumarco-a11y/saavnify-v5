import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saavnify.app',
  appName: 'SAAVNIFY',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
  },
  android: {
    backgroundColor: '#090909',
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
