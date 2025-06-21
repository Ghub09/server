import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  asset: { type: String, required: true },
  type: { type: String, enum: ["buy", "sell"], required: true },
  orderType: { type: String, enum: ["market", "limit"], required: true },
  price: {
    type: Number,
    required: function () {
      return this.orderType === "limit";
    },
  },
  quantity: { type: Number, required: true },
  tradeType: { type: String },
  status: {
    type: String,
    enum: ["open", "filled", "partial"],
    default: "open",
  },
  matchedOrders: [
    { orderId: mongoose.Schema.Types.ObjectId, quantity: Number },
  ], // Stores matched order details
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("Order", orderSchema);
