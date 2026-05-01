# MyHub Project Detailed Implementation Plan

This document provides a hyper-detailed, step-by-step implementation blueprint for enhancing the MyHub project. It is designed for direct execution by an AI agent, specifying exact file paths, code modifications, and new code additions. The plan leverages the existing tech stack: React with Wouter, Drizzle ORM (Supabase PostgreSQL), Express.js API (Render), and a Vercel-hosted frontend, with API contracts defined by OpenAPI and validated by Zod schemas.

## 1. Table Reservation State & Code Verification

This section details the steps to introduce a `reserved` table state and implement a customer reservation code verification flow.

### 1.1. Database Schema Updates

**Objective:** Add `reserved` status to `tablesTable` and link `reservationsTable` to `tablesTable` via a foreign key.

**Files to Modify:**
*   `/home/ubuntu/MyHub/lib/db/src/schema/tables.ts`
*   `/home/ubuntu/MyHub/lib/api-spec/openapi.yaml`
*   `/home/ubuntu/MyHub/lib/api-zod/src/generated/types/tableStatus.ts` (will be regenerated)
*   `/home/ubuntu/MyHub/lib/api-zod/src/generated/types/table.ts` (will be regenerated)

**Step-by-Step Instructions:**

1.  **Modify `tables.ts`:**
    *   Open `/home/ubuntu/MyHub/lib/db/src/schema/tables.ts`.
    *   Update the `status` column definition to include `'reserved'` as a possible value. Add a `reservationId` column that is nullable and references `reservationsTable.id`.

    ```typescript
    // Before:
    // status: text("status").notNull().default("available"),
    // After:
    status: text("status", { enum: ["available", "occupied", "reserved"] }).notNull().default("available"),
    reservationId: integer("reservation_id").references(() => reservationsTable.id, { onDelete: "set null" }).unique(), // Ensure one reservation per table at a time
    ```
    *   **Note:** Ensure `reservationsTable` is imported: `import { reservationsTable } from "./reservations";`

2.  **Modify `openapi.yaml`:**
    *   Open `/home/ubuntu/MyHub/lib/api-spec/openapi.yaml`.
    *   Locate the `TableStatus` schema definition and add `reserved` to its `enum` list.

    ```yaml
    # Before:
    #         status:
    #           type: string
    #           enum: [available, occupied]
    # After:
            status:
              type: string
              enum: [available, occupied, reserved]
    ```
    *   Locate the `Table` schema definition and add `reservationId`.

    ```yaml
    # Before:
    #         createdAt:
    #           type: string
    # After:
            reservationId:
              type: integer
              nullable: true
            createdAt:
              type: string
    ```

3.  **Regenerate Zod Schemas:**
    *   Execute the following command in the `MyHub` root directory to regenerate the Zod types based on the updated OpenAPI spec:

    ```bash
    pnpm --filter api-zod generate
    ```
    *   This will update `/home/ubuntu/MyHub/lib/api-zod/src/generated/types/tableStatus.ts` and `/home/ubuntu/MyHub/lib/api-zod/src/generated/types/table.ts` (among others).

### 1.2. API Logic Implementation

**Objective:** Link reservations to tables and create a verification endpoint.

**Files to Modify/Create:**
*   `/home/ubuntu/MyHub/artifacts/api-server/src/routes/reservations.ts`
*   `/home/ubuntu/MyHub/artifacts/api-server/src/routes/tables.ts`
*   `/home/ubuntu/MyHub/lib/api-spec/openapi.yaml` (for new endpoint)

**Step-by-Step Instructions:**

1.  **Modify `reservations.ts` (API):**
    *   Open `/home/ubuntu/MyHub/artifacts/api-server/src/routes/reservations.ts`.
    *   When creating a reservation (`POST /reservations`), if a `tableId` is provided in the request body (which needs to be added to `CreateReservationBody` in `openapi.yaml` first), update the corresponding table's status to `reserved` and set its `reservationId`.
    *   **Pre-requisite:** Update `CreateReservationBody` in `openapi.yaml` to include an optional `tableId: integer` field.

    ```typescript
    // Inside router.post("/reservations", ...)
    const parsed = CreateReservationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { tableId, ...reservationData } = parsed.data; // Destructure tableId

    await db.transaction(async (tx) => {
      const [reservation] = await tx.insert(reservationsTable).values(reservationData).returning();

      if (tableId) {
        // Check if table is available before reserving
        const [table] = await tx.select().from(tablesTable).where(eq(tablesTable.id, tableId));
        if (!table || table.status !== "available") {
          tx.rollback();
          res.status(409).json({ error: "Table is not available for reservation." });
          return;
        }

        await tx.update(tablesTable)
          .set({ status: "reserved", reservationId: reservation.id })
          .where(eq(tablesTable.id, tableId));
      }
      res.status(201).json(GetReservationResponse.parse({ ...reservation, dateTime: reservation.dateTime.toISOString() }));
    });
    ```

2.  **Add Verification Endpoint to `tables.ts` (API):**
    *   Open `/home/ubuntu/MyHub/artifacts/api-server/src/routes/tables.ts`.
    *   Add a new `POST` endpoint for reservation verification.

    ```typescript
    // Add this new import
    import { reservationsTable } from "@workspace/db";

    // ... existing code ...

    router.post("/tables/:id/verify-reservation", async (req, res): Promise<void> => {
      const params = GetTableParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }
      const { code } = req.body; // Expect { code: string } in body
      if (!code || typeof code !== "string") {
        res.status(400).json({ error: "Reservation code is required." });
        return;
      }

      const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, params.data.id));

      if (!table) {
        res.status(404).json({ error: "Table not found." });
        return;
      }

      if (table.status !== "reserved" || !table.reservationId) {
        res.status(409).json({ error: "Table is not reserved or has no active reservation." });
        return;
      }

      const [reservation] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, table.reservationId));

      if (!reservation || reservation.code !== code) {
        res.status(401).json({ error: "Invalid reservation code." });
        return;
      }

      // Optionally, update table status to 'occupied' after successful verification
      await db.update(tablesTable)
        .set({ status: "occupied", reservationId: null }) // Clear reservationId once occupied
        .where(eq(tablesTable.id, table.id));

      res.json({ success: true, message: "Reservation verified successfully. Table is now occupied." });
    });
    ```

3.  **Update `openapi.yaml` for new endpoint:**
    *   Add the new `/tables/{id}/verify-reservation` endpoint to `openapi.yaml` with its request body and response schema. Also update `CreateReservationBody` to include `tableId`.

    ```yaml
    # Add to paths section
    /tables/{id}/verify-reservation:
      post:
        operationId: verifyTableReservation
        tags: [tables]
        summary: Verify a reservation code for a reserved table
        parameters:
          - name: id
            in: path
            required: true
            schema:
              type: integer
        requestBody:
          required: true
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: string
                    description: 8-character reservation code
                required:
                  - code
        responses:
          
        "200":
            description: Reservation verified successfully
            content:
              application/json:
                schema:
                  $ref: "#/components/schemas/SuccessResponse"
          "400":
            description: Invalid request
          "401":
            description: Invalid reservation code
          "404":
            description: Table not found
          "409":
            description: Table not reserved or no active reservation

    # Update CreateReservationBody to include tableId
    # Locate CreateReservationBody schema and add:
    #       tableId:
    #         type: integer
    #         nullable: true

    ```

