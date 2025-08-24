import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import auditRouter from "./api/routes/audit.routes";
import authRoutes from "./api/routes/auth.routes";
import userRoutes from "./api/routes/user.routes";
import chronologiesRoutes from "./api/routes/chronologies.routes";

dotenv.config();
const app = express();

app.set("trust proxy", true);

const corsOptions: cors.CorsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/audit", auditRouter);
app.use("/api/chronologies", chronologiesRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
