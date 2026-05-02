import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, reservationsTable, tablesTable } from "@workspace/db";
import {
  GetReservationsResponse,
  CreateReservationBody,
  GetReservationByCodeParams,
  GetReservationByCodeResponse,
  UpdateReservationStatusParams,
  UpdateReservationStatusBody,
  UpdateReservationStatusResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function formatReservation(r: typeof reservationsTable.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email ?? null,
    customerId: r.customerId ?? null,
    dateTime: r.dateTime.toISOString(),
    code: r.code,
    status: r.status,
    partySize: r.partySize,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/reservations", async (_req, res): Promise<void> => {
  const reservations = await db.select().from(reservationsTable).orderBy(reservationsTable.dateTime);
  res.json(GetReservationsResponse.parse(reservations.map(formatReservation)));
});

router.post("/reservations", async (req, res): Promise<void> => {
  const parsed = CreateReservationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const code = generateCode();
  const { tableId, ...reservationData } = parsed.data;

  try {
    await db.transaction(async (tx) => {
      const [reservation] = await tx.insert(reservationsTable).values({
        name: reservationData.name,
        phone: reservationData.phone,
        email: reservationData.email ?? null,
        customerId: reservationData.customerId ?? null,
        dateTime: new Date(reservationData.dateTime),
        code,
        status: "pending",
        partySize: reservationData.partySize,
      }).returning();

      if (tableId) {
        const [table] = await tx.select().from(tablesTable).where(eq(tablesTable.id, tableId));
        if (!table || table.status !== "available") {
          throw new Error("Table is not available for reservation.");
        }
        await tx.update(tablesTable)
          .set({ status: "reserved", reservationId: reservation.id })
          .where(eq(tablesTable.id, tableId));
      }

      res.status(201).json(formatReservation(reservation));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create reservation";
    res.status(409).json({ error: message });
  }
});

router.get("/reservations/:code", async (req, res): Promise<void> => {
  const params = GetReservationByCodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [reservation] = await db.select().from(reservationsTable)
    .where(eq(reservationsTable.code, params.data.code));
  if (!reservation) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }
  res.json(GetReservationByCodeResponse.parse(formatReservation(reservation)));
});

router.put("/reservations/:id/status", async (req, res): Promise<void> => {
  const params = UpdateReservationStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateReservationStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [reservation] = await db
    .update(reservationsTable)
    .set({ status: parsed.data.status })
    .where(eq(reservationsTable.id, params.data.id))
    .returning();
  if (!reservation) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }
  res.json(UpdateReservationStatusResponse.parse(formatReservation(reservation)));
});

export default router;
