import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tablesTable, reservationsTable } from "@workspace/db";
import {
  GetTablesResponse,
  GetTableParams,
  GetTableResponse,
  CreateTableBody,
  UpdateTableParams,
  UpdateTableBody,
  UpdateTableResponse,
  DeleteTableParams,
  DeleteTableResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatTable(t: typeof tablesTable.$inferSelect) {
  return {
    id: t.id,
    name: t.name,
    status: t.status as "available" | "occupied" | "reserved",
    capacity: t.capacity,
    reservationId: t.reservationId ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/tables", async (_req, res): Promise<void> => {
  const tables = await db.select().from(tablesTable).orderBy(tablesTable.id);
  res.json(GetTablesResponse.parse(tables.map(formatTable)));
});

router.post("/tables", async (req, res): Promise<void> => {
  const parsed = CreateTableBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [table] = await db.insert(tablesTable).values(parsed.data).returning();
  res.status(201).json(GetTableResponse.parse(formatTable(table)));
});

router.get("/tables/:id", async (req, res): Promise<void> => {
  const params = GetTableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, params.data.id));
  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }
  res.json(GetTableResponse.parse(formatTable(table)));
});

router.put("/tables/:id", async (req, res): Promise<void> => {
  const params = UpdateTableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTableBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [table] = await db
    .update(tablesTable)
    .set(parsed.data)
    .where(eq(tablesTable.id, params.data.id))
    .returning();
  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }
  res.json(UpdateTableResponse.parse(formatTable(table)));
});

router.delete("/tables/:id", async (req, res): Promise<void> => {
  const params = DeleteTableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [table] = await db.delete(tablesTable).where(eq(tablesTable.id, params.data.id)).returning();
  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }
  res.json(DeleteTableResponse.parse({ success: true, message: "Table deleted" }));
});

// POST /tables/:id/verify-reservation
// Customer enters their reservation code to check in at a reserved table
router.post("/tables/:id/verify-reservation", async (req, res): Promise<void> => {
  const params = GetTableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { code } = req.body;
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
    res.status(409).json({ error: "This table is not reserved. Please order directly." });
    return;
  }

  const [reservation] = await db.select().from(reservationsTable)
    .where(eq(reservationsTable.id, table.reservationId));

  if (!reservation || reservation.code.toUpperCase() !== code.toUpperCase()) {
    res.status(401).json({ error: "Invalid reservation code. Please check your confirmation." });
    return;
  }

  // Mark table as occupied and clear the reservation link
  await db.update(tablesTable)
    .set({ status: "occupied", reservationId: null })
    .where(eq(tablesTable.id, table.id));

  res.json({ success: true, message: "Reservation verified! Welcome to MyHUB!" });
});

export default router;
