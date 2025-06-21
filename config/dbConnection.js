import mongoose from "mongoose";

export const dbConnection = () => {
  console.log(
    "MONGODB_CONNECTION_STRING---",
    process.env.MONGODB_CONNECTION_STRING
  );
  mongoose
    .connect(process.env.MONGODB_CONNECTION_STRING, {
      dbName: "BitEx-Crypto-Trading",
    })
    .then(() => {
      console.log("Database Has Been Successfully Connected");
    })
    .catch((err) => {
      console.log(
        "Some error occured while connecting to database",
        err.message
      );
    });
};
