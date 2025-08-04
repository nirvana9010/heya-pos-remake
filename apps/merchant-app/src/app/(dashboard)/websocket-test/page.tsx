'use client';

import { useRobustWebSocket } from '@/hooks/useRobustWebSocket';
import { SimpleConnectionStatus } from '@/components/SimpleConnectionStatus';
import { useState, useEffect } from 'react';

export default function WebSocketTestPage() {
  const [events, setEvents] = useState<Array<{ time: string; type: string; data: any }>>([]);
  const [tokenInfo, setTokenInfo] = useState<{ expiresAt: Date | null; timeLeft: string }>({
    expiresAt: null,
    timeLeft: ''
  });

  const {
    connectionStatus,
    lastNotification,
    isRealtime,
    reconnect,
    emit
  } = useRobustWebSocket({
    debug: true,
    onStateChange: (status) => {
      setEvents(prev => [...prev, {
        time: new Date().toISOString(),
        type: 'STATE_CHANGE',
        data: status
      }].slice(-20)); // Keep last 20 events
    },
    onBookingCreated: (data) => {
      setEvents(prev => [...prev, {
        time: new Date().toISOString(),
        type: 'BOOKING_CREATED',
        data
      }].slice(-20));
    },
    onBookingUpdated: (data) => {
      setEvents(prev => [...prev, {
        time: new Date().toISOString(),
        type: 'BOOKING_UPDATED', 
        data
      }].slice(-20));
    },
    onNotification: (data) => {
      setEvents(prev => [...prev, {
        time: new Date().toISOString(),
        type: 'NOTIFICATION',
        data
      }].slice(-20));
    }
  });

  // Check token expiration
  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const expiresAt = new Date(payload.exp * 1000);
          const now = new Date();
          const timeLeft = expiresAt.getTime() - now.getTime();
          
          let timeLeftStr = '';
          if (timeLeft > 0) {
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            if (days > 0) timeLeftStr = `${days}d ${hours}h ${minutes}m`;
            else if (hours > 0) timeLeftStr = `${hours}h ${minutes}m ${seconds}s`;
            else if (minutes > 0) timeLeftStr = `${minutes}m ${seconds}s`;
            else timeLeftStr = `${seconds}s`;
          } else {
            timeLeftStr = 'EXPIRED';
          }
          
          setTokenInfo({ expiresAt, timeLeft: timeLeftStr });
        } catch (e) {
          console.error('Failed to decode token:', e);
        }
      }
    };

    checkToken();
    const interval = setInterval(checkToken, 1000);
    return () => clearInterval(interval);
  }, []);

  const simulateTokenExpiry = () => {
    // Create a clearly fake expired token for testing
    const fakeExpiredToken = 'fake.expired.token';
    localStorage.setItem('access_token', fakeExpiredToken);
    
    // Force reconnect which should trigger auth failure
    reconnect();
    
    setEvents(prev => [...prev, {
      time: new Date().toISOString(),
      type: 'TEST_ACTION',
      data: { action: 'Simulated token expiry - set invalid token and forced reconnect' }
    }].slice(-20));
  };

  const sendTestPing = () => {
    const success = emit('ping');
    setEvents(prev => [...prev, {
      time: new Date().toISOString(),
      type: 'TEST_ACTION',
      data: { action: 'Sent ping', success }
    }].slice(-20));
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'CONNECTED': return '#10b981';
      case 'INITIALIZING':
      case 'RECONNECTING': return '#f59e0b';
      case 'DEGRADED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>
        WebSocket Token Refresh Test
      </h1>
      
      {/* Connection Status */}
      <div style={{ 
        backgroundColor: '#f9fafb', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Connection Status</h2>
          <SimpleConnectionStatus status={connectionStatus} onReconnect={reconnect} />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>State</p>
            <span style={{ 
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              backgroundColor: getStateColor(connectionStatus.state) + '20',
              color: getStateColor(connectionStatus.state),
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              {connectionStatus.state}
            </span>
          </div>
          
          <div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Real-time</p>
            <p style={{ fontSize: '0.875rem' }}>
              {isRealtime ? '✅ Active' : '🔴 Polling (60s)'}
            </p>
          </div>
          
          <div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Last Notification</p>
            <p style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
              {lastNotification ? new Date(lastNotification).toLocaleTimeString() : 'None'}
            </p>
          </div>
          
          <div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Last Heartbeat</p>
            <p style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
              {connectionStatus.lastHeartbeat 
                ? new Date(connectionStatus.lastHeartbeat).toLocaleTimeString() 
                : 'N/A'}
            </p>
          </div>
        </div>
        
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Status Message</p>
          <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>{connectionStatus.message}</p>
          {connectionStatus.reconnectAttempt && (
            <p style={{ fontSize: '0.875rem', color: '#f59e0b', marginTop: '0.5rem' }}>
              Reconnection attempt {connectionStatus.reconnectAttempt} of {connectionStatus.maxReconnectAttempts}
            </p>
          )}
        </div>
      </div>

      {/* Token Information */}
      <div style={{ 
        backgroundColor: '#f9fafb', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>JWT Token Status</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Expires At</p>
            <p style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
              {tokenInfo.expiresAt ? tokenInfo.expiresAt.toLocaleString() : 'Unknown'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Time Remaining</p>
            <p style={{ 
              fontSize: '0.875rem', 
              fontFamily: 'monospace',
              color: tokenInfo.timeLeft === 'EXPIRED' ? '#ef4444' : 'inherit'
            }}>
              {tokenInfo.timeLeft || 'Unknown'}
            </p>
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: '#dbeafe', 
          border: '1px solid #93c5fd', 
          borderRadius: '4px', 
          padding: '0.75rem'
        }}>
          <p style={{ fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.25rem' }}>
            <strong>Proactive Refresh:</strong> Token will automatically refresh 1 hour before expiry
          </p>
          <p style={{ fontSize: '0.875rem', color: '#1e40af' }}>
            <strong>Reactive Refresh:</strong> If auth fails, token will refresh and retry up to 5 times
          </p>
        </div>
      </div>

      {/* Test Actions */}
      <div style={{ 
        backgroundColor: '#f9fafb', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Test Actions</h2>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={reconnect}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#fff', 
              border: '1px solid #d1d5db', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Manual Reconnect
          </button>
          
          <button 
            onClick={sendTestPing}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#fff', 
              border: '1px solid #d1d5db', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📡 Send Test Ping
          </button>
          
          <button 
            onClick={simulateTokenExpiry}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#fee2e2', 
              border: '1px solid #fca5a5', 
              color: '#991b1b',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ⚠️ Simulate Token Expiry
          </button>
        </div>
      </div>

      {/* Event Log */}
      <div style={{ 
        backgroundColor: '#f9fafb', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Event Log (Last 20 Events)
        </h2>
        
        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto',
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          padding: '0.5rem'
        }}>
          {events.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: '#6b7280', padding: '1rem' }}>
              No events yet...
            </p>
          ) : (
            [...events].reverse().map((event, index) => (
              <div key={index} style={{ 
                borderBottom: index < events.length - 1 ? '1px solid #f3f4f6' : 'none',
                paddingBottom: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ 
                    fontSize: '0.75rem',
                    padding: '0.125rem 0.5rem',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px'
                  }}>
                    {event.type}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {new Date(event.time).toLocaleTimeString()}
                  </span>
                </div>
                <pre style={{ 
                  fontSize: '0.75rem', 
                  color: '#4b5563',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  margin: 0
                }}>
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}