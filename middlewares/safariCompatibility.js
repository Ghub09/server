/**
 * @description Middleware to add Safari-specific compatibility headers
 */
export const safariCompatibilityMiddleware = (req, res, next) => {
  // Check if the request is from Safari
  const userAgent = req.headers["user-agent"] || "";
  const isSafari =
    userAgent.includes("Safari") &&
    !userAgent.includes("Chrome") &&
    !userAgent.includes("Chromium");

  // Add Safari compatibility headers
  if (isSafari) {
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    // Handle preflight OPTIONS requests specially for Safari
    if (req.method === "OPTIONS") {
      return res
        .status(200)
        .set({
          "Access-Control-Allow-Origin": req.headers.origin || "*",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Accept",
            "Origin",
            "Cache-Control",
            "Pragma",
            "Expires",
            "apikey",
            "X-Client-Info",
            "accept-profile",
            "Device-Key",
            "Api-Key",
          ].join(", "),
          "Access-Control-Max-Age": "86400",
        })
        .send();
    }
  }

  // For non-OPTIONS or non-Safari requests, move to the next middleware
  next();
};
