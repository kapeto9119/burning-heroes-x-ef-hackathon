import bcrypt from 'bcryptjs';
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the back directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Script to reset a user's password
 * Usage: ts-node scripts/reset-password.ts <email> <new-password>
 */

async function resetPassword(email: string, newPassword: string) {
  // Support both DATABASE_URL and individual DB_* variables
  const clientConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      };

  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log('Connected to database');

    // Hash the new password using the same algorithm as the app (bcrypt with 10 rounds)
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update the password
    const result = await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING id, email, name',
      [passwordHash, email]
    );

    if (result.rowCount === 0) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    const user = result.rows[0];
    console.log('✅ Password updated successfully!');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Parse command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('Usage: ts-node scripts/reset-password.ts <email> <new-password>');
  console.error('Example: ts-node scripts/reset-password.ts user@example.com MyNewPassword123');
  process.exit(1);
}

resetPassword(email, newPassword);
