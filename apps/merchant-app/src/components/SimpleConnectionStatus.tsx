import React from 'react';
import { ConnectionStatus as Status } from '@/hooks/useRobustWebSocket';

interface ConnectionStatusProps {
  status: Status;
  onReconnect?: () => void;
  className?: string;
}

/**
 * Simplified visual indicator for WebSocket connection status
 * Shows users exactly what's happening with real-time updates
 */
export function SimpleConnectionStatus({ status, onReconnect, className = '' }: ConnectionStatusProps) {
  const getStatusColor = () => {
    switch (status.state) {
      case 'CONNECTED':
        return '#10b981';
      case 'INITIALIZING':
      case 'RECONNECTING':
        return '#f59e0b';
      case 'DEGRADED':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };
  
  const getStatusText = () => {
    switch (status.state) {
      case 'CONNECTED': return 'Live';
      case 'INITIALIZING': return 'Connecting';
      case 'RECONNECTING': return 'Reconnecting';
      case 'DEGRADED': return 'Delayed';
      default: return 'Unknown';
    }
  };
  
  const showReconnectButton = status.state === 'DEGRADED' && onReconnect;
  
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          cursor: showReconnectButton ? 'pointer' : 'default',
          transition: 'background-color 0.2s'
        }}
        onClick={showReconnectButton ? onReconnect : undefined}
        title={status.message}
        onMouseEnter={(e) => {
          if (showReconnectButton) {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#f9fafb';
        }}
      >
        <span style={{ fontSize: '1rem', color: getStatusColor() }}>
          {status.icon}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#4b5563' }}>
          {getStatusText()}
        </span>
      </button>
      
      {showReconnectButton && (
        <button
          style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onClick={onReconnect}
          title="Try to reconnect now"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'rotate(180deg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'rotate(0deg)';
          }}
        >
          🔄
        </button>
      )}
    </div>
  );
}

/**
 * Inline badge version for smaller spaces
 */
export function SimpleConnectionStatusBadge({ status }: { status: Status }) {
  const getColor = () => {
    switch (status.state) {
      case 'CONNECTED':
        return '#10b981';
      case 'INITIALIZING':
      case 'RECONNECTING':
        return '#f59e0b';
      case 'DEGRADED':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };
  
  const pulseAnimation = status.state === 'INITIALIZING' || status.state === 'RECONNECTING';
  
  return (
    <div 
      style={{ 
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: getColor(),
        animation: pulseAnimation ? 'pulse 2s infinite' : 'none'
      }}
      title={status.message}
    />
  );
}