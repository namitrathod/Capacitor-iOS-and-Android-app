import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.namit.splitkit',
  appName: 'SplitKit',
  webDir: 'dist/dxweb',
  // Keep Android WebView on secure defaults for Play production builds.
  android: {
    allowMixedContent: false,
  },
  /**
   * Native builds: omit `server.url` so the app loads bundled files from `webDir` after `ng build`.
   * Live reload only: set server.url to your dev machine, e.g. http://192.168.1.10:4200
   */
};

export default config;
