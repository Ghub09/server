import mongoose from "mongoose";

const tradeSchema = new mongoose.Schema({
  userId: { type:String ,required: true },
  type: { type: String, enum: ["buy", "sell"], required: true },
  asset: { type: String, required: true },  
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  executedAt: { type: Date, default: Date.now },
});

const Trade = mongoose.model("Trade", tradeSchema);
export default Trade;
