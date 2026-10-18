export const authenticate = (req, res, next) => {
  // 1. Check for x-user-id header (per-user scoping for dev, MCP, & testing)
  const headerUserId = req.headers["x-user-id"];
  if (headerUserId && typeof headerUserId === "string" && headerUserId.trim()) {
    req.userId = headerUserId.trim();
    return next();
  }

  // 2. Check for Authorization Bearer token (if provided)
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    // In production, verify with jwt.verify(token, process.env.JWT_SECRET)
    // For local dev/demo, any bearer token is accepted with prefix 'user_'
    req.userId = token.startsWith("user_") ? token : "authenticated_user";
    return next();
  }

  // 3. Fallback to default user so unauthenticated calls stay backwards-compatible
  req.userId = "default_user";
  next();
};
