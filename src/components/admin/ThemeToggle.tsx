import React from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const ThemeToggle = () => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-9 h-9 p-0 hover:bg-gray-100 dark:hover:bg-sonda-gray2 transition-colors"
      title={resolvedTheme === 'dark' ? 'Modo claro' : 'Modo escuro'}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4 transition-all text-yellow-500" />
      ) : (
        <Moon className="h-4 w-4 transition-all text-gray-600 dark:text-sonda-gray3" />
      )}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
};

export default ThemeToggle;