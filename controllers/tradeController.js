import Wallet from "../models/Wallet.js";
import Trade from "../models/Trade.js";
import { io } from "../server.js"; // Import WebSocket instance
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";

export const placeOrder = catchAsyncErrors(async (req, res) => {
  try {
    const { type, orderType, price, usdtAmount, assetsAmount, coin } = req.body;

    // console.log("GOT A PLACE ORDER REQUEST \n" + JSON.stringify(req.body));
    

    // Validate required fields
    if (!type || !orderType || !coin) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate order type
    if (!["buy", "sell"].includes(type)) {
      return res.status(400).json({ message: "Invalid order type" });
    }

    // Validate price for limit orders
    if (orderType === "limit" && (!price || price <= 0)) {
      return res.status(400).json({ message: "Invalid price for limit order" });
    }

    // Find the user's wallet
    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    if (type === "buy") {
      // Buy logic
      const marketPrice = price; // Use the provided price or fetch the current market price
      let quantity, totalCost;

      if (usdtAmount > 0 && assetsAmount > 0) {
        // Prioritize usdtAmount over assetsAmount
        quantity = usdtAmount / marketPrice;
        totalCost = usdtAmount;
      } else if (usdtAmount > 0) {
        // Calculate quantity based on USDT amount
        quantity = usdtAmount / marketPrice;
        totalCost = usdtAmount;
      } else if (assetsAmount > 0) {
        // Calculate quantity based on assetsAmount (percentage of spot wallet)
        const usableAssets = (wallet.spotWallet / 100) * assetsAmount;
        quantity = usableAssets / marketPrice;
        totalCost = usableAssets;
      } else {
        return res.status(400).json({ message: "Invalid amount" });
      }

      // Ensure user has enough balance in Spot Wallet
      if (totalCost > wallet.spotWallet) {
        return res
          .status(400)
          .json({ message: "Insufficient funds in Spot Wallet" });
      }

      // Create and save the trade
      const trade = await Trade.create({
        userId: req.user._id,
        type,
        orderType,
        price: marketPrice,
        quantity,
        totalCost,
        asset: coin,
        status: "pending",
      });

      // Emit trade update
      io.emit("tradeUpdate", trade);
    } else {
      // Sell logic
      const holding = wallet.holdings.find((h) => h.asset === coin);
      if (!holding) {
        return res.status(400).json({ message: "Insufficient crypto balance" });
      }

      let sellableQuantity;

      if (usdtAmount > 0 && assetsAmount > 0) {
        // Prioritize usdtAmount over assetsAmount
        sellableQuantity = usdtAmount;
      } else if (assetsAmount > 0) {
        // Calculate sellable quantity based on assetsAmount (percentage of holding)
        sellableQuantity = (holding.quantity / 100) * assetsAmount;
      } else if (usdtAmount > 0) {
        // Calculate sellable quantity based on USDT amount
        sellableQuantity = usdtAmount;
      } else {
        return res.status(400).json({ message: "Invalid amount" });
      }

      // Ensure user has enough crypto balance
      if (sellableQuantity > holding.quantity) {
        return res.status(400).json({ message: "Insufficient crypto balance" });
      }

      // Calculate total cost (USDT value of the sold assets)
      const totalCost = sellableQuantity * price;

      // Create and save the trade
      const trade = await Trade.create({
        userId: req.user._id,
        type,
        orderType,
        price,
        quantity: sellableQuantity,
        totalCost,
        asset: coin,
        status: "pending",
      });

      // Emit trade update
      io.emit("tradeUpdate", trade);
    }

    res.status(200).json({ message: "Order Successful" });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export const getTradeHistory = async (req, res) => {
  try {
    clog("got a trade history request" + req.user.userId);
    const trades = await Trade.find({
      userId: req.user.userId,
      status: "approved",
    }).sort({
      createdAt: -1,
    });
    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: "Error fetching trade history", error });
  }
};

// Get Wallet Balance & Holdings
export const getWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: "Error fetching wallet details", error });
  }
};

