import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Verificar tema salvo no localStorage
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
    }

    // Função para aplicar o tema
    const applyTheme = (currentTheme: Theme) => {
      let shouldBeDark = false;

      if (currentTheme === 'dark') {
        shouldBeDark = true;
      } else if (currentTheme === 'light') {
        shouldBeDark = false;
      } else {
        // system
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      setResolvedTheme(shouldBeDark ? 'dark' : 'light');

      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Aplicar tema inicial
    applyTheme(savedTheme || 'system');

    // Listener para mudanças na preferência do sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme]);

  const setThemeAndSave = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // Aplicar tema imediatamente
    let shouldBeDark = false;
    if (newTheme === 'dark') {
      shouldBeDark = true;
    } else if (newTheme === 'light') {
      shouldBeDark = false;
    } else {
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    setResolvedTheme(shouldBeDark ? 'dark' : 'light');

    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return {
    theme,
    resolvedTheme,
    setTheme: setThemeAndSave,
    toggleTheme: () => {
      const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
      setThemeAndSave(newTheme);
    }
  };
};