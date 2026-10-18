import { Router } from "express";
import { generateToken } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/token - Issue JWT token for a user
router.post("/token", (req, res) => {
  const { userId } = req.body;
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    return res.status(400).json({ error: "Field 'userId' is required." });
  }

  const cleanUserId = userId.trim();
  const token = generateToken(cleanUserId);

  res.json({
    message: "Token generated successfully",
    userId: cleanUserId,
    token,
    tokenType: "Bearer",
    expiresIn: "7d",
  });
});

export default router;
