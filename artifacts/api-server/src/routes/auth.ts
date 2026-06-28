import { Router, type IRouter, type Request } from "express";
import { eq, or } from "drizzle-orm";
import { db, customersTable, reservationsTable } from "@workspace/db";
import {
  GetCustomerMeResponse,
} from "@workspace/api-zod";
import { createClient } from '@supabase/supabase-js';

const router: IRouter = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Middleware to verify Supabase JWT
async function getSupabaseUser(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) return null;
  return user;
}

router.get("/auth/me", async (req: Request, res): Promise<void> => {
  try {
    const supabaseUser = await getSupabaseUser(req);
    
    if (!supabaseUser) {
      res.json(GetCustomerMeResponse.parse({ authenticated: false, customer: null }));
      return;
    }

    // Try database lookup, but fall back to Supabase metadata if DB fails
    try {
      // Find or create customer in our DB linked to Supabase ID
      let [customer] = await db.select().from(customersTable).where(eq(customersTable.supabaseId, supabaseUser.id));

      if (!customer) {
        // Check if customer exists by email (for migration)
        const [existingByEmail] = await db.select().from(customersTable).where(eq(customersTable.email, supabaseUser.email!));
        
        if (existingByEmail) {
          // Link existing customer to Supabase ID
          [customer] = await db.update(customersTable)
            .set({ supabaseId: supabaseUser.id })
            .where(eq(customersTable.id, existingByEmail.id))
            .returning();
        } else {
          // Create new customer
          [customer] = await db.insert(customersTable).values({
            supabaseId: supabaseUser.id,
            email: supabaseUser.email!,
            name: supabaseUser.user_metadata.full_name || 'New User',
            phone: supabaseUser.user_metadata.phone || null,
          }).returning();
        }
      }

      res.json(GetCustomerMeResponse.parse({
        authenticated: true,
        customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone ?? null },
      }));
    } catch (dbError) {
      // Database unavailable — fall back to Supabase user metadata
      console.error("Auth me DB error (falling back to Supabase metadata):", dbError);
      res.json(GetCustomerMeResponse.parse({
        authenticated: true,
        customer: {
          id: 0,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || "User",
          email: supabaseUser.email || "",
          phone: supabaseUser.user_metadata?.phone || null,
        },
      }));
    }
  } catch (error) {
    console.error("Auth me error:", error);
    res.json({ authenticated: false, customer: null });
  }
});

router.get("/auth/my-reservations", async (req: Request, res): Promise<void> => {
  try {
    const supabaseUser = await getSupabaseUser(req);
    
    if (!supabaseUser) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const [customer] = await db.select().from(customersTable).where(eq(customersTable.supabaseId, supabaseUser.id));
      
      if (!customer) {
        // Customer not in DB yet — try email-based lookup for reservations
        if (supabaseUser.email) {
          const reservations = await db.select().from(reservationsTable)
            .where(eq(reservationsTable.email, supabaseUser.email));
          res.json(reservations.map(r => {
            const dt = new Date(r.dateTime);
            const ca = new Date(r.createdAt);
            return {
              ...r,
              dateTime: isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString(),
              createdAt: isNaN(ca.getTime()) ? new Date().toISOString() : ca.toISOString(),
            };
          }));
          return;
        }
        res.json([]);
        return;
      }

      const reservations = await db.select().from(reservationsTable)
        .where(
          or(
            eq(reservationsTable.customerId, customer.id),
            eq(reservationsTable.email, customer.email)
          )
        );

      res.json(reservations.map(r => {
        const dt = new Date(r.dateTime);
        const ca = new Date(r.createdAt);
        return {
          ...r,
          dateTime: isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString(),
          createdAt: isNaN(ca.getTime()) ? new Date().toISOString() : ca.toISOString(),
        };
      }));
    } catch (dbError) {
      // Database unavailable — return empty array instead of 500
      console.error("Auth my-reservations DB error (returning empty):", dbError);
      res.json([]);
    }
  } catch (error) {
    console.error("Auth my-reservations error:", error);
    res.json([]);
  }
});

// Check if email exists in database (for registration validation)
router.post("/auth/check-email", async (req, res): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    // Check if email exists in our database
    const [existingCustomer] = await db.select().from(customersTable).where(eq(customersTable.email, email));
    
    if (existingCustomer) {
      res.json({ exists: true, message: "Email already registered" });
      return;
    }

    res.json({ exists: false });
  } catch (error) {
    console.error("Check email error:", error);
    res.status(500).json({ error: "Failed to check email" });
  }
});

// Legacy routes kept for compatibility but disabled/redirected
router.post("/auth/register", (req, res) => res.status(410).json({ error: "Use Supabase Auth" }));
router.post("/auth/login", (req, res) => res.status(410).json({ error: "Use Supabase Auth" }));
router.post("/auth/logout", (req, res) => res.json({ success: true }));

export default router;
