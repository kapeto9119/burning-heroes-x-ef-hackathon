"use client";

import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Panel,
  MarkerType,
  Handle,
  Position,
  useReactFlow,
  useViewport,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Save,
  Edit3,
  Volume2,
  VolumeX,
  Info,
} from "lucide-react";
import {
  getNodeVisual,
  isControlFlowNode,
  getControlFlowType,
} from "@/lib/nodeVisuals";
import { useWebSocket, NodeEvent } from "@/hooks/useWebSocket";
import { useNodes } from "@/hooks/useNodes";

// Control Flow Container Component that properly transforms with viewport
function ControlFlowContainer({ group, nodes }: { group: any; nodes: Node[] }) {
  const { x: viewportX, y: viewportY, zoom } = useViewport();

  const groupNodes = nodes.filter((n) => group.nodes.includes(n.id));
  if (groupNodes.length === 0) return null;

  const minX = Math.min(...groupNodes.map((n) => n.position.x));
  const maxX = Math.max(...groupNodes.map((n) => n.position.x + 220)); // 220 is node width
  const minY = Math.min(...groupNodes.map((n) => n.position.y));
  const maxY = Math.max(...groupNodes.map((n) => n.position.y + 100)); // approx node height

  const width = (maxX - minX + 40) * zoom;
  const height = (maxY - minY + 40) * zoom;
  const x = (minX - 20) * zoom + viewportX;
  const y = (minY - 40) * zoom + viewportY; // Extra space for label

  // Color based on control flow type
  const colors = {
    loop: "border-indigo-500/40 bg-indigo-500/5",
    if: "border-yellow-500/40 bg-yellow-500/5",
    switch: "border-cyan-500/40 bg-cyan-500/5",
    merge: "border-green-500/40 bg-green-500/5",
  };

  return (
    <div
      className={`absolute border-2 rounded-xl ${
        colors[group.type as keyof typeof colors]
      } pointer-events-none transition-all duration-200`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: -1,
      }}
    >
      <div
        className="absolute bg-background/90 border border-border rounded text-xs font-medium px-2 py-1"
        style={{
          top: `${-6 * zoom}px`,
          left: `${2 * zoom}px`,
          fontSize: `${Math.max(0.75, 0.75 * zoom)}rem`,
        }}
      >
        {group.condition || group.type.toUpperCase()}
      </div>
    </div>
  );
}

