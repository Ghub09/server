// routes/userRoutes.js
import express from "express";
import { deleteUserAndArchive , fetchUserWallets,updateUserWallets } from "../../controllers/Users/userManagement.js";
import { toggleUserStatus } from "./userProfit.js";
import { isAdminAuthenticated } from "../../middlewares/auth.js";
 

const router = express.Router();
router.delete("/delete/:_id", deleteUserAndArchive);
router.put("/:id/toggle", toggleUserStatus);
router.get("/:userId",  fetchUserWallets);
router.put("/update/:userId",isAdminAuthenticated , updateUserWallets);
// router.get('/messages/:userId/:targetId', getChatBetweenUsers);
export default router;
