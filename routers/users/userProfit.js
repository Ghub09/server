// controllers/Users/userProfit.js
import User from "../../models/User.js";
import TradeHistorySchema from "../../models/TradeHistory.js";

export const toggleUserStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" }); 
    }

    user.isActive = !user.isActive;
    await user.save();

    console.log("Toggled user:", user);

    return res.status(200).json({ message: "User status toggled", user }); 
  } catch (error) {
    console.error("Toggle Error:", error.message);

    if (!res.headersSent) {
      return res.status(500).json({ message: "Server error" }); 
    }
  }
};

 


