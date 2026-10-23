import express from "express";
import { createAssistantController } from "../controllers/assistantController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import database from "../database.js";

const router = express.Router();
const assistant = createAssistantController({ db: database });

router.use(authMiddleware);

router.get("/status", assistant.status);
router.post("/edit", assistant.edit);
router.post("/explain", assistant.explain);

export default router;
