import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false, enum: [false, true] },
    verificationCode: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    balanceUSDT: { type: Number, default: 0 },
    depositHistory: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    ],
    withdrawalHistory: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    ],
    kycDocuments: {
      idFront: { type: String },
      idBack: { type: String },
      uploadedAt: { type: Date },
      verificationStatus: {
        type: String,
        enum: ["pending", "verified", "rejected"],
      },
      rejectionReason: { type: String },
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  this.password = await bcrypt.hash(this.password, 14);
});

UserSchema.methods.comparePasswords = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.generateJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRY,
  });
};
export default mongoose.model("User", UserSchema);
