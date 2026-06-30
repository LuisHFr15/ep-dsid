import "dotenv/config";
import express from "express";
import { loadConfig } from "../infrastructure/config/env";

const config = loadConfig();

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(config.port, () => {
  console.log(`hub listening on ${config.port}`);
});
