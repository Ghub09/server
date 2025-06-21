import mongoose from "mongoose";

// ✅ Updated list of supported assets
const transferablePairs = [
  "USDT",
  "USDC",
  "ETH",
  "BTC",
  "BNB",
  "SOL",
  "XRP",
  "ADA",
  "DOGE",
  "MATIC",
  "DOTUS",
  "LTC",
  "DOT"
];

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "transfer", "swap"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    amount: { type: Number },
    currency: { type: String, enum: transferablePairs }, // ✅

    // ✅ Swap-specific fields
    fromAsset: { type: String, enum: transferablePairs },
    toAsset: { type: String, enum: transferablePairs },
    fromAmount: { type: Number },
    toAmount: { type: Number },
    exchangeRate: { type: Number },

    transactionId: { type: String, unique: true },
    adminApproval: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ✅ Clear the model to avoid recompilation error
delete mongoose.connection.models["Transaction"];

export default mongoose.model("Transaction", TransactionSchema);
