import { Router } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import { asyncHandler } from "../../lib/asyncHandler.js";

const router = Router();

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || "lovable_crm_verify_token_2024";

router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).type("text/plain").send(challenge);
  } else {
    res.status(403).send("Forbidden");
  }
});

router.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const body = req.body;

    if (body.object === "page") {
      const adminRoles = await db
        .select({ userId: schema.userRoles.userId })
        .from(schema.userRoles)
        .where(inArray(schema.userRoles.role, ["admin", "rop"]))
        .limit(1);

      if (adminRoles.length === 0) {
        return res.status(400).json({ success: false, error: "No admin or ROP users found to assign the lead" });
      }
      const sellerId = adminRoles[0].userId;

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.value?.leadgen_id) {
            const fieldData = change.value.field_data || [];
            const getField = (name: string) => fieldData.find((f: { name: string }) => f.name === name)?.values?.[0] || "";

            await db.insert(schema.leads).values({
              sellerId,
              customerName: getField("full_name") || getField("first_name") || "Facebook Lead",
              customerPhone: getField("phone_number") || getField("phone"),
              customerEmail: getField("email"),
              leadType: "Yangi lid",
              activity: "new",
              source: "Facebook Lead Ads",
              notes: `Lead ID: ${change.value.leadgen_id}\nForm ID: ${change.value.form_id}`,
              status: "new",
            });
          }
        }
      }
    }

    res.json({ success: true });
  }),
);

export default router;
