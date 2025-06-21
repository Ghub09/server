import express from "express";
import { getMessages, getConversations } from "../controllers/messages.js";

const router = express.Router();

// Fetch messages between two users
router.get("/:user1/:user2", getMessages);

// Admin: fetch unique conversations
router.get("/admin/inbox/list", getConversations);

export default router;
