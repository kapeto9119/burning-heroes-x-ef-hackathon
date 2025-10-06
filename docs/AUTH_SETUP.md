# 🔐 Authentication System - Complete Implementation

## ✅ What's Been Implemented

### Backend
1. **Database Schema** (`back/db/schema.sql`)
   - Users table with bcrypt password hashing
   - Credentials table for service authentication
   - Workflows, deployments, executions tables
   - All properly indexed and with foreign keys

2. **Auth Service** (`back/src/services/auth-service.ts`)
   - User registration with email/password validation
   - Login with JWT token generation (7-day expiry)
   - Token verification
   - Credential management per user

3. **Auth Routes** (`back/src/routes/auth.ts`)
   - `POST /api/auth/register` - Create new account
   - `POST /api/auth/login` - Login and get JWT
   - `GET /api/auth/me` - Get current user (protected)
   - `POST /api/auth/credentials/:service` - Save service credentials
   - `GET /api/auth/credentials/:service` - Get service credentials

4. **Auth Middleware** (`back/src/middleware/auth.ts`)
   - JWT verification
   - User attachment to requests
   - Optional auth support for public routes

5. **Vapi Integration** (`back/src/routes/voice.ts`)
   - Extracts `userId` from Vapi call metadata
   - Falls back to header or demo user for testing
   - Passes real user ID to all workflow operations

### Frontend
1. **Auth Context** (`front/src/contexts/AuthContext.tsx`)
   - `AuthProvider` component
   - `useAuth()` hook
   - Token persistence in localStorage
   - Auto-fetch user on mount
   - Login, register, logout functions

2. **UI Components**
   - `LoginForm` - Email/password login
   - `RegisterForm` - Account creation with validation
   - `AuthModal` - Modal wrapper with mode switching

3. **Integration**
   - `layout.tsx` - Wrapped with AuthProvider
   - `Navbar.tsx` - Shows login button or user menu
   - `editor/page.tsx` - Passes user ID to Vapi
   - `useVapi.ts` - Sends userId in call metadata

## 🚀 How to Use

### 1. Database Setup

First, ensure PostgreSQL is running and create the database:

```bash
# Create database
createdb workflow_builder

# Run schema
psql workflow_builder < back/db/schema.sql
```

### 2. Environment Variables

Make sure your `.env` file has:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=workflow_builder
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Secret (generate a random string)
JWT_SECRET=your_super_secret_jwt_key_here

# n8n (optional)
N8N_API_URL=http://localhost:5678/api/v1
N8N_API_KEY=your_n8n_api_key
```

### 3. Start the Backend

```bash
cd back
npm install
npm run dev
```

### 4. Start the Frontend

```bash
cd front
npm install
npm run dev
```

### 5. Test the Flow

1. **Visit the app** at `http://localhost:3000`
2. **Click "Login"** in the navbar
3. **Register a new account**:
   - Email: `test@example.com`
   - Password: `password123`
   - Name: `Test User`
4. **You're logged in!** The navbar now shows your profile menu
5. **Start a voice call** - Your user ID is automatically sent to the backend
6. **Create a workflow** - It's saved under your account

## 🔍 How It Works

### Authentication Flow

```
1. User registers/logs in
   ↓
2. Backend generates JWT token
   ↓
3. Frontend stores token in localStorage
   ↓
4. All API requests include: Authorization: Bearer <token>
   ↓
5. Backend middleware verifies token
   ↓
6. User ID attached to request
```

### Vapi Voice Integration

```
1. User starts voice call
   ↓
2. Frontend passes userId to Vapi client
   ↓
3. Vapi sends userId in call metadata
   ↓
4. Backend extracts userId from metadata
   ↓
5. All workflows created under that user
```

## 🧪 Testing Endpoints

### Register
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Get Current User
```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎯 Key Features

✅ **Secure Authentication** - bcrypt password hashing, JWT tokens
✅ **User Isolation** - Each user's workflows are separate
✅ **Persistent Sessions** - Token stored in localStorage
✅ **Voice Integration** - User ID passed to Vapi automatically
✅ **Protected Routes** - Middleware ensures only authenticated users access protected endpoints
✅ **Credential Management** - Store service credentials per user
✅ **Auto-login** - Token validated on page load

## 🔒 Security Notes

- Passwords are hashed with bcrypt (10 rounds)
- JWT tokens expire after 7 days
- Tokens stored in localStorage (consider httpOnly cookies for production)
- All sensitive endpoints protected with auth middleware
- SQL injection protected via parameterized queries

## 🐛 Troubleshooting

**"No token provided" error**
- Make sure you're logged in
- Check localStorage for `auth_token`
- Token may have expired (7 days)

**Database connection failed**
- Verify PostgreSQL is running
- Check DB credentials in `.env`
- Ensure database exists: `createdb workflow_builder`

**User not found after login**
- Check database has users table
- Run schema.sql if needed
- Check backend logs for errors

## 🎉 Success!

You now have a fully functional authentication system! Users can:
- Register and login
- Create workflows under their account
- Use voice AI with their user ID
- Manage their credentials
- View only their workflows

**No more `demo_user_123`!** 🚀
