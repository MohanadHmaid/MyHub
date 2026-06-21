import { Router, type IRouter, type Request } from "express";
import { eq } from "drizzle-orm";
import { db, adminsTable } from "@workspace/db";
import { AdminLoginBody, AdminLoginResponse, AdminLogoutResponse, GetAdminMeResponse } from "@workspace/api-zod";
import { createHash } from "crypto";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "myhub-salt").digest("hex");
}

declare module "express-session" {
  interface SessionData {
    adminId?: number;
    adminUsername?: string;
  }
}

router.post("/admin/login", async (req, res): Promise<void> => {
  try {
    const parsed = AdminLoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { username, password } = parsed.data;
    const passwordHash = hashPassword(password);

    const [admin] = await db.select().from(adminsTable)
      .where(eq(adminsTable.username, username));

    if (!admin || admin.passwordHash !== passwordHash) {
      res.status(401).json({ success: false });
      return;
    }

    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;

    res.json(AdminLoginResponse.parse({
      success: true,
      admin: { id: admin.id, username: admin.username },
    }));
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

router.post("/admin/logout", async (req, res): Promise<void> => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        res.status(500).json({ error: "Failed to logout" });
        return;
      }
      res.json(AdminLogoutResponse.parse({ success: true, message: "Logged out" }));
    });
  } catch (error) {
    console.error("Admin logout error:", error);
    res.status(500).json({ error: "Failed to logout" });
  }
});

export default router;
