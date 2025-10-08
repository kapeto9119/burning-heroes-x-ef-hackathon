'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Background } from '@/components/layout/Background';
import { NodePalette } from '@/components/workflow/NodePalette';
import { useNodes } from '@/hooks/useNodes';
import { useAuth } from '@/contexts/AuthContext';
import { getClientToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Save, Play, ArrowLeft, Loader2, CheckCircle, Trash2, Clock } from 'lucide-react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Background as RFBackground,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  NodeChange,
  XYPosition,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { NodeConfigPanel } from '@/components/workflow/NodeConfigPanel';
import { getNodeVisual } from '@/lib/nodeVisuals';
import { useMemo } from 'react';

// Custom styled node component matching WorkflowCanvas design
function CustomEditorNode({ data }: any) {
  const visual = getNodeVisual(data.nodeType || '', data.label);
  const Icon = visual.icon;
  
  const getNodeColor = () => {
    const type = (data.nodeType || '').toLowerCase();
    
    if (type.includes('webhook') || type.includes('trigger') || type.includes('manual')) {
      return 'border-blue-200 bg-blue-50';
    }
    if (type.includes('schedule') || type.includes('cron')) {
      return 'border-purple-200 bg-purple-50';
    }
    if (type.includes('email') || type.includes('mail') || type.includes('gmail')) {
      return 'border-green-200 bg-green-50';
    }
    if (type.includes('slack') || type.includes('discord')) {
      return 'border-emerald-200 bg-emerald-50';
    }
    if (type.includes('linkedin') || type.includes('twitter') || type.includes('facebook')) {
      return 'border-purple-200 bg-purple-50';
    }
    if (type.includes('salesforce') || type.includes('crm') || type.includes('hubspot')) {
      return 'border-blue-200 bg-blue-50';
    }
    if (type.includes('postgres') || type.includes('mysql') || type.includes('database')) {
      return 'border-cyan-200 bg-cyan-50';
    }
    if (type.includes('http') || type.includes('api')) {
      return 'border-orange-200 bg-orange-50';
    }
    if (type.includes('openai') || type.includes('ai')) {
      return 'border-pink-200 bg-pink-50';
    }
    if (type.includes('if') || type.includes('switch') || type.includes('merge')) {
      return 'border-yellow-200 bg-yellow-50';
    }
    return 'border-gray-200 bg-gray-50';
  };

  return (
    <div className="relative" style={{ width: '220px' }}>
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
        style={{ top: '0px' }}
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
        style={{ bottom: '0px' }}
      />
      
      <div className={`
        px-4 py-3 rounded-lg border-2 shadow-md bg-white
        ${getNodeColor()}
        hover:shadow-lg transition-all duration-200
        w-full min-w-48 relative cursor-grab active:cursor-grabbing
      `}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span className="font-medium text-sm">{data.label}</span>
          </div>
        </div>
        
        <p className="text-xs text-gray-600 mb-2">
          {data.description || 'Workflow node'}
        </p>
        
        <div className="inline-flex px-2 py-1 rounded text-xs border bg-white text-gray-500 border-gray-300">
          pending
        </div>
      </div>
    </div>
  );
}

