// legal_app_frontend/src/styles/theme.ts
import { extendTheme, ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const colors = {
  brand: {
    50: '#e6f2ff',
    100: '#b3d9ff',
    200: '#80bfff',
    300: '#4da6ff',
    400: '#1a8cff',
    500: '#0073e6',
    600: '#0059b3',
    700: '#004080',
    800: '#00264d',
    900: '#000d1a',
  },
};

const theme = extendTheme({ 
  colors, 
  config,
  // You can add more theme customizations here
});

export default theme;