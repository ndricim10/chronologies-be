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

const allowedOrigins = [
  "http://localhost:5173",
  "https://chronologies-be.fly.dev",
];

const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/audit", auditRouter);
app.use("/api/chronologies", chronologiesRoutes);

app.get("/health", (_, res) => res.send("OK"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
