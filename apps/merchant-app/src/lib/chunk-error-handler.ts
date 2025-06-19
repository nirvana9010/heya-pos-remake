/**
 * Chunk Error Handler - Phase 3 Build System Improvements
 * 
 * This module handles webpack chunk loading errors gracefully
 * to prevent the app from crashing when chunks fail to load.
 */

export function setupChunkErrorHandler() {
  if (typeof window === 'undefined') return;

  // Track failed chunks to avoid infinite loops
  const failedChunks = new Set<string>();

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

        // Try to recover by reloading the page after a delay
        setTimeout(() => {
          if (window.confirm('Some resources failed to load. Would you like to reload the page?')) {
            window.location.reload();
          }
        }, 2000);

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
      event.reason?.message?.includes('Loading chunk')
    ) {
      console.warn('[ChunkErrorHandler] Unhandled chunk loading rejection:', event.reason);
      event.preventDefault();
      showChunkErrorNotification();
    }
  });
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