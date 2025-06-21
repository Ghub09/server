import Messages from "../models/Messages.js";

 
// Get all messages between two users
export const getMessages = async (req, res) => {
  const { user1, user2 } = req.params;
  try {
    const messages = await Messages.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 },
      ],
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// Get list of users who messaged the admin (for admin inbox)
export const getConversations = async (req, res) => {
  try {
    const userMessages = await Message.aggregate([
      { $match: { receiverId: "admin" } }, // replace with actual admin ID if needed
      {
        $group: {
          _id: "$senderId",
          lastMessage: { $last: "$message" },
          timestamp: { $last: "$createdAt" },
        },
      },
      { $sort: { timestamp: -1 } }
    ]);
    res.json(userMessages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};
