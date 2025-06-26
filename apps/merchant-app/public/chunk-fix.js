// Aggressive chunk error fix
(function() {
  if (typeof window === 'undefined') return;
  
  // Override webpack public path
  if (window.__webpack_public_path__) {
    window.__webpack_public_path__ = '/_next/';
  }
  
  // Patch webpack require to handle chunk errors
  if (window.__webpack_require__) {
    const originalE = window.__webpack_require__.e;
    
    window.__webpack_require__.e = function(chunkId) {
      return originalE.call(this, chunkId).catch(function(error) {
        console.warn('[ChunkFix] Retrying chunk:', chunkId, error);
        
        // Clear the failed chunk from cache
        if (window.__webpack_require__.cache) {
          delete window.__webpack_require__.cache[chunkId];
        }
        
        // Force reload on chunk error
        if (error.name === 'ChunkLoadError' && !window.__chunk_reload_attempted) {
          window.__chunk_reload_attempted = true;
          console.log('[ChunkFix] Reloading page due to chunk error...');
          setTimeout(() => window.location.reload(), 100);
        }
        
        throw error;
      });
    };
  }
})();