3.  **Regenerate Zod Schemas:**
    *   After updating `openapi.yaml`, execute the following command in the `MyHub` root directory:

    ```bash
    pnpm --filter api-zod generate
    ```

### 1.3. Frontend Implementation

**Objective:** Update admin and customer UIs to reflect the new `reserved` state and implement the verification prompt.

**Files to Modify:**
*   `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/tables.tsx`
*   `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/reservations.tsx`
*   `/home/ubuntu/MyHub/artifacts/myhub/src/pages/home.tsx`
*   `/home/ubuntu/MyHub/artifacts/myhub/src/pages/table-order.tsx`
*   `/home/ubuntu/MyHub/artifacts/myhub/src/hooks/use-api.ts` (to add new API calls)

**Step-by-Step Instructions:**

1.  **Update `admin/tables.tsx`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/tables.tsx`.
    *   Modify the rendering logic for table cards to display a distinct visual (e.g., **yellow** background or border) when `table.status === 'reserved'`.
    *   Consider adding an action to view/manage the linked reservation from the table card.

2.  **Update `admin/reservations.tsx`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/reservations.tsx`.
    *   Enhance the reservation card to allow admins to assign an `available` table to a `pending` reservation. This would involve a dropdown or modal to select an available table and then calling an API endpoint (e.g., a new `PUT /reservations/:id/assign-table` or extending `updateReservationStatus`).

3.  **Update `home.tsx`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/pages/home.tsx`.
    *   Modify the logic that determines if a QR code dialog is shown. If `table.status === 'reserved'`, the QR code should lead to a verification flow instead of direct access to `table-order.tsx`.

4.  **Update `table-order.tsx`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/pages/table-order.tsx`.
    *   Implement a conditional rendering block at the beginning of the component. If the table status is `reserved`, display a modal or input field prompting the user to enter the 8-character reservation code.
    *   Use the new `verifyTableReservation` API call (from `use-api.ts`) to validate the code. On success, dismiss the prompt and allow access to the menu. On failure, display an error message.

5.  **Update `use-api.ts`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/hooks/use-api.ts`.
    *   Add a new mutation hook for the `verifyTableReservation` API call.

    ```typescript
    // Example for useVerifyTableReservation
    export const useVerifyTableReservation = () => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: ({ id, code }: { id: number; code: string }) =>
          api.verifyTableReservation(id, { code }),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["tables"] });
          queryClient.invalidateQueries({ queryKey: ["reservations"] });
          // Potentially navigate or update local state
        },
      });
    };
    ```

## 2. Mobile Responsiveness & Admin UI

This section details the improvements for mobile responsiveness in the admin dashboard.

### 2.1. Responsive Navigation

**Objective:** Replace the fixed sidebar with a mobile-friendly drawer (hamburger menu).

**Files to Modify:**
*   `/home/ubuntu/MyHub/artifacts/myhub/src/components/layout/admin-layout.tsx`
*   `/home/ubuntu/MyHub/artifacts/myhub/src/components/ui/drawer.tsx` (or similar component from Shadcn UI)

**Step-by-Step Instructions:**

1.  **Modify `admin-layout.tsx`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/components/layout/admin-layout.tsx`.
    *   **Remove/Hide Sidebar on Mobile:** Adjust CSS classes to hide the `<aside>` element on small screens (`md:hidden`).
    *   **Add Top Navigation Bar:** Introduce a new top navigation bar that is visible on mobile. This bar will contain a hamburger icon.
    *   **Integrate Drawer Component:** Use a Shadcn UI `Drawer` component (or similar) that opens when the hamburger icon is tapped. The drawer will contain the navigation items currently in the sidebar.

    ```typescript
    // Example (conceptual, actual implementation depends on Shadcn UI Drawer usage)
    import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"; // Assuming you have a Drawer component
    import { MenuIcon } from "lucide-react"; // For hamburger icon

    // ... inside AdminLayout component ...

    return (
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Mobile Top Nav with Hamburger */}
        <header className="md:hidden h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          <Link href="/admin/dashboard" className="text-xl font-bold text-sidebar-primary tracking-tight">MyHUB<span className="text-sidebar-foreground">Admin</span></Link>
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon">
                <MenuIcon className="h-6 w-6" />
              </Button>
            </DrawerTrigger>
            <DrawerContent side="left" className="w-64 p-4">
              {/* Navigation items go here, similar to the desktop sidebar */}
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => { /* ... render nav items ... */ })}
              </nav>
              <div className="mt-auto">
                <Button onClick={logout} className="w-full justify-start">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              </div>
            </DrawerContent>
          </Drawer>
        </header>

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 border-r border-sidebar-border bg-sidebar flex-col shrink-0 transition-all duration-200">
          {/* ... existing desktop sidebar content ... */}
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    );
    ```

### 2.2. Adaptive Data Display

**Objective:** Transform wide data tables into vertical cards on mobile for `orders.tsx` and `tables.tsx`.

**Files to Modify:**
*   `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/orders.tsx`
*   `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/tables.tsx`

**Step-by-Step Instructions:**

1.  **Modify `admin/orders.tsx`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/orders.tsx`.
    *   Implement responsive rendering: on small screens, instead of a `<table>` element, map over the `orders` data and render each order as a `Card` component. Each card will display relevant order details (ID, table, status, items, total) in a stacked, readable format.

    ```typescript
    // Example (conceptual)
    import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
    import { useMediaQuery } from "@/hooks/use-media-query"; // Assuming a hook for media queries

    // ... inside AdminOrders component ...
    const isMobile = useMediaQuery("(max-width: 768px)"); // Define breakpoint

    if (isLoading) return <div>Loading orders...</div>;

    return (
      <div className="p-4">
        {/* ... filter/tab logic ... */}

        {isMobile ? (
          <div className="grid gap-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <CardTitle>Order #{order.id} - Table {order.tableId}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Status: {order.status}</p>
                  <p>Payment: {order.paymentStatus}</p>
                  <p>Total: ${order.totalAmount}</p>
                  {/* Display order items, etc. */}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          {/* Existing table rendering for desktop */}
          <Table>
            {/* ... table header and rows ... */}
          </Table>
        )}
      </div>
    );
    ```

2.  **Modify `admin/tables.tsx`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/tables.tsx`.
    *   Apply similar responsive rendering logic as for `admin/orders.tsx`. On mobile, render each table as a `Card` component, displaying its name, status, and capacity in a stacked layout.

## 3. Unified Authentication & Email Verification

This section outlines the migration to a unified user model and the implementation of a customer registration and email verification flow.

### 3.1. User Model Migration

**Objective:** Replace `adminsTable` with a `usersTable` that supports roles and email verification.

