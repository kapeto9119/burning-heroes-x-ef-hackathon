"use client";

import { ReactFlowProvider } from "reactflow";

/**
 * Client-side wrapper for ReactFlowProvider
 * This allows us to use ReactFlow in the app while keeping the root layout as a Server Component
 */
export function ReactFlowProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReactFlowProvider>{children}</ReactFlowProvider>;
}
