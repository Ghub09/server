import mongoose from "mongoose";

const TradeHistorySchema = new mongoose.Schema({
  tradeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
  },
  asset: {
    type: String,
    required: true,
  },
  tradeType: {
    type: String,
    enum: ["spot", "futures", "perpetual"],
    required: true,
  },
  type: {
    type: String,
    enum: ["buy", "sell", "long", "short"],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  liquidationPrice: {
    type: Number,
  },
  price: {
    type: Number,
    required: true,
  },
  pnl: {
    type: Number,
  },
  leverage: {
    type: Number,
  },
  status: {
    type: String,
    enum: ["open", "closed", "liquidated", "completed"],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("TradeHistory", TradeHistorySchema);
 