import { Router, type IRouter, type Request } from "express";
import { eq } from "drizzle-orm";
import { db, customersTable, reservationsTable } from "@workspace/db";
import {
  CustomerRegisterBody,
  CustomerRegisterResponse,
  CustomerLoginBody,
  CustomerLoginResponse,
  CustomerLogoutResponse,
  GetCustomerMeResponse,
} from "@workspace/api-zod";
import { createHash } from "crypto";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "myhub-customer-salt").digest("hex");
}

declare module "express-session" {
  interface SessionData {
    customerId?: number;
    customerEmail?: string;
    customerName?: string;
  }
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = CustomerRegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password, phone } = parsed.data;

  const existing = await db.select().from(customersTable).where(eq(customersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = hashPassword(password);
  const [customer] = await db.insert(customersTable).values({ name, email, passwordHash, phone }).returning();

  req.session.customerId = customer.id;
  req.session.customerEmail = customer.email;
  req.session.customerName = customer.name;

  res.json(CustomerRegisterResponse.parse({
    success: true,
    customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone ?? null },
  }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = CustomerLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const passwordHash = hashPassword(password);

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.email, email));

  if (!customer || customer.passwordHash !== passwordHash) {
    res.status(401).json({ success: false });
    return;
  }

  req.session.customerId = customer.id;
  req.session.customerEmail = customer.email;
  req.session.customerName = customer.name;

  res.json(CustomerLoginResponse.parse({
    success: true,
    customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone ?? null },
  }));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.customerId = undefined;
  req.session.customerEmail = undefined;
  req.session.customerName = undefined;
  req.session.save(() => {
    res.json(CustomerLogoutResponse.parse({ success: true, message: "Logged out" }));
  });
});

router.get("/auth/me", async (req: Request, res): Promise<void> => {
  if (!req.session.customerId) {
    res.json(GetCustomerMeResponse.parse({ authenticated: false, customer: null }));
    return;
  }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, req.session.customerId));
  if (!customer) {
    res.json(GetCustomerMeResponse.parse({ authenticated: false, customer: null }));
    return;
  }
  res.json(GetCustomerMeResponse.parse({
    authenticated: true,
    customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone ?? null },
  }));
});

router.get("/auth/my-reservations", async (req: Request, res): Promise<void> => {
  if (!req.session.customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const reservations = await db.select().from(reservationsTable)
    .where(eq(reservationsTable.customerId, req.session.customerId));
  res.json(reservations.map(r => ({
    ...r,
    dateTime: r.dateTime.toISOString(),
    createdAt: r.createdAt.toISOString(),
  })));
});

export default router;