**Files to Modify:**
*   `/home/ubuntu/MyHub/lib/db/src/schema/admins.ts` (will be renamed and modified)
*   `/home/ubuntu/MyHub/lib/db/src/schema/index.ts` (to update exports)
*   `/home/ubuntu/MyHub/lib/api-spec/openapi.yaml` (for new user schemas)

**Step-by-Step Instructions:**

1.  **Rename and Modify `admins.ts` to `users.ts`:**
    *   Rename `/home/ubuntu/MyHub/lib/db/src/schema/admins.ts` to `/home/ubuntu/MyHub/lib/db/src/schema/users.ts`.
    *   Open the new `users.ts` file and rename `adminsTable` to `usersTable`.
    *   Add `email`, `role`, `emailVerified`, and `verificationCode` columns.

    ```typescript
    // Before:
    // export const adminsTable = pgTable("admins", {
    //   id: serial("id").primaryKey(),
    //   username: text("username").notNull().unique(),
    //   passwordHash: text("password_hash").notNull(),
    //   createdAt: timestamp("created_at").notNull().defaultNow(),
    // });

    // After:
    import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
    import { createInsertSchema } from "drizzle-zod";
    import { z } from "zod/v4";

    export const usersTable = pgTable("users", {
      id: serial("id").primaryKey(),
      username: text("username").unique(), // Make username optional for customer accounts
      email: text("email").notNull().unique(),
      passwordHash: text("password_hash").notNull(),
      role: text("role", { enum: ["admin", "customer"] }).notNull().default("customer"),
      emailVerified: boolean("email_verified").notNull().default(false),
      verificationCode: text("verification_code").unique(),
      createdAt: timestamp("created_at").notNull().defaultNow(),
    });

    export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, emailVerified: true });
    export type InsertUser = z.infer<typeof insertUserSchema>;
    export type User = typeof usersTable.$inferSelect;
    ```

2.  **Update `lib/db/src/schema/index.ts`:**
    *   Open `/home/ubuntu/MyHub/lib/db/src/schema/index.ts`.
    *   Update the export from `adminsTable` to `usersTable`.

    ```typescript
    // Before:
    // export * from "./admins";
    // After:
    export * from "./users";
    ```

3.  **Update `openapi.yaml` for User Schemas:**
    *   Open `/home/ubuntu/MyHub/lib/api-spec/openapi.yaml`.
    *   Replace `AdminLoginBody`, `AdminLoginResponse`, `AdminSession` schemas with new `UserLoginBody`, `UserLoginResponse`, `UserSession` that reflect the `usersTable` structure and `role`.
    *   Add new schemas for `RegisterUserBody`, `VerifyEmailBody`.

4.  **Regenerate Zod Schemas:**
    *   Execute `pnpm --filter api-zod generate` to update Zod types.

### 3.2. Registration & Verification API

**Objective:** Implement new API endpoints for user registration and email verification.

**Files to Modify/Create:**
*   `/home/ubuntu/MyHub/artifacts/api-server/src/routes/auth.ts` (new file)
*   `/home/ubuntu/MyHub/artifacts/api-server/src/app.ts` (to mount new auth router)
*   `/home/ubuntu/MyHub/lib/api-spec/openapi.yaml` (for new auth endpoints)

**Step-by-Step Instructions:**

1.  **Create `auth.ts`:**
    *   Create a new file `/home/ubuntu/MyHub/artifacts/api-server/src/routes/auth.ts`.
    *   Implement `POST /api/auth/register` and `POST /api/auth/verify` endpoints.
    *   **Registration:**
        *   Hash password using `bcrypt` (install if not present: `pnpm add bcrypt`).
        *   Generate a unique `verificationCode` (e.g., UUID or crypto-random string).
        *   Save user with `emailVerified: false` and `verificationCode`.
        *   Send verification email (placeholder for now).
    *   **Verification:**
        *   Find user by `email` and `verificationCode`.
        *   If match, set `emailVerified: true` and clear `verificationCode`.

    ```typescript
    // /home/ubuntu/MyHub/artifacts/api-server/src/routes/auth.ts
    import { Router, type IRouter } from "express";
    import { eq } from "drizzle-orm";
    import { db, usersTable } from "@workspace/db";
    import bcrypt from "bcrypt"; // pnpm add bcrypt
    import { v4 as uuidv4 } from "uuid"; // pnpm add uuid
    import { 
      RegisterUserBody, 
      VerifyEmailBody, 
      UserLoginBody, 
      UserLoginResponse, 
      SuccessResponse 
    } from "@workspace/api-zod";

    const router: IRouter = Router();

    // Helper to send email (placeholder)
    const sendVerificationEmail = async (email: string, code: string) => {
      console.log(`Sending verification email to ${email} with code: ${code}`);
      // TODO: Integrate with actual email service like Resend
    };

    router.post("/auth/register", async (req, res): Promise<void> => {
      const parsed = RegisterUserBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }

      const { email, password, username, role } = parsed.data;

      const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
      if (existingUser) {
        res.status(409).json({ error: "User with this email already exists." });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const verificationCode = uuidv4();

      const [newUser] = await db.insert(usersTable).values({
        email,
        username: username || null, // Username optional for customers
        passwordHash,
        role: role || "customer", // Default to customer
        verificationCode,
      }).returning();

      await sendVerificationEmail(newUser.email, verificationCode);

      res.status(201).json(SuccessResponse.parse({ success: true, message: "Registration successful. Please check your email for verification." }));
    });

    router.post("/auth/verify", async (req, res): Promise<void> => {
      const parsed = VerifyEmailBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }

      const { email, code } = parsed.data;

      const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

      if (!user || user.verificationCode !== code) {
        res.status(401).json({ error: "Invalid email or verification code." });
        return;
      }

      await db.update(usersTable)
        .set({ emailVerified: true, verificationCode: null })
        .where(eq(usersTable.id, user.id));

      res.json(SuccessResponse.parse({ success: true, message: "Email verified successfully." }));
    });

    // Existing login logic, adapted for usersTable and roles
    router.post("/auth/login", async (req, res): Promise<void> => {
      const parsed = UserLoginBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }

      const { email, password } = parsed.data;

      const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ error: "Invalid credentials." });
        return;
      }

      if (!user.emailVerified) {
        res.status(403).json({ error: "Please verify your email address." });
        return;
      }

      // Set session (assuming Express session is configured in app.ts)
      req.session.userId = user.id;
      req.session.userRole = user.role;

      res.json(UserLoginResponse.parse({ user: { id: user.id, email: user.email, role: user.role, username: user.username || undefined } }));
    });

    router.post("/auth/logout", (req, res): void => {
      req.session.destroy((err) => {
        if (err) {
          res.status(500).json({ error: "Failed to log out." });
          return;
        }
        res.json(SuccessResponse.parse({ success: true, message: "Logged out successfully." }));
      });
    });

    router.get("/auth/me", async (req, res): Promise<void> => {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated." });
        return;
      }
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
      if (!user) {
        req.session.destroy(() => {}); // Clear invalid session
        res.status(401).json({ error: "User not found." });
        return;
      }
      res.json(UserLoginResponse.parse({ user: { id: user.id, email: user.email, role: user.role, username: user.username || undefined } }));
    });

    export default router;
    ```

