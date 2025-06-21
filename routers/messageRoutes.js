import express from "express";
import { getMessages, getConversations } from "../controllers/messages.js";

const router = express.Router();

router.get("/:user1/:user2", getMessages);

router.get("/admin/inbox/list", getConversations);

export default router;
