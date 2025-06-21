import mongoose from "mongoose";

const FundingRateSchema = new mongoose.Schema({
  pair: { type: String, required: true }, // Example: BTCUSDT
  rate: { type: Number, required: true }, // Funding rate in percentage
  nextFundingTime: { type: Date, required: true }, // Time for the next funding
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("FundingRate", FundingRateSchema);
// console.log(FundingRateSchema.obj);