/**
 * Development Performance Monitor - Phase 3 Build System Improvements
 * 
 * This module provides performance monitoring tools for development
 * to help identify bottlenecks and optimize the application.
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class DevPerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled: boolean = process.env.NODE_ENV === 'development';

  /**
   * Start measuring a performance metric
   */
  start(name: string, metadata?: Record<string, any>) {
    if (!this.enabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  /**
   * End measuring a performance metric
   */
  end(name: string) {
    if (!this.enabled) return;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`[DevPerformanceMonitor] No metric found for: ${name}`);
      return;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    // Log slow operations
    if (metric.duration > 100) {
      console.warn(
        `[DevPerformanceMonitor] Slow operation detected: ${name} took ${metric.duration.toFixed(2)}ms`,
        metric.metadata
      );
    }

    return metric.duration;
  }

  /**
   * Measure a function's execution time
   */
  async measure<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    if (!this.enabled) return fn();

    this.start(name);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return Array.from(this.metrics.values()).filter(m => m.duration !== undefined);
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
  }

  /**
   * Log a summary of all metrics
   */
  logSummary() {
    if (!this.enabled) return;

    const metrics = this.getMetrics();
    if (metrics.length === 0) return;

    console.group('[DevPerformanceMonitor] Performance Summary');
    
    // Sort by duration
    metrics.sort((a, b) => (b.duration || 0) - (a.duration || 0));

    // Log table
    console.table(
      metrics.map(m => ({
        Operation: m.name,
        Duration: `${m.duration?.toFixed(2)}ms`,
        Metadata: JSON.stringify(m.metadata || {}),
      }))
    );

    // Log total time
    const totalTime = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    console.log(`Total time: ${totalTime.toFixed(2)}ms`);

    console.groupEnd();
  }
}

// Singleton instance
export const devPerformance = new DevPerformanceMonitor();

// React hook for component performance monitoring
export function usePerformanceMonitor(componentName: string) {
  if (process.env.NODE_ENV !== 'development') {
    return {
      measureRender: () => {},
      measureEffect: (effectName: string, fn: () => void) => fn(),
      measureAsync: async (operationName: string, fn: () => Promise<any>) => fn(),
    };
  }

  return {
    measureRender: () => {
      devPerformance.start(`${componentName}.render`);
      // This will be called in useEffect
      return () => devPerformance.end(`${componentName}.render`);
    },

    measureEffect: (effectName: string, fn: () => void) => {
      devPerformance.start(`${componentName}.${effectName}`);
      fn();
      devPerformance.end(`${componentName}.${effectName}`);
    },

    measureAsync: async (operationName: string, fn: () => Promise<any>) => {
      return devPerformance.measure(`${componentName}.${operationName}`, fn);
    },
  };
}

// Web Vitals monitoring for development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Monitor long tasks
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 50) {
        // Long task detected - logging removed to reduce console clutter
      }
    }
  });

  observer.observe({ entryTypes: ['longtask'] });

  // Monitor layout shifts
  const layoutShiftObserver = new PerformanceObserver((list) => {
    let cls = 0;
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        cls += (entry as any).value;
      }
    }
    if (cls > 0.1) {
      console.warn('[DevPerformanceMonitor] High CLS detected:', cls);
    }
  });

  layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
}