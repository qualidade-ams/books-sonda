/**
 * Performance optimization utilities for the permissions system
 */

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import type { UserPermissions, PermissionLevel } from '@/types/permissions';

/**
 * Debounce function to limit the rate of function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Throttle function to limit function execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memoized permission checker for optimal performance
 */
export function createPermissionChecker(permissions: UserPermissions) {
  // Create a Map for O(1) lookups
  const permissionMap = new Map<string, PermissionLevel>(
    Object.entries(permissions)
  );

  return {
    hasPermission: (screenKey: string, requiredLevel: PermissionLevel): boolean => {
      const userLevel = permissionMap.get(screenKey);
      
      if (!userLevel || userLevel === 'none') {
        return false;
      }
      
      if (requiredLevel === 'view') {
        return userLevel === 'view' || userLevel === 'edit';
      }
      
      if (requiredLevel === 'edit') {
        return userLevel === 'edit';
      }
      
      return false;
    },
    
    getPermissionLevel: (screenKey: string): PermissionLevel => {
      return permissionMap.get(screenKey) || 'none';
    },
    
    getAllowedScreens: (requiredLevel: PermissionLevel): string[] => {
      const allowedScreens: string[] = [];
      
      for (const [screenKey, userLevel] of permissionMap) {
        if (userLevel === 'none') continue;
        
        if (requiredLevel === 'view' && (userLevel === 'view' || userLevel === 'edit')) {
          allowedScreens.push(screenKey);
        } else if (requiredLevel === 'edit' && userLevel === 'edit') {
          allowedScreens.push(screenKey);
        }
      }
      
      return allowedScreens;
    }
  };
}

/**
 * Hook for memoized permission checking
 */
export function usePermissionChecker(permissions: UserPermissions) {
  return useMemo(() => createPermissionChecker(permissions), [permissions]);
}

/**
 * Hook for debounced permission refresh
 */
export function useDebouncedPermissionRefresh(
  refreshFunction: () => Promise<void>,
  delay: number = 300
) {
  const debouncedRefresh = useCallback(
    debounce(refreshFunction, delay),
    [refreshFunction, delay]
  );
  
  return debouncedRefresh;
}

/**
 * Hook for throttled permission updates
 */
export function useThrottledPermissionUpdate(
  updateFunction: (permissions: UserPermissions) => void,
  limit: number = 1000
) {
  const throttledUpdate = useCallback(
    throttle(updateFunction, limit),
    [updateFunction, limit]
  );
  
  return throttledUpdate;
}

/**
 * Batch permission operations for better performance
 */
export class PermissionBatcher {
  private operations: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private batchTimeout: NodeJS.Timeout | null = null;
  
  constructor(private batchDelay: number = 100) {}
  
  add(operation: () => Promise<void>): void {
    this.operations.push(operation);
    this.scheduleBatch();
  }
  
  private scheduleBatch(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.batchDelay);
  }
  
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.operations.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    const currentOperations = [...this.operations];
    this.operations = [];
    
    try {
      await Promise.all(currentOperations.map(op => op()));
    } catch (error) {
      console.error('Error processing permission batch:', error);
    } finally {
      this.isProcessing = false;
      
      // Process any operations that were added during processing
      if (this.operations.length > 0) {
        this.scheduleBatch();
      }
    }
  }
  
  async flush(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    await this.processBatch();
  }
}

/**
 * Hook for batched permission operations
 */
export function usePermissionBatcher(batchDelay: number = 100) {
  const batcherRef = useRef<PermissionBatcher>();
  
  if (!batcherRef.current) {
    batcherRef.current = new PermissionBatcher(batchDelay);
  }
  
  useEffect(() => {
    return () => {
      batcherRef.current?.flush();
    };
  }, []);
  
  return batcherRef.current;
}

/**
 * Lazy loading utility for permission-related components
 */
export function createLazyPermissionComponent<T extends React.ComponentType<any>>(
  importFunction: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const LazyComponent = React.lazy(importFunction);
  
  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => {
    const FallbackComponent = fallback;
    return React.createElement(
      React.Suspense,
      { 
        fallback: FallbackComponent 
          ? React.createElement(FallbackComponent) 
          : React.createElement('div', null, 'Loading...') 
      },
      React.createElement(LazyComponent, { ...props, ref } as any)
    );
  });
}

