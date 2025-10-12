"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Save, Trash2, Loader2, CheckCircle } from "lucide-react";
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Background as RFBackground,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  Handle,
} from "reactflow";
import "reactflow/dist/style.css";
import { NodePalette } from "@/components/workflow/NodePalette";
import { NodeConfigPanel } from "@/components/workflow/NodeConfigPanel";
import { useNodes } from "@/hooks/useNodes";
import { getNodeVisual } from "@/lib/nodeVisuals";
import { getClientToken } from "@/lib/auth";

// Custom styled node component
function CustomEditorNode({ data, selected, id }: any) {
  const visual = getNodeVisual(data.nodeType || "", data.label);
  const Icon = visual.icon;

  // Simple, clean node colors
  const getNodeColor = () => {
    const type = (data.nodeType || "").toLowerCase();

    // Trigger nodes - Blue
    if (
      type.includes("webhook") ||
      type.includes("trigger") ||
      type.includes("manual")
    ) {
      return selected
        ? "border-blue-500 bg-blue-100 dark:border-blue-400 dark:bg-blue-900/40"
        : "border-blue-300 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/40";
    }
    // Schedule nodes - Purple
    if (type.includes("schedule") || type.includes("cron")) {
      return selected
        ? "border-purple-500 bg-purple-100 dark:border-purple-400 dark:bg-purple-900/40"
        : "border-purple-300 bg-purple-50 dark:border-purple-500 dark:bg-purple-900/40";
    }
    // Email - Green
    if (
      type.includes("email") ||
      type.includes("mail") ||
      type.includes("gmail")
    ) {
      return selected
        ? "border-green-500 bg-green-100 dark:border-green-400 dark:bg-green-900/40"
        : "border-green-300 bg-green-50 dark:border-green-500 dark:bg-green-900/40";
    }
    // Slack/Discord - Teal
    if (type.includes("slack") || type.includes("discord")) {
      return selected
        ? "border-teal-500 bg-teal-100 dark:border-teal-400 dark:bg-teal-900/40"
        : "border-teal-300 bg-teal-50 dark:border-teal-500 dark:bg-teal-900/40";
    }
    // HTTP/API - Orange
    if (type.includes("http") || type.includes("api")) {
      return selected
        ? "border-orange-500 bg-orange-100 dark:border-orange-400 dark:bg-orange-900/40"
        : "border-orange-300 bg-orange-50 dark:border-orange-500 dark:bg-orange-900/40";
    }
    // AI - Rose
    if (type.includes("openai") || type.includes("ai")) {
      return selected
        ? "border-rose-500 bg-rose-100 dark:border-rose-400 dark:bg-rose-900/40"
        : "border-rose-300 bg-rose-50 dark:border-rose-500 dark:bg-rose-900/40";
    }
    // Control flow - Amber
    if (
      type.includes("if") ||
      type.includes("switch") ||
      type.includes("merge")
    ) {
      return selected
        ? "border-amber-500 bg-amber-100 dark:border-amber-400 dark:bg-amber-900/40"
        : "border-amber-300 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/40";
    }
    // Default - Slate
    return selected
      ? "border-slate-500 bg-slate-100 dark:border-slate-400 dark:bg-slate-800/40"
      : "border-slate-300 bg-slate-50 dark:border-slate-500 dark:bg-slate-800/40";
  };

  return (
    <div className="relative" style={{ minWidth: "220px", maxWidth: "400px" }}>
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
        style={{ top: "0px" }}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
        style={{ bottom: "0px" }}
      />

      <div
        className={`
        px-4 py-3 rounded-lg shadow-md bg-white
        ${getNodeColor()}
        ${selected ? "border-4" : "border-2"}
        hover:shadow-lg transition-all duration-200
        w-full relative cursor-grab active:cursor-grabbing
      `}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium text-sm break-words">
              {data.label}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-600 mb-2">
          {data.description || "Workflow node"}
        </p>

        <div className="inline-flex px-2 py-1 rounded text-xs border bg-white text-gray-500 border-gray-300">
          pending
        </div>
      </div>
    </div>
  );
}

interface EditWorkflowModalProps {
  workflow: any;
  onClose: () => void;
  onSave?: (nodes: Node[], edges: Edge[]) => void;
}

