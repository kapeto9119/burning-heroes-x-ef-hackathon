'use client';

import React, { useState } from 'react';
import { Search, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { NodeDefinition, CategorizedNodes } from '@/hooks/useNodes';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NodePaletteProps {
  nodes: CategorizedNodes | null;
  isLoading: boolean;
  onNodeSelect?: (node: NodeDefinition) => void;
  onSearch?: (query: string) => Promise<NodeDefinition[]>;
}

export function NodePalette({ nodes, isLoading, onNodeSelect, onSearch }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NodeDefinition[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['triggers', 'actions', 'logic'])
  );

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    if (onSearch) {
      setIsSearching(true);
      try {
        const results = await onSearch(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    } else {
      // Fallback: local search
      if (nodes) {
        const allNodes = [
          ...nodes.triggers,
          ...nodes.actions,
          ...nodes.logic,
          ...nodes.ai,
          ...nodes.database,
          ...nodes.communication,
        ];
        const filtered = allNodes.filter(
          (node) =>
            node.displayName.toLowerCase().includes(query.toLowerCase()) ||
            node.description.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
      }
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDragStart = (event: React.DragEvent, node: NodeDefinition) => {
    event.dataTransfer.setData('application/reactflow', node.type);
    event.dataTransfer.setData('nodeData', JSON.stringify(node));
    event.dataTransfer.effectAllowed = 'move';
    // Cache globally to allow canvas to read during dragover in some browsers
    try {
      // @ts-ignore
      (window as any).__paletteDragNode = node;
    } catch {}
  };

  const categories = [
    { id: 'triggers', name: 'Triggers', icon: '⚡', color: 'text-blue-500' },
    { id: 'actions', name: 'Actions', icon: '⚙️', color: 'text-orange-500' },
    { id: 'logic', name: 'Logic & Flow', icon: '🔀', color: 'text-yellow-500' },
    { id: 'ai', name: 'AI', icon: '🤖', color: 'text-purple-500' },
    { id: 'database', name: 'Database', icon: '🗄️', color: 'text-cyan-500' },
    { id: 'communication', name: 'Communication', icon: '💬', color: 'text-green-500' },
  ];

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading nodes...</p>
        </div>
      </div>
    );
  }

  const displayNodes = searchResults || nodes;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-3">Node Palette</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-accent border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {searchQuery && (
          <p className="text-xs text-muted-foreground mt-2">
            {searchResults ? `${searchResults.length} results` : 'Searching...'}
          </p>
        )}
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {searchResults ? (
          // Search Results
          <div className="space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No nodes found for "{searchQuery}"
              </p>
            ) : (
              searchResults.map((node) => (
                <NodeCard
                  key={node.type}
                  node={node}
                  onDragStart={handleDragStart}
                  onClick={onNodeSelect}
                />
              ))
            )}
          </div>
        ) : (
          // Categorized View
          categories.map((category) => {
            const categoryNodes = nodes?.[category.id as keyof CategorizedNodes] || [];
            const isExpanded = expandedCategories.has(category.id);

            return (
              <div key={category.id} className="space-y-2">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <span className={cn('text-lg', category.color)}>{category.icon}</span>
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {categoryNodes.length}
                  </span>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2 overflow-hidden"
                    >
                      {categoryNodes.map((node, index) => (
                        <NodeCard
                          key={`${node.type}-${index}`}
                          node={node}
                          onDragStart={handleDragStart}
                          onClick={onNodeSelect}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Drag nodes onto the canvas to add them
        </p>
      </div>
    </div>
  );
}

interface NodeCardProps {
  node: NodeDefinition;
  onDragStart: (event: React.DragEvent, node: NodeDefinition) => void;
  onClick?: (node: NodeDefinition) => void;
}

function NodeCard({ node, onDragStart, onClick }: NodeCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, node)}
      onClick={() => onClick?.(node)}
      className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg cursor-grab active:cursor-grabbing hover:border-primary hover:shadow-md transition-all"
      title={node.description}
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 text-lg"
        style={{ backgroundColor: node.color + '20' }}
      >
        {node.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{node.displayName}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {node.description}
        </p>
      </div>
    </div>
  );
}