2.  **Mount Auth Router in `app.ts`:**
    *   Open `/home/ubuntu/MyHub/artifacts/api-server/src/app.ts`.
    *   Import the new `authRouter` and mount it under `/api`.

    ```typescript
    // ... existing imports ...
    import authRouter from "./routes/auth";

    // ... inside app.ts, after other routers are mounted ...
    app.use("/api", authRouter);
    ```

3.  **Update `openapi.yaml` for new Auth Endpoints:**
    *   Add paths for `/auth/register`, `/auth/verify`, `/auth/login`, `/auth/logout`, `/auth/me` to `openapi.yaml`.
    *   Define `RegisterUserBody`, `VerifyEmailBody`, `UserLoginBody`, `UserLoginResponse` schemas.

### 3.3. Frontend Authentication Flow

**Objective:** Create a unified login/registration page and adapt existing auth hooks.

**Files to Modify:**
*   `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/login.tsx` (will be renamed/modified)
*   `/home/ubuntu/MyHub/artifacts/myhub/src/hooks/use-auth.ts` (will be adapted)
*   `/home/ubuntu/MyHub/artifacts/myhub/src/App.tsx` (for routing)

**Step-by-Step Instructions:**

1.  **Create Unified Auth Page:**
    *   Rename `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/login.tsx` to `/home/ubuntu/MyHub/artifacts/myhub/src/pages/auth.tsx`.
    *   Modify `auth.tsx` to include both login and registration forms, possibly using tabs or conditional rendering. It should also handle email verification input.
    *   Use new API hooks (from `use-api.ts`) for `registerUser`, `verifyEmail`, `loginUser`.
    *   Upon successful login/registration/verification, redirect users based on their `role`.

2.  **Adapt `use-auth.ts` Hook:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/hooks/use-auth.ts`.
    *   Rename `useAuth` to `useUserAuth` or similar, and adapt it to work with the new `User` context and `role`.
    *   The `isAdmin` check will now be `user?.role === 'admin'`.

3.  **Update `App.tsx` Routing:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/App.tsx`.
    *   Adjust routes to use the new unified auth page and handle redirects based on user roles.

## 4. QR Code Payment & Table Reset

This section details the implementation of a QR code payment generation feature and automatic table reset upon payment confirmation.

### 4.1. Payment Generation UI

**Objective:** Add a "Generate Payment QR" button in the admin dashboard for occupied tables.

**Files to Modify:**
*   `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/orders.tsx`
*   `/home/ubuntu/MyHub/artifacts/myhub/src/components/ui/dialog.tsx` (for QR display)

**Step-by-Step Instructions:**

1.  **Modify `admin/orders.tsx`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/orders.tsx`.
    *   For orders associated with `occupied` tables and `unpaid` payment status, display a "Generate Payment QR" button.
    *   When clicked, this button should open a `Dialog` (modal) containing a QR code. The QR code can be generated using a library like `qrcode.react` (install `pnpm add qrcode.react`). The QR code content will be a predefined payment URL (e.g., `https://ibourq.com/pay?orderId={order.id}&amount={order.totalAmount}`).

    ```typescript
    // Example (conceptual)
    import QRCode from "qrcode.react"; // pnpm add qrcode.react
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

    // ... inside AdminOrders component, within order rendering logic ...

    {order.tableStatus === "occupied" && order.paymentStatus === "unpaid" && (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Generate Payment QR</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment QR for Order #{order.id}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4">
            <QRCode value={`https://ibourq.com/pay?orderId=${order.id}&amount=${order.totalAmount}`} size={256} level="H" />
          </div>
          <p className="text-center text-sm text-muted-foreground">Scan to pay ${order.totalAmount}</p>
        </DialogContent>
      </Dialog>
    )}
    <Button
      onClick={() => updateOrderPaymentMutation.mutate({ id: order.id, paymentStatus: "paid" })}
      disabled={order.paymentStatus === "paid"}
    >
      Confirm Payment Received
    </Button>
    ```

### 4.2. Automatic Table Reset API

**Objective:** Modify the `updateOrderPayment` API to automatically reset the table status upon payment confirmation.

**Files to Modify:**
*   `/home/ubuntu/MyHub/artifacts/api-server/src/routes/orders.ts`

**Step-by-Step Instructions:**

1.  **Modify `orders.ts`:**
    *   Open `/home/ubuntu/MyHub/artifacts/api-server/src/routes/orders.ts`.
    *   Locate the `PUT /orders/{id}/payment` endpoint logic.
    *   Inside this endpoint, after updating the order's `paymentStatus` to `paid`, retrieve the `tableId` associated with the order. Then, update the `tablesTable` to set the `status` of that table back to `available` and clear its `reservationId` (if any). This should be done within a database transaction to ensure atomicity.

    ```typescript
    // Inside router.put("/orders/:id/payment", ...)
    // ... existing parsing and validation ...

    const { paymentStatus } = parsed.data;

    await db.transaction(async (tx) => {
      const [order] = await tx.update(ordersTable)
        .set({ paymentStatus })
        .where(eq(ordersTable.id, params.data.id))
        .returning();

      if (!order) {
        tx.rollback();
        res.status(404).json({ error: "Order not found." });
        return;
      }

      // If payment is confirmed and the table was occupied by this order, set it to available
      if (paymentStatus === "paid") {
        await tx.update(tablesTable)
          .set({ status: "available", reservationId: null }) // Clear reservationId as well
          .where(eq(tablesTable.id, order.tableId));
      }

      // Re-fetch order with items for response
      const [updatedOrderWithItems] = await tx.select()
        .from(ordersTable)
        .leftJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.orderId))
        .where(eq(ordersTable.id, order.id));

      // Group order items if necessary for the response structure
      const result = formatOrderWithItems(updatedOrderWithItems);
      res.json(UpdateOrderPaymentResponse.parse(result));
    });
    ```

## 5. Dynamic Traffic Heatmap (Time-Based)

This section details the implementation of a time-based traffic heatmap for reservations.

### 5.1. Analytics API Endpoint

**Objective:** Create a new API endpoint to provide reservation count data per time slot.

**Files to Modify/Create:**
*   `/home/ubuntu/MyHub/artifacts/api-server/src/routes/dashboard.ts` (or a new `analytics.ts`)
*   `/home/ubuntu/MyHub/lib/api-spec/openapi.yaml` (for new endpoint)

**Step-by-Step Instructions:**

1.  **Add to `dashboard.ts` (API):**
    *   Open `/home/ubuntu/MyHub/artifacts/api-server/src/routes/dashboard.ts`.
    *   Add a new `GET /dashboard/traffic-heatmap` endpoint.
    *   This endpoint will accept `startDate` and `endDate` (optional) query parameters.
    *   It will query the `reservationsTable`, group reservations by hour, and count them. The output should be an array of objects like `{ hour: string, count: number }`.

    ```typescript
    // Inside router.get("/dashboard/traffic-heatmap", ...)
    import { sql } from "drizzle-orm"; // Add this import

    router.get("/dashboard/traffic-heatmap", async (req, res): Promise<void> => {
      const { startDate, endDate } = req.query; // Expect YYYY-MM-DD format

      let query = db.select({
        hour: sql<string>`TO_CHAR(${reservationsTable.dateTime}, 'HH24')`,
        count: sql<number>`COUNT(*)`,
      })
      .from(reservationsTable)
      .groupBy(sql`TO_CHAR(${reservationsTable.dateTime}, 'HH24')`)
      .orderBy(sql`TO_CHAR(${reservationsTable.dateTime}, 'HH24')`);

      if (startDate) {
        query = query.where(sql`${reservationsTable.dateTime} >= ${new Date(startDate as string).toISOString()}`);
      }
      if (endDate) {
        query = query.where(sql`${reservationsTable.dateTime} <= ${new Date(endDate as string).toISOString()}`);
      }

      const heatmapData = await query;

      res.json(heatmapData);
    });
    ```

2.  **Update `openapi.yaml` for new endpoint:**
    *   Add the new `/dashboard/traffic-heatmap` endpoint to `openapi.yaml`.

3.  **Regenerate Zod Schemas:**
    *   Execute `pnpm --filter api-zod generate`.

### 5.2. Frontend Integration

**Objective:** Display the traffic heatmap on the customer reservation page and admin dashboard.

**Files to Modify:**
*   `/home/ubuntu/MyHub/artifacts/myhub/src/pages/reservation.tsx`
*   `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/dashboard.tsx`
*   `/home/ubuntu/MyHub/artifacts/myhub/src/hooks/use-api.ts` (to add new API calls)

**Step-by-Step Instructions:**

1.  **Update `use-api.ts`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/hooks/use-api.ts`.
    *   Add a new query hook for `getTrafficHeatmap`.

    ```typescript
    // Example for useGetTrafficHeatmap
    export const useGetTrafficHeatmap = (startDate: string, endDate?: string) => {
      return useQuery({
        queryKey: ["trafficHeatmap", startDate, endDate],
        queryFn: () => api.getDashboardTrafficHeatmap(startDate, endDate),
      });
    };
    ```

