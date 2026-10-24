import express from "express";
import { createFoodImageController } from "../controllers/foodImageController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import database from "../database.js";

const router = express.Router();
const foodImages = createFoodImageController({ db: database });

// Pictures are read without a token (see getImage); making one needs a signed-in user.
router.get("/:file", foodImages.getImage);
router.post("/", authMiddleware, foodImages.create);

export default router;
