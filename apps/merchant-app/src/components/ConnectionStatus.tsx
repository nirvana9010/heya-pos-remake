import React from 'react';
import { ConnectionStatus as Status } from '@/hooks/useRobustWebSocket';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface ConnectionStatusProps {
  status: Status;
  onReconnect?: () => void;
  className?: string;
}

/**
 * Visual indicator for WebSocket connection status
 * Shows users exactly what's happening with real-time updates
 */
export function ConnectionStatus({ status, onReconnect, className = '' }: ConnectionStatusProps) {
  const getStatusColor = () => {
    switch (status.state) {
      case 'CONNECTED':
        return 'text-green-500';
      case 'INITIALIZING':
      case 'RECONNECTING':
        return 'text-yellow-500';
      case 'DEGRADED':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };
  
  const getTooltipContent = () => {
    let content = (
      <div className="space-y-2">
        <div className="font-semibold">{status.message}</div>
        
        {status.state === 'CONNECTED' && status.lastHeartbeat && (
          <div className="text-xs text-gray-400">
            Last verified: {new Date(status.lastHeartbeat).toLocaleTimeString()}
          </div>
        )}
        
        {status.state === 'RECONNECTING' && (
          <div className="text-xs">
            Attempt {status.reconnectAttempt} of {status.maxReconnectAttempts}
          </div>
        )}
        
        {status.state === 'DEGRADED' && (
          <>
            <div className="text-xs text-yellow-400">
              Real-time updates are temporarily unavailable.
            </div>
            <div className="text-xs">
              The system is checking for updates every 60 seconds.
            </div>
            <div className="text-xs">
              We'll automatically reconnect when possible.
            </div>
          </>
        )}
      </div>
    );
    
    return content;
  };
  
  const showReconnectButton = status.state === 'DEGRADED' && onReconnect;
  
  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={showReconnectButton ? onReconnect : undefined}
            >
              <span className={`text-lg ${getStatusColor()}`}>
                {status.icon}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {status.state === 'CONNECTED' && 'Live'}
                {status.state === 'INITIALIZING' && 'Connecting'}
                {status.state === 'RECONNECTING' && 'Reconnecting'}
                {status.state === 'DEGRADED' && 'Delayed'}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            {getTooltipContent()}
          </TooltipContent>
        </Tooltip>
        
        {showReconnectButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onReconnect}
            title="Try to reconnect now"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Inline badge version for smaller spaces
 */
export function ConnectionStatusBadge({ status }: { status: Status }) {
  const getColor = () => {
    switch (status.state) {
      case 'CONNECTED':
        return 'bg-green-500';
      case 'INITIALIZING':
      case 'RECONNECTING':
        return 'bg-yellow-500 animate-pulse';
      case 'DEGRADED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`w-2 h-2 rounded-full ${getColor()}`} />
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">{status.message}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}