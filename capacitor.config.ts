import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dailyvibequest.app',
  appName: 'daily-vibe-quest',
  webDir: 'dist',
  server: {
    url: 'https://2c588c7a-e9e9-4d3f-b2dd-79a1b8546184.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
