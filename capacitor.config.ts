import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lasmith1689.SlidingStars',
  appName: 'Sliding Stars',
  webDir: 'dist',
  backgroundColor: '#071225',
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    allowsLinkPreview: false,
    preferredContentMode: 'mobile',
  },
};

export default config;
