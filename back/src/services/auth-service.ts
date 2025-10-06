import jwt from 'jsonwebtoken';
import { User } from '../types';
import { UserRepository } from '../repositories/user-repository';
import { CredentialRepository } from '../repositories/credential-repository';

export class AuthService {
  private jwtSecret: string;
  private userRepo: UserRepository;
  private credentialRepo: CredentialRepository;

  constructor(jwtSecret: string) {
    this.jwtSecret = jwtSecret;
    this.userRepo = new UserRepository();
    this.credentialRepo = new CredentialRepository();
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
    // Check if user already exists
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Create user (password hashing handled by repository)
    const user = await this.userRepo.create({ email, password, name });

    // Generate token
    const token = this.generateToken(user.id, user.email);

    return { 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at,
        credentials: {} // Will be loaded separately
      }, 
      token 
    };
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    // Verify password (repository handles bcrypt comparison)
    const user = await this.userRepo.verifyPassword(email, password);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user.id, user.email);

    return { 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at,
        credentials: {} // Will be loaded separately
      }, 
      token 
    };
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
  async getUserById(userId: string): Promise<User | null> {
    const user = await this.userRepo.findById(userId);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.created_at,
      credentials: {} // Will be loaded separately
    };
  }

  /**
   * Update user credentials
   */
  async updateCredentials(userId: string, service: string, credentialData: any): Promise<void> {
    // Verify user exists
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Determine N8N credential type from service
    const n8nCredentialType = this.getN8nCredentialType(service);

    // Check if credential already exists
    const existing = await this.credentialRepo.findByUserServiceAndType(
      userId, 
      service, 
      n8nCredentialType
    );

    if (existing) {
      // Update existing credential
      await this.credentialRepo.update(existing.id, credentialData);
    } else {
      // Create new credential
      await this.credentialRepo.create(
        userId,
        service,
        n8nCredentialType,
        credentialData
      );
    }
  }

  /**
   * Get user credentials for a service
   */
  async getCredentials(userId: string, service: string): Promise<any | null> {
    const credentials = await this.credentialRepo.findByUserAndService(userId, service);
    
    if (credentials.length === 0) {
      return null;
    }

    // Return the first (most recent) credential's data
    return credentials[0].credential_data;
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
  async getAllUsers(): Promise<User[]> {
    // Not implemented for production security
    // In development, you can query the database directly
    return [];
  }

  /**
   * Map service name to N8N credential type
   */
  private getN8nCredentialType(service: string): string {
    const mapping: Record<string, string> = {
      'slack': 'slackApi',
      'email': 'smtp',
      'gmail': 'gmailOAuth2',
      'postgres': 'postgres',
      'googlesheets': 'googleSheetsOAuth2',
      'airtable': 'airtableApi',
      'twitter': 'twitterOAuth1',
      'discord': 'discordApi',
      'notion': 'notionApi',
      'twilio': 'twilioApi'
    };

    return mapping[service.toLowerCase()] || service;
  }
}
