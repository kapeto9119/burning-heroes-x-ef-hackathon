import { query } from '../db/client';
import crypto from 'crypto';

export interface Credential {
  id: string;
  user_id: string;
  service: string;
  n8n_credential_type: string;
  credential_name?: string;
  credential_data: any;  // Decrypted
  n8n_credential_id?: string;
  is_valid: boolean;
  last_validated_at?: Date;
  validation_error?: string;
  created_at: Date;
  updated_at: Date;
  last_used_at?: Date;
}

/**
 * Repository for managing user credentials
 * Handles encryption/decryption automatically
 */
export class CredentialRepository {
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-cbc';

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
      throw new Error(
        'ENCRYPTION_KEY environment variable is required. ' +
        'Generate one with: openssl rand -base64 32'
      );
    }
    
    if (key.length < 32) {
      throw new Error(
        'ENCRYPTION_KEY must be at least 32 characters. ' +
        'Current length: ' + key.length
      );
    }
    
    // Use a random salt per encryption (stored with IV)
    // This ensures key is exactly 32 bytes for AES-256
    this.encryptionKey = crypto.scryptSync(key, 'n8n-workflow-builder', 32);
    
    console.log('[Credential Repository] ✅ Encryption initialized');
  }

  /**
   * Create new credential
   */
  async create(
    userId: string,
    service: string,
    n8nCredentialType: string,
    credentialData: any,
    credentialName?: string
  ): Promise<Credential> {
    const encrypted = this.encrypt(credentialData);
    
    const result = await query(
      `INSERT INTO credentials 
       (user_id, service, n8n_credential_type, credential_name, credential_data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, service, n8nCredentialType, credentialName, encrypted]
    );
    
    const row = result.rows[0];
    return this.mapRow(row);
  }

  /**
   * Get credential by ID
   */
  async findById(id: string): Promise<Credential | null> {
    const result = await query(
      `SELECT * FROM credentials WHERE id = $1`,
      [id]
    );
    
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Get user's credentials for a specific service
   */
  async findByUserAndService(userId: string, service: string): Promise<Credential[]> {
    const result = await query(
      `SELECT * FROM credentials
       WHERE user_id = $1 AND service = $2 AND is_valid = true
       ORDER BY credential_name, created_at DESC`,
      [userId, service]
    );
    
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Get user's credential by service and N8N type
   */
  async findByUserServiceAndType(
    userId: string,
    service: string,
    n8nCredentialType: string
  ): Promise<Credential | null> {
    const result = await query(
      `SELECT * FROM credentials
       WHERE user_id = $1 AND service = $2 AND n8n_credential_type = $3 AND is_valid = true
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, service, n8nCredentialType]
    );
    
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Get all user credentials
   */
  async findByUser(userId: string, validOnly = true): Promise<Credential[]> {
    const whereClause = validOnly ? 'WHERE user_id = $1 AND is_valid = true' : 'WHERE user_id = $1';
    
    const result = await query(
      `SELECT * FROM credentials
       ${whereClause}
       ORDER BY service, credential_name, created_at DESC`,
      [userId]
    );
    
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Update n8n credential ID after deployment
   */
  async updateN8nCredentialId(id: string, n8nCredentialId: string): Promise<void> {
    await query(
      `UPDATE credentials 
       SET n8n_credential_id = $1, last_used_at = NOW()
       WHERE id = $2`,
      [n8nCredentialId, id]
    );
  }

  /**
   * Mark credential as invalid
   */
  async markInvalid(id: string, error?: string): Promise<void> {
    await query(
      `UPDATE credentials 
       SET is_valid = false, validation_error = $1
       WHERE id = $2`,
      [error, id]
    );
  }

  /**
   * Mark credential as valid
   */
  async markValid(id: string): Promise<void> {
    await query(
      `UPDATE credentials 
       SET is_valid = true, validation_error = NULL, last_validated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  /**
   * Update credential data
   */
  async update(id: string, credentialData: any): Promise<void> {
    const encrypted = this.encrypt(credentialData);
    
    await query(
      `UPDATE credentials 
       SET credential_data = $1
       WHERE id = $2`,
      [encrypted, id]
    );
  }

  /**
   * Delete credential
   */
  async delete(id: string): Promise<void> {
    await query(`DELETE FROM credentials WHERE id = $1`, [id]);
  }

  /**
   * Check if user has credential for service
   */
  async hasCredential(userId: string, service: string): Promise<boolean> {
    const result = await query(
      `SELECT EXISTS(
        SELECT 1 FROM credentials 
        WHERE user_id = $1 AND service = $2 AND is_valid = true
      )`,
      [userId, service]
    );
    
    return result.rows[0].exists;
  }

  /**
   * Encrypt credential data
   */
  private encrypt(data: any): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      data: encrypted
    });
  }

  /**
   * Decrypt credential data
   */
  private decrypt(encrypted: string): any {
    try {
      const { iv, data } = JSON.parse(encrypted);
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        Buffer.from(iv, 'hex')
      );
      
      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('[Credential Repository] Decryption error:', error);
      throw new Error('Failed to decrypt credential data');
    }
  }

  /**
   * Map database row to Credential object (with decryption)
   */
  private mapRow(row: any): Credential {
    return {
      id: row.id,
      user_id: row.user_id,
      service: row.service,
      n8n_credential_type: row.n8n_credential_type,
      credential_name: row.credential_name,
      credential_data: this.decrypt(row.credential_data),
      n8n_credential_id: row.n8n_credential_id,
      is_valid: row.is_valid,
      last_validated_at: row.last_validated_at,
      validation_error: row.validation_error,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_used_at: row.last_used_at
    };
  }
}
