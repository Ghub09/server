// server.js or index.js (your main backend entry file)
import http from "http";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Server } from "socket.io"; // <-- important
import app from "../app.js"; // Adjust path to your Express app
import Message from "./models/Message.js"; // Adjust path to schema

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// Create server and Socket.IO
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL, "https://cryptonexus.live"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

// Socket.IO logic
io.on("connection", (socket) => {
  console.log("✅ 😍  User connected:", socket.id);

  socket.on("send_message", async (data) => {
    try {
      const savedMessage = await Message.create(data);
      io.emit("receive_message", savedMessage);
    } catch (error) {
      console.error("❌ Error saving message:", error.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(` 👌 Server running on port ${PORT}, frontend: ${process.env.FRONTEND_URL}`);
});
