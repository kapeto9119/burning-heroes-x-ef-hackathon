import { Router } from 'express';
import { NodePaletteService } from '../services/node-palette-service';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const nodePaletteService = new NodePaletteService();

/**
 * GET /api/nodes
 * Get all available nodes (categorized)
 * Uses hybrid approach: static config + cached MCP results
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const categorizedNodes = await nodePaletteService.getAllNodes();
    
    res.json({
      success: true,
      data: categorizedNodes,
      meta: {
        total: Object.values(categorizedNodes).reduce((sum, category) => sum + category.length, 0),
        categories: Object.keys(categorizedNodes),
        cached: true,
      }
    });
  } catch (error: any) {
    console.error('[Nodes API] Error getting nodes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch nodes'
    });
  }
});

/**
 * GET /api/nodes/search
 * Search for nodes using MCP (dynamic discovery)
 * Query param: q (search query)
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const query = req.query.q as string || '';
    
    const nodes = await nodePaletteService.searchNodes(query);
    
    res.json({
      success: true,
      data: nodes,
      meta: {
        query,
        count: nodes.length,
        source: query ? 'mcp' : 'cache'
      }
    });
  } catch (error: any) {
    console.error('[Nodes API] Error searching nodes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search nodes'
    });
  }
});

/**
 * GET /api/nodes/:nodeType
 * Get detailed information about a specific node
 * Includes properties, credentials, operations, examples
 */
router.get('/:nodeType', authenticateToken, async (req, res) => {
  try {
    const { nodeType } = req.params;
    
    // Node type might be URL encoded (e.g., n8n-nodes-base.slack)
    const decodedNodeType = decodeURIComponent(nodeType);
    
    const nodeDetails = await nodePaletteService.getNodeDetails(decodedNodeType);
    
    if (!nodeDetails) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    res.json({
      success: true,
      data: nodeDetails
    });
  } catch (error: any) {
    console.error('[Nodes API] Error getting node details:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get node details'
    });
  }
});

/**
 * POST /api/nodes/cache/clear
 * Clear node cache (admin only - for testing)
 */
router.post('/cache/clear', authenticateToken, async (req, res) => {
  try {
    nodePaletteService.clearCache();
    
    res.json({
      success: true,
      message: 'Node cache cleared'
    });
  } catch (error: any) {
    console.error('[Nodes API] Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear cache'
    });
  }
});

export default router;
