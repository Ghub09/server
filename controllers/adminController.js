import mongoose from "mongoose";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import FuturesTrade from "../models/FuturesTrade.js";
import PerpetualTrade from "../models/PerpetualTrade.js";
import Trade from "../models/Trade.js";
import TradeHistory from "../models/TradeHistory.js";
 import Transaction from "../models/Transaction.js"; // Ensure you import the Transaction model
import User from "../models/User.js";
import FuturesTradeSchema from "../models/FuturesTrade.js";
import Wallet from "../models/Wallet.js";
import { io } from "../server.js";
import DepositWithdrawRequest from "../models/RequestMessage.js";

export const getAllSpotHistories = async (req, res) => {
  try {
     if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const trades = await Trade.find({userId: req.params.userId}).sort({ createdAt: -1 });
    console.log(trades)
   return res.status(200).json({ message: "User trades history fetched successfully", trades });
  } catch (error) {
    res.status(500).json({ message: "Error fetching all trade histories", error });
  }
};

export const getAllPerpetualTradesHistory = async (req, res) => {
  try {
     if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const trades = await PerpetualTrade.find({userId: req.params.userId})
      .populate("userId", "name email") // populate user's name/email if needed
      .sort({ createdAt: -1 });
    console.log(trades)
  return res.status(200).json({ message: "User perpetual trades fetched", trades });
  } catch (error) {
    res.status(500).json({ message: "Error fetching perpetual trades", error });
  }
};
export const getAllUsersTradeHistory = async (req, res) => {
  try {
     if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const trades = await FuturesTradeSchema.find({ userId: req.params.userId })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
       console.log(trades.data)

  return  res.status(200).json({ message: "User trades fetched successfully", trades });
  } catch (error) {
  return  res.status(500).json({ message: "Error fetching all user trades", error });
  }
};


const tableModelMap = {
  TS: Trade,                     
  TP: PerpetualTrade,           
  TR: FuturesTradeSchema,              
  DW:  DepositWithdrawRequest,    
};

