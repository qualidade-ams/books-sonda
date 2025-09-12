/**
 * Utility functions for implementing retry logic with exponential backoff
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT') {
      return true;
    }
    
    // Retry on HTTP 5xx errors
    if (error?.status >= 500 && error?.status < 600) {
      return true;
    }
    
    // Retry on specific Supabase errors
    if (error?.code === 'PGRST301' || error?.code === 'PGRST302') {
      return true;
    }
    
    // Don't retry on authentication or permission errors
    if (error?.code === 'PGRST116' || error?.code === 'PGRST103') {
      return false;
    }
    
    return false;
  }
};

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;
  
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if condition fails
      if (finalConfig.retryCondition && !finalConfig.retryCondition(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === finalConfig.maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff and jitter
      const baseDelay = finalConfig.baseDelay * Math.pow(finalConfig.backoffFactor, attempt);
      const jitter = Math.random() * 0.1 * baseDelay; // Add up to 10% jitter
      const delay = Math.min(baseDelay + jitter, finalConfig.maxDelay);
      
      console.warn(`Operation failed (attempt ${attempt + 1}/${finalConfig.maxRetries + 1}), retrying in ${Math.round(delay)}ms:`, error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Create a retry wrapper for a function
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config: Partial<RetryConfig> = {}
): T {
  return ((...args: Parameters<T>) => {
    return retryWithBackoff(() => fn(...args), config);
  }) as T;
}

/**
 * Specific retry configurations for different types of operations
 */
export const RETRY_CONFIGS = {
  // For critical permission operations
  permissions: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2
  },
  
  // For data loading operations
  dataLoading: {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 3000,
    backoffFactor: 2
  },
  
  // For user actions (more aggressive retry)
  userActions: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 8000,
    backoffFactor: 1.5
  }
} as const;

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  return DEFAULT_RETRY_CONFIG.retryCondition?.(error) ?? false;
}

/**
 * Get a human-readable description of retry status
 */
export function getRetryStatusMessage(attempt: number, maxRetries: number, delay: number): string {
  if (attempt === 0) {
    return 'Tentando conectar...';
  }
  
  const remaining = maxRetries - attempt;
  if (remaining > 0) {
    return `Tentativa ${attempt + 1} de ${maxRetries + 1}. Tentando novamente em ${Math.round(delay / 1000)}s...`;
  }
  
  return 'Última tentativa...';
}