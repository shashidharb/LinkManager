import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { themeService, THEMES } from './themeService';

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme(); // Get system preference
  const [currentTheme, setCurrentTheme] = useState('blue');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [useSystemTheme, setUseSystemTheme] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThemeSettings();
  }, []);

  // Auto-update when system theme changes (if useSystemTheme is true)
  useEffect(() => {
    if (useSystemTheme) {
      setIsDarkMode(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, useSystemTheme]);

  const loadThemeSettings = async () => {
    try {
      const [theme, darkMode] = await Promise.all([
        themeService.getTheme(),
        themeService.getDarkMode(),
      ]);
      setCurrentTheme(theme);
      setIsDarkMode(darkMode);
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeTheme = async (themeName) => {
    setCurrentTheme(themeName);
    await themeService.setTheme(themeName);
  };

  const toggleDarkMode = async () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    setUseSystemTheme(false); // Disable auto when manually toggled
    await themeService.setDarkMode(newValue);
  };

  const setDarkMode = async (enabled) => {
    setIsDarkMode(enabled);
    setUseSystemTheme(false);
    await themeService.setDarkMode(enabled);
  };

  const colors = themeService.getThemeColors(currentTheme, isDarkMode);

  const value = {
    theme: currentTheme,
    isDarkMode,
    useSystemTheme,
    colors,
    changeTheme,
    toggleDarkMode,
    setDarkMode,
    allThemes: themeService.getAllThemes(),
  };

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
