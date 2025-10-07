import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { AuthService } from './auth-service';

export class WebSocketService {
  private io: SocketIOServer;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(httpServer: HttpServer, private authService: AuthService) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      }
    });

    this.setupAuthentication();
    this.setupEventHandlers();
  }

  /**
   * Setup authentication middleware
   */
  private setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify token
        const payload = await this.authService.verifyToken(token);
        
        // Attach user info to socket
        (socket as any).userId = payload.userId;
        (socket as any).userEmail = payload.email;
        
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const userId = (socket as any).userId;
      const userEmail = (socket as any).userEmail;

      console.log(`[WebSocket] User connected: ${userEmail} (${socket.id})`);

      // Track user's socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`[WebSocket] User disconnected: ${userEmail} (${socket.id})`);
        
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.userSockets.delete(userId);
          }
        }
      });

      // Handle workflow subscription
      socket.on('subscribe:workflow', (workflowId: string) => {
        socket.join(`workflow:${workflowId}`);
        console.log(`[WebSocket] User ${userEmail} subscribed to workflow ${workflowId}`);
      });

      socket.on('unsubscribe:workflow', (workflowId: string) => {
        socket.leave(`workflow:${workflowId}`);
        console.log(`[WebSocket] User ${userEmail} unsubscribed from workflow ${workflowId}`);
      });

      // Send welcome message
      socket.emit('connected', {
        message: 'Connected to real-time updates',
        userId,
        timestamp: new Date()
      });
    });
  }

  /**
   * Emit execution started event
   */
  emitExecutionStarted(userId: string, workflowId: string, executionId: string) {
    const event = {
      type: 'execution:started',
      workflowId,
      executionId,
      timestamp: new Date()
    };

    // Send to user's room
    this.io.to(`user:${userId}`).emit('execution:started', event);
    
    // Send to workflow room
    this.io.to(`workflow:${workflowId}`).emit('execution:started', event);

    console.log(`[WebSocket] Execution started: ${executionId} for workflow ${workflowId}`);
  }

  /**
   * Emit execution completed event
   */
  emitExecutionCompleted(
    userId: string, 
    workflowId: string, 
    executionId: string, 
    status: 'success' | 'error',
    data?: any
  ) {
    const event = {
      type: 'execution:completed',
      workflowId,
      executionId,
      status,
      data,
      timestamp: new Date()
    };

    this.io.to(`user:${userId}`).emit('execution:completed', event);
    this.io.to(`workflow:${workflowId}`).emit('execution:completed', event);

    console.log(`[WebSocket] Execution completed: ${executionId} - ${status}`);
  }

  /**
   * Emit execution progress event
   */
  emitExecutionProgress(
    userId: string,
    workflowId: string,
    executionId: string,
    nodeName: string,
    status: string
  ) {
    const event = {
      type: 'execution:progress',
      workflowId,
      executionId,
      nodeName,
      status,
      timestamp: new Date()
    };

    this.io.to(`user:${userId}`).emit('execution:progress', event);
    this.io.to(`workflow:${workflowId}`).emit('execution:progress', event);
  }

  /**
   * Emit workflow deployed event
   */
  emitWorkflowDeployed(userId: string, workflowId: string, data: any) {
    const event = {
      type: 'workflow:deployed',
      workflowId,
      data,
      timestamp: new Date()
    };

    this.io.to(`user:${userId}`).emit('workflow:deployed', event);
  }

  /**
   * Emit workflow activated/deactivated event
   */
  emitWorkflowStatusChanged(
    userId: string,
    workflowId: string,
    status: 'active' | 'inactive'
  ) {
    const event = {
      type: 'workflow:status_changed',
      workflowId,
      status,
      timestamp: new Date()
    };

    this.io.to(`user:${userId}`).emit('workflow:status_changed', event);
  }

  /**
   * Emit node started event
   */
  emitNodeStarted(
    userId: string,
    workflowId: string,
    executionId: string,
    nodeName: string
  ) {
    const event = {
      type: 'node:started',
      workflowId,
      executionId,
      nodeName,
      timestamp: new Date()
    };

    this.io.to(`user:${userId}`).emit('node:started', event);
    this.io.to(`workflow:${workflowId}`).emit('node:started', event);

    console.log(`[WebSocket] Node started: ${nodeName} in execution ${executionId}`);
  }

  /**
   * Emit node completed event
   */
  emitNodeCompleted(
    userId: string,
    workflowId: string,
    executionId: string,
    nodeName: string,
    status: 'success' | 'error',
    data?: any,
    error?: string
  ) {
    const event = {
      type: 'node:completed',
      workflowId,
      executionId,
      nodeName,
      status,
      data,
      error,
      timestamp: new Date()
    };

    this.io.to(`user:${userId}`).emit('node:completed', event);
    this.io.to(`workflow:${workflowId}`).emit('node:completed', event);

    console.log(`[WebSocket] Node completed: ${nodeName} - ${status}`);
  }

  /**
   * Emit node running event (progress update)
   */
  emitNodeRunning(
    userId: string,
    workflowId: string,
    executionId: string,
    nodeName: string,
    progress?: number
  ) {
    const event = {
      type: 'node:running',
      workflowId,
      executionId,
      nodeName,
      progress,
      timestamp: new Date()
    };

    this.io.to(`user:${userId}`).emit('node:running', event);
    this.io.to(`workflow:${workflowId}`).emit('node:running', event);
  }

  /**
   * Emit node data update (real-time data preview)
   */
  emitNodeData(
    userId: string,
    workflowId: string,
    executionId: string,
    nodeName: string,
    inputData?: any,
    outputData?: any
  ) {
    const event = {
      type: 'node:data',
      workflowId,
      executionId,
      nodeName,
      inputData,
      outputData,
      timestamp: new Date()
    };

    this.io.to(`user:${userId}`).emit('node:data', event);
    this.io.to(`workflow:${workflowId}`).emit('node:data', event);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}
