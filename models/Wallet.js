import mongoose from "mongoose";

const WalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  balanceUSDT: { type: Number, default: 0 }, // General balance
  marginBalance: { type: Number, default: 0 },
  spotWallet: { type: Number, default: 0 }, // Spot trading wallet
  futuresWallet: { type: Number, default: 0 }, // Futures trading wallet
  perpetualsWallet: { type: Number, default: 0 }, // Perpetuals trading wallet
  walletChangeHistory: [
  {
     changes: {
      spotWallet: [
        {
          asset: String, // e.g., "USDT", "BTC", "ETN"
          oldValue: Number,
          newValue: Number,
        },
      ],
      futuresWallet: [
        {
          asset: String,
          oldValue: Number,
          newValue: Number,
        },
      ],
      perpetualsWallet: [
        {
          asset: String,
          oldValue: Number,
          newValue: Number,
        },
      ],
    },
    timestamp: { type: Date, default: Date.now },
  },
],

  holdings: [
    {
      asset: String,
      quantity: Number,
    },
  ],
  frozenAssets: [
    {
      asset: String,
      quantity: Number,
    },
  ],
  depositHistory: [{ amount: Number, currency: String, createdAt: Date }],
  withdrawalHistory: [{ amount: Number, currency: String,network: String,
    walletAddress:String, createdAt: Date }],
  transferHistory: [
    {
      fromWallet: String,
      toWallet: String, 
      amount: Number,
      timestamp: { type: Date, default: Date.now },
    },
  ],
  futuresPositions: [
    { type: mongoose.Schema.Types.ObjectId, ref: "FuturesTrade" },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

WalletSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Wallet", WalletSchema);
