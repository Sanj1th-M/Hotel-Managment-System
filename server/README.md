# Hotel Management — Backend

Node.js + Express REST API for the Hotel Room Booking Management System.

## Setup
```bash
npm install
cp .env.example .env
# Edit .env with your PostgreSQL URI, JWT secret, and seed credentials
```

## Run
```bash
# Development (with nodemon)
npm run dev

# Initialize database tables
npm run initDb

# Add performance indexes
npm run addIndexes

# Seed database with admin user and sample rooms
npm run seed
```

## Seed Credentials

All seed credentials are read from environment variables — **no fallback defaults**.  
Set these in your `.env` before running `npm run seed`:

- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
- `SEED_STAFF_EMAIL` / `SEED_STAFF_PASSWORD`

> ⚠️ The seed script will **refuse to run** if any of these are missing. Change passwords immediately after first login in production.

## API Base URL
`http://localhost:5000/api`

