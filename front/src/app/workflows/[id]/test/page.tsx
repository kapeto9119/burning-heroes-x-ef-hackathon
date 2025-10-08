'use client';

/**
 * 🧪 WORKFLOW TEST PAGE
 * 
 * Test and simulate workflow executions with custom input data.
 * View step-by-step execution and inspect data at each node.
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Play, 
  ArrowLeft, 
  Loader2, 
  FileJson,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Background } from '@/components/layout/Background';
import { Button } from '@/components/ui/button';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { NodeDataInspector } from '@/components/execution/NodeDataInspector';
import { executeWorkflow, getWorkflowExecutions } from '@/app/actions/workflows';
import { getClientToken } from '@/lib/auth';

export default function WorkflowTestPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const [workflow, setWorkflow] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<any>(null);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [testPayload, setTestPayload] = useState('{\n  "test": true,\n  "message": "Test execution"\n}');
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [isGeneratingData, setIsGeneratingData] = useState(false);
  const [isDeployed, setIsDeployed] = useState<boolean | null>(null);
  const [isCheckingDeployment, setIsCheckingDeployment] = useState(true);

  // Load workflow and check deployment status
  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const token = getClientToken();
        
        // Load workflow data
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/workflows/${workflowId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await response.json();
        if (result.success) {
          setWorkflow(result.data);
        }
        
        // Check if workflow is deployed
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
        console.error('Failed to load workflow:', error);
        setIsDeployed(false);
      } finally {
        setIsLoading(false);
        setIsCheckingDeployment(false);
      }
    };

    loadWorkflow();
  }, [workflowId]);

  // Load execution history
  useEffect(() => {
    const loadHistory = async () => {
      const token = getClientToken();
      if (!token) return;
      
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
        // Check if it's a deployment error
        if (result.error?.includes('not deployed') || result.error?.includes('Workflow not deployed')) {
          alert('⚠️ This workflow needs to be deployed before testing.\n\nPlease go back and click "Deploy" first.');
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

  if (isLoading) {
    return (
      <div className="min-h-screen relative">
        <div className="fixed inset-0 w-full h-full">
          <Background />
        </div>
        <Navbar />
        <div className="relative z-10 flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen relative">
        <div className="fixed inset-0 w-full h-full">
          <Background />
        </div>
        <Navbar />
        <div className="relative z-10 flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Workflow not found</p>
            <Button onClick={() => router.push('/workflows')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Workflows
            </Button>
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

        <div className="container mx-auto px-6 py-8 max-w-[1800px]">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button
              variant="ghost"
              onClick={() => router.push('/workflows')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Workflows
            </Button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Test Workflow</h1>
                <p className="text-muted-foreground">{workflow.name}</p>
                
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
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isExecuting}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button
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
              </div>
            </div>
          </motion.div>

          {/* Not Deployed Warning */}
          {!isCheckingDeployment && !isDeployed && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 backdrop-blur-xl bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-600 mb-1">Workflow Not Deployed</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    This workflow needs to be deployed before you can test it. Deployment creates
                    the necessary infrastructure and connections in n8n.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => router.push('/workflows')}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    Go Back to Deploy
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Workflow Canvas */}
            <div className="lg:col-span-2 space-y-6">
              {/* Canvas */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="backdrop-blur-xl bg-background/40 rounded-2xl border border-border overflow-hidden"
              >
                <div className="p-4 border-b border-border">
                  <h2 className="font-semibold">Workflow Visualization</h2>
                  <p className="text-sm text-muted-foreground">
                    {workflow.nodes?.length || 0} nodes
                  </p>
                </div>
                <div className="h-[500px]">
                  <WorkflowCanvas
                    workflow={workflow}
                    isGenerating={false}
                    latestExecution={currentExecution}
                    enableRealTimeUpdates={true}
                  />
                </div>
              </motion.div>

              {/* Node Data Inspector */}
              {currentExecution && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="backdrop-blur-xl bg-background/40 rounded-2xl border border-border overflow-hidden"
                >
                  <div className="p-4 border-b border-border">
                    <h2 className="font-semibold">Node Execution Data</h2>
                    <p className="text-sm text-muted-foreground">
                      Inspect input/output data for each node
                    </p>
                  </div>
                  <div className="p-4 max-h-[600px] overflow-y-auto">
                    <NodeDataInspector
                      execution={currentExecution}
                      workflowNodes={workflow.nodes || []}
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right Column - Test Controls & History */}
            <div className="space-y-6">
              {/* Test Payload */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="backdrop-blur-xl bg-background/40 rounded-2xl border border-border overflow-hidden"
              >
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
                    className="w-full h-64 bg-accent/30 rounded-lg p-3 font-mono text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
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
              </motion.div>

              {/* Execution History */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="backdrop-blur-xl bg-background/40 rounded-2xl border border-border overflow-hidden"
              >
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold">Recent Executions</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {executionHistory.length} test runs
                  </p>
                </div>
                <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                  {executionHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No test executions yet
                    </p>
                  ) : (
                    executionHistory.map((exec) => (
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
                            {exec.status === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : exec.status === 'error' ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                            )}
                            <span className="text-sm font-medium capitalize">
                              {exec.status}
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
                    ))
                  )}
                </div>
              </motion.div>

              {/* Quick Stats */}
              {executionHistory.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="backdrop-blur-xl bg-background/40 rounded-2xl border border-border p-4"
                >
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
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
