import dotenv from "dotenv";
import express from "express";
import { profiles } from "./profiles.js";

dotenv.config({ path: "../../.env" });

const app = express();
const port = Number.parseInt(process.env.PORT ?? "3001", 10);

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", mode: "demo" });
});

app.get("/api/profiles", (_request, response) => {
  response.json({ mode: "demo", profiles });
});

app.listen(port, () => {
  console.log(`Zephyr demo API listening on http://localhost:${port}`);
});
