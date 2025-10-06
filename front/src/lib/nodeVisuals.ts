/**
 * Dynamic Node Visualization System
 * 
 * Automatically determines icons and colors for any N8N node type
 * based on node name, type, and category
 */

import {
  Webhook, Calendar, Play, Zap, Mail, Database, FileSpreadsheet,
  MessageSquare, Bell, Cloud, Code, GitBranch, Filter, Settings,
  Globe, Lock, Users, ShoppingCart, CreditCard, BarChart, FileText,
  Image, Video, Music, Phone, MapPin, Search, Hash, Link, Sparkles,
  Server, Cpu, HardDrive, Package, Boxes, Layers, Grid, List,
  CheckSquare, Clock, AlertCircle, Info, HelpCircle, Star, Heart,
  Send, Download, Upload, Share2, Copy, Edit, Trash2, Eye, EyeOff,
  type LucideIcon
} from 'lucide-react';

export interface NodeVisual {
  icon: LucideIcon;
  color: string; // Tailwind gradient classes
  category: string;
}

/**
 * Node category mapping based on N8N's node categories
 */
const categoryVisuals: Record<string, { icon: LucideIcon; color: string }> = {
  // Core/Trigger nodes
  'trigger': { icon: Play, color: 'from-blue-500/20 to-blue-600/20 border-blue-500/50' },
  'webhook': { icon: Webhook, color: 'from-blue-500/20 to-blue-600/20 border-blue-500/50' },
  'schedule': { icon: Calendar, color: 'from-purple-500/20 to-purple-600/20 border-purple-500/50' },
  'manual': { icon: Play, color: 'from-gray-500/20 to-gray-600/20 border-gray-500/50' },
  
  // Communication
  'communication': { icon: MessageSquare, color: 'from-green-500/20 to-green-600/20 border-green-500/50' },
  'slack': { icon: Zap, color: 'from-purple-500/20 to-pink-500/20 border-purple-500/50' },
  'email': { icon: Mail, color: 'from-orange-500/20 to-red-500/20 border-orange-500/50' },
  'gmail': { icon: Mail, color: 'from-red-500/20 to-orange-500/20 border-red-500/50' },
  'discord': { icon: MessageSquare, color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/50' },
  'telegram': { icon: Send, color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/50' },
  'twilio': { icon: Phone, color: 'from-red-500/20 to-pink-500/20 border-red-500/50' },
  
  // Data & Databases
  'database': { icon: Database, color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/50' },
  'postgres': { icon: Database, color: 'from-blue-600/20 to-indigo-600/20 border-blue-600/50' },
  'mysql': { icon: Database, color: 'from-orange-500/20 to-yellow-500/20 border-orange-500/50' },
  'mongodb': { icon: Database, color: 'from-green-600/20 to-emerald-600/20 border-green-600/50' },
  'redis': { icon: Database, color: 'from-red-600/20 to-orange-600/20 border-red-600/50' },
  
  // Productivity
  'productivity': { icon: FileText, color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/50' },
  'sheets': { icon: FileSpreadsheet, color: 'from-green-500/20 to-emerald-500/20 border-green-500/50' },
  'googlesheets': { icon: FileSpreadsheet, color: 'from-green-500/20 to-emerald-500/20 border-green-500/50' },
  'airtable': { icon: Grid, color: 'from-orange-500/20 to-amber-500/20 border-orange-500/50' },
  'notion': { icon: FileText, color: 'from-gray-700/20 to-gray-800/20 border-gray-700/50' },
  'trello': { icon: Boxes, color: 'from-blue-500/20 to-blue-600/20 border-blue-500/50' },
  
  // Cloud & Storage
  'cloud': { icon: Cloud, color: 'from-sky-500/20 to-blue-500/20 border-sky-500/50' },
  'aws': { icon: Cloud, color: 'from-orange-500/20 to-yellow-500/20 border-orange-500/50' },
  'googledrive': { icon: Cloud, color: 'from-blue-500/20 to-green-500/20 border-blue-500/50' },
  'dropbox': { icon: Cloud, color: 'from-blue-600/20 to-blue-700/20 border-blue-600/50' },
  
  // Development
  'development': { icon: Code, color: 'from-purple-500/20 to-pink-500/20 border-purple-500/50' },
  'github': { icon: GitBranch, color: 'from-gray-700/20 to-gray-800/20 border-gray-700/50' },
  'gitlab': { icon: GitBranch, color: 'from-orange-500/20 to-red-500/20 border-orange-500/50' },
  'http': { icon: Globe, color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/50' },
  'api': { icon: Link, color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/50' },
  
  // Analytics & Marketing
  'analytics': { icon: BarChart, color: 'from-blue-500/20 to-purple-500/20 border-blue-500/50' },
  'googleanalytics': { icon: BarChart, color: 'from-orange-500/20 to-yellow-500/20 border-orange-500/50' },
  'marketing': { icon: Bell, color: 'from-pink-500/20 to-rose-500/20 border-pink-500/50' },
  
  // E-commerce
  'ecommerce': { icon: ShoppingCart, color: 'from-green-500/20 to-emerald-500/20 border-green-500/50' },
  'shopify': { icon: ShoppingCart, color: 'from-green-600/20 to-emerald-600/20 border-green-600/50' },
  'stripe': { icon: CreditCard, color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/50' },
  
  // Utilities
  'utility': { icon: Settings, color: 'from-gray-500/20 to-gray-600/20 border-gray-500/50' },
  'filter': { icon: Filter, color: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/50' },
  'function': { icon: Code, color: 'from-purple-500/20 to-pink-500/20 border-purple-500/50' },
  'set': { icon: Edit, color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/50' },
  
  // AI & ML
  'ai': { icon: Sparkles, color: 'from-purple-500/20 to-pink-500/20 border-purple-500/50' },
  'openai': { icon: Sparkles, color: 'from-green-500/20 to-emerald-500/20 border-green-500/50' },
  
  // Default fallback
  'default': { icon: Sparkles, color: 'from-gray-500/20 to-gray-600/20 border-gray-500/50' }
};

/**
 * Extract category from node type
 * e.g., "n8n-nodes-base.slack" -> "slack"
 */
function extractCategory(nodeType: string): string {
  const parts = nodeType.split('.');
  const lastPart = parts[parts.length - 1].toLowerCase();
  
  // Remove common suffixes
  return lastPart
    .replace(/trigger$/i, '')
    .replace(/node$/i, '')
    .replace(/api$/i, '')
    .trim();
}

/**
 * Get visual properties for any node type
 * Automatically determines icon and color based on node type
 */
export function getNodeVisual(nodeType: string, nodeName?: string): NodeVisual {
  const category = extractCategory(nodeType);
  const lowerType = nodeType.toLowerCase();
  const lowerName = nodeName?.toLowerCase() || '';
  
  // Try exact category match first
  if (categoryVisuals[category]) {
    return {
      ...categoryVisuals[category],
      category
    };
  }
  
  // Try partial matches in node type
  for (const [key, visual] of Object.entries(categoryVisuals)) {
    if (lowerType.includes(key) || lowerName.includes(key)) {
      return {
        ...visual,
        category: key
      };
    }
  }
  
  // Fallback to default
  return {
    ...categoryVisuals.default,
    category: 'default'
  };
}

/**
 * Get all available node categories
 */
export function getNodeCategories(): string[] {
  return Object.keys(categoryVisuals).filter(k => k !== 'default');
}

/**
 * Check if a node is a trigger node
 */
export function isTriggerNode(nodeType: string): boolean {
  const lowerType = nodeType.toLowerCase();
  return lowerType.includes('trigger') || 
         lowerType.includes('webhook') || 
         lowerType.includes('schedule');
}
