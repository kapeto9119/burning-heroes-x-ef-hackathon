'use client';

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Panel,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Clock, Save, Edit3, Volume2, VolumeX } from 'lucide-react';
import { getNodeVisual, isControlFlowNode, getControlFlowType } from '@/lib/nodeVisuals';
import { useWebSocket, NodeEvent } from '@/hooks/useWebSocket';

// Custom node component with animations
// Now uses dynamic visual system to support all N8N nodes
function CustomNode({ data }: any) {
  const nodeStatus = data.executionStatus;
  
  // Get dynamic icon and color based on node type
  const visual = getNodeVisual(data.type, data.label);
  const Icon = visual.icon;

  // Determine border color and animation based on status
  const getBorderStyle = () => {
    switch (nodeStatus) {
      case 'running':
        return 'border-blue-500 shadow-blue-500/50';
      case 'success':
        return 'border-green-500 shadow-green-500/30';
      case 'error':
        return 'border-red-500 shadow-red-500/30';
      case 'waiting':
        return 'border-gray-400 shadow-gray-400/20';
      default:
        return 'border-purple-500/30';
    }
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: nodeStatus === 'running' ? [1, 1.05, 1] : 1,
        opacity: 1 
      }}
      transition={{ 
        duration: nodeStatus === 'running' ? 1.5 : 0.3,
        type: 'spring',
        repeat: nodeStatus === 'running' ? Infinity : 0
      }}
      className="relative"
      style={{ width: '220px' }}
    >
      {/* Input handle (left side) - positioned at left center border */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 !bg-purple-500 border-2 border-white"
        style={{ 
          left: '0px',
        }}
        isConnectable={false}
      />
      
      {/* Output handle (right side) - positioned at right center border */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 !bg-purple-500 border-2 border-white"
        style={{ 
          right: '0px',
        }}
        isConnectable={false}
      />
      
      <div className={`
        px-4 py-3 rounded-xl border-2 backdrop-blur-xl
        bg-gradient-to-br ${visual.color}
        shadow-lg hover:shadow-xl transition-all duration-200
        w-full relative nodrag
        ${getBorderStyle()}
      `}>
        
        {/* Status Badge */}
        {nodeStatus && (
          <div className="absolute -top-2 -right-2 z-10">
            {nodeStatus === 'success' && (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}
            {nodeStatus === 'error' && (
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                <XCircle className="w-4 h-4 text-white" />
              </div>
            )}
            {nodeStatus === 'running' && (
              <motion.div 
                className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
                animate={{ 
                  scale: [1, 1.2, 1],
                  boxShadow: [
                    '0 0 0 0 rgba(59, 130, 246, 0.7)',
                    '0 0 0 10px rgba(59, 130, 246, 0)',
                    '0 0 0 0 rgba(59, 130, 246, 0)'
                  ]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </motion.div>
            )}
            {nodeStatus === 'waiting' && (
              <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center shadow-lg">
                <Clock className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-background/80 flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-foreground">{data.label}</div>
            <div className="text-xs text-muted-foreground">{data.nodeType}</div>
          </div>
        </div>
        {data.description && (
          <div className="mt-2 text-xs text-muted-foreground">
            {data.description}
          </div>
        )}
      </div>
      
      {/* Animated glow effect */}
      <motion.div
        className="absolute inset-0 rounded-xl blur-xl opacity-30 -z-10"
        style={{
          background: `radial-gradient(circle, ${
            data.type.includes('webhook') ? '#3b82f6' :
            data.type.includes('schedule') ? '#a855f7' :
            data.type.includes('slack') ? '#22c55e' :
            '#6b7280'
          } 0%, transparent 70%)`
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}

interface WorkflowCanvasProps {
  workflow: any;
  isGenerating?: boolean;
  latestExecution?: any;
  isPreview?: boolean;
  enableRealTimeUpdates?: boolean; // Enable WebSocket real-time node updates
}

export function WorkflowCanvas({ workflow, isGenerating, latestExecution, isPreview = false, enableRealTimeUpdates = false }: WorkflowCanvasProps) {
  // Memoize nodeTypes to prevent React Flow warning
  const nodeTypes = useMemo(() => ({
    custom: CustomNode,
  }), []);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isEditingNode, setIsEditingNode] = useState(false);
  const [editedParameters, setEditedParameters] = useState<any>({});
  const hasInitialized = useRef(false);
  const [nodeStates, setNodeStates] = useState<Map<string, string>>(new Map()); // Track real-time node states
  const [activeEdges, setActiveEdges] = useState<Set<string>>(new Set()); // Track edges with flowing data
  const [executionProgress, setExecutionProgress] = useState(0); // Overall progress percentage
  const [clickedNode, setClickedNode] = useState<any>(null); // Node clicked during execution
  const [liveNodeData, setLiveNodeData] = useState<Map<string, any>>(new Map()); // Live data for nodes
  const [controlFlowGroups, setControlFlowGroups] = useState<Array<{id: string, type: string, nodes: string[], condition?: string}>>([]);
  const [soundsEnabled, setSoundsEnabled] = useState(() => {
    // Load from localStorage, default to false (opt-in)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('workflow_sounds_enabled') === 'true';
    }
    return false;
  });
  
  // WebSocket for real-time updates
  const { addEventListener, subscribeToWorkflow, unsubscribeFromWorkflow } = useWebSocket();

  // Save sound preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('workflow_sounds_enabled', soundsEnabled.toString());
    }
  }, [soundsEnabled]);

  // Reset initialization flag when workflow or execution changes
  useEffect(() => {
    hasInitialized.current = false;
  }, [workflow?.id, latestExecution?.id]);

  // Reset edit mode when node changes
  useEffect(() => {
    setIsEditingNode(false);
    setEditedParameters({});
  }, [selectedNode?.id]);

  // Subscribe to workflow for real-time updates
  useEffect(() => {
    if (!enableRealTimeUpdates || !workflow?.workflowId) return;

    subscribeToWorkflow(workflow.workflowId);

    return () => {
      unsubscribeFromWorkflow(workflow.workflowId);
    };
  }, [enableRealTimeUpdates, workflow?.workflowId, subscribeToWorkflow, unsubscribeFromWorkflow]);

  // Listen to real-time node events
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const handleNodeStarted = (event: NodeEvent) => {
      setNodeStates(prev => new Map(prev).set(event.nodeName, 'running'));
      updateNodeStatus(event.nodeName, 'running');
      
      // Animate edge leading to this node
      animateEdgeToNode(event.nodeName);
      
      // Update progress
      updateProgress();
      
      // Play sound
      playSound('start');
    };

    const handleNodeCompleted = (event: NodeEvent) => {
      const status = event.status === 'success' ? 'success' : 'error';
      setNodeStates(prev => new Map(prev).set(event.nodeName, status));
      updateNodeStatus(event.nodeName, status);
      
      // Update progress
      updateProgress();
      
      // Play sound
      playSound(status === 'success' ? 'success' : 'error');
    };

    const handleNodeRunning = (event: NodeEvent) => {
      setNodeStates(prev => new Map(prev).set(event.nodeName, 'running'));
      updateNodeStatus(event.nodeName, 'running');
    };

    const handleNodeData = (event: NodeEvent) => {
      setLiveNodeData(prev => new Map(prev).set(event.nodeName, {
        inputData: event.inputData,
        outputData: event.outputData,
        timestamp: event.timestamp
      }));
    };

    const unsubscribeStarted = addEventListener('node:started', handleNodeStarted);
    const unsubscribeCompleted = addEventListener('node:completed', handleNodeCompleted);
    const unsubscribeRunning = addEventListener('node:running', handleNodeRunning);
    const unsubscribeData = addEventListener('node:data', handleNodeData);

    return () => {
      unsubscribeStarted();
      unsubscribeCompleted();
      unsubscribeRunning();
      unsubscribeData();
    };
  }, [enableRealTimeUpdates, addEventListener]);

  // Update node status in React Flow
  const updateNodeStatus = useCallback((nodeName: string, status: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.data.label === nodeName) {
          return {
            ...node,
            data: {
              ...node.data,
              executionStatus: status,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Animate edge leading to a node
  const animateEdgeToNode = useCallback((nodeName: string) => {
    setEdges((eds) =>
      eds.map((edge) => {
        // Find the edge that connects to this node
        const targetNode = nodes.find(n => n.id === edge.target);
        if (targetNode?.data.label === nodeName) {
          return {
            ...edge,
            animated: true,
            style: {
              ...edge.style,
              stroke: '#3b82f6',
              strokeWidth: 3,
            },
          };
        }
        return edge;
      })
    );
  }, [nodes, setEdges]);

  // Update execution progress
  const updateProgress = useCallback(() => {
    const totalNodes = nodes.length;
    if (totalNodes === 0) return;
    
    const completedNodes = Array.from(nodeStates.values()).filter(
      status => status === 'success' || status === 'error'
    ).length;
    
    const progress = Math.round((completedNodes / totalNodes) * 100);
    setExecutionProgress(progress);
  }, [nodes.length, nodeStates]);

  // Play sound effects (optional, can be muted)
  const playSound = useCallback((type: 'start' | 'success' | 'error') => {
    if (!soundsEnabled) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different events
      switch (type) {
        case 'start':
          oscillator.frequency.value = 440; // A4
          gainNode.gain.value = 0.1;
          break;
        case 'success':
          oscillator.frequency.value = 523.25; // C5
          gainNode.gain.value = 0.15;
          break;
        case 'error':
          oscillator.frequency.value = 220; // A3
          gainNode.gain.value = 0.2;
          break;
      }

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      // Silently fail if audio not supported
      console.debug('[WorkflowCanvas] Audio not supported:', error);
    }
  }, [soundsEnabled]);

  // Convert n8n workflow to React Flow format
  useEffect(() => {
    if (!workflow || !workflow.nodes) return;
    
    // Prevent multiple initializations of same workflow
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Create a map of node execution statuses
    const nodeStatusMap = new Map<string, string>();
    if (latestExecution?.nodeExecutions) {
      latestExecution.nodeExecutions.forEach((nodeExec: any) => {
        nodeStatusMap.set(nodeExec.nodeName, nodeExec.status);
      });
    }

    const flowNodes: Node[] = workflow.nodes.map((node: any, index: number) => {
      const isFirst = index === 0;
      const x = isFirst ? 250 : 250 + (index * 350);
      const y = 250;

      return {
        id: node.id,
        type: 'custom',
        position: { x, y },
        data: {
          label: node.name,
          type: node.type,
          nodeType: node.type.split('.').pop(),
          description: node.parameters?.text || node.parameters?.channelId || '',
          parameters: node.parameters,
          rawNode: node,
          executionStatus: nodeStatusMap.get(node.name),
        },
      };
    });

    // Create edges from connections
    const flowEdges: Edge[] = [];
    
    // Simple approach: connect nodes sequentially if no connections specified
    if (!workflow.connections || Object.keys(workflow.connections).length === 0) {
      // Connect nodes in sequence
      for (let i = 0; i < flowNodes.length - 1; i++) {
        flowEdges.push({
          id: `edge-${i}`,
          source: flowNodes[i].id,
          target: flowNodes[i + 1].id,
          sourceHandle: 'output',
          targetHandle: 'input',
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: '#8b5cf6',
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#8b5cf6',
          },
        });
      }
    } else {
      // Use n8n connections
      Object.entries(workflow.connections).forEach(([sourceNode, connections]: any) => {
        const sourceNodeData = workflow.nodes.find((n: any) => n.name === sourceNode);
        
        if (connections.main && connections.main[0]) {
          connections.main[0].forEach((connection: any) => {
            const targetNodeData = workflow.nodes.find((n: any) => n.name === connection.node);
            
            if (sourceNodeData && targetNodeData) {
              const edge = {
                id: `${sourceNodeData.id}-${targetNodeData.id}`,
                source: sourceNodeData.id,
                target: targetNodeData.id,
                sourceHandle: 'output',
                targetHandle: 'input',
                type: 'smoothstep',
                animated: true,
                style: {
                  stroke: '#8b5cf6',
                  strokeWidth: 2,
                },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: '#8b5cf6',
                },
              };
              flowEdges.push(edge);
              console.warn('  - Target node found:', !!targetNodeData, connection.node);
            }
          });
        }
      });
    }

    // Set all nodes at once (no animation delay)
    setNodes(flowNodes);
    
    // IMPORTANT: Delay edge rendering to allow nodes to be measured first
    // This ensures handles are positioned correctly before edges connect
    setTimeout(() => {
      setEdges(flowEdges);
      
      // Fit view after edges are added and force update
      setTimeout(() => {
        if (reactFlowInstance) {
          reactFlowInstance.fitView({ padding: 0.3, duration: isPreview ? 0 : 800 });
          // Force ReactFlow to recalculate edge paths
          if (isPreview) {
            reactFlowInstance.fitView({ padding: 0.3, duration: 0 });
          }
        }
      }, isPreview ? 100 : 50);
    }, isPreview ? 200 : 50);
    
    // Detect control flow groups
    detectControlFlowGroups(flowNodes, workflow.connections || {});
  }, [workflow, reactFlowInstance, latestExecution, isPreview]);

  // Detect and group control flow structures
  const detectControlFlowGroups = useCallback((flowNodes: Node[], connections: any) => {
    const groups: Array<{id: string, type: string, nodes: string[], condition?: string}> = [];
    
    flowNodes.forEach((node) => {
      if (isControlFlowNode(node.data.type)) {
        const flowType = getControlFlowType(node.data.type);
        if (!flowType) return;
        
        // Find nodes that are part of this control flow
        const connectedNodes: string[] = [node.id];
        
        // For loops, find nodes in the loop body (nodes that connect back)
        if (flowType === 'loop') {
          // Find all nodes connected from this loop node
          Object.entries(connections).forEach(([sourceName, conns]: any) => {
            const sourceNode = flowNodes.find(n => n.data.label === sourceName);
            if (sourceNode?.id === node.id && conns.main && conns.main[0]) {
              conns.main[0].forEach((conn: any) => {
                const targetNode = flowNodes.find(n => n.data.label === conn.node);
                if (targetNode) connectedNodes.push(targetNode.id);
              });
            }
          });
        }
        
        // Get condition text if available
        let condition = '';
        if (flowType === 'if' && node.data.parameters?.conditions) {
          condition = 'IF condition';
        } else if (flowType === 'switch' && node.data.parameters?.rules) {
          condition = 'SWITCH';
        } else if (flowType === 'loop') {
          const batchSize = node.data.parameters?.batchSize || 1;
          condition = `Loop (batch: ${batchSize})`;
        }
        
        groups.push({
          id: node.id,
          type: flowType,
          nodes: connectedNodes,
          condition
        });
      }
    });
    
    setControlFlowGroups(groups);
  }, []);

  return (
    <div className="w-full h-full relative" key={`canvas-${workflow?.id || workflow?.name}`}>
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm"
        >
          <div className="text-center space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 text-primary mx-auto flex items-center justify-center"
            >
              <Loader2 className="w-12 h-12" />
            </motion.div>
            <p className="text-sm text-muted-foreground">Generating workflow nodes...</p>
          </div>
        </motion.div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={(instance) => {
          setReactFlowInstance(instance);
          // Force immediate fit view for previews
          setTimeout(() => {
            instance.fitView({ padding: 0.3, duration: 0 });
          }, 50);
        }}
        onNodeClick={(_, node) => {
          if (!isPreview) {
            setSelectedNode(node);
            // If real-time updates enabled and node has live data, show inspector
            if (enableRealTimeUpdates && liveNodeData.has(node.data.label)) {
              setClickedNode(node);
            }
          }
        }}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        nodesDraggable={!isPreview}
        nodesConnectable={false}
        nodesFocusable={!isPreview}
        elementsSelectable={!isPreview}
        fitView
        fitViewOptions={{ padding: 0.3, duration: isPreview ? 0 : 800 }}
        minZoom={0.5}
        maxZoom={1.5}
        defaultEdgeOptions={{
          animated: !isPreview,
          style: { strokeWidth: 2 },
        }}
        className="bg-transparent"
      >
        {/* Control Flow Containers - Rendered behind nodes */}
        {controlFlowGroups.map((group) => {
          const controlNode = nodes.find(n => n.id === group.id);
          if (!controlNode) return null;
          
          // Calculate bounding box for the group
          const groupNodes = nodes.filter(n => group.nodes.includes(n.id));
          if (groupNodes.length === 0) return null;
          
          const minX = Math.min(...groupNodes.map(n => n.position.x));
          const maxX = Math.max(...groupNodes.map(n => n.position.x + 220)); // 220 is node width
          const minY = Math.min(...groupNodes.map(n => n.position.y));
          const maxY = Math.max(...groupNodes.map(n => n.position.y + 100)); // approx node height
          
          const width = maxX - minX + 40;
          const height = maxY - minY + 40;
          const x = minX - 20;
          const y = minY - 40; // Extra space for label
          
          // Color based on control flow type
          const colors = {
            loop: 'border-indigo-500/40 bg-indigo-500/5',
            if: 'border-yellow-500/40 bg-yellow-500/5',
            switch: 'border-cyan-500/40 bg-cyan-500/5',
            merge: 'border-green-500/40 bg-green-500/5'
          };
          
          return (
            <div
              key={group.id}
              className={`absolute border-2 rounded-xl ${colors[group.type as keyof typeof colors]} pointer-events-none`}
              style={{
                left: x,
                top: y,
                width,
                height,
                zIndex: -1
              }}
            >
              <div className="absolute -top-6 left-2 px-2 py-1 bg-background/90 border border-border rounded text-xs font-medium">
                {group.condition || group.type.toUpperCase()}
              </div>
            </div>
          );
        })}
        <Background
          gap={24}
          size={1}
          color="hsl(var(--border))"
          className="opacity-30"
        />
        {!isPreview && (
          <>
            <Controls
              className="bg-background/80 backdrop-blur-xl border border-border rounded-lg"
            />
            <MiniMap
              className="bg-background/80 backdrop-blur-xl border border-border rounded-lg"
              nodeColor={(node) => {
                const visual = getNodeVisual(node.data.type, node.data.label);
                // Extract hex color from category
                if (visual.category.includes('webhook') || visual.category.includes('trigger')) return '#3b82f6';
                if (visual.category.includes('schedule')) return '#a855f7';
                if (visual.category.includes('slack')) return '#22c55e';
                if (visual.category.includes('email')) return '#f97316';
                if (visual.category.includes('database')) return '#3b82f6';
                return '#6b7280';
              }}
            />
          </>
        )}
        
        {workflow && !isPreview && (
          <Panel position="top-left" className="bg-background/80 backdrop-blur-xl border border-border rounded-lg p-3">
            <div className="text-sm">
              <div className="font-medium text-foreground">{workflow.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {workflow.nodes?.length || 0} nodes • {Object.keys(workflow.connections || {}).length} connections
              </div>
            </div>
          </Panel>
        )}

        {/* Progress Bar - Show during execution */}
        {enableRealTimeUpdates && executionProgress > 0 && executionProgress < 100 && (
          <Panel position="top-center" className="bg-background/90 backdrop-blur-xl border border-border rounded-lg p-3 min-w-[300px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Execution Progress</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSoundsEnabled(!soundsEnabled)}
                    className="p-1 hover:bg-accent rounded transition-colors"
                    title={soundsEnabled ? 'Mute sounds' : 'Enable sounds'}
                  >
                    {soundsEnabled ? (
                      <Volume2 className="w-4 h-4 text-primary" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <span className="text-muted-foreground">{executionProgress}%</span>
                </div>
              </div>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${executionProgress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {Array.from(nodeStates.values()).filter(s => s === 'success').length} completed •{' '}
                {Array.from(nodeStates.values()).filter(s => s === 'running').length} running •{' '}
                {Array.from(nodeStates.values()).filter(s => s === 'error').length} errors
              </div>
            </div>
          </Panel>
        )}

        {/* Live Node Inspector - Show when node is clicked during execution */}
        {enableRealTimeUpdates && clickedNode && liveNodeData.has(clickedNode.data.label) && (
          <Panel position="bottom-right" className="bg-background/95 backdrop-blur-xl border border-border rounded-lg p-4 max-w-md">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="font-semibold">{clickedNode.data.label}</span>
                </div>
                <button
                  onClick={() => setClickedNode(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              
              {liveNodeData.get(clickedNode.data.label)?.outputData && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Live Output</div>
                  <div className="text-xs font-mono bg-accent/50 p-2 rounded max-h-32 overflow-auto">
                    {JSON.stringify(liveNodeData.get(clickedNode.data.label)?.outputData, null, 2)}
                  </div>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                Last updated: {new Date(liveNodeData.get(clickedNode.data.label)?.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Node Details Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-4 w-80 bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl p-4 z-20"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  {(() => {
                    const visual = getNodeVisual(selectedNode.data.type, selectedNode.data.label);
                    const Icon = visual.icon;
                    return <Icon className="w-4 h-4 text-primary" />;
                  })()}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{selectedNode.data.label}</h3>
                  <p className="text-xs text-muted-foreground">{selectedNode.data.nodeType}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Node Type</label>
                <p className="text-sm text-foreground mt-1 font-mono text-xs bg-accent/50 px-2 py-1 rounded">
                  {selectedNode.data.type}
                </p>
              </div>

              {/* Schedule Editing for schedule nodes */}
              {selectedNode.data.type.includes('schedule') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground">Schedule Configuration</label>
                    {!isEditingNode ? (
                      <button
                        onClick={() => {
                          setIsEditingNode(true);
                          setEditedParameters(selectedNode.data.parameters || {});
                        }}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          // Save changes
                          alert('Schedule updated! (Note: In production, this would update via API)');
                          setIsEditingNode(false);
                        }}
                        className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded flex items-center gap-1 hover:bg-primary/90"
                      >
                        <Save className="w-3 h-3" />
                        Save
                      </button>
                    )}
                  </div>
                  
                  {isEditingNode ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Cron Expression</label>
                        <input
                          type="text"
                          value={editedParameters?.rule?.interval?.[0]?.expression || ''}
                          onChange={(e) => {
                            setEditedParameters({
                              ...editedParameters,
                              rule: {
                                interval: [{ field: 'cronExpression', expression: e.target.value }]
                              }
                            });
                          }}
                          className="w-full mt-1 px-2 py-1 text-xs font-mono bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="0 9 * * 1-5"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Examples:</p>
                        <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                          <div>• <code className="bg-accent/50 px-1 rounded">0 9 * * 1-5</code> - Weekdays at 9am</div>
                          <div>• <code className="bg-accent/50 px-1 rounded">0 * * * *</code> - Every hour</div>
                          <div>• <code className="bg-accent/50 px-1 rounded">*/15 * * * *</code> - Every 15 min</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-accent/30 px-2 py-1.5 rounded">
                      <div className="text-xs font-medium text-foreground">Cron Expression</div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {selectedNode.data.parameters?.rule?.interval?.[0]?.expression || 'Not set'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Regular parameters for non-schedule nodes or when not editing */}
              {!selectedNode.data.type.includes('schedule') && selectedNode.data.parameters && Object.keys(selectedNode.data.parameters).length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Parameters</label>
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    {Object.entries(selectedNode.data.parameters).map(([key, value]: any) => (
                      <div key={key} className="bg-accent/30 px-2 py-1.5 rounded">
                        <div className="text-xs font-medium text-foreground">{key}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 break-all">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Node ID</span>
                  <span className="font-mono text-foreground">{selectedNode.id.slice(0, 12)}...</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {selectedNode && (
        <div
          className="absolute inset-0 z-10"
          onClick={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
