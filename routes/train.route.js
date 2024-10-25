import express from "express";
import { fetchTrainInfo } from "../controllers/train.controller.js";
const router = express.Router();

router.post("/get", fetchTrainInfo);

export default router;