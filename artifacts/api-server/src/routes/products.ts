import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import {
  GetProductsResponse,
  GetProductsQueryParams,
  CreateProductBody,
  UpdateProductParams,
  UpdateProductBody,
  UpdateProductResponse,
  DeleteProductParams,
  DeleteProductResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  const queryParams = GetProductsQueryParams.safeParse(req.query);
  let query = db.select().from(productsTable).$dynamic();
  if (queryParams.success && queryParams.data.category) {
    query = query.where(eq(productsTable.category, queryParams.data.category));
  }
  const products = await query.orderBy(productsTable.category, productsTable.name);
  res.json(GetProductsResponse.parse(products.map(p => ({
    ...p,
    price: parseFloat(String(p.price)),
    createdAt: p.createdAt.toISOString(),
    description: p.description ?? undefined,
  }))));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db.insert(productsTable).values({
    ...parsed.data,
    price: String(parsed.data.price),
  }).returning();
  res.status(201).json({
    ...product,
    price: parseFloat(String(product.price)),
    createdAt: product.createdAt.toISOString(),
    description: product.description ?? undefined,
  });
});

router.put("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (typeof parsed.data.price === "number") {
    updateData.price = String(parsed.data.price);
  }
  const [product] = await db
    .update(productsTable)
    .set(updateData)
    .where(eq(productsTable.id, params.data.id))
    .returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(UpdateProductResponse.parse({
    ...product,
    price: parseFloat(String(product.price)),
    createdAt: product.createdAt.toISOString(),
    description: product.description ?? undefined,
  }));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [product] = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(DeleteProductResponse.parse({ success: true, message: "Product deleted" }));
});

export default router;
