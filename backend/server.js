import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { ensureInitialAdmin } from "./services/authService.js";

dotenv.config();
const app = express();
const allowedOrigins = new Set((process.env.CORS_ORIGINS || "").split(",").map(origin => origin.trim()).filter(Boolean));
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));
app.use(express.json({ limit: "2mb" }));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRoutes);
app.use("/admin/users", userRoutes);
app.use("/admin/files", fileRoutes);
app.use("/", chatRoutes);
const port = Number(process.env.PORT || 3001);
ensureInitialAdmin().then(() => app.listen(port, "0.0.0.0", () => console.log(`Server started on ${port}`))).catch(err => {
  console.error("Failed to initialize admin account:", err);
  process.exit(1);
});