export default function WorkflowEditorPage() {
  const router = useRouter();
  const params = useParams();
  const workflowId = params.id as string;
  const { user, isAuthenticated } = useAuth();
  const { nodes: availableNodes, isLoading: isLoadingNodes, searchNodes, getNodeDetails } = useNodes();

  const [workflow, setWorkflow] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [snappingNodeId, setSnappingNodeId] = useState<string | null>(null);
  
  // Magnetic snap settings
  const SNAP_THRESHOLD = 50; // Distance in pixels to trigger snap
  const NODE_WIDTH = 220; // Approximate node width
  const NODE_HEIGHT = 100; // Approximate node height
  
  // Memoize custom node types
  const nodeTypes = useMemo(() => ({
    custom: CustomEditorNode,
  }), []);

  // Load workflow
  useEffect(() => {
    if (workflowId && isAuthenticated) {
      loadWorkflow();
    }
  }, [workflowId, isAuthenticated]);

  const loadWorkflow = async () => {
    try {
      setIsLoading(true);
      const token = getClientToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/workflows/${workflowId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success && data.data) {
        setWorkflow(data.data);
        
        // Convert workflow nodes to ReactFlow format
        if (data.data.nodes && data.data.nodes.length > 0) {
          const flowNodes: Node[] = data.data.nodes.map((node: any, index: number) => ({
            id: node.id,
            type: 'custom',
            position: node.position || { x: 250, y: 100 + index * 200 },
            data: {
              label: node.name,
              nodeType: node.type,
              description: node.parameters?.text || node.parameters?.message || 'Workflow node',
              ...node.parameters,
            },
          }));

          setNodes(flowNodes);

          // Convert connections to edges
          const flowEdges: Edge[] = [];
          if (data.data.connections) {
            Object.entries(data.data.connections).forEach(([sourceNode, connections]: any) => {
              const sourceNodeData = data.data.nodes.find((n: any) => n.name === sourceNode);
              
              if (connections.main && connections.main[0]) {
                connections.main[0].forEach((connection: any) => {
                  const targetNodeData = data.data.nodes.find((n: any) => n.name === connection.node);
                  
                  if (sourceNodeData && targetNodeData) {
                    flowEdges.push({
                      id: `${sourceNodeData.id}-${targetNodeData.id}`,
                      source: sourceNodeData.id,
                      target: targetNodeData.id,
                      type: 'smoothstep',
                      animated: flowEdges.length === 0,
                      style: {
                        stroke: '#94a3b8',
                        strokeWidth: 1.5,
                      },
                      markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: '#94a3b8',
                      },
                    });
                  }
                });
              }
            });
          }

          setEdges(flowEdges);
        }
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Magnetic snapping for node connections
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Apply magnetic snapping to position changes
      const modifiedChanges = changes.map((change) => {
        if (change.type === 'position' && change.dragging && change.position) {
          const draggedNode = nodes.find((n) => n.id === change.id);
          if (!draggedNode) return change;

          let snappedPosition = { ...change.position };
          let hasSnapped = false;

          // Check all other nodes for snap opportunities
          nodes.forEach((targetNode) => {
            if (targetNode.id === change.id) return; // Skip self

            const targetX = targetNode.position.x;
            const targetY = targetNode.position.y;
            const draggedX = change.position!.x;
            const draggedY = change.position!.y;

            // Calculate snap points (for vertical layout - snap above/below)
            const snapPoints = [
              // Vertical snapping (align below target)
              {
                x: targetX,
                y: targetY + NODE_HEIGHT + 100,
                distance: Math.abs(draggedX - targetX) + Math.abs(draggedY - (targetY + NODE_HEIGHT + 100)),
              },
              // Vertical snapping (align above target)
              {
                x: targetX,
                y: targetY - NODE_HEIGHT - 100,
                distance: Math.abs(draggedX - targetX) + Math.abs(draggedY - (targetY - NODE_HEIGHT - 100)),
              },
              // Horizontal alignment (same X as target)
              {
                x: targetX,
                y: draggedY,
                distance: Math.abs(draggedX - targetX),
              },
            ];

            // Find closest snap point
            const closestSnap = snapPoints.reduce((closest, point) => 
              point.distance < closest.distance ? point : closest
            );

            // Apply snap if within threshold
            if (closestSnap.distance < SNAP_THRESHOLD && !hasSnapped) {
              snappedPosition = { x: closestSnap.x, y: closestSnap.y };
              hasSnapped = true;
              
              // Visual feedback for snapping
              setSnappingNodeId(change.id);
              setTimeout(() => setSnappingNodeId(null), 300);
            }
          });

          return {
            ...change,
            position: snappedPosition,
          };
        }
        return change;
      });

      onNodesChange(modifiedChanges);
    },
    [nodes, onNodesChange, SNAP_THRESHOLD, NODE_WIDTH, NODE_HEIGHT]
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const nodeDataStr = event.dataTransfer.getData('nodeData');

      if (!type || !nodeDataStr) {
        return;
      }

      const nodeData = JSON.parse(nodeDataStr);
      const reactFlowBounds = (event.target as HTMLElement).getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode: Node = {
        id: `${nodeData.type}-${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label: nodeData.displayName,
          nodeType: nodeData.type,
          icon: nodeData.icon,
          description: nodeData.description || 'Workflow node',
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const handleSave = async () => {
    if (!workflow) return;

    setIsSaving(true);
    try {
      const token = getClientToken();

      // Convert ReactFlow nodes back to N8N format
      const n8nNodes = nodes.map((node) => ({
        id: node.id,
        name: node.data.label,
        type: node.data.nodeType || 'n8n-nodes-base.set',
        position: [node.position.x, node.position.y],
        parameters: {},
      }));

      // Convert edges to connections
      const connections: any = {};
      edges.forEach((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (sourceNode) {
          if (!connections[sourceNode.data.label]) {
            connections[sourceNode.data.label] = { main: [[]] };
          }
          const targetNode = nodes.find((n) => n.id === edge.target);
          if (targetNode) {
            connections[sourceNode.data.label].main[0].push({
              node: targetNode.data.label,
              type: 'main',
              index: 0,
            });
          }
        }
      });

      const updatedWorkflow = {
        ...workflow,
        nodes: n8nNodes,
        connections,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/workflows/${workflowId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedWorkflow),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = () => {
    router.push(`/workflows/${workflowId}/test`);
  };

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowConfigPanel(true);
  };

  const handleNodeConfigSave = (nodeId: string, parameters: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              parameters,
            },
          };
        }
        return node;
      })
    );
  };

  const handleDeleteNode = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id)
      );
      setSelectedNode(null);
      setShowConfigPanel(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key - delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        e.preventDefault();
        handleDeleteNode();
      }
      // Escape key - close config panel
      if (e.key === 'Escape' && showConfigPanel) {
        setShowConfigPanel(false);
        setSelectedNode(null);
      }
      // Cmd/Ctrl + S - save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, showConfigPanel]);

  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-background">
        <Background />
        <div className="relative z-10">
          <Navbar />
          <div className="flex items-center justify-center h-[calc(100vh-80px)]">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <Background />
      
      <div className="relative z-10 h-screen flex flex-col">
        <Navbar />

        {/* Editor Header */}
        <div className="bg-background/80 backdrop-blur-xl border-b border-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/workflows')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{workflow?.name || 'Workflow Editor'}</h1>
              <p className="text-xs text-muted-foreground">
                {nodes.length} nodes • {edges.length} connections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedNode && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteNode}
                className="border-red-500 text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Node
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={nodes.length === 0}
            >
              <Play className="w-4 h-4 mr-2" />
              Test
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || saveSuccess || nodes.length === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 flex">
          {/* Node Palette */}
          <NodePalette
            nodes={availableNodes}
            isLoading={isLoadingNodes}
            onSearch={searchNodes}
          />

          {/* Canvas */}
          <div className="flex-1 relative">
            <style jsx global>{`
              .react-flow__node.snapping {
                box-shadow: 0 0 20px 4px rgba(139, 92, 246, 0.6) !important;
                transition: box-shadow 0.2s ease-in-out;
              }
            `}</style>
            <ReactFlow
              nodes={nodes.map(node => ({
                ...node,
                className: node.id === snappingNodeId ? 'snapping' : '',
              }))}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={handleNodeClick}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={{
                animated: false,
                type: 'smoothstep',
                style: {
                  strokeWidth: 1.5,
                  stroke: '#94a3b8'
                },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: '#94a3b8',
                },
              }}
              fitView
            >
              <RFBackground variant={BackgroundVariant.Dots} gap={16} size={1} />
              <Controls />
              <MiniMap />
            </ReactFlow>

            {/* Empty State */}
            {nodes.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold">Start Building</p>
                  <p className="text-sm text-muted-foreground">
                    Drag nodes from the palette to add them to your workflow
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Node Configuration Panel */}
          <AnimatePresence>
            {showConfigPanel && selectedNode && (
              <NodeConfigPanel
                node={selectedNode}
                nodeDefinition={availableNodes 
                  ? [
                      ...availableNodes.triggers,
                      ...availableNodes.actions,
                      ...availableNodes.logic,
                      ...availableNodes.ai,
                      ...availableNodes.database,
                      ...availableNodes.communication,
                    ].find(n => n.type === selectedNode.data.nodeType)
                  : undefined
                }
                onSave={handleNodeConfigSave}
                onClose={() => {
                  setShowConfigPanel(false);
                  setSelectedNode(null);
                }}
                onGetDetails={getNodeDetails}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
