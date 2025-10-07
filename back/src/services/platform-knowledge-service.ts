import { N8nMCPClient } from "./n8n-mcp-client";

type ConnectorSummary = {
  name: string;
  type: string;
  category?: string;
};

/**
 * PlatformKnowledgeService
 * - Periodically pulls connector/node information from MCP
 * - Produces a compact textual summary for use in system prompts (RAG-lite)
 */
export class PlatformKnowledgeService {
  private mcpClient: N8nMCPClient;
  private lastRefreshedAt: number = 0;
  private cacheTtlMs: number;
  private connectors: ConnectorSummary[] = [];
  private credentialCache: Map<string, string[]> = new Map();
  private refreshIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    mcpClient: N8nMCPClient,
    cacheTtlMs: number = 10 * 60 * 1000,
    refreshIntervalMs: number = 6 * 60 * 60 * 1000 // 6h auto-refresh
  ) {
    this.mcpClient = mcpClient;
    this.cacheTtlMs = cacheTtlMs;
    this.refreshIntervalMs = refreshIntervalMs;
  }

  /** Force refresh from MCP */
  async refresh(): Promise<void> {
    try {
      // Use popular keywords to diversify (empty query not supported by MCP)
      const [comms, data, ai, core] = await Promise.all([
        this.mcpClient.searchNodes("Slack email SMS", false),
        this.mcpClient.searchNodes("Postgres Sheets Database", false),
        this.mcpClient.searchNodes("OpenAI Claude Gemini", false),
        this.mcpClient.searchNodes("Webhook HTTP Request", false),
      ]);

      const merged = [...comms, ...data, ...ai, ...core];
      const byType = new Map<string, ConnectorSummary>();
      for (const n of merged) {
        const key = n.nodeType || n.nodeName;
        if (!byType.has(key)) {
          byType.set(key, {
            name: n.nodeName,
            type: n.nodeType,
            category: n.category,
          });
        }
      }

      this.connectors = Array.from(byType.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      this.lastRefreshedAt = Date.now();
    } catch (err) {
      // Keep old cache on error
      console.warn("[PlatformKnowledge] refresh failed:", err);
    }
  }

  /** Start background auto-refresh */
  startAutoRefresh(): void {
    if (this.timer) return;
    // kick off an immediate refresh but don't block
    this.refresh().catch(() => {});
    this.timer = setInterval(() => {
      this.refresh().catch(() => {});
    }, this.refreshIntervalMs);
  }

  /** Stop background auto-refresh */
  stopAutoRefresh(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private isStale(): boolean {
    return Date.now() - this.lastRefreshedAt > this.cacheTtlMs;
  }

  /** Returns a short, model-friendly summary of connectors */
  async getSummaryText(): Promise<string> {
    if (this.connectors.length === 0 || this.isStale()) {
      await this.refresh();
    }

    if (this.connectors.length === 0) return "No connector metadata available.";

    const max = 40; // keep prompt small
    const sample = this.connectors.slice(0, max);
    const byCategory = new Map<string, ConnectorSummary[]>();
    for (const c of sample) {
      const cat = c.category || "Other";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(c);
    }

    // Enrich a handful with credential requirements
    const popular = sample
      .filter((c) =>
        /Slack|Gmail|Google Sheets|Postgres|Webhook|HTTP Request/i.test(c.name)
      )
      .slice(0, 6);

    await Promise.all(
      popular.map(async (c) => {
        if (!this.credentialCache.has(c.type)) {
          const details = await this.mcpClient.getNodeDetails(c.type);
          if (details?.credentials)
            this.credentialCache.set(c.type, details.credentials);
        }
      })
    );

    const lines: string[] = ["Available connectors (sample):"];
    for (const [cat, items] of byCategory) {
      const names = items
        .map((i) => i.name)
        .slice(0, 12)
        .join(", ");
      lines.push(`- ${cat}: ${names}`);
    }

    if (popular.length > 0) {
      lines.push("Credential requirements (selected):");
      for (const c of popular) {
        const creds = this.credentialCache.get(c.type);
        if (creds && creds.length > 0) {
          lines.push(`- ${c.name}: ${creds.join(", ")}`);
        }
      }
    }
    lines.push(
      'If the user asks "what are the options?" or something similar, list relevant connectors, not all.'
    );
    lines.push(
      "Prefer exact node names when proposing steps (use n8n node types if known). But consider the user's query and the context of the conversation when proposing steps. Also, remember that the user is not always specific about the nodes they want to use, and they are NOT technical, so be careful with the node namesyou propose."
    );
    return lines.join("\n");
  }
}
