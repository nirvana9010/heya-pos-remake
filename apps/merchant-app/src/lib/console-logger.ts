// Console logger that saves browser logs to a file
export function initializeConsoleLogger() {
  if (typeof window === 'undefined') return;

  // Store original console methods
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  // Buffer to batch logs
  let logBuffer: any[] = [];
  let flushTimer: NodeJS.Timeout | null = null;

  // Function to send logs to server
  const sendLogs = async () => {
    if (logBuffer.length === 0) return;
    
    const logsToSend = [...logBuffer];
    logBuffer = [];

    try {
      await fetch('/api/console-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: logsToSend }),
      });
    } catch (error) {
      // Restore logs to buffer if send failed
      logBuffer = [...logsToSend, ...logBuffer];
    }
  };

  // Function to queue log for sending
  const queueLog = (type: string, args: any[]) => {
    const log = {
      type,
      timestamp: new Date().toISOString(),
      message: args.map(arg => {
        if (typeof arg === 'object') {
          try {
            // Special handling for Error objects
            if (arg instanceof Error) {
              return JSON.stringify({
                name: arg.name,
                message: arg.message,
                stack: arg.stack,
                ...arg // Include any additional properties
              }, null, 2);
            }
            // For Axios errors, extract relevant details
            if (arg?.isAxiosError) {
              return JSON.stringify({
                message: arg.message,
                status: arg.response?.status,
                statusText: arg.response?.statusText,
                data: arg.response?.data,
                url: arg.config?.url,
                method: arg.config?.method
              }, null, 2);
            }
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' '),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    logBuffer.push(log);

    // Clear existing timer
    if (flushTimer) clearTimeout(flushTimer);
    
    // Set new timer to flush logs after 1 second
    flushTimer = setTimeout(sendLogs, 1000);
  };

  // Override console methods
  console.log = function(...args: any[]) {
    originalLog.apply(console, args);
    queueLog('log', args);
  };

  console.error = function(...args: any[]) {
    originalError.apply(console, args);
    queueLog('error', args);
  };

  console.warn = function(...args: any[]) {
    originalWarn.apply(console, args);
    queueLog('warn', args);
  };

  console.info = function(...args: any[]) {
    originalInfo.apply(console, args);
    queueLog('info', args);
  };

  // Send logs before page unload
  window.addEventListener('beforeunload', () => {
    if (logBuffer.length > 0) {
      // Use sendBeacon for reliability
      navigator.sendBeacon('/api/console-logs', JSON.stringify({ logs: logBuffer }));
    }
  });

  console.log('[Console Logger] Initialized - logs will be sent to server');
}