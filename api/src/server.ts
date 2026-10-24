
import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { router } from "./routes.js";

export function createApp() {
  const app = express();

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("Set JWT_SECRET to a random value of at least 32 characters.");
  }

  const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim());

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origin not allowed"));
      }
    }
  }));
  app.use(express.json({ limit: "16kb" }));

  app.use("/api/auth", rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false
  }));

  app.use("/api", router);

  app.use((_req, res) => {
    res.status(404).json({ error: "Endpoint not found." });
  });

  app.use((
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    // Do not return stack traces, SQL errors, or secrets to clients.
    console.error("Request failed:", error instanceof Error
      ? error.message
      : "Unknown error");

    if (res.headersSent) return;

    res.status(500).json({ error: "Internal server error." });
  });

  return app;
}

const isMainModule = process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMainModule) {
  const app = createApp();
  const port = Number(process.env.PORT ?? 3001);

  app.listen(port, "127.0.0.1", () => {
    console.log(`API listening at http://127.0.0.1:${port}`);
  });
}
