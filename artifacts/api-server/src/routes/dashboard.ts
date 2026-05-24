import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, tablesTable, ordersTable, orderItemsTable, reservationsTable } from "@workspace/db";
import { GetDashboardSummaryResponse, GetRecentOrdersResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  try {
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
      .reduce((sum, o) => sum + (parseFloat(String(o.totalAmount)) || 0), 0);

    const unpaidAmount = orders
      .filter(o => o.paymentStatus === "unpaid")
      .reduce((sum, o) => sum + (parseFloat(String(o.totalAmount)) || 0), 0);

    const totalReservations = reservations.length;
    const pendingReservations = reservations.filter(r => r.status === "pending").length;
    const confirmedReservations = reservations.filter(r => r.status === "confirmed").length;

    const response = {
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
    };

    res.json(GetDashboardSummaryResponse.parse(response));
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

router.get("/dashboard/recent-orders", async (_req, res): Promise<void> => {
  try {
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
      totalAmount: parseFloat(String(order.totalAmount)) || 0,
      items: (itemsMap.get(order.id) ?? []).map(item => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        quantity: item.quantity,
        productName: item.productName,
        productPrice: parseFloat(String(item.productPrice)) || 0,
      })),
      createdAt: order.createdAt.toISOString(),
    }));

    res.json(GetRecentOrdersResponse.parse(result));
  } catch (error) {
    console.error("Recent orders error:", error);
    res.status(500).json({ error: "Failed to fetch recent orders" });
  }
});

// GET /dashboard/traffic-heatmap?date=YYYY-MM-DD (optional — if omitted, returns last 30-day aggregate)
router.get("/dashboard/traffic-heatmap", async (req, res): Promise<void> => {
  try {
    const reservations = await db.select().from(reservationsTable);

    // Group by dayOfWeek (0=Sun) + hour
    const counts: Record<string, { hour: string; dayOfWeek: number; count: number }> = {};

    for (const r of reservations) {
      if (r.status === "cancelled") continue;
      const dt = new Date(r.dateTime);
      const hour = String(dt.getHours()).padStart(2, "0") + ":00";
      const dayOfWeek = dt.getDay();
      const key = `${dayOfWeek}-${hour}`;
      if (!counts[key]) counts[key] = { hour, dayOfWeek, count: 0 };
      counts[key].count++;
    }

    const result = Object.values(counts).sort((a, b) =>
      a.dayOfWeek !== b.dayOfWeek ? a.dayOfWeek - b.dayOfWeek : a.hour.localeCompare(b.hour)
    );

    res.json(result);
  } catch (error) {
    console.error("Traffic heatmap error:", error);
    res.status(500).json({ error: "Failed to fetch traffic heatmap" });
  }
});

export default router;
