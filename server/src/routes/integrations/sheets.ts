import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";

const router = Router();
router.use(requireAuth);

router.post(
  "/trigger-sync",
  asyncHandler(async (_req, res) => {
    const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!appsScriptUrl) {
      return res.status(400).json({ success: false, error: "Google Apps Script URL not configured" });
    }

    const response = await fetch(appsScriptUrl, { method: "GET", redirect: "follow" });
    const responseText = await response.text();

    if (!response.ok) {
      return res.status(500).json({ success: false, error: `Apps Script returned ${response.status}`, details: responseText });
    }

    res.json({ success: true, message: "Google Sheets sync triggered" });
  }),
);

export default router;
