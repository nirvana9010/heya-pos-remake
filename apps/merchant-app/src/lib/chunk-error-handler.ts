/**
 * Chunk Error Handler - Phase 3 Build System Improvements
 * 
 * This module handles webpack chunk loading errors gracefully
 * to prevent the app from crashing when chunks fail to load.
 */

// Webpack chunk timeout configuration
declare global {
  interface Window {
    __webpack_require__?: any;
    __CHUNK_ERROR_HANDLER_ACTIVE__?: boolean;
  }
}

export function setupChunkErrorHandler() {
  if (typeof window === 'undefined') return;
  
  // Prevent multiple installations
  if (window.__CHUNK_ERROR_HANDLER_ACTIVE__) return;
  window.__CHUNK_ERROR_HANDLER_ACTIVE__ = true;

  // Increase webpack chunk load timeout (default is often too low)
  if (window.__webpack_require__ && window.__webpack_require__.l) {
    const originalLoader = window.__webpack_require__.l;
    window.__webpack_require__.l = function(url: string, done: any, key: any, chunkId: any) {
      // Set a longer timeout for chunk loading (30 seconds instead of default)
      const script = document.createElement('script');
      script.timeout = 30000;
      return originalLoader.call(this, url, done, key, chunkId);
    };
  }

  // Track failed chunks to avoid infinite loops
  const failedChunks = new Set<string>();
  const retryAttempts = new Map<string, number>();

  // Override webpack's chunk loading error handler
  const originalError = window.onerror;
  window.onerror = function (msg, source, lineno, colno, error) {
    // Check if this is a chunk loading error
    if (
      error?.name === 'ChunkLoadError' ||
      (typeof msg === 'string' && msg.includes('Loading chunk'))
    ) {
      console.warn('[ChunkErrorHandler] Chunk loading error detected:', error);

      // Extract chunk name from error
      const chunkMatch = error?.message?.match(/chunk (\S+) failed/);
      const chunkName = chunkMatch?.[1];

      if (chunkName && !failedChunks.has(chunkName)) {
        failedChunks.add(chunkName);

        // Show user-friendly notification
        showChunkErrorNotification();

        // Try to recover automatically
        const attempts = retryAttempts.get(chunkName) || 0;
        retryAttempts.set(chunkName, attempts + 1);
        
        if (attempts < 3) {
          console.log(`[ChunkErrorHandler] Attempting to retry chunk ${chunkName} (attempt ${attempts + 1}/3)`);
          
          // Clear webpack cache for this chunk if possible
          if (window.__webpack_require__ && window.__webpack_require__.cache) {
            delete window.__webpack_require__.cache[chunkName];
          }
          
          // Auto-reload after a short delay without confirmation
          setTimeout(() => {
            console.log('[ChunkErrorHandler] Auto-reloading page...');
            window.location.reload();
          }, 1500);
        } else {
          // After 3 attempts, ask user
          setTimeout(() => {
            if (window.confirm('Some resources failed to load after multiple attempts. Would you like to reload the page?')) {
              window.location.reload();
            }
          }, 2000);
        }

        // Prevent the error from propagating
        return true;
      }
    }

    // Call the original error handler for other errors
    if (originalError) {
      return originalError(msg, source, lineno, colno, error);
    }

    return false;
  };

  // Also handle unhandled promise rejections for dynamic imports
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason?.name === 'ChunkLoadError' ||
      event.reason?.message?.includes('Loading chunk') ||
      event.reason?.message?.includes('Failed to fetch dynamically imported module')
    ) {
      console.warn('[ChunkErrorHandler] Unhandled chunk loading rejection:', event.reason);
      event.preventDefault();
      
      // Extract chunk info and retry
      const chunkInfo = event.reason?.message || '';
      const chunkName = chunkInfo.match(/chunk ([\w\/.-]+)/)?.[1] || 'unknown';
      
      if (!failedChunks.has(chunkName)) {
        failedChunks.add(chunkName);
        const attempts = retryAttempts.get(chunkName) || 0;
        
        if (attempts < 2) {
          retryAttempts.set(chunkName, attempts + 1);
          showChunkErrorNotification();
          
          // Auto-reload for dynamic import failures
          setTimeout(() => {
            console.log('[ChunkErrorHandler] Auto-reloading due to dynamic import failure...');
            window.location.reload();
          }, 1500);
        }
      }
    }
  });
  
  // Add service worker update handler to clear cache on updates
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.addEventListener('updatefound', () => {
        console.log('[ChunkErrorHandler] Service worker update found, preparing for refresh...');
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // Clear caches and reload
              caches.keys().then(names => {
                Promise.all(names.map(name => caches.delete(name))).then(() => {
                  console.log('[ChunkErrorHandler] Caches cleared, reloading...');
                  window.location.reload();
                });
              });
            }
          });
        }
      });
    });
  }
}

function showChunkErrorNotification() {
  // Check if a notification is already showing
  if (document.getElementById('chunk-error-notification')) return;

  const notification = document.createElement('div');
  notification.id = 'chunk-error-notification';
  notification.className = 'chunk-error-notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 16px;
      max-width: 400px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <div style="display: flex; align-items: start; gap: 12px;">
        <svg style="flex-shrink: 0; width: 20px; height: 20px; color: #dc2626;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div style="flex: 1;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #991b1b;">
            Loading Error
          </h4>
          <p style="margin: 0; font-size: 14px; color: #7f1d1d;">
            Some resources couldn't be loaded. This might be due to network issues or cache problems.
          </p>
        </div>
        <button 
          onclick="this.closest('#chunk-error-notification').remove()"
          style="
            flex-shrink: 0;
            background: none;
            border: none;
            padding: 4px;
            cursor: pointer;
            color: #6b7280;
          "
        >
          <svg style="width: 16px; height: 16px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    notification.remove();
  }, 10000);
}

// Export a hook for React components to use
export function useChunkErrorRecovery() {
  // This could be expanded to provide component-level error recovery
  return {
    retryFailedImport: async (importFn: () => Promise<any>, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          return await importFn();
        } catch (error) {
          if (i === retries - 1) throw error;
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
      }
    }
  };
}