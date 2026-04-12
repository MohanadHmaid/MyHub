import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tablesRouter from "./tables";
import productsRouter from "./products";
import ordersRouter from "./orders";
import reservationsRouter from "./reservations";
import adminRouter from "./admin";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tablesRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(reservationsRouter);
router.use(adminRouter);
router.use(dashboardRouter);

export default router;