export const deleteUserTradeHistory = async (req, res) => {
  try {
    // Ensure only admin has access
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { userId, selectedIds, deleteAll } = req.body;

    console.log(userId, selectedIds, deleteAll);

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (deleteAll && Array.isArray(selectedIds)) {
      for (const { table } of selectedIds) {
        switch (table) {
          case 'TS':
            await Trade.deleteMany({ userId });
            break;
          case 'TP':
            await PerpetualTrade.deleteMany({ userId });
            break;
          case 'TR':
            await FuturesTradeSchema.deleteMany({ userId });
            break;
          case 'DW':
            await DepositWithdrawRequest.deleteMany({ userId });
            break;
          default:
            // Unknown table key, skip
            break;
        }
      }

      return res.status(200).json({
        message: "Selected trade and request history deleted for the user"
      });
    }

    if (Array.isArray(selectedIds)) {
  for (const { table, ids } of selectedIds) {
    const model = tableModelMap[table];
    if (!model) continue;

    if (Array.isArray(ids) && ids.length > 0) {
      await model.deleteMany({ _id: { $in: ids }, userId });
    }
  }
}
    return res.status(200).json({
      message: "Selected user trade history records deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting trade history:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};



 

export const fetchUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};
export const fetchTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find();
    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

export const approveOrder = catchAsyncErrors(async (req, res) => {
  try {
    const { orderId } = req.params;

    const trade = await Trade.findById(orderId);
    if (!trade) return res.status(404).json({ message: "Order not found" });

    const wallet = await Wallet.findOne({ userId: trade.userId });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    // Validate and convert quantity and price
    const quantity = Number(trade.quantity);
    const price = Number(trade.price);

    if (isNaN(quantity) || isNaN(price)) {
      return res.status(400).json({ message: "Invalid trade data: price or quantity is NaN" });
    }

    const totalCost = quantity * price;

    if (isNaN(totalCost)) {
      return res.status(400).json({ message: "Invalid total cost calculation" });
    }

    if (trade.type === "buy") {
      if (wallet.spotWallet < totalCost) {
        return res
          .status(400)
          .json({ message: "Insufficient funds in spot wallet" });
      }

      wallet.spotWallet -= totalCost;

      const holding = wallet.holdings.find((h) => h.asset === trade.asset);
      if (holding) {
        holding.quantity += quantity;
      } else {
        wallet.holdings.push({ asset: trade.asset, quantity });
      }
    } else if (trade.type === "sell") {
      const holding = wallet.holdings.find((h) => h.asset === trade.asset);
      if (!holding || holding.quantity < quantity) {
        return res.status(400).json({ message: "Not enough holdings to sell" });
      }

      holding.quantity -= quantity;

      if (holding.quantity === 0) {
        wallet.holdings = wallet.holdings.filter(
          (h) => h.asset !== trade.asset
        );
      }

      wallet.spotWallet += totalCost;
    } else {
      return res.status(400).json({ message: "Invalid trade type" });
    }

    await wallet.save();

    trade.status = "approved";
    await trade.save();

    io.emit("orderApproved", trade);

    res.status(200).json({ message: "Order approved successfully", trade });

  } catch (error) {
    console.log("Error in approveOrder:", error);
    res.status(500).json({ message: "Error approving order", error: error.message });
  }
});

export const rejectOrder = catchAsyncErrors(async (req, res) => {
  try {
    const { orderId } = req.params;
    const trade = await Trade.findById(orderId);
    if (!trade) return res.status(404).json({ message: "Order not found" });

    trade.status = "rejected";
    await trade.save();

    io.emit("orderRejected", trade);

    res.status(200).json({ message: "Order rejected successfully", trade });
  } catch (error) {
    res.status(500).json({ message: "Error rejecting order", error });
  }
});

export const fetchOpenTrades = async (req, res) => {
  try {
    // Fetch open futures trades and add category field
    const futuresTrades = await FuturesTrade.find({ status: "open" })
      .populate("userId", "firstName") // Fetch user firstName
      .lean(); // Converts Mongoose documents to plain objects

    futuresTrades.forEach((trade) => (trade.category = "Futures"));

    // Fetch open perpetual trades and add category field
    const perpetualTrades = await PerpetualTrade.find({ status: "open" })
      .populate("userId", "firstName")
      .lean();

    perpetualTrades.forEach((trade) => (trade.category = "Perpetual"));

    // Combine both trade lists
    const openTrades = [...futuresTrades, ...perpetualTrades];

    res.status(200).json({
      message: "Successfully found the open trades",
      trades: openTrades,
    });
  } catch (error) {
    console.error("Error fetching open trades:", error);
    res.status(500).json({ message: "Error fetching open trades" });
  }
};

 
export const liquidateTrade = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const { marketPrice } = req.body; // marketPrice is sent from frontend

    console.log("Liquidation request received");

    if (!marketPrice || isNaN(parseFloat(marketPrice))) {
      return res.status(400).json({ message: "Valid market price is required" });
    }

    let trade = await FuturesTrade.findById(tradeId);
    let category = "futures";

    if (!trade) {
      trade = await PerpetualTrade.findById(tradeId);
      if (!trade) {
        return res.status(404).json({ message: "Trade not found" });
      }
      category = "perpetual";
    }

    if (trade.status !== "open") {
      return res.status(400).json({ message: "Trade is already closed" });
    }

    const closePrice = parseFloat(marketPrice);

    const user = await User.findById(trade.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    // ✅ Calculate fixed profit/loss as % of leverage
    const fixedProfit = (trade.assetsAmount * trade.leverage) / 100;
    const profitLoss = user.isActive === true ? fixedProfit : -fixedProfit;

    // ✅ Update wallet balance
    if (category === "futures") {
      const updatedBalance = wallet.futuresWallet + trade.marginUsed + profitLoss;
      wallet.futuresWallet = Math.max(0, updatedBalance);
    } else {
      const updatedBalance = wallet.perpetualsWallet + trade.marginUsed + profitLoss;
      wallet.perpetualsWallet = Math.max(0, updatedBalance);
    }

    await wallet.save();

    // ✅ Update trade status
    trade.status = "closed";
    trade.closedAt = new Date();
    trade.profitLoss = profitLoss;
    trade.closePrice = closePrice;
    await trade.save();

    // ✅ Emit event for frontend updates
    io.emit("tradeClose", { tradeId: trade._id, profitLoss });

    res.status(200).json({
      message: "Trade closed successfully",
      profitLoss,
      closePrice,
    });
  } catch (error) {
    console.log("Liquidation error:", error.message);
    res.status(500).json({ message: "Error closing trade", error: error.message });
  }
};

