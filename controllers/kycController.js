import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";

// Upload KYC documents
export const uploadKycDocuments = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if files are provided
    if (!req.files || !req.files.idFront || !req.files.idBack) {
      return res.status(400).json({
        success: false,
        message: "Please upload both front and back sides of your ID",
      });
    }

    // Verify Cloudinary configuration
    if (
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.error("Cloudinary configuration missing:", {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? "exists" : "missing",
        api_key: process.env.CLOUDINARY_API_KEY ? "exists" : "missing",
        api_secret: process.env.CLOUDINARY_API_SECRET ? "exists" : "missing",
      });
      return res.status(500).json({
        success: false,
        message: "Server configuration error with file upload service",
      });
    }

    // Upload front ID to cloudinary
    const frontIdResult = await cloudinary.uploader.upload(
      req.files.idFront.tempFilePath,
      { folder: "kyc_documents" }
    );

    // Upload back ID to cloudinary
    const backIdResult = await cloudinary.uploader.upload(
      req.files.idBack.tempFilePath,
      { folder: "kyc_documents" }
    );

    // Update user with KYC document info
    // console.log('the user id is',userId);
    const user = await User.findByIdAndUpdate(
      userId,
      {
        kycDocuments: {
          idFront: frontIdResult.secure_url,
          idBack: backIdResult.secure_url,
          uploadedAt: new Date(),
          verificationStatus: "pending",
        },
      },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "KYC documents uploaded successfully",
      data: {
        kycDocuments: user.kycDocuments,
      },
    });
  } catch (error) {
    console.error("Error uploading KYC documents:", error);
    // Provide more detailed error information
    const errorMessage = error.message || "Failed to upload KYC documents";
    res.status(500).json({
      success: false,
      message: errorMessage,
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

// Get all pending KYC verifications for admin
export const getPendingKycVerifications = async (req, res) => {
  try {
    const pendingUsers = await User.find({
      "kycDocuments.verificationStatus": "pending",
      "kycDocuments.idFront": { $exists: true },
      "kycDocuments.idBack": { $exists: true },
    }).select("firstName lastName email kycDocuments");

    res.status(200).json({
      success: true,
      count: pendingUsers.length,
      data: pendingUsers,
    });
  } catch (error) {
    console.error("Error fetching pending KYC verifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending KYC verifications",
    });
  }
};

// Verify or reject KYC documents by admin
export const verifyKycDocuments = async (req, res) => {
  try {
    const { userId, status, rejectionReason } = req.body;

    if (!userId || !status || (status === "rejected" && !rejectionReason)) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Status must be either 'verified' or 'rejected'",
      });
    }

    const updateData = {
      "kycDocuments.verificationStatus": status,
    };

    if (status === "rejected") {
      updateData["kycDocuments.rejectionReason"] = rejectionReason;
    }

    // If status is verified, also update the user's isVerified field
    if (status === "verified") {
      updateData.isVerified = true;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: `KYC verification ${status}`,
      data: {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          kycDocuments: user.kycDocuments,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error) {
    console.error("Error verifying KYC documents:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to verify KYC documents" });
  }
};

// Get KYC status for a user
export const getKycStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("kycDocuments isVerified");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        kycDocuments: user.kycDocuments,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Error fetching KYC status:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch KYC status" });
  }
};
