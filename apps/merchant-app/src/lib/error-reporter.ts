/**
 * Error Reporter - Phase 3 Build System Improvements
 * 
 * Captures and reports errors for monitoring and debugging.
 * In production, this would integrate with services like Sentry.
 */

interface ErrorReport {
  message: string;
  stack?: string;
  source?: string;
  timestamp: Date;
  userAgent: string;
  url: string;
  componentStack?: string;
  metadata?: Record<string, any>;
}

class ErrorReporter {
  private queue: ErrorReport[] = [];
  private isProduction = process.env.NODE_ENV === 'production';
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.setupGlobalHandlers();
    }
  }
  
  private setupGlobalHandlers() {
    // Handle unhandled errors
    window.addEventListener('error', (event) => {
      this.report({
        message: event.message,
        stack: event.error?.stack,
        source: `${event.filename}:${event.lineno}:${event.colno}`,
        metadata: {
          type: 'unhandled-error',
        },
      });
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.report({
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        metadata: {
          type: 'unhandled-rejection',
          reason: event.reason,
        },
      });
    });
  }
  
  report(error: Partial<ErrorReport>) {
    const report: ErrorReport = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      source: error.source,
      timestamp: new Date(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      componentStack: error.componentStack,
      metadata: error.metadata,
    };
    
    // In development, log to console
    if (!this.isProduction) {
      console.error('[ErrorReporter]', report);
      return;
    }
    
    // In production, queue for batch sending
    this.queue.push(report);
    
    // Send immediately for critical errors
    if (this.isCriticalError(report)) {
      this.flush();
    } else if (this.queue.length >= 10) {
      // Batch send when queue is full
      this.flush();
    }
  }
  
  reportError(error: Error, metadata?: Record<string, any>) {
    this.report({
      message: error.message,
      stack: error.stack,
      metadata,
    });
  }
  
  reportComponentError(
    error: Error,
    componentStack: string,
    errorInfo?: React.ErrorInfo
  ) {
    this.report({
      message: error.message,
      stack: error.stack,
      componentStack,
      metadata: {
        type: 'react-error',
        componentStack: errorInfo?.componentStack,
      },
    });
  }
  
  private isCriticalError(report: ErrorReport): boolean {
    // Determine if error is critical based on patterns
    const criticalPatterns = [
      'ChunkLoadError',
      'NetworkError',
      'SecurityError',
      'TypeError: Cannot read',
      'ReferenceError',
    ];
    
    return criticalPatterns.some(pattern => 
      report.message.includes(pattern) || 
      report.stack?.includes(pattern)
    );
  }
  
  private async flush() {
    if (this.queue.length === 0) return;
    
    const reports = [...this.queue];
    this.queue = [];
    
    try {
      // In production, this would send to your error tracking service
      if (this.isProduction) {
        await fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reports }),
        });
      }
    } catch (error) {
      // Failed to send, re-queue for retry
      this.queue.unshift(...reports);
    }
  }
  
  // Performance monitoring
  measurePerformance(name: string, fn: () => void) {
    const start = performance.now();
    try {
      fn();
    } finally {
      const duration = performance.now() - start;
      if (duration > 1000) {
        this.report({
          message: `Slow operation: ${name}`,
          metadata: {
            type: 'performance',
            operation: name,
            duration,
          },
        });
      }
    }
  }
  
  // Build-time error tracking
  trackBuildError(error: any) {
    // This would be called during build process
    this.report({
      message: error.message || 'Build error',
      stack: error.stack,
      metadata: {
        type: 'build-error',
        phase: 'build',
        ...error,
      },
    });
  }
}

// Singleton instance
export const errorReporter = new ErrorReporter();

// React Error Boundary integration
export function useErrorReporter() {
  return {
    reportError: (error: Error, metadata?: Record<string, any>) => {
      errorReporter.reportError(error, metadata);
    },
    reportComponentError: (
      error: Error,
      componentStack: string,
      errorInfo?: React.ErrorInfo
    ) => {
      errorReporter.reportComponentError(error, componentStack, errorInfo);
    },
  };
}