// Custom node component with animations
// Now uses dynamic visual system to support all N8N nodes
function CustomNode({ data }: any) {
  const nodeStatus = data.executionStatus;
  const isPreview = data.isPreview || false; // Get preview mode from node data

  // Get dynamic icon and color based on node type
  const visual = getNodeVisual(data.type, data.label);
  const Icon = visual.icon;

  // Get node color based on type (with improved dark mode support)
  // Using brighter colors for better visibility and contrast in dark theme
  const getNodeColor = () => {
    const type = data.type.toLowerCase();

    // Trigger nodes - Blue (vibrant blue with good contrast)
    if (
      type.includes("webhook") ||
      type.includes("trigger") ||
      type.includes("manual")
    ) {
      return "border-blue-300 bg-blue-100 dark:border-blue-500 dark:bg-blue-900/60";
    }
    // Schedule nodes - Purple (vivid purple)
    if (type.includes("schedule") || type.includes("cron")) {
      return "border-purple-300 bg-purple-100 dark:border-purple-500 dark:bg-purple-900/60";
    }
    // Communication (Email, Slack, etc) - Green (bright green for visibility)
    if (
      type.includes("email") ||
      type.includes("mail") ||
      type.includes("gmail")
    ) {
      return "border-green-300 bg-green-100 dark:border-green-500 dark:bg-green-900/60";
    }
    if (type.includes("slack") || type.includes("discord")) {
      return "border-emerald-300 bg-emerald-100 dark:border-emerald-400 dark:bg-emerald-800/60";
    }
    // Social/Professional networks - Purple
    if (
      type.includes("linkedin") ||
      type.includes("twitter") ||
      type.includes("facebook")
    ) {
      return "border-purple-300 bg-purple-100 dark:border-purple-500 dark:bg-purple-900/60";
    }
    // CRM & Business - Blue
    if (
      type.includes("salesforce") ||
      type.includes("crm") ||
      type.includes("hubspot")
    ) {
      return "border-blue-300 bg-blue-100 dark:border-blue-500 dark:bg-blue-900/60";
    }
    // Data & Database - Cyan (bright cyan for databases)
    if (
      type.includes("postgres") ||
      type.includes("mysql") ||
      type.includes("database")
    ) {
      return "border-cyan-300 bg-cyan-100 dark:border-cyan-400 dark:bg-cyan-900/60";
    }
    // HTTP & API - Orange (warm orange for APIs)
    if (type.includes("http") || type.includes("api")) {
      return "border-orange-300 bg-orange-100 dark:border-orange-400 dark:bg-orange-800/60";
    }
    // AI nodes - Pink (vibrant pink for AI)
    if (type.includes("openai") || type.includes("ai")) {
      return "border-pink-300 bg-pink-100 dark:border-pink-400 dark:bg-pink-900/60";
    }
    // Control flow - Yellow (bright yellow for logic nodes)
    if (
      type.includes("if") ||
      type.includes("switch") ||
      type.includes("merge")
    ) {
      return "border-yellow-300 bg-yellow-100 dark:border-yellow-400 dark:bg-yellow-800/60";
    }
    // Default - Gray (better contrast)
    return "border-gray-300 bg-gray-100 dark:border-gray-500 dark:bg-gray-800/60";
  };

  // Status border overlay (only when executing)
  const getStatusBorder = () => {
    switch (nodeStatus) {
      case "running":
        return "ring-2 ring-blue-400";
      case "success":
        return "ring-2 ring-green-400";
      case "error":
        return "ring-2 ring-red-400";
      default:
        return "";
    }
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: nodeStatus === "running" ? [1, 1.05, 1] : 1,
        opacity: 1,
      }}
      transition={{
        duration: nodeStatus === "running" ? 1.5 : 0.3,
        type: "spring",
        repeat: nodeStatus === "running" ? Infinity : 0,
      }}
      className="relative"
      style={{ minWidth: "220px", maxWidth: "400px" }}
    >
      {/* Input handle (top side) - positioned at top center border */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
        style={{
          top: "0px",
        }}
        isConnectable={false}
      />

      {/* Output handle (bottom side) - positioned at bottom center border */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
        style={{
          bottom: "0px",
        }}
        isConnectable={false}
      />

      <div
        className={`
        px-4 py-3 rounded-lg border-2 shadow-md bg-white dark:bg-gray-950
        ${getNodeColor()}
        ${getStatusBorder()}
        hover:shadow-lg transition-all duration-200
        w-full relative
        ${isPreview ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
      `}
      >
        {/* Header with icon and status icon */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon className="w-4 h-4 flex-shrink-0 text-foreground" />
            <span className="font-medium text-sm break-words text-foreground">
              {data.label}
            </span>
          </div>
          {/* Status icon (top right, small) */}
          {nodeStatus === "success" && (
            <CheckCircle className="w-3 h-3 text-green-500" />
          )}
          {nodeStatus === "running" && (
            <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
          )}
          {nodeStatus === "error" && (
            <div className="w-3 h-3 bg-red-500 rounded-full" />
          )}
          {nodeStatus === "waiting" && (
            <Clock className="w-3 h-3 text-gray-400" />
          )}
        </div>

        {/* Description - Always show */}
        <p className="text-xs text-muted-foreground mb-2">
          {data.description || "Workflow node"}
        </p>

        {/* Status Badge (bottom, like reference) */}
        {nodeStatus && (
          <div
            className={`
            inline-flex px-2 py-1 rounded text-xs border bg-white dark:bg-gray-900
            ${
              nodeStatus === "completed" || nodeStatus === "success"
                ? "text-green-700 border-green-300"
                : nodeStatus === "running"
                ? "text-blue-700 border-blue-300"
                : nodeStatus === "error"
                ? "text-red-700 border-red-300"
                : "text-gray-500 border-gray-300"
            }
          `}
          >
            {nodeStatus}
          </div>
        )}
      </div>
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

// Helper function to get default description based on node type
function getNodeDescription(nodeType: string): string {
  const type = nodeType.toLowerCase();

  if (type.includes("webhook"))
    return "Receive HTTP requests to trigger workflow";
  if (type.includes("schedule")) return "Trigger workflow on a schedule";
  if (type.includes("manual")) return "Manually trigger workflow";
  if (type.includes("email") || type.includes("mail"))
    return "Send email message";
  if (type.includes("slack")) return "Send Slack message";
  if (type.includes("http")) return "Make HTTP request";
  if (type.includes("if")) return "Conditional branching";
  if (type.includes("switch")) return "Route based on conditions";
  if (type.includes("loop") || type.includes("batch"))
    return "Loop through items";
  if (type.includes("merge")) return "Merge data from branches";
  if (type.includes("set")) return "Set field values";
  if (type.includes("code")) return "Run custom code";

  return "Workflow node";
}

export function WorkflowCanvas({
  workflow,
  isGenerating,
  latestExecution,
  isPreview = false,
  enableRealTimeUpdates = false,
}: WorkflowCanvasProps) {
  // Memoize nodeTypes to prevent React Flow warning
  const nodeTypes = useMemo(
    () => ({
      custom: CustomNode,
    }),
    []
  );
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
  const [controlFlowGroups, setControlFlowGroups] = useState<
    Array<{ id: string; type: string; nodes: string[]; condition?: string }>
  >([]);
  const [soundsEnabled, setSoundsEnabled] = useState(() => {
    // Load from localStorage, default to false (opt-in)
    if (typeof window !== "undefined") {
      return localStorage.getItem("workflow_sounds_enabled") === "true";
    }
    return false;
  });
  const [nodeDetails, setNodeDetails] = useState<any>(null); // MCP node details
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // WebSocket for real-time updates
  const { addEventListener, subscribeToWorkflow, unsubscribeFromWorkflow } =
    useWebSocket();

  // Node details fetching via MCP
  const { getNodeDetails } = useNodes();

  // Save sound preference to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("workflow_sounds_enabled", soundsEnabled.toString());
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

  // Fetch node details from MCP when a node is selected
  useEffect(() => {
    if (!selectedNode || !getNodeDetails) {
      setNodeDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const details = await getNodeDetails(selectedNode.data.type);
        setNodeDetails(details);
      } catch (error) {
        console.error("Failed to fetch node details:", error);
        setNodeDetails(null);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedNode?.id, selectedNode?.data.type, getNodeDetails]);

  // Subscribe to workflow for real-time updates
  useEffect(() => {
    if (!enableRealTimeUpdates || !workflow?.workflowId) return;

    subscribeToWorkflow(workflow.workflowId);

    return () => {
      unsubscribeFromWorkflow(workflow.workflowId);
    };
  }, [
    enableRealTimeUpdates,
    workflow?.workflowId,
    subscribeToWorkflow,
    unsubscribeFromWorkflow,
  ]);

  // Listen to real-time node events
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const handleNodeStarted = (event: NodeEvent) => {
      setNodeStates((prev) => new Map(prev).set(event.nodeName, "running"));
      updateNodeStatus(event.nodeName, "running");

      // Animate edge leading to this node
      animateEdgeToNode(event.nodeName);

      // Update progress
      updateProgress();

      // Play sound
      playSound("start");
    };

    const handleNodeCompleted = (event: NodeEvent) => {
      const status = event.status === "success" ? "success" : "error";
      setNodeStates((prev) => new Map(prev).set(event.nodeName, status));
      updateNodeStatus(event.nodeName, status);

      // Update progress
      updateProgress();

      // Play sound
      playSound(status === "success" ? "success" : "error");
    };

    const handleNodeRunning = (event: NodeEvent) => {
      setNodeStates((prev) => new Map(prev).set(event.nodeName, "running"));
      updateNodeStatus(event.nodeName, "running");
    };

    const handleNodeData = (event: NodeEvent) => {
      setLiveNodeData((prev) =>
        new Map(prev).set(event.nodeName, {
          inputData: event.inputData,
          outputData: event.outputData,
          timestamp: event.timestamp,
        })
      );
    };

    const unsubscribeStarted = addEventListener(
      "node:started",
      handleNodeStarted
    );
    const unsubscribeCompleted = addEventListener(
      "node:completed",
      handleNodeCompleted
    );
    const unsubscribeRunning = addEventListener(
      "node:running",
      handleNodeRunning
    );
    const unsubscribeData = addEventListener("node:data", handleNodeData);

    return () => {
      unsubscribeStarted();
      unsubscribeCompleted();
      unsubscribeRunning();
      unsubscribeData();
    };
  }, [enableRealTimeUpdates, addEventListener]);

  // Update node status in React Flow
  const updateNodeStatus = useCallback(
    (nodeName: string, status: string) => {
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
    },
    [setNodes]
  );

  // Animate edge leading to a node
  const animateEdgeToNode = useCallback(
    (nodeName: string) => {
      setEdges((eds) =>
        eds.map((edge) => {
          // Find the edge that connects to this node
          const targetNode = nodes.find((n) => n.id === edge.target);
          if (targetNode?.data.label === nodeName) {
            return {
              ...edge,
              animated: true,
              style: {
                ...edge.style,
                stroke: "#3b82f6",
                strokeWidth: 3,
              },
            };
          }
          return edge;
        })
      );
    },
    [nodes, setEdges]
  );

  // Update execution progress
  const updateProgress = useCallback(() => {
    const totalNodes = nodes.length;
    if (totalNodes === 0) return;

    const completedNodes = Array.from(nodeStates.values()).filter(
      (status) => status === "success" || status === "error"
    ).length;

    const progress = Math.round((completedNodes / totalNodes) * 100);
    setExecutionProgress(progress);
  }, [nodes.length, nodeStates]);

  // Play sound effects (optional, can be muted)
  const playSound = useCallback(
    (type: "start" | "success" | "error") => {
      if (!soundsEnabled) return;

      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Different frequencies for different events
        switch (type) {
          case "start":
            oscillator.frequency.value = 440; // A4
            gainNode.gain.value = 0.1;
            break;
          case "success":
            oscillator.frequency.value = 523.25; // C5
            gainNode.gain.value = 0.15;
            break;
          case "error":
            oscillator.frequency.value = 220; // A3
            gainNode.gain.value = 0.2;
            break;
        }

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (error) {
        // Silently fail if audio not supported
        console.debug("[WorkflowCanvas] Audio not supported:", error);
      }
    },
    [soundsEnabled]
  );

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
      const x = 250; // Keep X constant for vertical layout
      const y = isFirst ? 100 : 100 + index * 200; // Increment Y for vertical layout

      return {
        id: node.id,
        type: "custom",
        position: { x, y },
        data: {
          label: node.name,
          type: node.type,
          nodeType: node.type.split(".").pop(),
          description:
            node.parameters?.text ||
            node.parameters?.message ||
            node.parameters?.channelId ||
            getNodeDescription(node.type),
          parameters: node.parameters,
          rawNode: node,
          executionStatus: nodeStatusMap.get(node.name) || "pending",
          isPreview: isPreview, // Pass preview mode to node
          // Add animation delay for staggered entrance
          animationDelay: index * 80, // 80ms delay per node
        },
        // Start nodes transparent for entrance animation (no transform to avoid position issues)
        style: {
          opacity: 0,
        },
      };
    });

    // Create edges from connections
    const flowEdges: Edge[] = [];

    // Simple approach: connect nodes sequentially if no connections specified
    if (
      !workflow.connections ||
      Object.keys(workflow.connections).length === 0
    ) {
      // Connect nodes in sequence
      for (let i = 0; i < flowNodes.length - 1; i++) {
        flowEdges.push({
          id: `edge-${i}`,
          source: flowNodes[i].id,
          target: flowNodes[i + 1].id,
          sourceHandle: "output",
          targetHandle: "input",
          type: "smoothstep",
          animated: i === 0, // Only animate first edge
          style: {
            stroke: "#94a3b8",
            strokeWidth: 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#94a3b8",
          },
        });
      }
    } else {
      // Use n8n connections
      Object.entries(workflow.connections).forEach(
        ([sourceNode, connections]: any) => {
          const sourceNodeData = workflow.nodes.find(
            (n: any) => n.name === sourceNode
          );

          if (connections.main && connections.main[0]) {
            connections.main[0].forEach((connection: any) => {
              const targetNodeData = workflow.nodes.find(
                (n: any) => n.name === connection.node
              );

              if (sourceNodeData && targetNodeData) {
                const edge = {
                  id: `${sourceNodeData.id}-${targetNodeData.id}`,
                  source: sourceNodeData.id,
                  target: targetNodeData.id,
                  sourceHandle: "output",
                  targetHandle: "input",
                  type: "smoothstep",
                  animated: flowEdges.length === 0, // Only animate first edge
                  style: {
                    stroke: "#94a3b8",
                    strokeWidth: 1.5,
                  },
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: "#94a3b8",
                  },
                };
                flowEdges.push(edge);
                console.warn(
                  "  - Target node found:",
                  !!targetNodeData,
                  connection.node
                );
              }
            });
          }
        }
      );
    }

    // Set all nodes at once but invisible for animation
    setNodes(flowNodes);

    // Animate nodes in with staggered fade-in delay
    flowNodes.forEach((node, index) => {
      setTimeout(() => {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  style: {
                    opacity: 1,
                    transition: "opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                  },
                }
              : n
          )
        );
      }, index * 100); // Stagger by 100ms per node
    });

    // IMPORTANT: Delay edge rendering to allow nodes to be measured first
    // This ensures handles are positioned correctly before edges connect
    setTimeout(
      () => {
        setEdges(flowEdges);

        // Fit view after edges are added and force update
        setTimeout(
          () => {
            if (reactFlowInstance) {
              reactFlowInstance.fitView({
                padding: 0.3,
                duration: isPreview ? 0 : 800,
              });
              // Force ReactFlow to recalculate edge paths
              if (isPreview) {
                reactFlowInstance.fitView({ padding: 0.3, duration: 0 });
              }
            }
          },
          isPreview ? 100 : 50
        );
      },
      // Wait for nodes animation to start
      isPreview ? 200 : Math.max(flowNodes.length * 100 + 200, 400)
    );

    // Detect control flow groups
    detectControlFlowGroups(flowNodes, workflow.connections || {});
  }, [workflow, reactFlowInstance, latestExecution, isPreview]);

  // Detect and group control flow structures
  const detectControlFlowGroups = useCallback(
    (flowNodes: Node[], connections: any) => {
      const groups: Array<{
        id: string;
        type: string;
        nodes: string[];
        condition?: string;
      }> = [];

      flowNodes.forEach((node) => {
        if (isControlFlowNode(node.data.type)) {
          const flowType = getControlFlowType(node.data.type);
          if (!flowType) return;

          // Find nodes that are part of this control flow
          const connectedNodes: string[] = [node.id];

          // For loops, find nodes in the loop body (nodes that connect back)
          if (flowType === "loop") {
            // Find all nodes connected from this loop node
            Object.entries(connections).forEach(([sourceName, conns]: any) => {
              const sourceNode = flowNodes.find(
                (n) => n.data.label === sourceName
              );
              if (sourceNode?.id === node.id && conns.main && conns.main[0]) {
                conns.main[0].forEach((conn: any) => {
                  const targetNode = flowNodes.find(
                    (n) => n.data.label === conn.node
                  );
                  if (targetNode) connectedNodes.push(targetNode.id);
                });
              }
            });
          }

          // Get condition text if available
          let condition = "";
          if (flowType === "if" && node.data.parameters?.conditions) {
            condition = "IF condition";
          } else if (flowType === "switch" && node.data.parameters?.rules) {
            condition = "SWITCH";
          } else if (flowType === "loop") {
            const batchSize = node.data.parameters?.batchSize || 1;
            condition = `Loop (batch: ${batchSize})`;
          }

          groups.push({
            id: node.id,
            type: flowType,
            nodes: connectedNodes,
            condition,
          });
        }
      });

      setControlFlowGroups(groups);
    },
    []
  );

  return (
    <div
      className="w-full h-full relative"
      key={`canvas-${workflow?.id || workflow?.name}`}
    >
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm"
        >
          <div className="text-center space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 text-primary mx-auto flex items-center justify-center"
            >
              <Loader2 className="w-12 h-12" />
            </motion.div>
            <p className="text-sm text-muted-foreground">
              Generating workflow nodes...
            </p>
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
          animated: false,
          style: {
            strokeWidth: 1.5,
            stroke: "#94a3b8",
          },
        }}
        className="bg-transparent"
      >
        {/* Control Flow Containers - Rendered behind nodes */}
        {controlFlowGroups.map((group) => {
          const controlNode = nodes.find((n) => n.id === group.id);
          if (!controlNode) return null;

          return (
            <ControlFlowContainer key={group.id} group={group} nodes={nodes} />
          );
        })}
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1.5}
          color={
            isPreview ? "hsl(var(--border))" : "hsl(var(--muted-foreground))"
          }
          className={isPreview ? "opacity-20" : "opacity-40"}
        />
        {!isPreview && (
          <>
            <Controls className="bg-background/80 backdrop-blur-xl border border-border rounded-lg" />
            <MiniMap
              className="bg-background/80 backdrop-blur-xl border border-border rounded-lg"
              nodeColor={(node) => {
                const visual = getNodeVisual(node.data.type, node.data.label);
                // Extract hex color from category
                if (
                  visual.category.includes("webhook") ||
                  visual.category.includes("trigger")
                )
                  return "#3b82f6";
                if (visual.category.includes("schedule")) return "#a855f7";
                if (visual.category.includes("slack")) return "#22c55e";
                if (visual.category.includes("email")) return "#f97316";
                if (visual.category.includes("database")) return "#3b82f6";
                return "#6b7280";
              }}
            />
          </>
        )}

        {workflow && !isPreview && (
          <Panel
            position="top-left"
            className="bg-background/80 backdrop-blur-xl border border-border rounded-lg p-3"
          >
            <div className="text-sm">
              <div className="font-medium text-foreground">{workflow.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {workflow.nodes?.length || 0} nodes •{" "}
                {Object.keys(workflow.connections || {}).length} connections
              </div>
            </div>
          </Panel>
        )}

        {/* Progress Bar - Show during execution */}
        {enableRealTimeUpdates &&
          executionProgress > 0 &&
          executionProgress < 100 && (
            <Panel
              position="top-center"
              className="bg-background/90 backdrop-blur-xl border border-border rounded-lg p-3 min-w-[300px]"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Execution Progress</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSoundsEnabled(!soundsEnabled)}
                      className="p-1 hover:bg-accent rounded transition-colors"
                      title={soundsEnabled ? "Mute sounds" : "Enable sounds"}
                    >
                      {soundsEnabled ? (
                        <Volume2 className="w-4 h-4 text-primary" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <span className="text-muted-foreground">
                      {executionProgress}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${executionProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {
                    Array.from(nodeStates.values()).filter(
                      (s) => s === "success"
                    ).length
                  }{" "}
                  completed •{" "}
                  {
                    Array.from(nodeStates.values()).filter(
                      (s) => s === "running"
                    ).length
                  }{" "}
                  running •{" "}
                  {
                    Array.from(nodeStates.values()).filter((s) => s === "error")
                      .length
                  }{" "}
                  errors
                </div>
              </div>
            </Panel>
          )}

        {/* Live Node Inspector - Show when node is clicked during execution */}
        {enableRealTimeUpdates &&
          clickedNode &&
          liveNodeData.has(clickedNode.data.label) && (
            <Panel
              position="bottom-right"
              className="bg-background/95 backdrop-blur-xl border border-border rounded-lg p-4 max-w-md"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="font-semibold">
                      {clickedNode.data.label}
                    </span>
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
                    <div className="text-xs font-medium text-muted-foreground">
                      Live Output
                    </div>
                    <div className="text-xs font-mono bg-accent/50 p-2 rounded max-h-32 overflow-auto">
                      {JSON.stringify(
                        liveNodeData.get(clickedNode.data.label)?.outputData,
                        null,
                        2
                      )}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Last updated:{" "}
                  {new Date(
                    liveNodeData.get(clickedNode.data.label)?.timestamp
                  ).toLocaleTimeString()}
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
                    const visual = getNodeVisual(
                      selectedNode.data.type,
                      selectedNode.data.label
                    );
                    const Icon = visual.icon;
                    return <Icon className="w-4 h-4 text-primary" />;
                  })()}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {selectedNode.data.label}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedNode.data.nodeType}
                  </p>
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
                <label className="text-xs font-medium text-muted-foreground">
                  Node Type
                </label>
                <p className="text-sm text-foreground mt-1 font-mono text-xs bg-accent/50 px-2 py-1 rounded">
                  {selectedNode.data.type}
                </p>
              </div>

              {/* Schedule Editing for schedule nodes */}
              {selectedNode.data.type.includes("schedule") && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Schedule Configuration
                    </label>
                    {!isEditingNode ? (
                      <button
                        onClick={() => {
                          setIsEditingNode(true);
                          setEditedParameters(
                            selectedNode.data.parameters || {}
                          );
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
                          alert(
                            "Schedule updated! (Note: In production, this would update via API)"
                          );
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
                        <label className="text-xs text-muted-foreground">
                          Cron Expression
                        </label>
                        <input
                          type="text"
                          value={
                            editedParameters?.rule?.interval?.[0]?.expression ||
                            ""
                          }
                          onChange={(e) => {
                            setEditedParameters({
                              ...editedParameters,
                              rule: {
                                interval: [
                                  {
                                    field: "cronExpression",
                                    expression: e.target.value,
                                  },
                                ],
                              },
                            });
                          }}
                          className="w-full mt-1 px-2 py-1 text-xs font-mono bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="0 9 * * 1-5"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Examples:
                        </p>
                        <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                          <div>
                            •{" "}
                            <code className="bg-accent/50 px-1 rounded">
                              0 9 * * 1-5
                            </code>{" "}
                            - Weekdays at 9am
                          </div>
                          <div>
                            •{" "}
                            <code className="bg-accent/50 px-1 rounded">
                              0 * * * *
                            </code>{" "}
                            - Every hour
                          </div>
                          <div>
                            •{" "}
                            <code className="bg-accent/50 px-1 rounded">
                              */15 * * * *
                            </code>{" "}
                            - Every 15 min
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-accent/30 px-2 py-1.5 rounded">
                      <div className="text-xs font-medium text-foreground">
                        Cron Expression
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {selectedNode.data.parameters?.rule?.interval?.[0]
                          ?.expression || "Not set"}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Regular parameters for non-schedule nodes or when not editing */}
              {!selectedNode.data.type.includes("schedule") &&
                selectedNode.data.parameters &&
                Object.keys(selectedNode.data.parameters).length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Configuration
                      </label>
                      {isLoadingDetails && (
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(selectedNode.data.parameters).map(
                        ([key, value]: any) => {
                          // Try to find parameter definition from MCP details
                          const paramDef = Array.isArray(
                            nodeDetails?.properties
                          )
                            ? nodeDetails.properties.find(
                                (p: any) =>
                                  p.name === key || p.displayName === key
                              )
                            : null;

                          return (
                            <div
                              key={key}
                              className="bg-accent/30 px-3 py-2 rounded-lg border border-border/50"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <div className="text-xs font-semibold text-foreground">
                                      {paramDef?.displayName || key}
                                    </div>
                                    {paramDef?.required && (
                                      <span className="text-xs text-red-500">
                                        *
                                      </span>
                                    )}
                                  </div>
                                  {paramDef?.description && (
                                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                      {paramDef.description}
                                    </div>
                                  )}
                                </div>
                                {paramDef && (
                                  <div className="flex-shrink-0">
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                                      {paramDef.type}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 text-xs bg-background/50 px-2 py-1.5 rounded border border-border/30 font-mono break-all">
                                {typeof value === "object" ? (
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(value, null, 2)}
                                  </pre>
                                ) : (
                                  <span className="text-foreground">
                                    {String(value)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>

                    {/* Show MCP node description if available */}
                    {nodeDetails?.description && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-start gap-2">
                          <Info className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-muted-foreground leading-relaxed">
                            {nodeDetails.description}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Show message if no parameters */}
              {!selectedNode.data.type.includes("schedule") &&
                (!selectedNode.data.parameters ||
                  Object.keys(selectedNode.data.parameters).length === 0) && (
                  <div className="bg-accent/20 px-3 py-2 rounded-lg border border-border/50">
                    <div className="text-xs text-muted-foreground text-center">
                      No parameters configured for this node
                    </div>
                  </div>
                )}

              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Node ID</span>
                  <span className="font-mono text-foreground">
                    {selectedNode.id.slice(0, 12)}...
                  </span>
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
