import express from "express";
import path from "path";

export async function startAssetServer(port: number): Promise<void> {
  const app = express();
  const assetsDir = path.resolve(__dirname, "../../assets");

  app.use("/assets", express.static(assetsDir));

  app.use("/assets", (_req, res) => {
    res.status(404).json({ error: "Asset not found" });
  });

  return new Promise((resolve) => {
    app.listen(port, () => {
      resolve();
    });
  });
}
