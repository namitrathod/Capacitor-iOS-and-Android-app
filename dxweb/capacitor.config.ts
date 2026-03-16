import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.dxweb',
  appName: 'DxWeb',
  webDir: 'dist/dxweb',
  server: {
    // Load app from PC so WebView can reach backend (run: npm run serve:mobile)
    url: 'http://10.0.0.155:4200',
    cleartext: true,
  },
};

export default config;
