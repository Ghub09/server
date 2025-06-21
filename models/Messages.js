// Message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true
  },
  receiver: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  isAdminMessage: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model("Messages", messageSchema);