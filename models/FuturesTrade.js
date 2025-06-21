import mongoose from "mongoose";

const FuturesTradeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  pair: { type: String, required: true }, // Example: BTCUSDT
  type: { type: String, enum: ["long", "short"], required: true }, // Long or Short
  assetsAmount: { type: Number, required: true },
  leverage: { type: Number, required: true }, // Leverage (e.g., 5x, 10x, 20x)
  entryPrice: { type: Number, required: true }, // Price at which position was entered
  quantity: { type: Number, required: true }, // Contract quantity
  marginUsed: { type: Number, required: true }, // Margin reserved for trade
  liquidationPrice: { type: Number, required: true }, // Price at which liquidation occurs
  profitLoss: { type: Number, default: 0 }, // PNL for the trade
  closePrice: { type: Number }, // Price at which position was closed
  status: {
    type: String,
    enum: ["open", "closed", "liquidated"],
    default: "open",
  },
  expiryTime: { type: Date }, // Time when trade is set to expire
  isExpired: { type: Boolean, default: false }, // Flag to indicate if trade has expired but not closed
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
});

export default mongoose.model("FuturesTrade", FuturesTradeSchema);
