import { useState, useEffect } from 'react';
import { getClientToken } from '@/lib/auth';

export interface NodeDefinition {
  name: string;
  displayName: string;
  type: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  properties?: any;
  credentials?: string[];
  operations?: string[];
}

export interface CategorizedNodes {
  triggers: NodeDefinition[];
  actions: NodeDefinition[];
  logic: NodeDefinition[];
  ai: NodeDefinition[];
  database: NodeDefinition[];
  communication: NodeDefinition[];
}

/**
 * Hook to fetch and manage available N8N nodes
 */
export function useNodes() {
  const [nodes, setNodes] = useState<CategorizedNodes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = getClientToken();
      if (!token) {
        setError('Authentication required');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/nodes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setNodes(data.data);
      } else {
        setError(data.error || 'Failed to fetch nodes');
      }
    } catch (err: any) {
      console.error('[useNodes] Error:', err);
      setError(err.message || 'Failed to fetch nodes');
    } finally {
      setIsLoading(false);
    }
  };

  const searchNodes = async (query: string): Promise<NodeDefinition[]> => {
    try {
      const token = getClientToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/nodes/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (err: any) {
      console.error('[useNodes] Search error:', err);
      throw err;
    }
  };

  const getNodeDetails = async (nodeType: string): Promise<any> => {
    try {
      const token = getClientToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/nodes/${encodeURIComponent(nodeType)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to get node details');
      }
    } catch (err: any) {
      console.error('[useNodes] Get details error:', err);
      throw err;
    }
  };

  return {
    nodes,
    isLoading,
    error,
    refetch: fetchNodes,
    searchNodes,
    getNodeDetails,
  };
}
