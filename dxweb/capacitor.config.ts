import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.splitkit',
  appName: 'SplitKit',
  webDir: 'dist/dxweb',
  server: {
    // Dev only: point to your machine IP + dev server port. Remove `server` for store builds.
    url: 'http://10.0.0.155:4200',
    cleartext: true,
  },
};

export default config;
