'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ExecutionEvent {
  type: 'execution:started' | 'execution:completed' | 'execution:progress';
  workflowId: string;
  executionId: string;
  status?: 'success' | 'error' | 'running';
  nodeName?: string;
  data?: any;
  timestamp: Date;
}

export interface WorkflowEvent {
  type: 'workflow:deployed' | 'workflow:status_changed';
  workflowId: string;
  status?: 'active' | 'inactive';
  data?: any;
  timestamp: Date;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<ExecutionEvent | WorkflowEvent | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Set<Function>>>(new Map());

  // Initialize WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('[WebSocket] No auth token, skipping connection');
      return;
    }

    console.log('[WebSocket] Connecting to', WS_URL);

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WebSocket] Connected!', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
    });

    socket.on('connected', (data) => {
      console.log('[WebSocket] Welcome message:', data);
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error.message);
      setIsConnected(false);
    });

    // Listen to all execution events
    socket.on('execution:started', (event: ExecutionEvent) => {
      console.log('[WebSocket] Execution started:', event);
      setLastEvent(event);
      notifyListeners('execution:started', event);
    });

    socket.on('execution:completed', (event: ExecutionEvent) => {
      console.log('[WebSocket] Execution completed:', event);
      setLastEvent(event);
      notifyListeners('execution:completed', event);
    });

    socket.on('execution:progress', (event: ExecutionEvent) => {
      console.log('[WebSocket] Execution progress:', event);
      setLastEvent(event);
      notifyListeners('execution:progress', event);
    });

    socket.on('workflow:deployed', (event: WorkflowEvent) => {
      console.log('[WebSocket] Workflow deployed:', event);
      setLastEvent(event);
      notifyListeners('workflow:deployed', event);
    });

    socket.on('workflow:status_changed', (event: WorkflowEvent) => {
      console.log('[WebSocket] Workflow status changed:', event);
      setLastEvent(event);
      notifyListeners('workflow:status_changed', event);
    });

    return () => {
      console.log('[WebSocket] Cleaning up connection');
      socket.disconnect();
    };
  }, []);

  // Subscribe to a specific workflow
  const subscribeToWorkflow = useCallback((workflowId: string) => {
    if (socketRef.current?.connected) {
      console.log('[WebSocket] Subscribing to workflow:', workflowId);
      socketRef.current.emit('subscribe:workflow', workflowId);
    }
  }, []);

  // Unsubscribe from a workflow
  const unsubscribeFromWorkflow = useCallback((workflowId: string) => {
    if (socketRef.current?.connected) {
      console.log('[WebSocket] Unsubscribing from workflow:', workflowId);
      socketRef.current.emit('unsubscribe:workflow', workflowId);
    }
  }, []);

  // Add event listener
  const addEventListener = useCallback((eventType: string, callback: Function) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType)!.add(callback);

    // Return cleanup function
    return () => {
      listenersRef.current.get(eventType)?.delete(callback);
    };
  }, []);

  // Notify all listeners for an event type
  const notifyListeners = (eventType: string, event: any) => {
    const listeners = listenersRef.current.get(eventType);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  };

  return {
    isConnected,
    lastEvent,
    subscribeToWorkflow,
    unsubscribeFromWorkflow,
    addEventListener
  };
}