2.  **Modify `reservation.tsx`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/pages/reservation.tsx`.
    *   Fetch traffic heatmap data using the new hook for the selected reservation date.
    *   Visually represent the traffic levels (Green, Yellow/Orange, Red) on the time slot selection UI, similar to how existing availability is shown.

3.  **Modify `admin/dashboard.tsx`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/dashboard.tsx`.
    *   Fetch traffic heatmap data for the current day or a selected date range.
    *   Display this data using a chart (e.g., a bar chart or heat calendar) to show peak hours, helping staff prepare.

## Summary of Detailed Changes

This detailed plan provides granular instructions for each improvement, including specific file paths, code modifications, and new component/API considerations. By following these steps, an AI agent can systematically implement the requested features and enhancements to the MyHub project. Each change is broken down to minimize ambiguity and facilitate direct execution.
## 3. Unified Authentication & Email Verification (Continued)

### 3.3. Frontend Authentication Flow (Continued)

**Objective:** Create a unified login/registration page and adapt existing auth hooks.

**Files to Modify:**
*   `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/login.tsx` (will be renamed/modified)
*   `/home/ubuntu/MyHub/artifacts/myhub/src/hooks/use-auth.ts` (will be adapted)
*   `/home/ubuntu/MyHub/artifacts/myhub/src/App.tsx` (for routing)
*   `/home/ubuntu/MyHub/artifacts/myhub/src/hooks/use-api.ts` (to add new API calls)

**Step-by-Step Instructions:**

