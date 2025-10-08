'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  updateEdge,
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
    <div className="relative" style={{ minWidth: '220px', maxWidth: '400px' }}>
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
        w-full relative cursor-grab active:cursor-grabbing
      `}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium text-sm break-words">{data.label}</span>
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
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [snappingNodeId, setSnappingNodeId] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialWorkflowState, setInitialWorkflowState] = useState<{nodes: Node[], edges: Edge[]} | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // Track which original edge a node split so we can restore it when un-linking
  const [splitEdgeByNode, setSplitEdgeByNode] = useState<Record<string, { sourceId: string; targetId: string } | undefined>>({});
  // Live DnD temp node id while dragging from palette
  const [tempDragNodeId, setTempDragNodeId] = useState<string | null>(null);
  // Track if user is actively dragging a node
  const [isDragging, setIsDragging] = useState(false);
  
  // Magnetic snap settings
  const SNAP_THRESHOLD = 80; // Distance in pixels to trigger snap
  const UNSNAP_THRESHOLD = 140; // Distance to original pair midpoint to auto-unlink
  const NODE_WIDTH = 220; // Approximate node width
  const NODE_HEIGHT = 120; // Approximate node height
  const VERTICAL_SPACING = 200; // Spacing between nodes vertically
  
  // Memoize custom node types
  const nodeTypes = useMemo(() => ({
    custom: CustomEditorNode,
  }), []);

  // Track edge update lifecycle for reconnection by drag
  const edgeUpdateSuccessful = useRef(true);

  // Helper: keep at most one incoming and one outgoing edge for a node
  const normalizeEdgesForNode = useCallback((list: Edge[], nodeId: string) => {
    let incoming: Edge | undefined;
    let outgoing: Edge | undefined;
    const others: Edge[] = [];
    for (const e of list) {
      if (e.target === nodeId) {
        if (!incoming) incoming = e; else continue;
      } else if (e.source === nodeId) {
        if (!outgoing) outgoing = e; else continue;
      } else {
        others.push(e);
      }
      // keep pushed edges in place
      if (others[others.length - 1] !== e && e.target !== nodeId && e.source !== nodeId) {
        // no-op
      }
    }
    const kept: Edge[] = [...others];
    if (incoming) kept.push(incoming);
    if (outgoing) kept.push(outgoing);
    return kept;
  }, []);

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
          const flowNodes: Node[] = data.data.nodes.map((node: any, index: number) => {
            // Convert n8n position format [x, y] to ReactFlow {x, y}
            let position = { x: 250, y: 100 + index * 200 };
            if (node.position) {
              if (Array.isArray(node.position)) {
                // n8n format: [x, y]
                position = { x: node.position[0], y: node.position[1] };
              } else if (typeof node.position === 'object') {
                // Already ReactFlow format
                position = node.position;
              }
            }
            
            return {
              id: node.id,
              type: 'custom',
              position,
              data: {
                label: node.name,
                nodeType: node.type,
                description: node.parameters?.text || node.parameters?.message || 'Workflow node',
                ...node.parameters,
              },
            };
          });

          setNodes(flowNodes);
          
          // Store initial state for unsaved changes detection
          setInitialWorkflowState({ nodes: flowNodes, edges: [] });

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
          
          // Update initial state with edges
          setInitialWorkflowState({ nodes: flowNodes, edges: flowEdges });
        }
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Magnetic snapping for node connections - INSERT between nodes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setHasUnsavedChanges(true);
      // Detect drag start/end
      changes.forEach((change) => {
        if (change.type === 'position' && change.dragging !== undefined) {
          setIsDragging(change.dragging);
        }
      });
      // Apply magnetic snapping to position changes
      const modifiedChanges = changes.map((change) => {
        if (change.type === 'position' && change.dragging && change.position) {
          const draggedNode = nodes.find((n) => n.id === change.id);
          if (!draggedNode) return change;

          let snappedPosition = { ...change.position };
          let hasSnapped = false;
          let insertBetween: { sourceId: string; targetId: string; edgeId: string } | null = null;

          const draggedX = change.position!.x;
          const draggedY = change.position!.y;

          // Check all edges to see if we're near the midpoint (to insert between nodes)
          edges.forEach((edge) => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            
            // Skip if this edge involves the dragged node (we'll handle re-linking)
            if (!sourceNode || !targetNode) return;
            if (edge.source === change.id || edge.target === change.id) return;

            // Calculate midpoint of the edge
            const midX = (sourceNode.position.x + targetNode.position.x) / 2;
            const midY = (sourceNode.position.y + targetNode.position.y) / 2;

            // Calculate distance from dragged node to edge midpoint
            const distanceToMidpoint = Math.sqrt(
              Math.pow(draggedX - midX, 2) + Math.pow(draggedY - midY, 2)
            );

            // If close to the edge midpoint, snap to insert position
            if (distanceToMidpoint < SNAP_THRESHOLD && !hasSnapped) {
              snappedPosition = { x: midX, y: midY };
              hasSnapped = true;
              insertBetween = {
                sourceId: edge.source,
                targetId: edge.target,
                edgeId: edge.id,
              };

              // Visual feedback for snapping
              setSnappingNodeId(change.id);
              setTimeout(() => setSnappingNodeId(null), 300);
            }
          });

          // If we found an insertion point, update connections
          if (insertBetween && hasSnapped) {
            setTimeout(() => {
              setEdges((eds) => {
                // Capture current pair (if node was already between two nodes)
                const prevIncoming = eds.find(e => e.target === change.id);
                const prevOutgoing = eds.find(e => e.source === change.id);
                
                // Remove the edge we're inserting into and any existing edges tied to this node
                let newEdges = eds.filter(e => e.id !== insertBetween!.edgeId);
                newEdges = newEdges.filter(e => e.source !== change.id && e.target !== change.id);

                // Add two new edges: source -> dragged node -> target
                newEdges = [
                  ...newEdges,
                  {
                    id: `${insertBetween!.sourceId}-${change.id}`,
                    source: insertBetween!.sourceId,
                    target: change.id,
                    type: 'smoothstep',
                    animated: false,
                    style: { stroke: '#94a3b8', strokeWidth: 1.5 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
                  },
                  {
                    id: `${change.id}-${insertBetween!.targetId}`,
                    source: change.id,
                    target: insertBetween!.targetId,
                    type: 'smoothstep',
                    animated: false,
                    style: { stroke: '#94a3b8', strokeWidth: 1.5 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
                  },
                ];

                // If the node was previously inserted between A and B, restore A->B before moving to new pair
                if (prevIncoming && prevOutgoing) {
                  const a = prevIncoming.source;
                  const b = prevOutgoing.target;
                  // Avoid restoring if it's the same pair we're inserting into
                  if (!(a === insertBetween!.sourceId && b === insertBetween!.targetId)) {
                    // Ensure we don't duplicate the edge
                    const exists = newEdges.some(e => e.source === a && e.target === b);
                    if (!exists) {
                      newEdges.push({
                        id: `${a}-${b}`,
                        source: a,
                        target: b,
                        type: 'smoothstep',
                        animated: false,
                        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
                      });
                    }
                  }
                }

                // Enforce degree constraint for this node
                return normalizeEdgesForNode(newEdges, change.id);
              });
              // Remember which pair this node split now
              setSplitEdgeByNode((m) => ({ ...m, [change.id]: { sourceId: insertBetween!.sourceId, targetId: insertBetween!.targetId } }));
            }, 100);
          }

          // If not snapping to any edge, and currently between two nodes, unlink when far enough and restore original A->B
          if (!hasSnapped) {
            const incoming = edges.find(e => e.target === change.id);
            const outgoing = edges.find(e => e.source === change.id);
            if (incoming && outgoing) {
              const sourceNode = nodes.find(n => n.id === incoming.source);
              const targetNode = nodes.find(n => n.id === outgoing.target);
              if (sourceNode && targetNode) {
                const midX = (sourceNode.position.x + targetNode.position.x) / 2;
                const midY = (sourceNode.position.y + targetNode.position.y) / 2;
                const distanceToMid = Math.hypot(draggedX - midX, draggedY - midY);
                if (distanceToMid > UNSNAP_THRESHOLD) {
                  setEdges((eds) => {
                    // Remove node's edges
                    let next = eds.filter(e => e.source !== change.id && e.target !== change.id);
                    // Restore A->B if missing
                    const exists = next.some(e => e.source === incoming.source && e.target === outgoing.target);
                    if (!exists) {
                      next = next.concat({
                        id: `${incoming.source}-${outgoing.target}`,
                        source: incoming.source,
                        target: outgoing.target,
                        type: 'smoothstep',
                        animated: false,
                        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
                      });
                    }
                    return next;
                  });
                  // Clear split info for this node
                  setSplitEdgeByNode((m) => ({ ...m, [change.id]: undefined }));
                }
              }
            }
          }

          return {
            ...change,
            position: snappedPosition,
          };
        }
        return change;
      });

      onNodesChange(modifiedChanges);
    },
    [nodes, edges, onNodesChange, setEdges, SNAP_THRESHOLD]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setHasUnsavedChanges(true);
      setEdges((eds) => {
        const next = addEdge(params, eds);
        // Enforce at most one incoming and one outgoing per node for both ends
        const afterSource = normalizeEdgesForNode(next, params.source as string);
        const afterBoth = normalizeEdgesForNode(afterSource, params.target as string);
        return afterBoth;
      });
    },
    [setEdges, normalizeEdgesForNode]
  );

  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
    setHasUnsavedChanges(true);
    setEdges((eds) => {
      const updated = updateEdge(oldEdge, newConnection, eds);
      const afterSource = newConnection.source ? normalizeEdgesForNode(updated, newConnection.source) : updated;
      const afterBoth = newConnection.target ? normalizeEdgesForNode(afterSource, newConnection.target) : afterSource;
      return afterBoth;
    });
    edgeUpdateSuccessful.current = true;
  }, [setEdges, normalizeEdgesForNode]);

  const onEdgeUpdateEnd = useCallback((_: any, edge: Edge) => {
    if (!edgeUpdateSuccessful.current) {
      // if not reconnected, remove the edge
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      setHasUnsavedChanges(true);
    }
    edgeUpdateSuccessful.current = true;
  }, [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    if (!reactFlowInstance) return;

    // Try to read node data from DataTransfer or window cache
    let nodeDataStr = event.dataTransfer.getData('nodeData');
    let nodeData: any | null = null;
    if (nodeDataStr) {
      try { nodeData = JSON.parse(nodeDataStr); } catch {}
    }
    // @ts-ignore
    if (!nodeData && (window as any).__paletteDragNode) {
      // @ts-ignore
      nodeData = (window as any).__paletteDragNode;
    }
    if (!nodeData) return;

    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });

    if (!tempDragNodeId) {
      const id = `temp-${Date.now()}`;
      const tempNode: Node = {
        id,
        type: 'custom',
        position,
        data: {
          label: nodeData.displayName,
          nodeType: nodeData.type,
          icon: nodeData.icon,
          description: nodeData.description || 'Workflow node',
        },
      };
      setNodes((nds) => nds.concat(tempNode));
      setTempDragNodeId(id);
    } else {
      // Update temp node position
      setNodes((nds) => nds.map(n => n.id === tempDragNodeId ? { ...n, position } : n));
    }
  }, [reactFlowInstance, tempDragNodeId, setNodes]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (tempDragNodeId) {
        // Finalize temp node as real node
        setHasUnsavedChanges(true);
        setTempDragNodeId(null);
        // Clear cache
        try { /* @ts-ignore */ delete (window as any).__paletteDragNode; } catch {}
        return;
      }

      // Fallback: create from DataTransfer if no temp node was created
      const type = event.dataTransfer.getData('application/reactflow');
      const nodeDataStr = event.dataTransfer.getData('nodeData');
      if (!type || !nodeDataStr || !reactFlowInstance) return;
      const nodeData = JSON.parse(nodeDataStr);
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
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
      setHasUnsavedChanges(true);
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, tempDragNodeId, setNodes]
  );

  const onDragLeaveCanvas = useCallback(() => {
    // Remove temp node if dragging leaves canvas without drop
    if (tempDragNodeId) {
      setNodes((nds) => nds.filter(n => n.id !== tempDragNodeId));
      setTempDragNodeId(null);
      try { /* @ts-ignore */ delete (window as any).__paletteDragNode; } catch {}
    }
  }, [tempDragNodeId, setNodes]);

  // Global unlink-on-distance: only run while actively dragging
  useEffect(() => {
    if (!isDragging) return;

    setEdges((prevEdges) => {
      let nextEdges = prevEdges;
      let modified = false;

      nodes.forEach((n) => {
        const incoming = nextEdges.find((e) => e.target === n.id);
        const outgoing = nextEdges.find((e) => e.source === n.id);

        // Case 1: node is between two nodes (incoming + outgoing)
        if (incoming && outgoing) {
          const sourceNode = nodes.find((x) => x.id === incoming.source);
          const targetNode = nodes.find((x) => x.id === outgoing.target);
          if (!sourceNode || !targetNode) return;

          const midX = (sourceNode.position.x + targetNode.position.x) / 2;
          const midY = (sourceNode.position.y + targetNode.position.y) / 2;
          const dist = Math.hypot(n.position.x - midX, n.position.y - midY);
          if (dist > UNSNAP_THRESHOLD) {
            modified = true;
            // remove n's edges
            let updated = nextEdges.filter((e) => e.source !== n.id && e.target !== n.id);
            // restore A->B if missing
            const exists = updated.some((e) => e.source === incoming.source && e.target === outgoing.target);
            if (!exists) {
              updated = updated.concat({
                id: `${incoming.source}-${outgoing.target}`,
                source: incoming.source,
                target: outgoing.target,
                type: 'smoothstep',
                animated: false,
                style: { stroke: '#94a3b8', strokeWidth: 1.5 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
              });
            }
            nextEdges = updated;
          }
          return;
        }

        // Case 2: node is tail with only one connection (incoming only or outgoing only)
        if (incoming && !outgoing) {
          const sourceNode = nodes.find((x) => x.id === incoming.source);
          if (!sourceNode) return;
          const dist = Math.hypot(n.position.x - sourceNode.position.x, n.position.y - sourceNode.position.y);
          if (dist > UNSNAP_THRESHOLD) {
            modified = true;
            nextEdges = nextEdges.filter((e) => e.id !== incoming.id);
          }
          return;
        }
        if (!incoming && outgoing) {
          const targetNode = nodes.find((x) => x.id === outgoing.target);
          if (!targetNode) return;
          const dist = Math.hypot(n.position.x - targetNode.position.x, n.position.y - targetNode.position.y);
          if (dist > UNSNAP_THRESHOLD) {
            modified = true;
            nextEdges = nextEdges.filter((e) => e.id !== outgoing.id);
          }
          return;
        }
      });

      if (modified) {
        setHasUnsavedChanges(true);
      }
      return nextEdges;
    });
  }, [nodes, isDragging]);

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
        setHasUnsavedChanges(false);
        // Update initial state after successful save
        setInitialWorkflowState({ nodes, edges });
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
      setHasUnsavedChanges(true);
      // Find edges connected to this node
      const incomingEdge = edges.find(e => e.target === selectedNode.id);
      const outgoingEdge = edges.find(e => e.source === selectedNode.id);
      
      // Remove the node and its edges
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) => {
        let newEdges = eds.filter((edge) => 
          edge.source !== selectedNode.id && edge.target !== selectedNode.id
        );
        
        // If this node was between two nodes, reconnect them
        if (incomingEdge && outgoingEdge) {
          newEdges.push({
            id: `${incomingEdge.source}-${outgoingEdge.target}`,
            source: incomingEdge.source,
            target: outgoingEdge.target,
            type: 'smoothstep',
            animated: false,
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
        
        return newEdges;
      });
      setSelectedNode(null);
      setShowConfigPanel(false);
    }
  };

  // Handle when a node is moved away from its insertion position
  // This reconnects the nodes it was between
  const handleNodeDragStop = useCallback(() => {
    // This is handled by the snapping logic automatically
    // When a node snaps to a new position, old connections are removed
  }, []);

  // Custom leave confirm modal instead of browser beforeunload

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key - delete selected node or edges
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNode) {
          e.preventDefault();
          handleDeleteNode();
        } else if (selectedEdges.length > 0) {
          e.preventDefault();
          // Delete selected edges
          setHasUnsavedChanges(true);
          setEdges((eds) => eds.filter((edge) => !selectedEdges.includes(edge.id)));
          setSelectedEdges([]);
        }
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
  }, [selectedNode, selectedEdges, showConfigPanel]);

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
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 w-full h-full">
        <Background />
      </div>
      
      <div className="relative z-10">
        <Navbar />

        <div className="container mx-auto px-6 py-6 max-w-[1800px] h-screen overflow-hidden flex flex-col">
          {/* Editor Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex-shrink-0"
          >
            <Button
              variant="ghost"
              onClick={() => {
                if (hasUnsavedChanges) setShowLeaveConfirm(true);
                else router.push('/workflows');
              }}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Workflows
            </Button>

            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold mb-1">Edit Workflow</h1>
                  {hasUnsavedChanges && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded-full border border-yellow-500/30">
                      Unsaved changes
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{workflow?.name || 'Workflow Editor'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {nodes.length} nodes • {edges.length} connections
                </p>
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
          </motion.div>

          {/* Editor Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 overflow-hidden min-h-0">
            {/* Node Palette - Left Column */}
            <div className="lg:col-span-1 overflow-hidden">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="backdrop-blur-xl bg-background/40 rounded-2xl border border-border overflow-hidden h-full flex flex-col"
              >
                <NodePalette
                  nodes={availableNodes}
                  isLoading={isLoadingNodes}
                  onSearch={searchNodes}
                />
              </motion.div>
            </div>

            {/* Canvas - Right Column */}
            <div className="lg:col-span-3 overflow-hidden">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="backdrop-blur-xl bg-background/40 rounded-2xl border border-border overflow-hidden h-full flex flex-col relative"
              >
                <div className="p-3 border-b border-border flex-shrink-0">
                  <h2 className="font-semibold text-sm">Workflow Canvas</h2>
                  <p className="text-xs text-muted-foreground">
                    Drag nodes • Click edges to select • Drag from handles to reconnect
                  </p>
                </div>
                <div 
                  className="flex-1 relative"
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeaveCanvas}
                >
                  <style jsx global>{`
                    .react-flow__node.snapping {
                      box-shadow: 0 0 20px 4px rgba(139, 92, 246, 0.6) !important;
                      transition: box-shadow 0.2s ease-in-out;
                    }
                    /* Larger, clearer edge updater circle */
                    .react-flow__edge-updater {
                      stroke: #8b5cf6 !important; /* purple */
                      fill: #ffffff !important;
                      stroke-width: 2px !important;
                      transform: scale(1.3);
                    }
                    /* Highlight selected edges */
                    .react-flow__edge.selected path {
                      stroke: #8b5cf6 !important;
                      stroke-width: 2.5px !important;
                    }
                    /* Larger node handles for easier grabbing */
                    .react-flow__handle {
                      width: 12px !important;
                      height: 12px !important;
                      border: 2px solid #8b5cf6 !important;
                      background: #ffffff !important;
                      box-shadow: 0 0 0 2px rgba(139,92,246,0.15);
                    }
                    .react-flow__handle:hover {
                      background: #f5f3ff !important; /* light purple */
                      box-shadow: 0 0 0 4px rgba(139,92,246,0.2);
                    }
                  `}</style>
                  <ReactFlow
                    nodes={nodes.map(node => ({
                      ...node,
                      className: node.id === snappingNodeId ? 'snapping' : '',
                    }))}
                    edges={edges.map(edge => ({
                      ...edge,
                      selected: selectedEdges.includes(edge.id),
                      style: {
                        ...edge.style,
                        stroke: selectedEdges.includes(edge.id) ? '#8b5cf6' : '#94a3b8',
                        strokeWidth: selectedEdges.includes(edge.id) ? 2.5 : 1.5,
                      },
                    }))}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={handleNodeClick}
                    onEdgeUpdateStart={onEdgeUpdateStart}
                    onEdgeUpdate={onEdgeUpdate}
                    onEdgeUpdateEnd={onEdgeUpdateEnd}
                    onEdgeClick={(_, edge) => {
                      setSelectedEdges([edge.id]);
                      setSelectedNode(null);
                    }}
                    onPaneClick={() => {
                      setSelectedNode(null);
                      setSelectedEdges([]);
                    }}
                    onInit={setReactFlowInstance}
                    nodeTypes={nodeTypes}
                    nodesDraggable={true}
                    nodesConnectable={true}
                    elementsSelectable={true}
                    edgesUpdatable={true}
                    edgeUpdaterRadius={30}
                    reconnectRadius={20}
                    defaultEdgeOptions={{
                      animated: false,
                      type: 'smoothstep',
                      updatable: true,
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
                    fitViewOptions={{ padding: 0.2 }}
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

                {/* Leave Confirm Modal */}
          <AnimatePresence>
            {showLeaveConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md p-6"
                >
                  <h3 className="text-lg font-semibold mb-2">Leave without saving?</h3>
                  <p className="text-sm text-muted-foreground mb-6">You have unsaved changes. If you leave now, your edits will be lost.</p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowLeaveConfirm(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => router.push('/workflows')}>Leave</Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Node Configuration Panel - Inside Canvas Container */}
          <AnimatePresence>
            {showConfigPanel && selectedNode && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute right-4 top-16 bottom-4 w-80 z-50 backdrop-blur-xl bg-background/95 rounded-2xl border border-border shadow-2xl overflow-auto"
              >
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
