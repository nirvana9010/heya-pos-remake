/**
 * Performance utilities for optimizing heavy operations
 */

/**
 * Process data in chunks to avoid blocking the main thread
 */
export function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => R,
  chunkSize: number = 50,
  onProgress?: (processed: number, total: number) => void
): Promise<R[]> {
  return new Promise((resolve) => {
    const results: R[] = [];
    let currentIndex = 0;

    function processChunk() {
      const endIndex = Math.min(currentIndex + chunkSize, items.length);
      
      for (let i = currentIndex; i < endIndex; i++) {
        results.push(processor(items[i]));
      }
      
      currentIndex = endIndex;
      
      if (onProgress) {
        onProgress(currentIndex, items.length);
      }
      
      if (currentIndex < items.length) {
        // Process next chunk in next frame
        requestAnimationFrame(processChunk);
      } else {
        resolve(results);
      }
    }
    
    // Start processing
    requestAnimationFrame(processChunk);
  });
}

/**
 * Debounce function for search and filter operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Defer heavy computations until browser is idle
 */
export function deferredComputation<T>(
  computation: () => T,
  fallback?: T
): Promise<T> {
  return new Promise((resolve) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(
        () => resolve(computation()),
        { timeout: 2000 } // Max wait time
      );
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => resolve(computation()), 0);
    }
  });
}

/**
 * Lazy load data with progress tracking
 */
export async function lazyLoadData<T>(
  loader: () => Promise<T>,
  options?: {
    onStart?: () => void;
    onComplete?: (data: T) => void;
    onError?: (error: Error) => void;
    timeout?: number;
  }
): Promise<T> {
  const { onStart, onComplete, onError, timeout = 10000 } = options || {};
  
  if (onStart) onStart();
  
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Load timeout')), timeout);
    });
    
    const data = await Promise.race([loader(), timeoutPromise]);
    
    if (onComplete) onComplete(data);
    return data;
  } catch (error) {
    if (onError) onError(error as Error);
    throw error;
  }
}

/**
 * Memoize expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    // Limit cache size
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
}

/**
 * Virtual scrolling helper for large lists
 */
export function getVisibleItems<T>(
  items: T[],
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  overscan: number = 3
): { visibleItems: T[]; startIndex: number; endIndex: number } {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  return {
    visibleItems: items.slice(startIndex, endIndex + 1),
    startIndex,
    endIndex,
  };
}