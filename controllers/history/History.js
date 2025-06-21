import DepositWithdrawRequest from "../../models/RequestMessage.js";

 
export const getUserHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const history = await DepositWithdrawRequest.find({ userId })
      .sort({ createdAt: -1 }); 

    res.status(200).json({
      success: true,
      message: "User transaction history fetched successfully",
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user history",
      error: error.message
    });
  }
};
