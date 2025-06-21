import Wallet from "../models/Wallet.js";
import FuturesTrade from "../models/FuturesTrade.js";
import FundingRate from "../models/FundingRate.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import PerpetualTrade from "../models/PerpetualTrade.js";
import { io } from "../server.js"; // Import WebSocket instance

export const openFuturesPosition = catchAsyncErrors(async (req, res) => {
  const {
    pair,
    type,
    leverage,
    time,
    quantity, // Quantity of crypto (optional)
    entryPrice,
    assetsAmount,
    tradeType,
    amountInUSDT, // New field: Amount of USDT to allocate
  } = req.body;
  console.log(req.body)
  const userId = req.user._id;

  // Validate required fields
 if (
  !pair ||
  !type ||
  !leverage ||
  !entryPrice ||
  !assetsAmount ||
  (!quantity && !amountInUSDT)
) {
  return res.status(400).json({ message: "Kindly fill in all fields" });
}


  // Validate trade type
  if (!["long", "short"].includes(type)) {
    return res.status(400).json({ message: "Invalid trade type" });
  }

  const wallet = await Wallet.findOne({ userId });

  if (!wallet) {
    return res.status(404).json({ message: "Wallet not found" });
  }

  let calculatedQuantity = quantity;

  // If amountInUSDT is provided, calculate the quantity of crypto
  if (amountInUSDT) {
    calculatedQuantity = amountInUSDT / entryPrice; // Quantity = USDT Amount / Entry Price
  }

  // Calculate required margin
  const marginUsed = (calculatedQuantity * entryPrice) / leverage;

  const availableMargin = wallet.futuresWallet * (assetsAmount / 100);

  if (availableMargin < marginUsed) {
    return res.status(400).json({
      message:
        "Insufficient funds in Perpetuals Wallet based on the specified assets amount.",
    });
  }

  // Calculate liquidation price (approximate formula)
  let liquidationPrice;
  if (type === "long") {
    liquidationPrice = entryPrice * (1 - 1 / leverage);
  } else {
    liquidationPrice = entryPrice * (1 + 1 / leverage);
  }

  // Calculate expiry time based on leverage value
 let expiryTime = new Date();

switch (leverage.toString()) {
  case "10": // 30s
    expiryTime.setSeconds(expiryTime.getSeconds() + 30);
    break;
  case "20": // 60s
    expiryTime.setSeconds(expiryTime.getSeconds() + 60);
    break;
  case "30": // 120s
    expiryTime.setSeconds(expiryTime.getSeconds() + 120);
    break;
  case "40": // 150s
    expiryTime.setSeconds(expiryTime.getSeconds() + 150);
    break;
  case "50": // 180s
    expiryTime.setSeconds(expiryTime.getSeconds() + 180);
    break;
  case "60": // 24h
    expiryTime.setHours(expiryTime.getHours() + 24);
    break;
  case "70": // 48h
    expiryTime.setHours(expiryTime.getHours() + 48);
    break;
  case "80": // 72h
    expiryTime.setHours(expiryTime.getHours() + 72);
    break;
  case "90": // 7d
    expiryTime.setDate(expiryTime.getDate() + 7);
    break;
  case "100": // 15d
    expiryTime.setDate(expiryTime.getDate() + 15);
    break;
  default:
    expiryTime.setHours(expiryTime.getHours() + 24); // Default: 24h
}


  // Deduct margin from user's wallet
  wallet.futuresWallet -= marginUsed;
  await wallet.save();

  // Save trade to database
  const futuresTrade = await FuturesTrade.create({
    userId,
    pair,
    type,
    tradeType,
    assetsAmount,
    leverage,
    time,
    entryPrice,
    quantity: calculatedQuantity, // Use calculated quantity
    marginUsed,
    liquidationPrice,
    expiryTime, // Add expiry time
    status: "open",
  });

  // Emit events for real-time updates
  io.emit("newFuturesTrade", futuresTrade);
  io.emit("newPosition", futuresTrade);

  res.status(201).json({
  message: "Futures position opened successfully",
  trade: futuresTrade,
});

});

