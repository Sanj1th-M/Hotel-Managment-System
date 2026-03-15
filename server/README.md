# Hotel Management — Backend

Node.js + Express REST API for the Hotel Room Booking Management System.

## Setup
```bash
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

## Run
```bash
# Development (with nodemon)
npm run dev

# Seed database with admin user and sample rooms
npm run seed
```

## Default Credentials (after seed)

Credentials are configured via environment variables in `.env`:

| Role  | Env Variable         | Default (dev only)  |
|-------|----------------------|---------------------|
| Admin | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | `admin@hotel.com` / see `.env` |
| Staff | `SEED_STAFF_EMAIL` / `SEED_STAFF_PASSWORD` | `staff@hotel.com` / see `.env` |

> ⚠️ Set strong unique values in `.env` before seeding. Change passwords immediately after first login in production. Never commit `.env` to version control.

## API Base URL
`http://localhost:5000/api`