1.  **Update `use-api.ts` for new Auth APIs:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/hooks/use-api.ts`.
    *   Add new mutation hooks for `registerUser`, `verifyEmail`, and update `loginUser`, `logoutUser`, `getMe` to use the new unified user endpoints.

    ```typescript
    // Example for new auth hooks
    export const useRegisterUser = () => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: (data: RegisterUserBody) => api.registerUser(data),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["user"] });
          // Potentially show a success toast and guide user to check email
        },
      });
    };

    export const useVerifyEmail = () => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: (data: VerifyEmailBody) => api.verifyEmail(data),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["user"] });
          // Potentially show a success toast and redirect to login
        },
      });
    };

    // Adapt existing useAdminLogin to use unified /auth/login
    export const useLoginUser = () => {
      const queryClient = useQueryClient();
      const setLocation = useLocation()[1];
      return useMutation({
        mutationFn: (data: UserLoginBody) => api.loginUser(data),
        onSuccess: (response) => {
          queryClient.invalidateQueries({ queryKey: ["user"] });
          if (response.user.role === "admin") {
            setLocation("/admin/dashboard");
          } else {
            setLocation("/"); // Redirect customers to home or a customer dashboard
          }
        },
      });
    };

    // Adapt existing useAdminLogout to use unified /auth/logout
    export const useLogoutUser = () => {
      const queryClient = useQueryClient();
      const setLocation = useLocation()[1];
      return useMutation({
        mutationFn: () => api.logoutUser(),
        onSuccess: () => {
          queryClient.clear();
          setLocation("/auth"); // Redirect to unified auth page
        },
      });
    };

    // Adapt existing useGetAdminMe to use unified /auth/me
    export const useGetMe = () => {
      return useQuery({
        queryKey: ["user"],
        queryFn: () => api.getMe(),
        retry: false,
      });
    };
    ```

2.  **Create Unified Auth Page (`/home/ubuntu/MyHub/artifacts/myhub/src/pages/auth.tsx`):**
    *   Rename `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/login.tsx` to `/home/ubuntu/MyHub/artifacts/myhub/src/pages/auth.tsx`.
    *   This page will serve as the entry point for both login and registration, and potentially email verification.
    *   Use a state variable (e.g., `mode: 'login' | 'register' | 'verify'`) to switch between forms.
    *   **Login Form:** Use `useLoginUser` hook. On success, redirect based on user role.
    *   **Registration Form:** Use `useRegisterUser` hook. On success, display a message to check email and potentially switch `mode` to `verify`.
    *   **Verification Form:** If `mode` is `verify`, prompt for email and verification code. Use `useVerifyEmail` hook. On success, redirect to login or home.

    ```typescript
    // /home/ubuntu/MyHub/artifacts/myhub/src/pages/auth.tsx (conceptual structure)
    import { useState } from "react";
    import { useLoginUser, useRegisterUser, useVerifyEmail } from "@/hooks/use-api";
    import { useForm } from "react-hook-form";
    import { zodResolver } from "@hookform/resolvers/zod";
    import { z } from "zod";
    import { Button } from "@/components/ui/button";
    import { Input } from "@/components/ui/input";
    import { Label } from "@/components/ui/label";
    import { Link } from "wouter";

    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });

    const registerSchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      username: z.string().optional(),
    });

    const verifySchema = z.object({
      email: z.string().email(),
      code: z.string().length(8), // Assuming 8-char code
    });

    export default function AuthPage() {
      const [mode, setMode] = useState<"login" | "register" | "verify">("login");

      const loginForm = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
      const registerForm = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });
      const verifyForm = useForm<z.infer<typeof verifySchema>>({ resolver: zodResolver(verifySchema) });

      const loginMutation = useLoginUser();
      const registerMutation = useRegisterUser();
      const verifyMutation = useVerifyEmail();

      const handleLogin = loginForm.handleSubmit((data) => {
        loginMutation.mutate(data);
      });

      const handleRegister = registerForm.handleSubmit((data) => {
        registerMutation.mutate(data, {
          onSuccess: () => {
            setMode("verify");
            verifyForm.setValue("email", data.email);
          },
        });
      });

      const handleVerify = verifyForm.handleSubmit((data) => {
        verifyMutation.mutate(data, {
          onSuccess: () => {
            setMode("login");
            // Show success toast
          },
        });
      });

      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <h2 className="text-2xl font-bold text-center">Login</h2>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...loginForm.register("email")} />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" {...loginForm.register("password")} />
                </div>
                <Button type="submit" className="w-full">Login</Button>
                <p className="text-center text-sm">
                  Don't have an account? <Link href="#" onClick={() => setMode("register")}>Register</Link>
                </p>
              </form>
            )}

            {mode === "register" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <h2 className="text-2xl font-bold text-center">Register</h2>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...registerForm.register("email")} />
                </div>
                <div>
                  <Label htmlFor="username">Username (Optional)</Label>
                  <Input id="username" type="text" {...registerForm.register("username")} />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" {...registerForm.register("password")} />
                </div>
                <Button type="submit" className="w-full">Register</Button>
                <p className="text-center text-sm">
                  Already have an account? <Link href="#" onClick={() => setMode("login")}>Login</Link>
                </p>
              </form>
            )}

            {mode === "verify" && (
              <form onSubmit={handleVerify} className="space-y-4">
                <h2 className="text-2xl font-bold text-center">Verify Email</h2>
                <p className="text-center text-sm">A verification code has been sent to your email.</p>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...verifyForm.register("email")} readOnly />
                </div>
                <div>
                  <Label htmlFor="code">Verification Code</Label>
                  <Input id="code" type="text" {...verifyForm.register("code")} />
                </div>
                <Button type="submit" className="w-full">Verify</Button>
              </form>
            )}
          </div>
        </div>
      );
    }
    ```

3.  **Update `App.tsx` Routing:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/App.tsx`.
    *   Modify the routing to direct unauthenticated users to the new `/auth` page.
    *   Protect admin routes based on `user.role === 'admin'`.

    ```typescript
    // /home/ubuntu/MyHub/artifacts/myhub/src/App.tsx (conceptual)
    import { Route, Switch, Redirect } from "wouter";
    import { useGetMe } from "@/hooks/use-api";
    import AdminLayout from "@/components/layout/admin-layout";
    import CustomerLayout from "@/components/layout/customer-layout"; // Assuming a customer layout
    import AuthPage from "@/pages/auth";
    // ... import other pages

    function App() {
      const { data: user, isLoading, isError } = useGetMe();

      if (isLoading) {
        return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
      }

      return (
        <Switch>
          <Route path="/auth" component={AuthPage} />

          {/* Public Routes */}
          <Route path="/" component={HomePage} />
          <Route path="/reservation" component={ReservationPage} />
          <Route path="/reservation-success" component={ReservationSuccessPage} />
          <Route path="/table/:id" component={TableOrderPage} />

          {/* Admin Protected Routes */}
          {user?.user.role === "admin" ? (
            <AdminLayout>
              <Route path="/admin/dashboard" component={AdminDashboardPage} />
              <Route path="/admin/tables" component={AdminTablesPage} />
              <Route path="/admin/orders" component={AdminOrdersPage} />
              <Route path="/admin/menu" component={AdminMenuPage} />
              <Route path="/admin/reservations" component={AdminReservationsPage} />
            </AdminLayout>
          ) : (
            <Redirect to="/auth" /> // Redirect non-admin or unauthenticated to auth page
          )}

          {/* Fallback for unknown routes */}
          <Route component={NotFoundPage} />
        </Switch>
      );
    }

    export default App;
    ```

## 5. Dynamic Traffic Heatmap (Time-Based) (Continued)

### 5.2. Frontend Integration (Continued)

**Objective:** Display the traffic heatmap on the customer reservation page and admin dashboard.

**Files to Modify:**
*   `/home/ubuntu/MyHub/artifacts/myhub/src/pages/reservation.tsx`
*   `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/dashboard.tsx`

**Step-by-Step Instructions:**

1.  **Modify `reservation.tsx`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/pages/reservation.tsx`.
    *   Fetch traffic heatmap data using `useGetTrafficHeatmap` for the currently selected date.
    *   Integrate this data into the time slot selection UI. For example, you can color-code time slots (green, yellow, orange, red) based on their reservation count relative to the table capacity. You'll need to define capacity thresholds (e.g., 0-30% green, 31-70% yellow/orange, 71-100% red).

    ```typescript
    // /home/ubuntu/MyHub/artifacts/myhub/src/pages/reservation.tsx (conceptual)
    import { useGetTrafficHeatmap } from "@/hooks/use-api";
    import { format } from "date-fns";

    // ... inside ReservationPage component ...
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined;

    const { data: heatmapData, isLoading: isLoadingHeatmap } = useGetTrafficHeatmap(
      formattedDate || "",
      undefined,
      { enabled: !!formattedDate }
    );

    // Function to determine traffic level based on count and total capacity
    const getTrafficLevel = (count: number, totalCapacity: number) => {
      const percentage = (count / totalCapacity) * 100;
      if (percentage <= 30) return "green";
      if (percentage <= 70) return "yellow";
      return "red";
    };

    // ... inside rendering time slots ...
    {timeSlots.map((slot) => {
      const slotHour = format(slot, "HH");
      const reservationsInSlot = heatmapData?.find(data => data.hour === slotHour)?.count || 0;
      const trafficLevel = getTrafficLevel(reservationsInSlot, totalTablesCapacity); // totalTablesCapacity needs to be fetched or calculated

      return (
        <Button
          key={slot.toISOString()}
          // ... existing props ...
          className={`w-full ${trafficLevel === "green" ? "bg-green-200" : trafficLevel === "yellow" ? "bg-yellow-200" : trafficLevel === "red" ? "bg-red-200" : ""}`}
        >
          {format(slot, "HH:mm")}
        </Button>
      );
    })}
    ```

2.  **Modify `admin/dashboard.tsx`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/dashboard.tsx`.
    *   Fetch traffic heatmap data for the current day or a selected date range using `useGetTrafficHeatmap`.
    *   Display this data using a chart component (e.g., a bar chart from a charting library like Recharts or Chart.js, if integrated). This will provide a visual overview of peak hours for the admin.

    ```typescript
    // /home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/dashboard.tsx (conceptual)
    import { useGetTrafficHeatmap } from "@/hooks/use-api";
    import { format } from "date-fns";
    // import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"; // Example charting library

    // ... inside AdminDashboardPage component ...
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: heatmapData, isLoading: isLoadingHeatmap } = useGetTrafficHeatmap(today);

    // ... rendering dashboard content ...

    <h3 className="text-lg font-semibold">Daily Reservation Traffic</h3>
    {isLoadingHeatmap ? (
      <div>Loading traffic data...</div>
    ) : (
      // Example using a hypothetical Chart component
      // <ResponsiveContainer width="100%" height={300}>
      //   <BarChart data={heatmapData}>
      //     <XAxis dataKey="hour" />
      //     <YAxis />
      //     <Tooltip />
      //     <Bar dataKey="count" fill="#8884d8" />
      //   </BarChart>
      // </ResponsiveContainer>
      <div className="grid grid-cols-6 gap-2 mt-4">
        {heatmapData?.map((data) => (
          <div key={data.hour} className="text-center p-2 border rounded-md">
            <p className="font-bold">{data.hour}:00</p>
            <p>{data.count} reservations</p>
          </div>
        ))}
      </div>
    )}
    ```

