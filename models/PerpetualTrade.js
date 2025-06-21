import mongoose from "mongoose";

const PerpetualTradeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  pair: { type: String, required: true }, // Example: BTCUSDT
  type: { type: String, enum: ["long", "short"], required: true },
  leverage: { type: Number, required: true },
  entryPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  marginUsed: { type: Number, required: true },
  assetsAmount:{type:Number,required:true},
  liquidationPrice: { type: Number, required: true },
  amountInUSDT:{type:String},
  fundingFee: { type: Number, default: 0 }, // Funding fee applied periodically
  profitLoss: { type: Number, default: 0 }, // PNL for the trade
  closePrice: { type: Number }, // Price at which position was closed
  status: {
    type: String,
    enum: ["open", "closed", "liquidated"],
    default: "open",
  },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
});

export default mongoose.model("PerpetualTrade", PerpetualTradeSchema);