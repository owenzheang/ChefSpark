import express from "express";
import { createZineController } from "../controllers/zineController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import database from "../database.js";

const router = express.Router();
const zines = createZineController({ db: database });

router.use(authMiddleware);

router.get("/recipe/:savedRecipeId", zines.getForRecipe);
router.post("/recipe/:savedRecipeId", zines.generateForRecipe);
router.get("/:id/images/:kind", zines.getImage);
router.delete("/:id", zines.remove);

export default router;