export const fetchPendingOrders = async (req, res, next) => {
  try {
    const transactions = await Trade.find({ status: "pending" });
    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

 export const transferFunds = catchAsyncErrors(async (req, res) => {
const { fromWallet, toWallet, transferAsset: asset, amount } = req.body;
  const userId = req.user._id;

  try {
    // Fetch user wallet
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    // Validate wallet types
    const validWallets = [
      // "exchangeWallet",
      "spotWallet",
      "futuresWallet",
      "perpetualsWallet",
    ];
    if (
      !validWallets.includes(fromWallet) ||
      !validWallets.includes(toWallet)
    ) {
      return res.status(400).json({ message: "Invalid wallet type" });
    }

    const transferAmount = Number(amount); // Ensure the amount is a number

    console.log("the asset is" + asset);

    // Validate balance for USDT transfers
    if (asset === "USDT") {
      if (wallet[fromWallet] < transferAmount) {
        return res.status(400).json({ message: "Insufficient funds" });
      }

      // Process transfer with proper addition
      wallet[fromWallet] -= transferAmount;
      wallet[toWallet] += transferAmount;
    } else {
      // Handle asset transfers between exchange and spot wallets
      const fromHoldings =
        fromWallet === "spotWallet" ? wallet.holdings : wallet.holdings;
      const toHoldings =
        toWallet === "spotWallet" ? wallet.holdings : wallet.holdings;

      // Validate if fromHoldings is empty
      if (fromHoldings.length === 0) {
        return res.status(400).json({ message: "Insufficient crypto balance" });
      }

      const fromHolding = fromHoldings.find(
        (holding) => holding.asset === asset
      );
      if (!fromHolding || fromHolding.quantity < transferAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Deduct from the sender's holdings
      fromHolding.quantity -= transferAmount;
      if (fromHolding.quantity === 0) {
        fromHoldings.splice(fromHoldings.indexOf(fromHolding), 1);
      }

      // Add to the receiver's holdings
      const toHolding = toHoldings.find((holding) => holding.asset === asset);
      if (toHolding) {
        toHolding.quantity += transferAmount;
      } else {
        toHoldings.push({ asset, quantity: transferAmount });
      }
    }

    // Log transfer in history
    wallet.transferHistory.push({
      fromWallet,
      toWallet,
      asset,
      amount: transferAmount,
      timestamp: new Date(),
    });

    await wallet.save();

    res.status(200).json({ message: "Transfer successful", wallet });
  } catch (error) {
    res.status(500).json({ message: "Error processing transfer", error });
  }
});

// export const transferFunds = catchAsyncErrors(async (req, res) => {
//   const { fromWallet, toWallet, transferAsset: asset, amount } = req.body;
//   const userId = req.user._id;

//   try {
//     // Fetch user wallet
//     const wallet = await Wallet.findOne({ userId });
//     if (!wallet) {
//       return res.status(404).json({ message: "Wallet not found" });
//     }

//     // ✅ Automatically migrate exchangeWallet funds to spotWallet before proceeding
//     let migrated = false;
//     if (wallet.exchangeWallet && wallet.exchangeWallet > 0) {
//       wallet.spotWallet += wallet.exchangeWallet;
//       wallet.exchangeWallet = 0;
//       migrated = true;
//     }
//     if (wallet.holdings && wallet.holdings.length > 0) {
//       wallet.holdings.forEach((holding) => {
//         const existing = wallet.holdings.find(h => h.asset === holding.asset);
//         if (existing) {
//           existing.quantity += holding.quantity;
//         } else {
//           wallet.holdings.push({ asset: holding.asset, quantity: holding.quantity });
//         }
//       });
//       wallet.holdings = [];
//       migrated = true;
//     }
//     if (migrated) {
//       wallet.transferHistory.push({
//         fromWallet: "exchangeWallet",
//         toWallet: "spotWallet",
//         asset: "ALL",
//         amount: 0,
//         timestamp: new Date(),
//         details: wallet.holdings.map(h => ({ asset: h.asset, quantity: h.quantity })),
//       });
//     }

//     // ✅ Now proceed with normal transfer logic
//     const validWallets = [
//       "spotWallet",
//       "futuresWallet",
//       "perpetualsWallet",
//     ];
//     if (
//       !validWallets.includes(fromWallet) ||
//       !validWallets.includes(toWallet)
//     ) {
//       return res.status(400).json({ message: "Invalid wallet type" });
//     }

//     const transferAmount = Number(amount);
//     if (isNaN(transferAmount) || transferAmount <= 0) {
//       return res.status(400).json({ message: "Invalid transfer amount" });
//     }

//     // USDT transfer between wallets
//     if (asset === "USDT") {
//       if (wallet[fromWallet] < transferAmount) {
//         return res.status(400).json({ message: "Insufficient funds" });
//       }

//       wallet[fromWallet] -= transferAmount;
//       wallet[toWallet] += transferAmount;
//     } else {
//       // Crypto asset transfer
//       const fromHoldings = wallet.holdings;
//       const toHoldings = wallet.holdings; // all assets now use `holdings`

//       const fromHolding = fromHoldings.find(h => h.asset === asset);
//       if (!fromHolding || fromHolding.quantity < transferAmount) {
//         return res.status(400).json({ message: "Insufficient asset balance" });
//       }

//       fromHolding.quantity -= transferAmount;
//       if (fromHolding.quantity === 0) {
//         fromHoldings.splice(fromHoldings.indexOf(fromHolding), 1);
//       }

//       const toHolding = toHoldings.find(h => h.asset === asset);
//       if (toHolding) {
//         toHolding.quantity += transferAmount;
//       } else {
//         toHoldings.push({ asset, quantity: transferAmount });
//       }
//     }

//     // Log transfer in history
//     wallet.transferHistory.push({
//       fromWallet,
//       toWallet,
//       asset,
//       amount: transferAmount,
//       timestamp: new Date(),
//     });

//     await wallet.save();

//     res.status(200).json({
//       message: "Transfer successful",
//       migratedExchangeToSpot: migrated,
//       wallet,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Error processing transfer", error });
//   }
// });

export const getSpotTradesHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const trades = await Trade.find({
      userId,
      status: "approved",
    });

    res.status(200).json({ message: "Trades fetched successfully", trades });
  } catch (error) {
    res.status(500).json({ message: "Error fetching trades", error });
  }
};
export const fetchOpenOrders = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const trades = await Trade.find({ userId, status: "pending" });
    console.log("got fetch open orders req" + trades);
    return res.status(200).json({
      success: true,
      trades,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching open orders", error });
  }
};
