# MyHUB - Internet Cafe Management System

MyHUB is a web app I built to help manage an internet cafe. It lets customers see available tables, make reservations, and order food. The admin can manage tables, orders, reservations, and the menu from a dashboard.

## What It Does

- **Home Page** — Shows all tables with their status (available, occupied, reserved) using colors.
- **Table Ordering** — Customers can scan a QR code on a table and order from the menu.
- **Reservations** — Anyone can book a table without creating an account.
- **Admin Dashboard** — View stats, revenue, recent orders, and manage everything.

## Tech Used

- React + Vite for the frontend
- Express for the API
- PostgreSQL database
- Drizzle ORM
- Supabase
- TailwindCSS for styling
- pnpm workspaces (monorepo)

## How to Run

```bash
# Install dependencies
pnpm install

# Run the frontend
pnpm --filter @workspace/myhub run dev

# Run the API server
pnpm --filter @workspace/api-server run dev
```

## Admin Login

- Username: admin
- Password: admin123
