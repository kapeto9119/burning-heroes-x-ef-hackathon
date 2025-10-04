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
import { Sparkles, Webhook, Calendar, Play, Zap } from 'lucide-react';

// Custom node component with animations
function CustomNode({ data }: any) {
  const getIcon = (type: string) => {
    if (type.includes('webhook')) return <Webhook className="w-4 h-4" />;
    if (type.includes('schedule')) return <Calendar className="w-4 h-4" />;
    if (type.includes('manual')) return <Play className="w-4 h-4" />;
    if (type.includes('slack')) return <Zap className="w-4 h-4" />;
    return <Sparkles className="w-4 h-4" />;
  };

  const getNodeColor = (type: string) => {
    if (type.includes('webhook')) return 'from-blue-500/20 to-blue-600/20 border-blue-500/50';
    if (type.includes('schedule')) return 'from-purple-500/20 to-purple-600/20 border-purple-500/50';
    if (type.includes('slack')) return 'from-green-500/20 to-green-600/20 border-green-500/50';
    if (type.includes('email')) return 'from-orange-500/20 to-orange-600/20 border-orange-500/50';
    return 'from-gray-500/20 to-gray-600/20 border-gray-500/50';
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, type: 'spring' }}
      className="relative"
    >
      {/* Input handle (left side) */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-4 h-4 !bg-primary border-2 border-background"
        style={{ left: -8 }}
      />
      
      <div className={`
        px-4 py-3 rounded-xl border-2 backdrop-blur-xl
        bg-gradient-to-br ${getNodeColor(data.type)}
        shadow-lg hover:shadow-xl transition-all duration-200
        min-w-[200px]
      `}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-background/80 flex items-center justify-center">
            {getIcon(data.type)}
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
      
      {/* Output handle (right side) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-4 h-4 !bg-primary border-2 border-background"
        style={{ right: -8 }}
      />
      
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
}

export function WorkflowCanvas({ workflow, isGenerating }: WorkflowCanvasProps) {
  // Memoize nodeTypes to prevent React Flow warning
  const nodeTypes = useMemo(() => ({
    custom: CustomNode,
  }), []);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const hasInitialized = useRef(false);

  // Reset initialization flag when workflow changes
  useEffect(() => {
    hasInitialized.current = false;
  }, [workflow?.id]);

  // Convert n8n workflow to React Flow format
  useEffect(() => {
    if (!workflow || !workflow.nodes) return;
    
    // Prevent multiple initializations of same workflow
    if (hasInitialized.current) return;
    hasInitialized.current = true;

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
            stroke: 'hsl(var(--primary))',
            strokeWidth: 3,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: 'hsl(var(--primary))',
          },
        });
      }
    } else {
      // Use n8n connections
      console.log('[WorkflowCanvas] Processing connections:', workflow.connections);
      console.log('[WorkflowCanvas] Available nodes:', workflow.nodes.map((n: any) => n.name));
      
      Object.entries(workflow.connections).forEach(([sourceNode, connections]: any) => {
        console.log('[WorkflowCanvas] Processing source node:', sourceNode);
        const sourceNodeData = workflow.nodes.find((n: any) => n.name === sourceNode);
        console.log('[WorkflowCanvas] Source node data:', sourceNodeData);
        
        if (connections.main && connections.main[0]) {
          console.log('[WorkflowCanvas] Main connections:', connections.main[0]);
          connections.main[0].forEach((connection: any) => {
            console.log('[WorkflowCanvas] Processing connection:', connection);
            const targetNodeData = workflow.nodes.find((n: any) => n.name === connection.node);
            console.log('[WorkflowCanvas] Target node data:', targetNodeData);
            
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
                  stroke: 'hsl(var(--primary))',
                  strokeWidth: 3,
                },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: 'hsl(var(--primary))',
                },
              };
              console.log('[WorkflowCanvas] Creating edge:', edge);
              flowEdges.push(edge);
              console.log('[WorkflowCanvas] ✓ Connected:', sourceNode, '→', connection.node);
              console.log('[WorkflowCanvas] Total edges now:', flowEdges.length);
            } else {
              console.warn('[WorkflowCanvas] ✗ Could not find nodes for connection:', sourceNode, '→', connection.node);
              console.warn('  - Source node found:', !!sourceNodeData, sourceNode);
              console.warn('  - Target node found:', !!targetNodeData, connection.node);
            }
          });
        }
      });
    }

    // Set all nodes at once (no animation delay)
    setNodes(flowNodes);
    
    // Set edges immediately after nodes
    setEdges(flowEdges);
    
    console.log('[WorkflowCanvas] Set nodes:', flowNodes.length);
    console.log('[WorkflowCanvas] Set edges:', flowEdges.length);

    // Fit view after all nodes are added
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.3, duration: 800 });
      }
    }, 100);
  }, [workflow, reactFlowInstance]);

  return (
    <div className="w-full h-full relative">
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
            >
              <Sparkles className="w-12 h-12 text-primary mx-auto" />
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
        onInit={setReactFlowInstance}
        onNodeClick={(_, node) => setSelectedNode(node)}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.5}
        maxZoom={1.5}
        defaultEdgeOptions={{
          animated: true,
          style: { strokeWidth: 2 },
        }}
        className="bg-transparent"
      >
        <Background
          gap={24}
          size={1}
          color="hsl(var(--border))"
          className="opacity-30"
        />
        <Controls
          className="bg-background/80 backdrop-blur-xl border border-border rounded-lg"
        />
        <MiniMap
          className="bg-background/80 backdrop-blur-xl border border-border rounded-lg"
          nodeColor={(node) => {
            if (node.data.type.includes('webhook')) return '#3b82f6';
            if (node.data.type.includes('schedule')) return '#a855f7';
            if (node.data.type.includes('slack')) return '#22c55e';
            return '#6b7280';
          }}
        />
        
        {workflow && (
          <Panel position="top-left" className="bg-background/80 backdrop-blur-xl border border-border rounded-lg p-3">
            <div className="text-sm">
              <div className="font-medium text-foreground">{workflow.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {workflow.nodes?.length || 0} nodes • {Object.keys(workflow.connections || {}).length} connections
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
                  {selectedNode.data.type.includes('webhook') ? <Webhook className="w-4 h-4 text-primary" /> :
                   selectedNode.data.type.includes('schedule') ? <Calendar className="w-4 h-4 text-primary" /> :
                   selectedNode.data.type.includes('slack') ? <Zap className="w-4 h-4 text-primary" /> :
                   <Sparkles className="w-4 h-4 text-primary" />}
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

              {selectedNode.data.parameters && Object.keys(selectedNode.data.parameters).length > 0 && (
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
