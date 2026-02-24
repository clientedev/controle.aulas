import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { db } from "./db";
import { usuarios } from "@shared/schema";

let __filename_val: string;
let __dirname_val: string;

try {
  if (typeof import.meta.url === "string") {
    __filename_val = fileURLToPath(import.meta.url);
    __dirname_val = dirname(__filename_val);
  } else {
    __filename_val = "";
    __dirname_val = process.cwd();
  }
} catch (e) {
  __filename_val = "";
  __dirname_val = process.cwd();
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

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

// Move modelsPath calculation here to ensure __dirname_val is set
const modelsPath = process.env.NODE_ENV === "production"
  ? path.join(__dirname_val || process.cwd(), "public", "models")
  : path.join(process.cwd(), "public", "models");

app.use("/models", express.static(modelsPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".json")) {
      res.setHeader("Content-Type", "application/json");
    }
  }
}));

(async () => {
  const port = parseInt(process.env.PORT || "5000", 10);
  
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

  try {
    await registerRoutes(httpServer, app);

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    if (process.env.DATABASE_URL) {
      console.log("Railway: Initializing database check (post-startup)...");
      db.select().from(usuarios).limit(1).then(() => {
        console.log("Railway: Database connection successful.");
      }).catch(err => {
        console.error("Railway: Database connection FAILED:", err.message);
      });
    }

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Internal Server Error:", err);
      if (res.headersSent) {
        return next(err);
      }
      return res.status(status).json({ message });
    });
  } catch (err) {
    console.error("Critical initialization error:", err);
  }
})();
