import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, productsTable, tablesTable } from "@workspace/db";
import {
  GetOrdersResponse,
  GetOrdersQueryParams,
  CreateOrderBody,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  UpdateOrderStatusResponse,
  UpdateOrderPaymentParams,
  UpdateOrderPaymentBody,
  UpdateOrderPaymentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatOrder(order: typeof ordersTable.$inferSelect, tableName: string, items: typeof orderItemsTable.$inferSelect[]) {
  return {
    id: order.id,
    tableId: order.tableId,
    tableName,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalAmount: parseFloat(String(order.totalAmount)),
    items: items.map(item => ({
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      quantity: item.quantity,
      productName: item.productName,
      productPrice: parseFloat(String(item.productPrice)),
    })),
    createdAt: order.createdAt.toISOString(),
  };
}

router.get("/orders", async (req, res): Promise<void> => {
  const queryParams = GetOrdersQueryParams.safeParse(req.query);
  
  let ordersQuery = db.select().from(ordersTable).$dynamic();
  if (queryParams.success) {
    if (queryParams.data.status) {
      ordersQuery = ordersQuery.where(eq(ordersTable.status, queryParams.data.status));
    }
    if (queryParams.data.tableId) {
      ordersQuery = ordersQuery.where(eq(ordersTable.tableId, queryParams.data.tableId));
    }
  }
  
  const orders = await ordersQuery.orderBy(desc(ordersTable.createdAt));
  const items = await db.select().from(orderItemsTable);
  const tables = await db.select().from(tablesTable);
  
  const tableMap = new Map(tables.map(t => [t.id, t.name]));
  const itemsMap = new Map<number, typeof orderItemsTable.$inferSelect[]>();
  for (const item of items) {
    if (!itemsMap.has(item.orderId)) itemsMap.set(item.orderId, []);
    itemsMap.get(item.orderId)!.push(item);
  }
  
  const result = orders.map(order =>
    formatOrder(order, tableMap.get(order.tableId) ?? "Unknown", itemsMap.get(order.id) ?? [])
  );
  
  res.json(GetOrdersResponse.parse(result));
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { tableId, items } = parsed.data;
  
  const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, tableId));
  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }

  const productIds = items.map(i => i.productId);
  const products = await db.select().from(productsTable).where(
    productIds.length === 1
      ? eq(productsTable.id, productIds[0])
      : eq(productsTable.id, productIds[0])
  );
  
  const allProducts = await db.select().from(productsTable);
  const productMap = new Map(allProducts.map(p => [p.id, p]));
  
  let totalAmount = 0;
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
    totalAmount += parseFloat(String(product.price)) * item.quantity;
  }

  const [order] = await db.insert(ordersTable).values({
    tableId,
    status: "pending",
    paymentStatus: "unpaid",
    totalAmount: String(totalAmount),
  }).returning();

  await db.update(tablesTable).set({ status: "occupied" }).where(eq(tablesTable.id, tableId));

  const orderItems = await db.insert(orderItemsTable).values(
    items.map(item => {
      const product = productMap.get(item.productId)!;
      return {
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        productName: product.name,
        productPrice: String(product.price),
      };
    })
  ).returning();

  res.status(201).json(formatOrder(order, table.name, orderItems));
});

router.put("/orders/:id/status", async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  
  const [order] = await db
    .update(ordersTable)
    .set({ status: parsed.data.status })
    .where(eq(ordersTable.id, params.data.id))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (parsed.data.status === "completed") {
    const otherOrders = await db.select().from(ordersTable)
      .where(eq(ordersTable.tableId, order.tableId));
    const allCompleted = otherOrders.every(o => o.status === "completed" || o.id === order.id);
    if (allCompleted) {
      await db.update(tablesTable).set({ status: "available" }).where(eq(tablesTable.id, order.tableId));
    }
  }

  const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, order.tableId));
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  
  res.json(UpdateOrderStatusResponse.parse(formatOrder(order, table?.name ?? "Unknown", items)));
});

router.put("/orders/:id/payment", async (req, res): Promise<void> => {
  const params = UpdateOrderPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOrderPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  
  const [order] = await db
    .update(ordersTable)
    .set({ paymentStatus: parsed.data.paymentStatus })
    .where(eq(ordersTable.id, params.data.id))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, order.tableId));
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  
  res.json(UpdateOrderPaymentResponse.parse(formatOrder(order, table?.name ?? "Unknown", items)));
});

export default router;
