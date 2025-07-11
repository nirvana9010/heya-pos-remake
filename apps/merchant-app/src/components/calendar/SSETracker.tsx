'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Wifi, WifiOff, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { getSSEClient } from '@/lib/services/sse-notifications';
import { format } from 'date-fns';

interface SSEEvent {
  id: string;
  timestamp: Date;
  type: string;
  data: any;
  raw?: string;
}

export function SSETracker() {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<any>({});
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const eventListRef = useRef<HTMLDivElement>(null);
  const eventIdCounter = useRef(0);
  const sseClient = useRef<ReturnType<typeof getSSEClient> | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Only run on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Define addEvent outside useEffect so it can be used by other functions
  const addEvent = (type: string, data: any, raw?: string) => {
    const newEvent: SSEEvent = {
      id: `event-${eventIdCounter.current++}`,
      timestamp: new Date(),
      type,
      data,
      raw
    };
    
    setEvents(prev => [...prev.slice(-99), newEvent]); // Keep last 100 events
    
    // Auto-scroll to bottom
    setTimeout(() => {
      if (eventListRef.current) {
        eventListRef.current.scrollTop = eventListRef.current.scrollHeight;
      }
    }, 10);
  };

  useEffect(() => {
    if (!isMounted) return;

    // Get SSE client
    if (!sseClient.current) {
      sseClient.current = getSSEClient();
    }
    const client = sseClient.current;
    
    // Check auth token
    const token = localStorage.getItem('access_token');
    // Check if Supabase is explicitly enabled (default is false, so SSE is default)
    const supabaseFlag = localStorage.getItem('feature_supabaseRealtime');
    const supabaseEnabled = supabaseFlag === 'true';
    
    
    if (!token) {
      addEvent('auth_check', { message: 'No auth token found', token: !!token });
    }
    
    if (supabaseEnabled) {
      addEvent('feature_flag', { message: 'Supabase Realtime is enabled, SSE is disabled', supabaseEnabled });
    } else {
      addEvent('system_check', { 
        message: 'SSE is the active notification system', 
        token: !!token,
        supabaseEnabled: false 
      });
    }

    // Monitor connection state
    const stateInterval = setInterval(() => {
      const state = client.getConnectionState();
      setIsConnected(client.isConnected());
      setConnectionState(state);
    }, 1000);

    // Listen to all SSE events
    const handleConnected = (data: any) => addEvent('connected', data);
    const handleNotification = (data: any) => addEvent('notification', data);
    const handleBookingCreated = (data: any) => addEvent('booking_created', data);
    const handleBookingUpdated = (data: any) => addEvent('booking_updated', data);
    const handleInitial = (data: any) => addEvent('initial', data);
    const handleHeartbeat = (data: any) => addEvent('heartbeat', data);
    const handleError = (data: any) => addEvent('error', data);
    const handleReconnecting = (data: any) => addEvent('reconnecting', data);

    // Subscribe to events
    client.on('connected', handleConnected);
    client.on('notification', handleNotification);
    client.on('booking_created', handleBookingCreated);
    client.on('booking_updated', handleBookingUpdated);
    client.on('initial', handleInitial);
    client.on('heartbeat', handleHeartbeat);
    client.on('error', handleError);
    client.on('reconnecting', handleReconnecting);

    // Add initial state event
    addEvent('tracker_started', { message: 'SSE Tracker initialized' });

    return () => {
      clearInterval(stateInterval);
      if (client) {
        client.off('connected', handleConnected);
        client.off('notification', handleNotification);
        client.off('booking_created', handleBookingCreated);
        client.off('booking_updated', handleBookingUpdated);
        client.off('initial', handleInitial);
        client.off('heartbeat', handleHeartbeat);
        client.off('error', handleError);
        client.off('reconnecting', handleReconnecting);
      }
    };
  }, [isMounted]);

  const getEventColor = (type: string) => {
    switch (type) {
      case 'connected': return 'text-green-600 bg-green-50';
      case 'notification': return 'text-blue-600 bg-blue-50';
      case 'booking_created': return 'text-purple-600 bg-purple-50';
      case 'booking_updated': return 'text-orange-600 bg-orange-50';
      case 'initial': return 'text-indigo-600 bg-indigo-50';
      case 'heartbeat': return 'text-gray-600 bg-gray-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'reconnecting': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const clearEvents = () => {
    setEvents([]);
    setSelectedEvent(null);
  };

  const handleEventClick = (eventId: string) => {
    setSelectedEvent(selectedEvent === eventId ? null : eventId);
  };

  const handleManualConnect = () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      addEvent('manual_connect', { error: 'No auth token available' });
      return;
    }
    
    if (!sseClient.current) {
      sseClient.current = getSSEClient();
    }
    
    addEvent('manual_connect', { message: 'Attempting manual SSE connection...' });
    sseClient.current.connect(token);
  };

  // Only show in development mode
  if (process.env.NODE_ENV === 'development' && isMounted) {
    return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[600px] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-800">SSE Event Tracker</h3>
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isConnected && (
            <button
              onClick={handleManualConnect}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              title="Manually connect SSE"
            >
              Connect
            </button>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={clearEvents}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Connection State */}
          <div className="p-2 bg-gray-50 border-b text-xs">
            <div className="grid grid-cols-2 gap-1">
              <div>Status: <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span></div>
              <div>Reconnect: {connectionState.reconnectAttempts || 0}/{connectionState.maxReconnectAttempts || 10}</div>
              <div>Ready: {connectionState.readyState || 'Unknown'}</div>
              <div>Last Event: {connectionState.lastEventTime ? 
                format(new Date(connectionState.lastEventTime), 'HH:mm:ss') : 'Never'}</div>
            </div>
            <div className="mt-2 text-gray-600">
              <div>Auth Token: {typeof window !== 'undefined' && localStorage.getItem('access_token') ? '✅' : '❌'}</div>
              <div>Supabase Flag: {typeof window !== 'undefined' && localStorage.getItem('feature_supabaseRealtime') || 'not set'}</div>
            </div>
          </div>

          {/* Event List */}
          <div 
            ref={eventListRef}
            className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0"
            style={{ maxHeight: '400px' }}
          >
            {events.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                Waiting for SSE events...
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id}>
                  <div
                    onClick={() => handleEventClick(event.id)}
                    className={`px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 ${getEventColor(event.type)}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{event.type}</span>
                      <span className="text-gray-600">
                        {format(event.timestamp, 'HH:mm:ss.SSS')}
                      </span>
                    </div>
                    {selectedEvent === event.id && (
                      <div className="mt-2 p-2 bg-white rounded border">
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(event.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Event Count */}
          <div className="p-2 border-t bg-gray-50 text-xs text-gray-600">
            {events.length} events tracked
          </div>
        </>
      )}
    </div>
  );
  }

  // In production or not mounted, don't render anything
  return null;
}