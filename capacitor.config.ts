import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.novalane.game',
  appName: 'Nova Lane',
  webDir: 'dist',
  backgroundColor: '#070916',
  android: {
    allowMixedContent: false,
    captureInput: true
  }
};

export default config;
