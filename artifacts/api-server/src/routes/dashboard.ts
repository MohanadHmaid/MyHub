import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, tablesTable, ordersTable, orderItemsTable, reservationsTable } from "@workspace/db";
import { GetDashboardSummaryResponse, GetRecentOrdersResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const tables = await db.select().from(tablesTable);
  const orders = await db.select().from(ordersTable);
  const reservations = await db.select().from(reservationsTable);

  const totalTables = tables.length;
  const occupiedTables = tables.filter(t => t.status === "occupied").length;
  const availableTables = tables.filter(t => t.status === "available").length;

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const preparingOrders = orders.filter(o => o.status === "preparing").length;
  const completedOrders = orders.filter(o => o.status === "completed").length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => o.createdAt >= today);
  const todayRevenue = todayOrders
    .filter(o => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + parseFloat(String(o.totalAmount)), 0);

  const unpaidAmount = orders
    .filter(o => o.paymentStatus === "unpaid")
    .reduce((sum, o) => sum + parseFloat(String(o.totalAmount)), 0);

  const totalReservations = reservations.length;
  const pendingReservations = reservations.filter(r => r.status === "pending").length;
  const confirmedReservations = reservations.filter(r => r.status === "confirmed").length;

  res.json(GetDashboardSummaryResponse.parse({
    totalTables,
    occupiedTables,
    availableTables,
    totalOrders,
    pendingOrders,
    preparingOrders,
    completedOrders,
    todayRevenue,
    unpaidAmount,
    totalReservations,
    pendingReservations,
    confirmedReservations,
  }));
});

router.get("/dashboard/recent-orders", async (_req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(10);

  const tables = await db.select().from(tablesTable);
  const tableMap = new Map(tables.map(t => [t.id, t.name]));

  const allItems = await db.select().from(orderItemsTable);
  const itemsMap = new Map<number, typeof orderItemsTable.$inferSelect[]>();
  for (const item of allItems) {
    if (!itemsMap.has(item.orderId)) itemsMap.set(item.orderId, []);
    itemsMap.get(item.orderId)!.push(item);
  }

  const result = orders.map(order => ({
    id: order.id,
    tableId: order.tableId,
    tableName: tableMap.get(order.tableId) ?? "Unknown",
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalAmount: parseFloat(String(order.totalAmount)),
    items: (itemsMap.get(order.id) ?? []).map(item => ({
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      quantity: item.quantity,
      productName: item.productName,
      productPrice: parseFloat(String(item.productPrice)),
    })),
    createdAt: order.createdAt.toISOString(),
  }));

  res.json(GetRecentOrdersResponse.parse(result));
});

export default router;