export function EditWorkflowModal({
  workflow,
  onClose,
  onSave,
}: EditWorkflowModalProps) {
  const {
    nodes: availableNodes,
    isLoading: isLoadingNodes,
    searchNodes,
    getNodeDetails,
  } = useNodes();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNodePalette, setShowNodePalette] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const nodeTypes = useMemo(
    () => ({
      custom: CustomEditorNode,
    }),
    []
  );

  // Load workflow nodes and edges
  useEffect(() => {
    if (workflow?.nodes) {
      const loadedNodes = workflow.nodes.map((node: any, index: number) => {
        // Convert n8n position format [x, y] to ReactFlow {x, y}
        // Default: spread nodes out more (300px horizontal, 250px vertical spacing)
        let position = {
          x: 100 + (index % 3) * 400,
          y: 100 + Math.floor(index / 3) * 300,
        };

        if (node.position) {
          if (Array.isArray(node.position)) {
            // n8n format: [x, y]
            position = { x: node.position[0], y: node.position[1] };
          } else if (typeof node.position === "object") {
            // Already ReactFlow format
            position = node.position;
          }
        }

        // Use node.name as ID since n8n connections reference by name
        const nodeId = node.name || node.id || `node-${index}`;

        return {
          id: nodeId,
          type: "custom",
          position,
          data: {
            label: node.name || node.type,
            nodeType: node.type,
            description:
              node.parameters?.text ||
              node.parameters?.message ||
              "Workflow node",
            parameters: node.parameters || {},
          },
        };
      });
      setNodes(loadedNodes);

      console.log(
        "[EditWorkflow] Loaded nodes:",
        loadedNodes.map((n: any) => n.id)
      );

      // Create edges from connections (handle both array and object formats)
      const loadedEdges: Edge[] = [];
      const connections = workflow.connections;

      console.log("[EditWorkflow] Connections:", connections);

      if (connections) {
        if (Array.isArray(connections)) {
          // Array format: [{source, destination}]
          connections.forEach((conn: any, idx: number) => {
            if (conn.source && conn.destination) {
              loadedEdges.push({
                id: `edge-${idx}`,
                source: conn.source,
                target: conn.destination,
                type: "smoothstep",
                animated: false,
                style: { stroke: "#94a3b8", strokeWidth: 1.5 },
                markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
              });
            }
          });
        } else if (typeof connections === "object") {
          // Object format: { nodeId: { main: [[{node, type, index}]] } }
          let edgeIdx = 0;
          Object.entries(connections).forEach(
            ([sourceId, connData]: [string, any]) => {
              console.log(
                "[EditWorkflow] Processing connection from:",
                sourceId,
                connData
              );

              // Handle main connections (can have multiple output branches)
              if (connData?.main) {
                connData.main.forEach(
                  (outputBranch: any[], branchIndex: number) => {
                    if (outputBranch && Array.isArray(outputBranch)) {
                      outputBranch.forEach((target: any) => {
                        if (target?.node) {
                          console.log(
                            "[EditWorkflow] Creating edge:",
                            sourceId,
                            "->",
                            target.node
                          );
                          loadedEdges.push({
                            id: `edge-${edgeIdx++}`,
                            source: sourceId,
                            target: target.node,
                            type: "smoothstep",
                            animated: false,
                            style: { stroke: "#94a3b8", strokeWidth: 1.5 },
                            markerEnd: {
                              type: MarkerType.ArrowClosed,
                              color: "#94a3b8",
                            },
                          });
                        }
                      });
                    }
                  }
                );
              }
            }
          );
        }
      }

      console.log("[EditWorkflow] Loaded edges:", loadedEdges);
      setEdges(loadedEdges);
    }
  }, [workflow]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, type: "smoothstep" }, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback((event: any, node: Node) => {
    setSelectedNode(node);
    setShowConfigPanel(true);
  }, []);

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
        eds.filter(
          (edge) =>
            edge.source !== selectedNode.id && edge.target !== selectedNode.id
        )
      );
      setSelectedNode(null);
      setShowConfigPanel(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = getClientToken();
      const workflowId = workflow.workflowId || workflow.id;

      // Convert ReactFlow nodes/edges back to n8n format
      const n8nNodes = nodes.map((node) => ({
        id: node.id,
        name: node.data.label,
        type: node.data.nodeType,
        position: [node.position.x, node.position.y],
        parameters: node.data.parameters || {},
      }));

      const n8nConnections: any = {};
      edges.forEach((edge) => {
        if (!n8nConnections[edge.source]) {
          n8nConnections[edge.source] = { main: [[]] };
        }
        n8nConnections[edge.source].main[0].push({
          node: edge.target,
          type: "main",
          index: 0,
        });
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/workflows/${workflowId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nodes: n8nNodes,
            connections: n8nConnections,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          if (onSave) onSave(nodes, edges);
        }, 1500);
      } else {
        alert("Failed to save: " + result.error);
      }
    } catch (error: any) {
      alert("Error saving workflow: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeDataStr = event.dataTransfer.getData("nodeData");
      if (!nodeDataStr || !reactFlowInstance) return;

      const node = JSON.parse(nodeDataStr);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: "custom",
        position,
        data: {
          label: node.displayName || node.name,
          nodeType: node.type,
          description: node.description || "",
          parameters: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background border border-border rounded-2xl overflow-hidden w-full max-w-[92vw] h-[88vh] shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold">Edit Workflow</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {workflow?.name}
            </p>
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
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 grid grid-cols-[280px_1fr] gap-4 p-4 overflow-hidden min-h-0">
          {/* Node Palette */}
          <div className="overflow-hidden">
            <div className="backdrop-blur-xl bg-background/40 rounded-2xl border border-border overflow-hidden h-full flex flex-col">
              <NodePalette
                nodes={availableNodes}
                isLoading={isLoadingNodes}
                onSearch={searchNodes}
              />
            </div>
          </div>

          {/* Canvas */}
          <div className="overflow-hidden relative">
            <div className="backdrop-blur-xl bg-background/40 rounded-2xl border border-border overflow-hidden h-full flex flex-col">
              <div className="p-3 border-b border-border flex-shrink-0">
                <h2 className="font-semibold text-sm">Workflow Canvas</h2>
                <p className="text-xs text-muted-foreground">
                  Drag nodes from palette • Click to configure
                </p>
              </div>
              <div
                className="flex-1 relative min-h-0"
                onDrop={onDrop}
                onDragOver={onDragOver}
              >
                <div className="absolute inset-0">
                  <ReactFlow
                    nodes={nodes}
                    edges={edges.map((edge) => {
                      const isHovered = hoveredEdge === edge.id;
                      return {
                        ...edge,
                        animated: isHovered,
                        style: {
                          strokeWidth: isHovered ? 2.5 : 1.5,
                          stroke: isHovered ? "#3b82f6" : "#94a3b8",
                        },
                        markerEnd: {
                          type: MarkerType.ArrowClosed,
                          color: isHovered ? "#3b82f6" : "#94a3b8",
                        },
                      };
                    })}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={handleNodeClick}
                    onEdgeMouseEnter={(_, edge) => setHoveredEdge(edge.id)}
                    onEdgeMouseLeave={() => setHoveredEdge(null)}
                    onPaneClick={() => {
                      setSelectedNode(null);
                      setShowConfigPanel(false);
                    }}
                    onInit={setReactFlowInstance}
                    nodeTypes={nodeTypes}
                    nodesDraggable={true}
                    nodesConnectable={true}
                    elementsSelectable={true}
                    defaultEdgeOptions={{
                      animated: false,
                      type: "smoothstep",
                      style: { strokeWidth: 1.5, stroke: "#94a3b8" },
                      markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: "#94a3b8",
                      },
                    }}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                  >
                    <RFBackground
                      variant={BackgroundVariant.Dots}
                      gap={16}
                      size={1}
                    />
                    <Controls />
                    <MiniMap />
                  </ReactFlow>
                </div>

                {nodes.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center space-y-2">
                      <p className="text-lg font-semibold">Start Building</p>
                      <p className="text-sm text-muted-foreground">
                        Drag nodes from the palette to add them
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Node Configuration Panel */}
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
                      nodeDefinition={
                        availableNodes
                          ? [
                              ...availableNodes.triggers,
                              ...availableNodes.actions,
                              ...availableNodes.logic,
                              ...availableNodes.ai,
                              ...availableNodes.database,
                              ...availableNodes.communication,
                            ].find((n) => n.type === selectedNode.data.nodeType)
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
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
