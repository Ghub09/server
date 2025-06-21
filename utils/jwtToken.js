import jwt from "jsonwebtoken";

export const generateToken = (user, message, statusCode, res) => {
  const jwtExpiry = "30d" || process.env.JWT_EXPIRY;
  const cookieExpiryDays = 30 || process.env.COOKIE_EXPIRY;

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: jwtExpiry,
  });

  const cookieName = user.role === "admin" ? "adminToken" : "userToken";

  const domain =
    process.env.NODE_ENV === "production" ? ".cryptonexus.live" : "localhost";

  const expiresDate = new Date(Date.now() + cookieExpiryDays * 24 * 60 * 60 * 1000);

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain,
    path: "/",
    expires: expiresDate,
  });

  res.status(statusCode).json({
    success: true,
    message,
    user,
    token,
  });
};





// export const generateToken = (user, message, statusCode, res) => {
//   const token = user.generateJWTToken();
//   const cookieName = user.role === "admin" ? "adminToken" : "userToken";

//   const domain = process.env.NODE_ENV === "production" ? ".cryptonexus.live" : "localhost";
//   const cookieExpiryDays = Number(process.env.COOKIE_EXPIRY) || 7;
//   const expiresDate = new Date(Date.now() + cookieExpiryDays * 24 * 60 * 60 * 1000);

//   console.log("COOKIE_EXPIRY:", process.env.COOKIE_EXPIRY);
//   console.log("Parsed cookieExpiryDays:", cookieExpiryDays);
//   console.log("Expires Date:", expiresDate);
//   console.log("Is valid date:", !isNaN(expiresDate.getTime()));

//   res.cookie(cookieName, token, {
//     httpOnly: true,
//     secure: true,
//     sameSite: "none",
//     domain: domain,
//     path: "/",
//     expires: expiresDate,
//   });

//   res.status(statusCode).json({
//     success: true,
//     message,
//     user,
//     token,
//   });
// };


// export const generateToken = (user, message, statusCode, res) => {
//   const token = user.generateJWTToken();

//   let cookieName = user.role === "admin" ? "adminToken" : "userToken";

//   // Get the domain from environment variable or default to localhost
//   const domain =
//     process.env.NODE_ENV === "production"
//       ? ".cryptonexus.live" // Include subdomain support with leading dot
//       : "localhost";

//   res.cookie(cookieName, token, {
//     httpOnly: true,
//     secure: true,
//     sameSite: "none", // Required for cross-origin cookies
//     domain: domain,
//     path: "/",
//     expires: new Date(
//       Date.now() + process.env.COOKIE_EXPIRY * 24 * 60 * 60 * 1000
//     ),
//   });

//   res.status(statusCode).json({
//     success: true,
//     message,
//     user,
//     token,
//   });
// };
