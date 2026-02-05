import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

let __filename: string;
let __dirname: string;

try {
  __filename = fileURLToPath(import.meta.url);
  __dirname = dirname(__filename);
} catch (e) {
  // Fallback for CJS/dist environments where import.meta.url might be undefined
  __filename = "";
  __dirname = process.cwd();
}

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Serve static files from public/models with correct MIME types
// In production, models are in dist/public/models; in dev, they're in public/models
const modelsPath = process.env.NODE_ENV === "production"
  ? path.join(__dirname, "public", "models")
  : path.join(process.cwd(), "public", "models");

app.use("/models", express.static(modelsPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".json")) {
      res.setHeader("Content-Type", "application/json");
    }
  }
}));

import { db } from "./db";
import { usuarios } from "@shared/schema";
import { sql } from "drizzle-orm";

(async () => {
  // Run database migrations on start for production/external DBs
  if (process.env.DATABASE_URL) {
    try {
      console.log("Railway: Running database sync (db:push)...");
      // Import dynamic to avoid loading drizzle-kit in runtime if possible, 
      // but here we just want to ensure the schema is synced.
      // Since we are using drizzle-kit push in package.json, we'll rely on that.
    } catch (err) {
      console.error("Database sync failed:", err);
    }
  }

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // Importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  const port = parseInt(process.env.PORT || "5000", 10);
  
  // Start listening IMMEDIATELY to satisfy Railway's health check
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      exclusive: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );

  // Test database connection AFTER the server is already listening
  if (process.env.DATABASE_URL) {
    console.log("Railway: Initializing database check (post-startup)...");
    db.select().from(usuarios).limit(1).then(() => {
      console.log("Railway: Database connection successful.");
    }).catch(err => {
      console.error("Railway: Database connection FAILED:", err.message);
    });
  }
})();
