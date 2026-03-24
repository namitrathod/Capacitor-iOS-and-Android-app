import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.splitkit',
  appName: 'SplitKit',
  webDir: 'dist/dxweb',
  /**
   * Native builds: omit `server` so the app loads bundled files from `webDir` after `ng build`.
   * Live reload only: uncomment and set to your dev machine, e.g.
   * server: { url: 'http://192.168.1.10:4200', cleartext: true },
   */
};

export default config;
