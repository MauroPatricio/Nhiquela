import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'nhiquela',
  webDir: 'build',
  server: {
    androidScheme: 'https://192.168.5.81:3000',
    cleartext: true
  }
};

export default config;