export const closeFuturesPosition = catchAsyncErrors(async (req, res) => {
  const { tradeId, closePrice } = req.body;
  const userId = req.user._id;

  const parsedClosePrice = parseFloat(closePrice);
  if (isNaN(parsedClosePrice)) {
    return res.status(400).json({ message: "Invalid close price provided" });
  }

  const trade = await FuturesTrade.findOne({ _id: tradeId, userId });
  if (!trade) {
    return res.status(404).json({ message: "Trade not found" });
  }

  if (trade.status !== "open") {
    return res.status(400).json({ message: "Trade is already closed" });
  }

  const wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    return res.status(404).json({ message: "Wallet not found" });
  }

  // 🎯 FIXED PNL using leverage %
  const fixedPNL = Math.round((trade.assetsAmount * trade.leverage) / 100);

  // 🎯 Only decide profit/loss direction using entry & close price
  const isWin =
    (trade.type === "long" && parsedClosePrice > trade.entryPrice) ||
    (trade.type === "short" && parsedClosePrice < trade.entryPrice);

  const profitLoss = isWin ? fixedPNL : -fixedPNL;

  // Update wallet
  const updatedBalance = wallet.futuresWallet + trade.marginUsed + profitLoss;
  wallet.futuresWallet = isNaN(updatedBalance)
    ? wallet.futuresWallet
    : updatedBalance;

  if (wallet.futuresWallet < 0) wallet.futuresWallet = 0;
  await wallet.save();

  // Update trade
  trade.status = "closed";
  trade.closedAt = new Date();
  trade.profitLoss = profitLoss; // ✅ now strictly 10, -10, etc.
  trade.closePrice = parsedClosePrice;
  await trade.save();

  io.emit("tradeClose", { tradeId, profitLoss });

  res.status(200).json({
    message: "Futures position closed successfully",
    profitLoss,
    tradeId,
  });
});



export const getOpenPositions = catchAsyncErrors(async (req, res) => {
  const userId = req.user._id;
  const openTrades = await FuturesTrade.find({ userId, status: "open" });

  res.status(200).json({ trades: openTrades }); // ✅ returns correct shape
});

export const getFuturesTradeHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const trades = await FuturesTrade.find({
      userId,
      status: { $in: ["closed", "liquidated"] },
    });

    res.status(200).json({ message: "Trades fetched successfully", trades });
  } catch (error) {
    res.status(500).json({ message: "Error fetching trades", error });
  }
};

export const getFundingRates = catchAsyncErrors(async (req, res) => {
  const rates = await FundingRate.find();
  res.status(200).json({ rates });
});

export const checkLiquidations = async (marketPrices) => {
  const futureTrades = await FuturesTrade.find({ status: "open" });
  const perpetualTrades = await PerpetualTrade.find({ status: "open" });
  const openTrades = [...futureTrades, ...perpetualTrades];
  for (const trade of openTrades) {
    const marketPrice = marketPrices[trade.pair];

    if (
      (trade.type === "long" && marketPrice <= trade.liquidationPrice) ||
      (trade.type === "short" && marketPrice >= trade.liquidationPrice)
    ) {
      // Calculate profit/loss for the liquidated trade
      // For liquidation, consider it a full loss of the margin used
      const profitLoss = -trade.marginUsed;

      // Update the trade record with liquidation information
      trade.status = "liquidated";
      trade.closedAt = new Date();
      trade.profitLoss = profitLoss;
      trade.closePrice = marketPrice;
      await trade.save();

      // Notify clients about the liquidation
      io.emit("liquidationUpdate", trade);
    }
  }
};

// Check for expired trades and mark them as expired without closing them
export const checkExpiredTrades = async () => {
  try {
    const now = new Date();

    // Find all open futures trades that have expired but don't have expired flag
    const expiredTrades = await FuturesTrade.find({
      status: "open",
      expiryTime: { $lte: now },
      isExpired: { $ne: true }, // Only get trades that aren't already marked as expired
    });

    for (const trade of expiredTrades) {
      // Just mark the trade as expired without closing it
      // Admin will handle the actual closing process
      trade.isExpired = true;
      await trade.save();

      // Notify clients about expired trade status for UI updates
      io.emit("tradeExpired", trade);
    }

    if (expiredTrades.length > 0) {
      console.log(
        `Marked ${expiredTrades.length} trades as expired. These trades will remain open until closed by admin.`
      );
    }
  } catch (error) {
    console.error("Error checking expired trades:", error);
  }
};
