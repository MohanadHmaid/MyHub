import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tablesTable = pgTable("tables", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status", { enum: ["available", "occupied", "reserved"] }).notNull().default("available"),
  capacity: integer("capacity").notNull().default(4),
  reservationId: integer("reservation_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTableSchema = createInsertSchema(tablesTable).omit({ id: true, createdAt: true });
export type InsertTable = z.infer<typeof insertTableSchema>;
export type CafeTable = typeof tablesTable.$inferSelect;
