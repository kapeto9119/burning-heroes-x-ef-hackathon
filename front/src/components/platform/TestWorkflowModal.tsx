'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Loader2, 
  FileJson,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { NodeDataInspector } from '@/components/execution/NodeDataInspector';
import { executeWorkflow, getWorkflowExecutions } from '@/app/actions/workflows';
import { getClientToken } from '@/lib/auth';

interface TestWorkflowModalProps {
  workflow: any;
  onClose: () => void;
}

export function TestWorkflowModal({ workflow, onClose }: TestWorkflowModalProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<any>(null);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [testPayload, setTestPayload] = useState('{\n  "test": true,\n  "message": "Test execution"\n}');
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [isGeneratingData, setIsGeneratingData] = useState(false);
  const [isDeployed, setIsDeployed] = useState<boolean | null>(null);
  const [isCheckingDeployment, setIsCheckingDeployment] = useState(true);

  const workflowId = workflow?.workflowId || workflow?.id;

  // Check deployment status
  useEffect(() => {
    const checkDeployment = async () => {
      try {
        const token = getClientToken();
        const deployResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/deploy/${workflowId}/status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        if (deployResponse.ok) {
          const deployResult = await deployResponse.json();
          setIsDeployed(deployResult.success && deployResult.data?.deployed);
        } else {
          setIsDeployed(false);
        }
      } catch (error) {
        console.error('Failed to check deployment:', error);
        setIsDeployed(false);
      } finally {
        setIsCheckingDeployment(false);
      }
    };

    if (workflowId) {
      checkDeployment();
    }
  }, [workflowId]);

  // Load execution history
  useEffect(() => {
    const loadHistory = async () => {
      const token = getClientToken();
      if (!token || !workflowId) return;
      
      const result = await getWorkflowExecutions(workflowId, 5, token || undefined);
      if (result.success) {
        setExecutionHistory(result.data || []);
        if (result.data && result.data.length > 0) {
          setCurrentExecution(result.data[0]);
        }
      }
    };

    loadHistory();
  }, [workflowId]);

  const validatePayload = (payload: string): boolean => {
    try {
      JSON.parse(payload);
      setPayloadError(null);
      return true;
    } catch (error: any) {
      setPayloadError(error.message);
      return false;
    }
  };

  const handleExecute = async () => {
    if (!validatePayload(testPayload)) {
      return;
    }

    const token = getClientToken();
    if (!token) {
      alert('Authentication required. Please log in again.');
      return;
    }

    setIsExecuting(true);
    try {
      const payload = JSON.parse(testPayload);
      const result = await executeWorkflow(workflowId, payload, token || undefined);

      if (result.success) {
        // Refresh execution history
        const historyResult = await getWorkflowExecutions(workflowId, 5, token || undefined);
        if (historyResult.success && historyResult.data) {
          setExecutionHistory(historyResult.data);
          setCurrentExecution(historyResult.data[0]);
        }
      } else {
        if (result.error?.includes('not deployed') || result.error?.includes('Workflow not deployed')) {
          alert('⚠️ This workflow needs to be deployed before testing.\n\nPlease deploy it first.');
        } else {
          alert('Execution failed: ' + result.error);
        }
      }
    } catch (error: any) {
      alert('Execution error: ' + error.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReset = () => {
    setCurrentExecution(null);
    setTestPayload('{\n  "test": true,\n  "message": "Test execution"\n}');
    setPayloadError(null);
  };

  const handleGenerateWithAI = async () => {
    if (!workflow) return;

    setIsGeneratingData(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/test-data/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ workflow }),
        }
      );

      const result = await response.json();

      if (result.success && result.data) {
        const generatedData = result.data.testData;
        setTestPayload(JSON.stringify(generatedData, null, 2));
        setPayloadError(null);
      } else {
        alert('Failed to generate test data: ' + result.error);
      }
    } catch (error: any) {
      alert('Error generating test data: ' + error.message);
    } finally {
      setIsGeneratingData(false);
    }
  };

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
            <h2 className="text-2xl font-bold">Test Workflow</h2>
            <p className="text-sm text-muted-foreground mt-1">{workflow?.name}</p>
            
            {/* Deployment Status Badge */}
            {!isCheckingDeployment && (
              <div className="mt-2">
                {isDeployed ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-500/10 border border-green-500/30 text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    Deployed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-600">
                    <AlertCircle className="w-3 h-3" />
                    Not Deployed
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isExecuting}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleExecute}
              disabled={isExecuting || !!payloadError || !isDeployed || isCheckingDeployment}
              className="bg-green-600 hover:bg-green-700 text-white"
              title={!isDeployed ? 'Deploy the workflow first to test it' : ''}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Test
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

        {/* Not Deployed Warning */}
        {!isCheckingDeployment && !isDeployed && (
          <div className="mx-6 mt-4 backdrop-blur-xl bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-600 mb-1">Workflow Not Deployed</h3>
                <p className="text-sm text-muted-foreground">
                  This workflow needs to be deployed before you can test it. Deployment creates
                  the necessary infrastructure and connections in n8n.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden min-h-0">
          {/* Left Column - Workflow Canvas */}
          <div className="lg:col-span-2 space-y-4 overflow-y-auto">
            {/* Canvas */}
            <div className="backdrop-blur-xl bg-background/40 rounded-2xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold">Workflow Visualization</h2>
                <p className="text-sm text-muted-foreground">
                  {workflow?.nodes?.length || 0} nodes
                </p>
              </div>
              <div className="h-[400px]">
                <WorkflowCanvas
                  workflow={workflow}
                  isGenerating={false}
                  latestExecution={currentExecution}
                  enableRealTimeUpdates={true}
                />
              </div>
            </div>

            {/* Node Data Inspector */}
            {currentExecution && (
              <div className="backdrop-blur-xl bg-background/40 rounded-2xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="font-semibold">Node Execution Data</h2>
                  <p className="text-sm text-muted-foreground">
                    Inspect input/output data for each node
                  </p>
                </div>
                <div className="p-4 max-h-[400px] overflow-y-auto">
                  <NodeDataInspector
                    execution={currentExecution}
                    workflowNodes={workflow?.nodes || []}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Test Controls & History */}
          <div className="space-y-4 overflow-y-auto">
            {/* Test Payload */}
            <div className="backdrop-blur-xl bg-background/40 rounded-2xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold">Test Payload</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Provide input data for the workflow
                </p>
              </div>
              <div className="p-4">
                <textarea
                  value={testPayload}
                  onChange={(e) => {
                    setTestPayload(e.target.value);
                    validatePayload(e.target.value);
                  }}
                  className="w-full h-48 bg-accent/30 rounded-lg p-3 font-mono text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder='{\n  "key": "value"\n}'
                />
                {payloadError && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500">
                    Invalid JSON: {payloadError}
                  </div>
                )}
                
                {/* AI Generate Button */}
                <div className="mt-3">
                  <Button
                    size="sm"
                    onClick={handleGenerateWithAI}
                    disabled={isGeneratingData}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30 dark:shadow-purple-500/20"
                  >
                    {isGeneratingData ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Test Data with AI
                      </>
                    )}
                  </Button>
                </div>

                {/* Preset Templates */}
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Or use a preset:</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTestPayload('{\n  "test": true\n}')}
                      className="text-xs"
                    >
                      Simple
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTestPayload('{\n  "name": "John Doe",\n  "email": "john@example.com",\n  "message": "Hello!"\n}')}
                      className="text-xs"
                    >
                      Form Data
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTestPayload('{\n  "items": [\n    {"id": 1, "name": "Item 1"},\n    {"id": 2, "name": "Item 2"}\n  ]\n}')}
                      className="text-xs"
                    >
                      Array
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Execution History */}
            <div className="backdrop-blur-xl bg-background/40 rounded-2xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold">Recent Executions</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {executionHistory.length} test runs
                </p>
              </div>
              <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                {executionHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No test executions yet
                  </p>
                ) : (
                  executionHistory.map((exec) => {
                    const actualStatus = exec.finishedAt && exec.status === 'running' 
                      ? (exec.error ? 'error' : 'success')
                      : exec.status;

                    return (
                      <button
                        key={exec.id}
                        onClick={() => setCurrentExecution(exec)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          currentExecution?.id === exec.id
                            ? 'bg-primary/10 border-primary'
                            : 'bg-accent/20 border-border hover:bg-accent/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {actualStatus === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : actualStatus === 'error' ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                            )}
                            <span className="text-sm font-medium capitalize">
                              {actualStatus}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(exec.startedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        {exec.finishedAt && (
                          <div className="text-xs text-muted-foreground">
                            Duration: {Math.round(
                              (new Date(exec.finishedAt).getTime() - 
                               new Date(exec.startedAt).getTime())
                            )}ms
                          </div>
                        )}
                        {exec.error && (
                          <div className="text-xs text-red-500 mt-1 truncate">
                            {exec.error}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Stats */}
            {executionHistory.length > 0 && (
              <div className="backdrop-blur-xl bg-background/40 rounded-2xl border border-border p-4">
                <h3 className="font-semibold mb-3 text-sm">Test Statistics</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600">
                      {executionHistory.filter(e => e.status === 'success').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Successful</div>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <div className="text-2xl font-bold text-red-600">
                      {executionHistory.filter(e => e.status === 'error').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
