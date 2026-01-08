import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme definitions
export const THEMES = {
  blue: {
    name: 'Ocean Blue',
    primary: '#4F46E5',
    primaryDark: '#4338CA',
    secondary: '#818CF8',
    accent: '#6366F1',
    background: '#F3F4F6',
    surface: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
  },
  purple: {
    name: 'Royal Purple',
    primary: '#9333EA',
    primaryDark: '#7E22CE',
    secondary: '#C084FC',
    accent: '#A855F7',
    background: '#FAF5FF',
    surface: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E9D5FF',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
  },
  green: {
    name: 'Forest Green',
    primary: '#059669',
    primaryDark: '#047857',
    secondary: '#34D399',
    accent: '#10B981',
    background: '#F0FDF4',
    surface: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#D1FAE5',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
  },
};

// Dark mode color overrides (works with any theme)
export const DARK_MODE_OVERRIDES = {
  background: '#111827',
  surface: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  border: '#374151',
};

const THEME_KEY = '@app_theme';
const DARK_MODE_KEY = '@app_dark_mode';

export const themeService = {
  // Get current theme
  async getTheme() {
    try {
      const theme = await AsyncStorage.getItem(THEME_KEY);
      return theme || 'blue';
    } catch (error) {
      console.error('Error getting theme:', error);
      return 'blue';
    }
  },

  // Set theme
  async setTheme(themeName) {
    try {
      await AsyncStorage.setItem(THEME_KEY, themeName);
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  },

  // Get dark mode setting
  async getDarkMode() {
    try {
      const darkMode = await AsyncStorage.getItem(DARK_MODE_KEY);
      return darkMode === 'true';
    } catch (error) {
      console.error('Error getting dark mode:', error);
      return false;
    }
  },

  // Set dark mode
  async setDarkMode(enabled) {
    try {
      await AsyncStorage.setItem(DARK_MODE_KEY, enabled.toString());
    } catch (error) {
      console.error('Error setting dark mode:', error);
    }
  },

  // Get theme colors (with dark mode applied if enabled)
  getThemeColors(themeName, isDarkMode) {
    const theme = THEMES[themeName] || THEMES.blue;
    
    if (isDarkMode) {
      return {
        ...theme,
        ...DARK_MODE_OVERRIDES,
      };
    }
    
    return theme;
  },

  // Get all available themes
  getAllThemes() {
    return Object.keys(THEMES).map(key => ({
      id: key,
      name: THEMES[key].name,
      colors: THEMES[key],
    }));
  },
};
