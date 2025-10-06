import { query } from '../db/client';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreateData {
  email: string;
  name: string;
  password: string;
}

/**
 * Repository for managing users
 */
export class UserRepository {
  /**
   * Create new user
   */
  async create(data: UserCreateData): Promise<Omit<User, 'password_hash'>> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    
    const result = await query(
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at, updated_at`,
      [data.email, data.name, passwordHash]
    );
    
    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await query(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Verify user password
   */
  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    
    if (!user) {
      return null;
    }
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    return isValid ? user : null;
  }

  /**
   * Update user
   */
  async update(id: string, data: Partial<{ name: string; email: string }>): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }

    if (updates.length === 0) {
      return;
    }

    values.push(id);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
  }

  /**
   * Update password
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, id]
    );
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<void> {
    await query(`DELETE FROM users WHERE id = $1`, [id]);
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const result = await query(
      `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`,
      [email]
    );
    
    return result.rows[0].exists;
  }

  /**
   * Get user count
   */
  async count(): Promise<number> {
    const result = await query(`SELECT COUNT(*) as count FROM users`);
    return parseInt(result.rows[0].count);
  }
}