/**
 * Memory-efficient permission cache
 */
export class PermissionCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private cleanupInterval: NodeJS.Timeout;
  
  constructor(private defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }
  
  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  has(key: string): boolean {
    return this.get(key) !== null;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
  
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
  
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl
      }))
    };
  }
}

/**
 * Hook for permission caching
 */
export function usePermissionCache(ttl?: number) {
  const cacheRef = useRef<PermissionCache>();
  
  if (!cacheRef.current) {
    cacheRef.current = new PermissionCache(ttl);
  }
  
  useEffect(() => {
    return () => {
      cacheRef.current?.destroy();
    };
  }, []);
  
  return cacheRef.current;
}

/**
 * Virtual scrolling utility for large permission lists
 */
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);
  
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);
  
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop,
    visibleRange
  };
}

/**
 * Performance monitoring utility
 */
export class PermissionPerformanceMonitor {
  private metrics = new Map<string, number[]>();
  
  startTiming(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, []);
      }
      
      const operationMetrics = this.metrics.get(operation)!;
      operationMetrics.push(duration);
      
      // Keep only last 100 measurements
      if (operationMetrics.length > 100) {
        operationMetrics.shift();
      }
    };
  }
  
  getMetrics(operation: string) {
    const measurements = this.metrics.get(operation) || [];
    
    if (measurements.length === 0) {
      return null;
    }
    
    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((a, b) => a + b, 0);
    
    return {
      count: measurements.length,
      average: sum / measurements.length,
      median: sorted[Math.floor(sorted.length / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
  
  getAllMetrics() {
    const result: Record<string, any> = {};
    
    for (const [operation] of this.metrics) {
      result[operation] = this.getMetrics(operation);
    }
    
    return result;
  }
  
  clear(): void {
    this.metrics.clear();
  }
}

/**
 * Hook for performance monitoring
 */
export function usePermissionPerformanceMonitor() {
  const monitorRef = useRef<PermissionPerformanceMonitor>();
  
  if (!monitorRef.current) {
    monitorRef.current = new PermissionPerformanceMonitor();
  }
  
  return monitorRef.current;
}

/**
 * Optimized permission comparison utility
 */
export function comparePermissions(
  oldPermissions: UserPermissions,
  newPermissions: UserPermissions
): {
  added: string[];
  removed: string[];
  changed: string[];
  unchanged: string[];
} {
  const oldKeys = new Set(Object.keys(oldPermissions));
  const newKeys = new Set(Object.keys(newPermissions));
  
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  const unchanged: string[] = [];
  
  // Check for added and changed permissions
  for (const key of newKeys) {
    if (!oldKeys.has(key)) {
      added.push(key);
    } else if (oldPermissions[key] !== newPermissions[key]) {
      changed.push(key);
    } else {
      unchanged.push(key);
    }
  }
  
  // Check for removed permissions
  for (const key of oldKeys) {
    if (!newKeys.has(key)) {
      removed.push(key);
    }
  }
  
  return { added, removed, changed, unchanged };
}

/**
 * Efficient permission filtering utility
 */
export function filterPermissionsByLevel(
  permissions: UserPermissions,
  level: PermissionLevel
): string[] {
  const result: string[] = [];
  
  for (const [screenKey, userLevel] of Object.entries(permissions)) {
    if (level === 'view' && (userLevel === 'view' || userLevel === 'edit')) {
      result.push(screenKey);
    } else if (level === 'edit' && userLevel === 'edit') {
      result.push(screenKey);
    } else if (level === 'none' && userLevel === 'none') {
      result.push(screenKey);
    }
  }
  
  return result;
}

/**
 * Batch permission validation utility
 */
export function validatePermissionsBatch(
  permissions: UserPermissions,
  checks: Array<{ screenKey: string; requiredLevel: PermissionLevel }>
): Record<string, boolean> {
  const checker = createPermissionChecker(permissions);
  const results: Record<string, boolean> = {};
  
  for (const check of checks) {
    const key = `${check.screenKey}:${check.requiredLevel}`;
    results[key] = checker.hasPermission(check.screenKey, check.requiredLevel);
  }
  
  return results;
}