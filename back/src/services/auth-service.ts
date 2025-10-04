import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, UserCredentials } from '../types';

// In-memory user storage (replace with database in production)
const users: Map<string, User & { password: string }> = new Map();

// Create demo user for hackathon
const demoUser: User & { password: string } = {
  id: 'demo_user_123',
  email: 'demo@example.com',
  name: 'Demo User',
  password: 'demo_password_hash',
  createdAt: new Date(),
  credentials: {}
};
users.set(demoUser.id, demoUser);

export class AuthService {
  private jwtSecret: string;

  constructor(jwtSecret: string) {
    this.jwtSecret = jwtSecret;
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
    // Check if user already exists
    const existingUser = Array.from(users.values()).find(u => u.email === email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user: User & { password: string } = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      email,
      name,
      password: hashedPassword,
      createdAt: new Date(),
      credentials: {}
    };

    users.set(user.id, user);

    // Generate token
    const token = this.generateToken(user.id, user.email);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    // Find user
    const user = Array.from(users.values()).find(u => u.email === email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user.id, user.email);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string; email: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): User | null {
    const user = users.get(userId);
    if (!user) return null;

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user credentials
   */
  async updateCredentials(userId: string, service: string, credentials: any): Promise<void> {
    const user = users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.credentials) {
      user.credentials = {};
    }

    user.credentials[service as keyof UserCredentials] = credentials;
    users.set(userId, user);
  }

  /**
   * Get user credentials for a service
   */
  getCredentials(userId: string, service: string): any | null {
    const user = users.get(userId);
    if (!user || !user.credentials) return null;

    return user.credentials[service as keyof UserCredentials] || null;
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  /**
   * List all users (for debugging)
   */
  getAllUsers(): User[] {
    return Array.from(users.values()).map(({ password: _, ...user }) => user);
  }
}
