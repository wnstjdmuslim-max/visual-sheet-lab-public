import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { serveStatic } from "../server/_core/vite";
import { sdk } from "../server/_core/sdk";
import { syncLatestFilmGrab } from "../server/filmGrabRemote";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
app.post("/api/scheduled/filmGrabSync", async (req, res) => {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    return res.json({ ok: true, ...(await syncLatestFilmGrab(12)) });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
serveStatic(app);

export default app;
