import { Pool, PoolClient } from 'pg';

/**
 * PostgreSQL connection pool
 * Manages database connections efficiently
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'workflow_builder',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  
  // Connection pool settings
  max: 20,                      // Maximum number of clients
  idleTimeoutMillis: 30000,     // Close idle clients after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('[Database] Unexpected error on idle client:', err);
  process.exit(-1);
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('[Database] ❌ Connection failed:', err.message);
  } else {
    console.log('[Database] ✅ Connected successfully');
  }
});

/**
 * Execute a query
 */
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn(`[Database] Slow query (${duration}ms):`, text.substring(0, 100));
    }
    
    return res;
  } catch (error) {
    console.error('[Database] Query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool (for transactions)
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

/**
 * Close all connections (for graceful shutdown)
 */
export async function close() {
  await pool.end();
  console.log('[Database] Connection pool closed');
}

export default pool;
