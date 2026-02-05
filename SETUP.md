# Local Setup Guide

## Prerequisites

### 1. Install PostgreSQL

**Option A: Using Homebrew (Recommended)**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Option B: Using Postgres.app (macOS)**
- Download from: https://postgresapp.com/
- Install and start the app

**Option C: Using Docker**
```bash
docker run --name restaurant-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=restaurant_insights -p 5434:5432 -d postgres:15
```

### 2. Create Database

Once Postgres is running, create the database:

```bash
# If using Homebrew:
createdb restaurant_insights

# Or connect and create:
psql postgres
CREATE DATABASE restaurant_insights;
\q
```

### 3. Run Schema

```bash
psql -d restaurant_insights -f backend/sql/schema.sql
```

### 4. Seed Data

```bash
cd backend
npm run seed
```

To clear duplicates and re-seed from scratch:
```bash
npm run seed:reset
```

## Running the Application

### Terminal 1: Backend
```bash
cd backend
npm run dev
```
Backend will run on http://localhost:4000

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```
Frontend will run on http://localhost:5173

## Verify Setup

1. Open http://localhost:5173 in your browser
2. Go to "Internal" tab
3. Enter API key: `dev-internal-key`
4. Try creating a restaurant

## Troubleshooting

**Postgres connection error?**
- Check Postgres is running: `brew services list` or check Postgres.app
- Verify connection string in `backend/.env` matches your setup
- Default: `postgres://postgres:postgres@localhost:5434/restaurant_insights`

**Port already in use?**
- Change `PORT` in `backend/.env` or `VITE_API_URL` in `frontend/.env`
