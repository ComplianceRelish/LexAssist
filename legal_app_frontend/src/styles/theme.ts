// legal_app_frontend/src/styles/theme.ts

interface ThemeColors {
  primary: {
    main: string;
    light: string;
    dark: string;
  };
  accent: {
    main: string;
    light: string;
    dark: string;
  };
  background: {
    default: string;
    paper: string;
    dark: string;
  };
  text: {
    primary: string;
    secondary: string;
    light: string;
    muted: string;
  };
  border: {
    light: string;
    main: string;
    dark: string;
  };
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

interface ThemeTypography {
  fontFamily: {
    body: string;
    heading: string;
  };
  fontWeights: {
    light: number;
    regular: number;
    medium: number;
    semiBold: number;
    bold: number;
  };
  sizes: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
  };
}

interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
}

interface ThemeBorders {
  radius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
}

interface ThemeShadows {
  sm: string;
  md: string;
  lg: string;
  inner: string;
}

interface ThemeTransitions {
  default: string;
  fast: string;
  slow: string;
}

interface ThemeZIndices {
  base: number;
  dropdown: number;
  sticky: number;
  fixed: number;
  modalBackdrop: number;
  modal: number;
  popover: number;
  tooltip: number;
}

export interface Theme {
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borders: ThemeBorders;
  shadows: ThemeShadows;
  transitions: ThemeTransitions;
  zIndices: ThemeZIndices;
}

export const lexAssistTheme: Theme = {
  colors: {
    primary: {
      main: '#0D3B59',      // Primary dark blue
      light: '#155A7C',     // Secondary blue
      dark: '#092C43',      // Darker variant
    },
    accent: {
      main: '#FFBB33',      // Accent gold
      light: '#FFCB5C',     // Lighter gold
      dark: '#E6A61F',      // Darker gold
    },
    background: {
      default: '#F5F0E5',   // Updated to beige background to match logo
      paper: '#FFFFFF',     // Paper/card background
      dark: '#E8E3D8',      // Slightly darker beige for contrast
    },
    text: {
      primary: '#2C3E50',   // Primary text
      secondary: '#546E7A', // Secondary text
      light: '#FFFFFF',     // Light text (on dark backgrounds)
      muted: '#90A4AE',     // Muted text
    },
    border: {
      light: '#E0E0E0',
      main: '#BDBDBD',
      dark: '#9E9E9E',
    },
    status: {
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      info: '#2196F3',
    }
  },
  typography: {
    fontFamily: {
      body: "'Inter', 'Roboto', sans-serif",
      heading: "'Libre Baskerville', 'Times New Roman', serif",
    },
    fontWeights: {
      light: 300,
      regular: 400,
      medium: 500,
      semiBold: 600,
      bold: 700,
    },
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
    },
  },
  spacing: {
    xs: '0.25rem',      // 4px 
    sm: '0.5rem',       // 8px
    md: '1rem',         // 16px
    lg: '1.5rem',       // 24px
    xl: '2rem',         // 32px
    '2xl': '2.5rem',    // 40px
    '3xl': '3rem',      // 48px
  },
  borders: {
    radius: {
      sm: '0.25rem',    // 4px
      md: '0.5rem',     // 8px
      lg: '1rem',       // 16px
      full: '9999px',   // Circle/Pill
    },
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    md: '0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
    lg: '0 10px 25px rgba(0,0,0,0.1), 0 5px 10px rgba(0,0,0,0.05)',
    inner: 'inset 0 2px 4px 0 rgba(0,0,0,0.06)',
  },
  transitions: {
    default: 'all 0.2s ease-in-out',
    fast: 'all 0.1s ease-in-out',
    slow: 'all 0.3s ease-in-out',
  },
  zIndices: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  }
};

export default lexAssistTheme;
