import mongoose from "mongoose";
const AdminSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed password
    role: { type: String, enum: ["superadmin", "support"], default: "support" },
    permissions: [{ type: String }], // ["approve_deposits", "manage_users"]
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", AdminSchema);
