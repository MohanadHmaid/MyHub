# MyHUB - Internet Café Management System

## Overview

A full-stack web-based internet café management system named **MyHUB**. Supports real-time table visualization, QR code table ordering, a guest reservation system, admin dashboard, and basic payment tracking.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifact: `myhub`)
- **API framework**: Express 5 (artifact: `api-server`)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: Session-based (express-session + SHA-256 hashed passwords)

## Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`

## Pages

### Customer Pages
- `/` — Home: visual table grid (green = available, red = occupied)
- `/table/:id` — QR order page: menu + cart for a specific table
- `/reservation` — Guest reservation form (no login needed)
- `/success` — Reservation confirmation with unique code

### Admin Pages
- `/admin/login` — Admin login
- `/admin/dashboard` — Dashboard: stats, revenue, recent orders
- `/admin/tables` — Table management: CRUD, status toggle
- `/admin/orders` — Orders: filter by status, update status + payment
- `/admin/reservations` — Reservations: list, confirm/cancel
- `/admin/menu` — Menu management: CRUD products by category

## Database Schema

Tables: `tables`, `products`, `orders`, `order_items`, `reservations`, `admins`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/myhub run dev` — run frontend locally

## API Routes

- `GET/POST /api/tables` — list/create tables
- `GET/PUT/DELETE /api/tables/:id` — get/update/delete table
- `GET/POST /api/products` — list/create products
- `PUT/DELETE /api/products/:id` — update/delete product
- `GET/POST /api/orders` — list/create orders
- `PUT /api/orders/:id/status` — update order status
- `PUT /api/orders/:id/payment` — update payment status
- `GET/POST /api/reservations` — list/create reservations
- `GET /api/reservations/:code` — lookup reservation by code
- `PUT /api/reservations/:id/status` — update reservation status
- `POST /api/admin/login` — admin login
- `POST /api/admin/logout` — admin logout
- `GET /api/admin/me` — check session
- `GET /api/dashboard/summary` — dashboard stats
- `GET /api/dashboard/recent-orders` — recent activity feed

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
