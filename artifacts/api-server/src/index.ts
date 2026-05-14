import app from "./app";
import { logger } from "./lib/logger";
import { db, reservationsTable, tablesTable } from "@workspace/db";
import { eq, and, lt } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// Automatic reservation expiry: every 60 seconds, expire reservations
// whose dateTime passed more than 10 minutes ago and whose status is still 'pending' or 'reserved'
async function expireStaleReservations() {
  try {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

    // Find expired reservations
    const expired = await db
      .update(reservationsTable)
      .set({ status: "cancelled" })
      .where(
        and(
          lt(reservationsTable.dateTime, cutoff),
          eq(reservationsTable.status, "pending")
        )
      )
      .returning({ id: reservationsTable.id });

    if (expired.length > 0) {
      logger.info({ count: expired.length }, "Auto-expired stale reservations");

      // Free tables that were linked to these expired reservations
      for (const r of expired) {
        await db
          .update(tablesTable)
          .set({ status: "available", reservationId: null })
          .where(
            and(
              eq(tablesTable.reservationId, r.id),
              eq(tablesTable.status, "reserved")
            )
          );
      }
    }
  } catch (err) {
    logger.error({ err }, "Error in expireStaleReservations");
  }
}

// Run immediately on startup and then every 60 seconds
expireStaleReservations();
setInterval(expireStaleReservations, 60 * 1000);
