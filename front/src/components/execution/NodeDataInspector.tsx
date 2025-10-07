'use client';

/**
 * 🔍 NODE DATA INSPECTOR
 * 
 * Shows detailed input/output data for each node during execution.
 * Similar to n8n's execution view where you can see what data flows through each node.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  CheckCircle, 
  XCircle, 
  Clock,
  Database,
  ArrowRight,
  Code,
  FileJson
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NodeExecutionData {
  nodeName: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  executionTime?: number;
  error?: string;
  inputData?: any;
  outputData?: any;
  startTime?: Date;
  endTime?: Date;
}

interface NodeDataInspectorProps {
  execution: {
    id: string;
    status: string;
    startedAt: Date;
    finishedAt?: Date;
    data?: any;
    nodeExecutions?: NodeExecutionData[];
  };
  workflowNodes: any[];
}

export function NodeDataInspector({ execution, workflowNodes }: NodeDataInspectorProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'json' | 'table'>('json');

  // Parse execution data to extract node-level information
  const getNodeExecutionData = (): NodeExecutionData[] => {
    const nodeData: NodeExecutionData[] = [];

    // Check if we have runData from n8n
    if (execution.data?.resultData?.runData) {
      const runData = execution.data.resultData.runData;

      Object.entries(runData).forEach(([nodeName, runs]: [string, any]) => {
        if (Array.isArray(runs) && runs.length > 0) {
          const lastRun = runs[runs.length - 1];

          nodeData.push({
            nodeName,
            status: lastRun.error ? 'error' : 'success',
            executionTime: lastRun.executionTime,
            error: lastRun.error?.message,
            inputData: lastRun.data?.main?.[0] || [],
            outputData: lastRun.data?.main?.[0] || [],
            startTime: lastRun.startTime ? new Date(lastRun.startTime) : undefined,
            endTime: lastRun.executionTime 
              ? new Date(new Date(lastRun.startTime).getTime() + lastRun.executionTime)
              : undefined
          });
        }
      });
    } else if (execution.nodeExecutions) {
      // Fallback to nodeExecutions if available
      return execution.nodeExecutions;
    }

    return nodeData;
  };

  const nodeExecutions = getNodeExecutionData();

  const toggleNode = (nodeName: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeName)) {
      newExpanded.delete(nodeName);
    } else {
      newExpanded.add(nodeName);
    }
    setExpandedNodes(newExpanded);
  };

  const copyToClipboard = (data: any, path: string) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const JsonViewer = ({ data, path = 'root' }: { data: any; path?: string }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (data === null || data === undefined) {
      return <span className="text-muted-foreground italic">null</span>;
    }

    if (typeof data !== 'object') {
      return (
        <span className={`font-mono text-sm ${
          typeof data === 'string' ? 'text-green-600 dark:text-green-400' :
          typeof data === 'number' ? 'text-blue-600 dark:text-blue-400' :
          typeof data === 'boolean' ? 'text-purple-600 dark:text-purple-400' :
          'text-foreground'
        }`}>
          {typeof data === 'string' ? `"${data}"` : String(data)}
        </span>
      );
    }

    const isArray = Array.isArray(data);
    const entries = isArray ? data : Object.entries(data);
    const isEmpty = entries.length === 0;

    return (
      <div className="ml-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 hover:bg-accent/50 rounded px-1 -ml-1"
        >
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <span className="font-mono text-sm text-muted-foreground">
            {isArray ? `Array[${entries.length}]` : `Object{${entries.length}}`}
          </span>
        </button>
        
        {isExpanded && !isEmpty && (
          <div className="ml-4 border-l border-border pl-3 mt-1 space-y-1">
            {isArray ? (
              entries.map((item: any, index: number) => (
                <div key={index} className="flex gap-2">
                  <span className="text-muted-foreground font-mono text-xs">[{index}]:</span>
                  <JsonViewer data={item} path={`${path}[${index}]`} />
                </div>
              ))
            ) : (
              entries.map(([key, value]: [string, any]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-foreground font-mono text-xs font-semibold">{key}:</span>
                  <JsonViewer data={value} path={`${path}.${key}`} />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  const TableViewer = ({ data }: { data: any[] }) => {
    if (!Array.isArray(data) || data.length === 0) {
      return <p className="text-sm text-muted-foreground">No data</p>;
    }

    const firstItem = data[0];
    if (typeof firstItem !== 'object') {
      return <JsonViewer data={data} />;
    }

    const columns = Object.keys(firstItem);

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              {columns.map(col => (
                <th key={col} className="text-left p-2 font-semibold text-foreground">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-b border-border/50 hover:bg-accent/30">
                {columns.map(col => (
                  <td key={col} className="p-2 font-mono text-xs">
                    {typeof row[col] === 'object' 
                      ? JSON.stringify(row[col]) 
                      : String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (nodeExecutions.length === 0) {
    return (
      <div className="p-8 text-center">
        <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">No execution data available</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Run the workflow to see node-level data
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h3 className="font-semibold text-sm">Node Execution Data</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === 'json' ? 'default' : 'outline'}
            onClick={() => setViewMode('json')}
            className="h-7 text-xs"
          >
            <Code className="w-3 h-3 mr-1" />
            JSON
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'outline'}
            onClick={() => setViewMode('table')}
            className="h-7 text-xs"
          >
            <FileJson className="w-3 h-3 mr-1" />
            Table
          </Button>
        </div>
      </div>

      {/* Node List */}
      <div className="space-y-2">
        {nodeExecutions.map((nodeExec, index) => {
          const isExpanded = expandedNodes.has(nodeExec.nodeName);
          const hasData = nodeExec.outputData && (
            Array.isArray(nodeExec.outputData) ? nodeExec.outputData.length > 0 : true
          );

          return (
            <motion.div
              key={nodeExec.nodeName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border border-border rounded-lg overflow-hidden bg-background/50"
            >
              {/* Node Header */}
              <button
                onClick={() => toggleNode(nodeExec.nodeName)}
                className="w-full flex items-center justify-between p-3 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  
                  {/* Status Icon */}
                  {nodeExec.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : nodeExec.status === 'error' ? (
                    <XCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-blue-500 animate-spin" />
                  )}

                  <div className="text-left">
                    <div className="font-medium text-sm">{nodeExec.nodeName}</div>
                    <div className="text-xs text-muted-foreground">
                      {nodeExec.executionTime !== undefined && `${nodeExec.executionTime}ms`}
                      {hasData && ` • ${Array.isArray(nodeExec.outputData) ? nodeExec.outputData.length : 1} item(s)`}
                    </div>
                  </div>
                </div>

                {nodeExec.error && (
                  <span className="text-xs text-red-500 max-w-xs truncate">
                    {nodeExec.error}
                  </span>
                )}
              </button>

              {/* Node Data */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-border"
                  >
                    <div className="p-4 space-y-4">
                      {/* Input Data */}
                      {nodeExec.inputData && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <ArrowRight className="w-3 h-3 text-blue-500" />
                              <span className="text-xs font-semibold text-muted-foreground">INPUT</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(nodeExec.inputData, `${nodeExec.nodeName}-input`)}
                              className="h-6 px-2 text-xs"
                            >
                              {copiedPath === `${nodeExec.nodeName}-input` ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                          <div className="bg-accent/20 rounded p-3 max-h-60 overflow-auto">
                            {viewMode === 'table' && Array.isArray(nodeExec.inputData) ? (
                              <TableViewer data={nodeExec.inputData} />
                            ) : (
                              <JsonViewer data={nodeExec.inputData} path={`${nodeExec.nodeName}.input`} />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Output Data */}
                      {nodeExec.outputData && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <ArrowRight className="w-3 h-3 text-green-500" />
                              <span className="text-xs font-semibold text-muted-foreground">OUTPUT</span>
                              {Array.isArray(nodeExec.outputData) && (
                                <span className="text-xs text-muted-foreground">
                                  ({nodeExec.outputData.length} items, {formatBytes(JSON.stringify(nodeExec.outputData).length)})
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(nodeExec.outputData, `${nodeExec.nodeName}-output`)}
                              className="h-6 px-2 text-xs"
                            >
                              {copiedPath === `${nodeExec.nodeName}-output` ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                          <div className="bg-accent/20 rounded p-3 max-h-60 overflow-auto">
                            {viewMode === 'table' && Array.isArray(nodeExec.outputData) ? (
                              <TableViewer data={nodeExec.outputData} />
                            ) : (
                              <JsonViewer data={nodeExec.outputData} path={`${nodeExec.nodeName}.output`} />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Error Details */}
                      {nodeExec.error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs font-semibold text-red-500">ERROR</span>
                          </div>
                          <p className="text-xs text-red-600 dark:text-red-400 font-mono">
                            {nodeExec.error}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
