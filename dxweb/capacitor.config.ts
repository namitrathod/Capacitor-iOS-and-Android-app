import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.namit.splitkit',
  appName: 'SplitKit',
  webDir: 'dist/dxweb',
  /**
   * Android WebView uses https://localhost for the app by default. Calls to http:// (e.g. EC2 API) are
   * mixed content and get blocked unless this is true. Chrome typing the docs URL still works without it.
   */
  android: {
    allowMixedContent: true,
  },
  /**
   * Default is https://localhost — XHR to http://EC2 is mixed content and often blocked.
   * http scheme makes the app origin http://localhost so http API calls are allowed.
   */
  server: {
    androidScheme: 'http',
  },
  /**
   * Native builds: omit `server.url` so the app loads bundled files from `webDir` after `ng build`.
   * Live reload only: set server.url to your dev machine, e.g. http://192.168.1.10:4200
   */
};

export default config;
