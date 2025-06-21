import Wallet from "../models/Wallet.js";
import PerpetualTrade from "../models/PerpetualTrade.js";
import FundingRate from "../models/FundingRate.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import { io } from "../server.js";

export const openPerpetualPosition = catchAsyncErrors(async (req, res) => {
  const {
    pair,
    type,
    leverage,
    quantity,
    entryPrice,
    tradeType,
    assetsAmount,
    amountInUSDT, // New field: Amount of USDT to allocate
  } = req.body;
  const userId = req.user._id;

  if (
    !pair ||
    !type ||
    !leverage ||
    !entryPrice ||
    !tradeType ||
    !assetsAmount ||
    (!quantity && !amountInUSDT)
  ) {
    return res.status(400).json({ message: "Kindly fill in all fields" });
  }
  
  if (!["long", "short"].includes(type)) {
    return res.status(400).json({ message: "Invalid trade type" });
  }

  const wallet = await Wallet.findOne({ userId });

  if (!wallet) {
    return res.status(404).json({ message: "Wallet not found" });
  }
  let calculatedQuantity = quantity;

  if (amountInUSDT) {
    calculatedQuantity = amountInUSDT / entryPrice; // Quantity = USDT Amount / Entry Price
  }
  // Calculate required margin
  const marginUsed = (calculatedQuantity * entryPrice) / leverage;

  const availableMargin = wallet.perpetualsWallet * (assetsAmount / 100);

  if (availableMargin < marginUsed) {
    return res.status(400).json({
      message:
        "Insufficient funds in Futures Wallet based on the specified assets amount.",
    });
  }

  let liquidationPrice =
    type === "long"
      ? entryPrice * (1 - 1 / leverage)
      : entryPrice * (1 + 1 / leverage);

  wallet.perpetualsWallet -= marginUsed;
  await wallet.save();

  const trade = await PerpetualTrade.create({
    userId,
    pair,
    type,
    tradeType,
    assetsAmount,
    leverage,
    entryPrice,
    quantity: calculatedQuantity,
    marginUsed,
    liquidationPrice,
  });
  io.emit("newPerpetualsTrade", trade);

  res.status(201).json({
    message: "Perpetual position opened successfully",
    trade,
  });
});

export const closePerpetualPosition = catchAsyncErrors(async (req, res) => {
  const { tradeId, closePrice } = req.body;
  const userId = req.user._id;

  // Ensure closePrice is a valid number
  const parsedClosePrice = parseFloat(closePrice);
  if (isNaN(parsedClosePrice)) {
    return res.status(400).json({ message: "Invalid close price provided" });
  }

  const trade = await PerpetualTrade.findOne({ _id: tradeId, userId });

  if (!trade) return res.status(404).json({ message: "Trade not found" });
  if (trade.status !== "open")
    return res.status(400).json({ message: "Trade is already closed" });

  const wallet = await Wallet.findOne({ userId });

  if (!wallet) return res.status(404).json({ message: "Wallet not found" });

  // Calculate profit/loss taking leverage into account
  let profitLoss;
  if (trade.type === "long") {
    profitLoss =
      (parsedClosePrice - trade.entryPrice) * trade.quantity * trade.leverage;
  } else {
    profitLoss =
      (trade.entryPrice - parsedClosePrice) * trade.quantity * trade.leverage;
  }

  // Make sure we're adding valid numbers to the wallet
  if (isNaN(profitLoss)) {
    profitLoss = 0;
  }

  // Ensure we're adding a valid number to perpetualsWallet
  const updatedBalance =
    wallet.perpetualsWallet + trade.marginUsed + profitLoss;
  wallet.perpetualsWallet = isNaN(updatedBalance)
    ? wallet.perpetualsWallet
    : updatedBalance;

  if (wallet.perpetualsWallet < 0) {
    wallet.perpetualsWallet = 0;
  }
  await wallet.save();

  // Store PNL information in the trade record
  trade.status = "closed";
  trade.closedAt = new Date();
  trade.profitLoss = profitLoss;
  trade.closePrice = parsedClosePrice;
  await trade.save();

  res.status(200).json({
    message: "Perpetual position closed successfully",
    profitLoss,
    tradeId,
  });
});

export const applyFundingRates = async () => {
  const rates = await FundingRate.find();
  const openTrades = await PerpetualTrade.find({ status: "open" });

  for (const trade of openTrades) {
    const rate = rates.find((r) => r.pair === trade.pair)?.rate || 0;
    const fundingFee = (trade.marginUsed * rate) / 100;

    const wallet = await Wallet.findOne({ userId: trade.userId });
    if (!wallet) continue;

    if (trade.type === "long") {
      wallet.balanceUSDT = Math.max(0, wallet.balanceUSDT - fundingFee);
    } else {
      wallet.balanceUSDT += fundingFee;
    }

    trade.fundingFee += fundingFee;
    await trade.save();
    await wallet.save();
  }
};

export const fetchOpenPerpetualTrades = catchAsyncErrors(
  async (req, res, next) => {
    try {
      const trades = await PerpetualTrade.find({
        userId: req.user._id,
        status: "open",
      });
      res.status(200).json({
        success: true,
        trades,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

export const getPerpetualTradesHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const trades = await PerpetualTrade.find({
      userId,
      status: { $in: ["closed", "liquidated"] },
    });

    res.status(200).json({ message: "Trades fetched successfully", trades });
  } catch (error) {
    res.status(500).json({ message: "Error fetching trades", error });
  }
};