## Summary of Detailed Changes

This detailed plan provides granular instructions for each improvement, including specific file paths, code modifications, and new component/API considerations. By following these steps, an AI agent can systematically implement the requested features and enhancements to the MyHub project. Each change is broken down to minimize ambiguity and facilitate direct execution.
## 4. QR Code Payment & Table Reset

This section details the implementation of a QR code payment generation feature and automatic table reset upon payment confirmation.

### 4.1. Payment Generation UI

**Objective:** Add a "Generate Payment QR" button in the admin dashboard for occupied tables.

**Files to Modify:**
*   `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/orders.tsx`
*   `/home/ubuntu/MyHub/artifacts/myhub/src/components/ui/dialog.tsx` (for QR display, assuming it exists or will be created)

**Step-by-Step Instructions:**

1.  **Modify `admin/orders.tsx`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/orders.tsx`.
    *   For orders associated with `occupied` tables and `unpaid` payment status, display a "Generate Payment QR" button.
    *   When clicked, this button should open a `Dialog` (modal) containing a QR code. The QR code can be generated using a library like `qrcode.react` (install `pnpm add qrcode.react`). The QR code content will be a predefined payment URL (e.g., `https://ibourq.com/pay?orderId={order.id}&amount={order.totalAmount}`).

    ```typescript
    // Example (conceptual)
    import QRCode from "qrcode.react"; // First, install: pnpm add qrcode.react
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; // Assuming Shadcn UI Dialog
    import { Button } from "@/components/ui/button";

    // ... inside AdminOrders component, within order rendering logic ...

    {order.tableStatus === "occupied" && order.paymentStatus === "unpaid" && (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="mr-2">Generate Payment QR</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment QR for Order #{order.id}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4">
            <QRCode value={`https://ibourq.com/pay?orderId=${order.id}&amount=${order.totalAmount}`} size={256} level="H" />
          </div>
          <p className="text-center text-sm text-muted-foreground">Scan to pay ${order.totalAmount}</p>
        </DialogContent>
      </Dialog>
    )}
    <Button
      onClick={() => updateOrderPaymentMutation.mutate({ id: order.id, paymentStatus: "paid" })}
      disabled={order.paymentStatus === "paid"}
    >
      Confirm Payment Received
    </Button>
    ```

### 4.2. Automatic Table Reset API

**Objective:** Modify the `updateOrderPayment` API to automatically reset the table status upon payment confirmation.

**Files to Modify:**
*   `/home/ubuntu/MyHub/artifacts/api-server/src/routes/orders.ts`

**Step-by-Step Instructions:**

1.  **Modify `orders.ts`:**
    *   Open `/home/ubuntu/MyHub/artifacts/api-server/src/routes/orders.ts`.
    *   Locate the `PUT /orders/{id}/payment` endpoint logic.
    *   Inside this endpoint, after updating the order's `paymentStatus` to `paid`, retrieve the `tableId` associated with the order. Then, update the `tablesTable` to set the `status` of that table back to `available` and clear its `reservationId` (if any). This should be done within a database transaction to ensure atomicity.

    ```typescript
    // Inside router.put("/orders/:id/payment", ...)
    // ... existing parsing and validation ...

    const { paymentStatus } = parsed.data;

    await db.transaction(async (tx) => {
      const [order] = await tx.update(ordersTable)
        .set({ paymentStatus })
        .where(eq(ordersTable.id, params.data.id))
        .returning();

      if (!order) {
        tx.rollback();
        res.status(404).json({ error: "Order not found." });
        return;
      }

      // If payment is confirmed and the table was occupied by this order, set it to available
      if (paymentStatus === "paid") {
        await tx.update(tablesTable)
          .set({ status: "available", reservationId: null }) // Clear reservationId as well
          .where(eq(tablesTable.id, order.tableId));
      }

      // Re-fetch order with items for response
      const [updatedOrderWithItems] = await tx.select()
        .from(ordersTable)
        .leftJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.orderId))
        .where(eq(ordersTable.id, order.id));

      // Group order items if necessary for the response structure
      const result = formatOrderWithItems(updatedOrderWithItems); // Assuming formatOrderWithItems exists
      res.json(UpdateOrderPaymentResponse.parse(result));
    });
    ```

## 5. Dynamic Traffic Heatmap (Time-Based)

This section details the implementation of a time-based traffic heatmap for reservations.

### 5.1. Analytics API Endpoint

**Objective:** Create a new API endpoint to provide reservation count data per time slot.

**Files to Modify/Create:**
*   `/home/ubuntu/MyHub/artifacts/api-server/src/routes/dashboard.ts` (or a new `analytics.ts`)
*   `/home/ubuntu/MyHub/lib/api-spec/openapi.yaml` (for new endpoint)

**Step-by-Step Instructions:**

1.  **Add to `dashboard.ts` (API):**
    *   Open `/home/ubuntu/MyHub/artifacts/api-server/src/routes/dashboard.ts`.
    *   Add a new `GET /dashboard/traffic-heatmap` endpoint.
    *   This endpoint will accept `startDate` and `endDate` (optional) query parameters.
    *   It will query the `reservationsTable`, group reservations by hour, and count them. The output should be an array of objects like `{ hour: string, count: number }`.

    ```typescript
    // Inside router.get("/dashboard/traffic-heatmap", ...)
    import { sql } from "drizzle-orm"; // Add this import
    import { reservationsTable } from "@workspace/db"; // Ensure reservationsTable is imported

    router.get("/dashboard/traffic-heatmap", async (req, res): Promise<void> => {
      const { startDate, endDate } = req.query; // Expect YYYY-MM-DD format

      let query = db.select({
        hour: sql<string>`TO_CHAR(${reservationsTable.dateTime}, 'HH24')`,
        count: sql<number>`COUNT(*)`,
      })
      .from(reservationsTable)
      .groupBy(sql`TO_CHAR(${reservationsTable.dateTime}, 'HH24')`)
      .orderBy(sql`TO_CHAR(${reservationsTable.dateTime}, 'HH24')`);

      if (startDate) {
        query = query.where(sql`${reservationsTable.dateTime} >= ${new Date(startDate as string).toISOString()}`);
      }
      if (endDate) {
        query = query.where(sql`${reservationsTable.dateTime} <= ${new Date(endDate as string).toISOString()}`);
      }

      const heatmapData = await query;

      res.json(heatmapData);
    });
    ```

2.  **Update `openapi.yaml` for new endpoint:**
    *   Add the new `/dashboard/traffic-heatmap` endpoint to `openapi.yaml`.

    ```yaml
    # Add to paths section
    /dashboard/traffic-heatmap:
      get:
        operationId: getDashboardTrafficHeatmap
        tags: [dashboard]
        summary: Get reservation traffic heatmap data by hour
        parameters:
          - name: startDate
            in: query
            required: false
            schema:
              type: string
              format: date
            description: Start date for filtering (YYYY-MM-DD)
          - name: endDate
            in: query
            required: false
            schema:
              type: string
              format: date
            description: End date for filtering (YYYY-MM-DD)
        responses:
          "200":
            description: Hourly reservation counts
            content:
              application/json:
                schema:
                  type: array
                  items:
                    type: object
                    properties:
                      hour:
                        type: string
                        description: Hour of the day (00-23)
                      count:
                        type: integer
                        description: Number of reservations in that hour
                    required:
                      - hour
                      - count
    ```

3.  **Regenerate Zod Schemas:**
    *   Execute `pnpm --filter api-zod generate`.

### 5.2. Frontend Integration

**Objective:** Display the traffic heatmap on the customer reservation page and admin dashboard.

**Files to Modify:**
*   `/home/ubuntu/MyHub/artifacts/myhub/src/pages/reservation.tsx`
*   `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/dashboard.tsx`
*   `/home/ubuntu/MyHub/artifacts/myhub/src/hooks/use-api.ts` (to add new API calls)

**Step-by-Step Instructions:**

1.  **Update `use-api.ts`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/hooks/use-api.ts`.
    *   Add a new query hook for `getTrafficHeatmap`.

    ```typescript
    // Example for useGetTrafficHeatmap
    export const useGetTrafficHeatmap = (startDate: string, endDate?: string) => {
      return useQuery({
        queryKey: ["trafficHeatmap", startDate, endDate],
        queryFn: () => api.getDashboardTrafficHeatmap(startDate, endDate),
        enabled: !!startDate, // Only fetch if startDate is provided
      });
    };
    ```

