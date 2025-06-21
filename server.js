import http from "http";
import { Server } from "socket.io";
import axios from "axios";
import dotenv from "dotenv";
import app from "./app.js";
import {
  checkLiquidations,
  checkExpiredTrades,

} from "./controllers/futuresTradeController.js";
import Messages from "./models/Messages.js";

dotenv.config();

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server for real-time updates
const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

// Handle socket connections
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });

  socket.on("placeOrder", (data) => {
    io.emit("tradeUpdate", data);
  });
});

export { io };

export const emitTradeUpdate = (trade) => {
  io.emit("tradeUpdate", trade);
};

// Market prices storage
const marketPrices = {};
const fetchMarketPrices = async () => {
  try {
    const response = await axios.get(
      "https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,BNB,SOL,XRP,ADA,DOGE,MATIC,DOT,LTC&tsyms=USDT"
    );

    if (response.data) {
      Object.keys(response.data).forEach((symbol) => {
        marketPrices[`${symbol}USDT`] = parseFloat(response.data[symbol].USDT);
      });

      await checkLiquidations(marketPrices);
    }
  } catch (error) {
    console.error("⚠️ Error fetching market prices:", error.message);
  }
};
setInterval(fetchMarketPrices, 30000);

// Run liquidation checks every 30 seconds
setInterval(async () => {
  console.log("🔄 Running periodic liquidation check...");
  await checkLiquidations(marketPrices);
}, 30000);

// Run expired trades check every minute
setInterval(async () => {
  console.log("⏱️ Checking for expired trades...");
  await checkExpiredTrades();
}, 60000);

 
 
 
  
  

// Server-side socket handlers
// Socket.IO server
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("register", async ({ userId }) => {
    try {
      socket.join(userId);
      console.log(`User ${userId} joined their room`);
      
      // Only send initial history for admin
      if (userId === "admin") {
        // Admin doesn't need initial history for all conversations
        return;
      }
      
      // For regular users, fetch their chat history with admin
      const history = await Messages.find({
        $or: [
          { sender: userId, receiver: "admin" },
          { sender: "admin", receiver: userId }
        ]
      }).sort('createdAt');
      
      socket.emit("chat_history", history);
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }
  });

  socket.on("delete_conversation", async ({ userId }) => {
  try {
    const deletedMessages = await Messages.deleteMany({
      $or: [
        { sender: userId, receiver: "admin" },
        { sender: "admin", receiver: userId },
      ],
    });

    console.log(`🗑️ Deleted ${deletedMessages.deletedCount} messages between admin and ${userId}`);

    // Notify both user and admin
    io.to(userId).emit("conversation_deleted", { success: true });
    io.to("admin").emit("conversation_deleted", { userId, success: true });
  } catch (err) {
    console.error("❌ Error deleting conversation:", err);
    socket.emit("delete_error", { error: err.message });
  }
});

  socket.on("sendMessage", async ({ senderId, receiverId, text, tempId }) => {
    try {
      // Create new message
      const message = new Messages({
        sender: senderId,
        receiver: receiverId,
        content: text,
        isAdminMessage: senderId === "admin"
      });
      
      const savedMessage = await message.save();
      
      // Construct message object for clients
      const messageData = {
        _id: savedMessage._id,
        sender: savedMessage.sender,
        receiver: savedMessage.receiver,
        content: savedMessage.content,
        isAdminMessage: savedMessage.isAdminMessage,
        createdAt: savedMessage.createdAt,
      };

      // Emit to receiver
      io.to(receiverId).emit("message", messageData);
      
      // Emit to sender with tempId for reconciliation
      io.to(senderId).emit("message", {
        ...messageData,
        tempId
      });
    } catch (err) {
      console.error("Error saving message:", err);
      // Notify sender of the error
      io.to(senderId).emit("message_error", { tempId, error: err.message });
    }
  });
  socket.on("get_conversation_history", async ({ adminId, userId }) => {
    try {
      const history = await Messages.find({
        $or: [
          { sender: adminId, receiver: userId },
          { sender: userId, receiver: adminId }
        ]
      }).sort('createdAt');
      
      // Send to the requesting socket only
      socket.emit("conversation_history", history);
    } catch (err) {
      console.error("Error fetching conversation history:", err);
    }
  });



  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});








 // Start the server
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

server.listen(PORT, () => {
  console.log(`🚀 Server prort=> ${PORT} Frontend URL=>${FRONTEND_URL}`);
 });

