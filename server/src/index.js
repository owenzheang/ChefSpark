import "dotenv/config";
import cors from "cors";
import express from "express";
import authRoutes from "./routes/authRoutes.js";
import ingredientRoutes from "./routes/ingredientRoutes.js";
import recipeRoutes from "./routes/recipeRoutes.js";
import savedRecipeRoutes from "./routes/savedRecipeRoutes.js";
import zineRoutes from "./routes/zineRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

const localDevelopmentOrigins = [
  /^http:\/\/localhost:(5173|4173)$/,
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:(5173|4173)$/,
  /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:(5173|4173)$/
];

const productionOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const isAllowedInDevelopment =
      process.env.NODE_ENV !== "production" &&
      localDevelopmentOrigins.some((pattern) => pattern.test(origin));
    const isAllowedInProduction = productionOrigins.includes(origin);

    if (isAllowedInDevelopment || isAllowedInProduction) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin is not allowed by CORS."));
  }
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/ingredients", ingredientRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/saved-recipes", savedRecipeRoutes);
app.use("/api/zines", zineRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`SMARTKITCHEN server is running on port ${PORT}`);
});