2.  **Modify `reservation.tsx`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/pages/reservation.tsx`.
    *   Fetch traffic heatmap data using the new hook for the currently selected date.
    *   Visually represent the traffic levels (Green, Yellow/Orange, Red) on the time slot selection UI, similar to how existing availability is shown. You'll need to define capacity thresholds (e.g., 0-30% green, 31-70% yellow/orange, 71-100% red). You will also need to determine the `totalTablesCapacity` (e.g., by fetching total tables or a configuration value).

    ```typescript
    // /home/ubuntu/MyHub/artifacts/myhub/src/pages/reservation.tsx (conceptual)
    import { useGetTrafficHeatmap } from "@/hooks/use-api";
    import { format } from "date-fns";
    import { Button } from "@/components/ui/button"; // Assuming Button component

    // ... inside ReservationPage component ...
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined;

    const { data: heatmapData, isLoading: isLoadingHeatmap } = useGetTrafficHeatmap(
      formattedDate || "",
      undefined,
    );

    // Placeholder for total tables capacity - this would ideally come from an API or config
    const totalTablesCapacity = 10; // Example value, adjust as per your system

    // Function to determine traffic level based on count and total capacity
    const getTrafficLevel = (count: number, totalCapacity: number) => {
      const percentage = (count / totalCapacity) * 100;
      if (percentage <= 30) return "green";
      if (percentage <= 70) return "yellow";
      return "red";
    };

    // ... inside rendering time slots (assuming `timeSlots` array is available) ...
    {timeSlots.map((slot) => {
      const slotHour = format(slot, "HH");
      const reservationsInSlot = heatmapData?.find(data => data.hour === slotHour)?.count || 0;
      const trafficLevel = getTrafficLevel(reservationsInSlot, totalTablesCapacity); 

      return (
        <Button
          key={slot.toISOString()}
          // ... existing props for time slot button ...
          className={`w-full ${trafficLevel === "green" ? "bg-green-200" : trafficLevel === "yellow" ? "bg-yellow-200" : trafficLevel === "red" ? "bg-red-200" : ""}`}
        >
          {format(slot, "HH:mm")}
        </Button>
      );
    })}
    ```

3.  **Modify `admin/dashboard.tsx`:**
    *   Open `/home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/dashboard.tsx`.
    *   Fetch traffic heatmap data for the current day or a selected date range using `useGetTrafficHeatmap`.
    *   Display this data using a chart component (e.g., a bar chart from a charting library like Recharts or Chart.js, if integrated). This will provide a visual overview of peak hours for the admin.

    ```typescript
    // /home/ubuntu/MyHub/artifacts/myhub/src/pages/admin/dashboard.tsx (conceptual)
    import { useGetTrafficHeatmap } from "@/hooks/use-api";
    import { format } from "date-fns";
    // import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"; // Example charting library

    // ... inside AdminDashboardPage component ...
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: heatmapData, isLoading: isLoadingHeatmap } = useGetTrafficHeatmap(today);

    // ... rendering dashboard content ...

    <h3 className="text-lg font-semibold mt-8">Daily Reservation Traffic</h3>
    {isLoadingHeatmap ? (
      <div>Loading traffic data...</div>
    ) : (
      // Example using a hypothetical Chart component or simple grid display
      // If using a charting library, integrate it here:
      // <ResponsiveContainer width="100%" height={300}>
      //   <BarChart data={heatmapData}>
      //     <XAxis dataKey="hour" />
      //     <YAxis />
      //     <Tooltip />
      //     <Bar dataKey="count" fill="#8884d8" />
      //   </BarChart>
      // </ResponsiveContainer>
      <div className="grid grid-cols-6 gap-2 mt-4">
        {heatmapData?.map((data) => (
          <div key={data.hour} className="text-center p-2 border rounded-md">
            <p className="font-bold">{data.hour}:00</p>
            <p>{data.count} reservations</p>
          </div>
        ))}
      </div>
    )}
    ```

## Summary of Detailed Changes

This detailed plan provides granular instructions for each improvement, including specific file paths, code modifications, and new component/API considerations. By following these steps, an AI agent can systematically implement the requested features and enhancements to the MyHub project. Each change is broken down to minimize ambiguity and facilitate direct execution.


## Summary of Detailed Changes

This detailed plan provides granular instructions for each improvement, including specific file paths, code modifications, and new component/API considerations. By following these steps, an AI agent can systematically implement the requested features and enhancements to the MyHub project. Each change is broken down to minimize ambiguity and facilitate direct execution.
