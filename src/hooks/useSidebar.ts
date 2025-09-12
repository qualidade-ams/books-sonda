import { useState, useEffect } from 'react';

const SIDEBAR_STORAGE_KEY = 'admin-sidebar-collapsed';

export const useSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored ? JSON.parse(stored) : false;
  });

  const toggle = () => {
    setIsCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(newValue));
      return newValue;
    });
  };

  return {
    isCollapsed,
    toggle
  };
};