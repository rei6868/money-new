import { spawn } from "child_process";
import fs from "fs";
import path from "path";

import dotenv from "dotenv";

dotenv.config();

const dbUrl = process.env.DB_URL;

if (!dbUrl) {
  console.error("❌ Missing DB_URL environment variable. Aborting deployment.");
  process.exit(1);
}

const logsDir = path.resolve("logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logFile = path.join(logsDir, `neon-deploy-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: "a" });

const executable = process.platform === "win32" ? "drizzle-kit.cmd" : "drizzle-kit";
const drizzleBin = path.resolve("node_modules", ".bin", executable);

if (!fs.existsSync(drizzleBin)) {
  console.error(
    "❌ Unable to locate drizzle-kit binary. Did you run `npm install` to install project dependencies?",
  );
  logStream.write(
    `[${new Date().toISOString()}] drizzle-kit binary missing at ${drizzleBin}. Aborting.\n`,
  );
  logStream.end();
  process.exit(1);
}

const args = ["push", "--config", "drizzle.config.ts"];

console.info("🚀 Starting Neon schema deployment using Drizzle Kit...\n");
logStream.write(`[${new Date().toISOString()}] Starting deployment\n`);

const child = spawn(drizzleBin, args, {
  env: {
    ...process.env,
    DB_URL: dbUrl,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  logStream.write(chunk);
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
  logStream.write(chunk);
});

child.on("error", (error) => {
  const message = `Deployment process failed to start: ${error.message}`;
  console.error(`❌ ${message}`);
  logStream.write(`[${new Date().toISOString()}] ${message}\n`);
  logStream.end();
  process.exit(1);
});

child.on("close", (code) => {
  const statusMessage = code === 0 ? "✅ Deployment completed successfully." : `❌ Deployment exited with code ${code}.`;
  console.info(`\n${statusMessage}`);
  logStream.write(`[${new Date().toISOString()}] ${statusMessage}\n`);
  logStream.end();
  process.exit(code === null ? 1 : code);
});
