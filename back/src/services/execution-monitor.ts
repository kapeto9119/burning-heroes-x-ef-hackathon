import { N8nApiClient } from './n8n-api-client';
import { WebSocketService } from './websocket-service';

/**
 * Execution Monitor Service
 * Polls n8n execution status and emits real-time node-level events via WebSocket
 */
export class ExecutionMonitor {
  private activeMonitors: Map<string, NodeJS.Timeout> = new Map();
  private executionNodeStates: Map<string, Set<string>> = new Map(); // executionId -> Set of completed nodes

  constructor(
    private n8nClient: N8nApiClient,
    private wsService: WebSocketService
  ) {}

  /**
   * Start monitoring an execution
   * Polls n8n API and emits node-level events
   */
  async startMonitoring(
    executionId: string,
    workflowId: string,
    userId: string,
    pollInterval: number = 500 // Poll every 500ms
  ): Promise<void> {
    // Don't start if already monitoring
    if (this.activeMonitors.has(executionId)) {
      console.log(`[ExecutionMonitor] Already monitoring execution ${executionId}`);
      return;
    }

    console.log(`[ExecutionMonitor] 🔍 Starting monitor for execution ${executionId}`);
    
    // Initialize node state tracking
    this.executionNodeStates.set(executionId, new Set());

    const monitor = setInterval(async () => {
      try {
        await this.pollExecution(executionId, workflowId, userId);
      } catch (error: any) {
        console.error(`[ExecutionMonitor] Error polling execution ${executionId}:`, error.message);
        
        // If execution not found or finished, stop monitoring
        if (error.message.includes('not found') || error.message.includes('finished')) {
          this.stopMonitoring(executionId);
        }
      }
    }, pollInterval);

    this.activeMonitors.set(executionId, monitor);

    // Auto-stop after 5 minutes (safety timeout)
    setTimeout(() => {
      if (this.activeMonitors.has(executionId)) {
        console.log(`[ExecutionMonitor] ⏱️ Timeout reached for execution ${executionId}`);
        this.stopMonitoring(executionId);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop monitoring an execution
   */
  stopMonitoring(executionId: string): void {
    const monitor = this.activeMonitors.get(executionId);
    if (monitor) {
      clearInterval(monitor);
      this.activeMonitors.delete(executionId);
      this.executionNodeStates.delete(executionId);
      console.log(`[ExecutionMonitor] ✋ Stopped monitoring execution ${executionId}`);
    }
  }

  /**
   * Poll execution status and emit node events
   */
  private async pollExecution(
    executionId: string,
    workflowId: string,
    userId: string
  ): Promise<void> {
    try {
      const execution = await this.n8nClient.getExecution(executionId);
      
      // Check if execution is finished
      if (execution.finished) {
        console.log(`[ExecutionMonitor] ✅ Execution ${executionId} finished`);
        this.stopMonitoring(executionId);
        return;
      }

      // Get node execution data
      const runData = execution.data?.resultData?.runData;
      if (!runData) {
        return; // No node data yet
      }

      const completedNodes = this.executionNodeStates.get(executionId) || new Set();

      // Process each node's execution status
      Object.entries(runData).forEach(([nodeName, nodeRuns]: [string, any]) => {
        if (!Array.isArray(nodeRuns) || nodeRuns.length === 0) {
          return;
        }

        const lastRun = nodeRuns[nodeRuns.length - 1];
        const nodeKey = `${nodeName}`;

        // Check if this node just started
        if (!completedNodes.has(nodeKey)) {
          // Node is running
          this.wsService.emitNodeStarted(userId, workflowId, executionId, nodeName);
          
          // Emit node data if available
          const inputData = lastRun.data?.main?.[0];
          const outputData = lastRun.data?.main?.[0];
          
          if (inputData || outputData) {
            this.wsService.emitNodeData(
              userId,
              workflowId,
              executionId,
              nodeName,
              inputData,
              outputData
            );
          }

          // Check if node completed
          if (lastRun.executionTime !== undefined) {
            // Node finished
            const status = lastRun.error ? 'error' : 'success';
            
            this.wsService.emitNodeCompleted(
              userId,
              workflowId,
              executionId,
              nodeName,
              status,
              outputData,
              lastRun.error?.message
            );

            // Mark as completed
            completedNodes.add(nodeKey);
            this.executionNodeStates.set(executionId, completedNodes);
          } else {
            // Node still running
            this.wsService.emitNodeRunning(
              userId,
              workflowId,
              executionId,
              nodeName
            );
          }
        }
      });

    } catch (error: any) {
      // If execution not found, it might be finished
      if (error.message.includes('404')) {
        console.log(`[ExecutionMonitor] Execution ${executionId} not found, stopping monitor`);
        this.stopMonitoring(executionId);
      }
      throw error;
    }
  }

  /**
   * Get active monitors count
   */
  getActiveMonitorsCount(): number {
    return this.activeMonitors.size;
  }

  /**
   * Stop all monitors (cleanup)
   */
  stopAll(): void {
    console.log(`[ExecutionMonitor] Stopping all ${this.activeMonitors.size} monitors`);
    this.activeMonitors.forEach((monitor, executionId) => {
      clearInterval(monitor);
    });
    this.activeMonitors.clear();
    this.executionNodeStates.clear();
  }
}
