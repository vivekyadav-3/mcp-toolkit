import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_dev_secret_change_in_production";

/**
 * Generate a signed JWT token for a given user ID
 */
export const generateToken = (userId, expiresIn = "7d") => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn });
};

/**
 * Production-ready Authentication Middleware
 * 
 * Enforces valid Bearer JWT tokens in production.
 * Prevents unauthorized access and unauthenticated fallbacks.
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  // 1. Verify standard Bearer JWT Token
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (!decoded.userId) {
        return res.status(401).json({ error: "Unauthorized: Invalid token payload" });
      }
      req.userId = decoded.userId;
      return next();
    } catch (err) {
      return res.status(401).json({
        error: `Unauthorized: ${err.name === "TokenExpiredError" ? "Token expired" : "Invalid token"}`,
      });
    }
  }

  // 2. Strict Dev/Testing bypass - NEVER enabled in production
  const isDevOrTest = process.env.NODE_ENV !== "production";
  const allowDevHeader = process.env.ALLOW_DEV_HEADER === "true" || process.env.NODE_ENV === "test";

  if (isDevOrTest && allowDevHeader) {
    const devUserId = req.headers["x-user-id"];
    if (devUserId && typeof devUserId === "string" && devUserId.trim()) {
      req.userId = devUserId.trim();
      return next();
    }
  }

  // 3. Optional local anonymous dev fallback (only if explicitly enabled in .env)
  if (isDevOrTest && process.env.ALLOW_ANONYMOUS === "true") {
    req.userId = "default_user";
    return next();
  }

  // 4. Default: Reject unauthenticated requests
  return res.status(401).json({
    error: "Unauthorized: Missing Bearer token in Authorization header",
  });
};
