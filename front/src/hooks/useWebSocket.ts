"use client";

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getClientToken } from "@/lib/auth";

const WS_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ExecutionEvent {
  type: "execution:started" | "execution:completed" | "execution:progress";
  workflowId: string;
  executionId: string;
  status?: "success" | "error" | "running";
  nodeName?: string;
  data?: any;
  timestamp: Date;
}

export interface NodeEvent {
  type: "node:started" | "node:completed" | "node:running" | "node:data";
  workflowId: string;
  executionId: string;
  nodeName: string;
  status?: "success" | "error";
  data?: any;
  inputData?: any;
  outputData?: any;
  error?: string;
  progress?: number;
  timestamp: Date;
}

export interface WorkflowEvent {
  type: "workflow:deployed" | "workflow:status_changed";
  workflowId: string;
  status?: "active" | "inactive";
  data?: any;
  timestamp: Date;
}

// Singleton WebSocket Manager
class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private isConnected: boolean = false;
  private subscriberCount: number = 0;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  addSubscriber() {
    this.subscriberCount++;
    console.log(`[WebSocket] Subscriber added. Total: ${this.subscriberCount}`);
    
    // Initialize connection if this is the first subscriber
    if (this.subscriberCount === 1 && !this.socket) {
      this.connect();
    }
  }

  removeSubscriber() {
    this.subscriberCount--;
    console.log(`[WebSocket] Subscriber removed. Total: ${this.subscriberCount}`);
    
    // Keep connection alive even when count reaches 0
    // The connection will be reused if a new subscriber comes
  }

  private connect() {
    const token = getClientToken();
    if (!token) {
      console.log("[WebSocket] No auth token, skipping connection");
      return;
    }

    console.log("[WebSocket] 🔌 Establishing single shared connection to", WS_URL);

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on("connect", () => {
      console.log("[WebSocket] ✅ Connected! Socket ID:", this.socket?.id);
      this.isConnected = true;
      this.notifyConnectionListeners(true);
    });

    this.socket.on("disconnect", () => {
      console.log("[WebSocket] ⚠️ Disconnected");
      this.isConnected = false;
      this.notifyConnectionListeners(false);
    });

    this.socket.on("connected", (data) => {
      console.log("[WebSocket] Welcome message:", data);
    });

    this.socket.on("connect_error", (error) => {
      console.error("[WebSocket] Connection error:", error.message);
      this.isConnected = false;
      this.notifyConnectionListeners(false);
    });

    // Listen to all execution events
    this.socket.on("execution:started", (event: ExecutionEvent) => {
      console.log("[WebSocket] Execution started:", event);
      this.notifyListeners("execution:started", event);
    });

    this.socket.on("execution:completed", (event: ExecutionEvent) => {
      console.log("[WebSocket] Execution completed:", event);
      this.notifyListeners("execution:completed", event);
    });

    this.socket.on("execution:progress", (event: ExecutionEvent) => {
      console.log("[WebSocket] Execution progress:", event);
      this.notifyListeners("execution:progress", event);
    });

    this.socket.on("workflow:deployed", (event: WorkflowEvent) => {
      console.log("[WebSocket] Workflow deployed:", event);
      this.notifyListeners("workflow:deployed", event);
    });

    this.socket.on("workflow:status_changed", (event: WorkflowEvent) => {
      console.log("[WebSocket] Workflow status changed:", event);
      this.notifyListeners("workflow:status_changed", event);
    });

    // Listen to node-level events
    this.socket.on("node:started", (event: NodeEvent) => {
      console.log("[WebSocket] 🟡 Node started:", event.nodeName);
      this.notifyListeners("node:started", event);
    });

    this.socket.on("node:completed", (event: NodeEvent) => {
      console.log(`[WebSocket] ${event.status === 'success' ? '✅' : '❌'} Node completed:`, event.nodeName);
      this.notifyListeners("node:completed", event);
    });

    this.socket.on("node:running", (event: NodeEvent) => {
      console.log("[WebSocket] ⚡ Node running:", event.nodeName);
      this.notifyListeners("node:running", event);
    });

    this.socket.on("node:data", (event: NodeEvent) => {
      console.log("[WebSocket] 📊 Node data:", event.nodeName);
      this.notifyListeners("node:data", event);
    });
  }

  subscribeToWorkflow(workflowId: string) {
    if (this.socket?.connected) {
      console.log("[WebSocket] Subscribing to workflow:", workflowId);
      this.socket.emit("subscribe:workflow", workflowId);
    }
  }

  unsubscribeFromWorkflow(workflowId: string) {
    if (this.socket?.connected) {
      console.log("[WebSocket] Unsubscribing from workflow:", workflowId);
      this.socket.emit("unsubscribe:workflow", workflowId);
    }
  }

  addEventListener(eventType: string, callback: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  addConnectionListener(callback: (connected: boolean) => void) {
    this.connectionListeners.add(callback);
    // Immediately call with current state
    callback(this.isConnected);

    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  private notifyListeners(eventType: string, event: any) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach((callback) => callback(event));
    }
  }

  private notifyConnectionListeners(connected: boolean) {
    this.connectionListeners.forEach((callback) => callback(connected));
  }

  getConnectionState(): boolean {
    return this.isConnected;
  }
}

// Hook to use the shared WebSocket connection
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<
    ExecutionEvent | WorkflowEvent | null
  >(null);

  // Get singleton instance
  const manager = WebSocketManager.getInstance();

  // Register this component as a subscriber
  useEffect(() => {
    manager.addSubscriber();

    // Subscribe to connection state changes
    const unsubscribe = manager.addConnectionListener(setIsConnected);

    return () => {
      unsubscribe();
      manager.removeSubscriber();
    };
  }, []);

  // Subscribe to a specific workflow
  const subscribeToWorkflow = useCallback((workflowId: string) => {
    manager.subscribeToWorkflow(workflowId);
  }, []);

  // Unsubscribe from a workflow
  const unsubscribeFromWorkflow = useCallback((workflowId: string) => {
    manager.unsubscribeFromWorkflow(workflowId);
  }, []);

  // Add event listener
  const addEventListener = useCallback(
    (eventType: string, callback: Function) => {
      return manager.addEventListener(eventType, callback);
    },
    []
  );

  return {
    isConnected,
    lastEvent,
    subscribeToWorkflow,
    unsubscribeFromWorkflow,
    addEventListener,
  };
}
