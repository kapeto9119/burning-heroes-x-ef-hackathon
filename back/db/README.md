# Database Setup Guide

## Quick Start

### 1. Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from: https://www.postgresql.org/download/windows/

---

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE workflow_builder;

# Create user (optional)
CREATE USER workflow_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE workflow_builder TO workflow_user;

# Exit
\q
```

---

### 3. Run Schema

```bash
# From the back directory
psql workflow_builder < db/schema.sql

# Or if using custom user
psql -U workflow_user -d workflow_builder < db/schema.sql
```

---

### 4. Configure Environment

Copy `.env.example` to `.env` and update:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=workflow_builder
DB_USER=postgres  # or workflow_user
DB_PASSWORD=your_password

# Generate a random 32-character key
ENCRYPTION_KEY=$(openssl rand -base64 32)
```

---

### 5. Test Connection

```bash
npm run dev
```

You should see:
```
[Database] ✅ Connected successfully
```

---

## Database Schema Overview

### Tables

1. **users** - User accounts and authentication
2. **credentials** - Encrypted service credentials (supports all N8N types)
3. **workflows** - Workflow definitions with n8n JSON structure
4. **deployments** - Deployed workflow instances in n8n
5. **executions** - Workflow execution history and logs

### Key Features

- ✅ **UUID primary keys** - Better for distributed systems
- ✅ **JSONB for flexibility** - Supports dynamic n8n structures
- ✅ **Array columns** - Fast searches for node types and credentials
- ✅ **Encrypted credentials** - AES-256-CBC encryption
- ✅ **Auto-updated timestamps** - Triggers handle updated_at
- ✅ **Cascade deletes** - Clean up related data automatically

---

## Useful Commands

### View Tables
```sql
\dt
```

### View Table Structure
```sql
\d users
\d credentials
\d workflows
```

### Query Examples

**Get user's workflows:**
```sql
SELECT id, name, created_at 
FROM workflows 
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC;
```

**Find workflows using Slack:**
```sql
SELECT name, node_types 
FROM workflows 
WHERE 'n8n-nodes-base.slack' = ANY(node_types);
```

**Check credential status:**
```sql
SELECT service, n8n_credential_type, is_valid, created_at
FROM credentials
WHERE user_id = 'your-user-id';
```

---

## Backup & Restore

### Backup
```bash
pg_dump workflow_builder > backup_$(date +%Y%m%d).sql
```

### Restore
```bash
psql workflow_builder < backup_20250106.sql
```

---

## Troubleshooting

### Can't connect to PostgreSQL
```bash
# Check if PostgreSQL is running
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# Check port
lsof -i :5432
```

### Permission denied
```bash
# Reset PostgreSQL password
sudo -u postgres psql
ALTER USER postgres PASSWORD 'new_password';
```

### Schema already exists
```bash
# Drop and recreate (⚠️ DELETES ALL DATA)
psql postgres
DROP DATABASE workflow_builder;
CREATE DATABASE workflow_builder;
\q
psql workflow_builder < db/schema.sql
```

---

## Production Considerations

1. **Use connection pooling** (already configured in `db/client.ts`)
2. **Enable SSL** for remote connections
3. **Set up read replicas** for analytics queries
4. **Partition executions table** by month
5. **Use AWS RDS** or **Google Cloud SQL** for managed PostgreSQL
6. **Backup regularly** (daily recommended)
7. **Monitor slow queries** (logged automatically if > 1s)
8. **Use proper encryption keys** (AWS KMS, Google Cloud KMS)

---

## Migration to Production Database

When ready to use a real database:

1. Update `.env` with production credentials
2. Run schema on production database
3. Test connection
4. Deploy application

**Example (AWS RDS):**
```bash
DB_HOST=your-db.xxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=workflow_builder
DB_USER=admin
DB_PASSWORD=your-secure-password
```

---

## Next Steps

- [ ] Run `psql workflow_builder < db/schema.sql`
- [ ] Update `.env` with database credentials
- [ ] Test with `npm run dev`
- [ ] Create your first workflow!

🚀 **Database is ready!**
