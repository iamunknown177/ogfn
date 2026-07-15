import dotenv from "dotenv";
dotenv.config();

import { config } from "./config";
import { startApiServer } from "./api/server";

function printBanner() {
  console.log("===========================================");
  console.log(`  ${config.serverName}`);
  console.log(`  Version: ${config.version}`);
  console.log(`  Port: ${config.port}`);
  console.log("===========================================");
}

async function main() {
  printBanner();

  try {
    await startApiServer(config.port);
    console.log(`[Server] Started on port ${config.port}`);
  } catch (err) {
    console.error("[Server] Failed to start:", err);
    process.exit(1);
  }
}

main();
