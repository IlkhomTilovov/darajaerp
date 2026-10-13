import { Router } from "express";
import crypto from "node:crypto";
import { asc, inArray, sql } from "drizzle-orm";
import { db, schema } from "../../db/index.js";

const router = Router();

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || "lovable_crm_verify_token_2024";
const APP_SECRET = process.env.FACEBOOK_APP_SECRET || "";
const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || "v21.0";

/**
 * Page access tokenlar. Ikki xil berish mumkin:
 *   FACEBOOK_PAGE_ACCESS_TOKEN=EAAG...            (bitta sahifa)
 *   FACEBOOK_PAGE_TOKENS={"123456":"EAAG...","789":"EAAG..."}   (bir nechta sahifa)
 */
function resolvePageToken(pageId?: string): string {
  const raw = process.env.FACEBOOK_PAGE_TOKENS;
  if (raw && pageId) {
    try {
      const map = JSON.parse(raw) as Record<string, string>;
      if (map[pageId]) return map[pageId];
    } catch {
      console.error("[facebook] FACEBOOK_PAGE_TOKENS noto'g'ri JSON");
    }
  }
  return process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";
}

// ---------------------------------------------------------------- verification

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

/** Meta so'rovi haqiqatan ham Meta'dan kelganini tekshiradi (X-Hub-Signature-256). */
function verifySignature(req: { headers: Record<string, unknown>; rawBody?: Buffer }): boolean {
  if (!APP_SECRET) {
    console.error("[facebook] FACEBOOK_APP_SECRET sozlanmagan — so'rov rad etildi");
    return false;
  }
  const header = req.headers["x-hub-signature-256"];
  if (typeof header !== "string" || !header.startsWith("sha256=")) return false;
  if (!req.rawBody) return false;

  const expected = crypto.createHmac("sha256", APP_SECRET).update(req.rawBody).digest("hex");
  const received = header.slice("sha256=".length);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------- lead olish

type FieldDatum = { name: string; values?: string[] };

/**
 * MUHIM: Meta webhook'i lid ma'lumotlarini (ism, telefon) YUBORMAYDI.
 * U faqat leadgen_id yuboradi — qolganini Graph API'dan o'qib olish kerak.
 */
async function fetchLeadDetails(leadgenId: string, pageToken: string) {
  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(leadgenId)}` +
    `?fields=id,created_time,field_data,form_id,ad_id,campaign_id` +
    `&access_token=${encodeURIComponent(pageToken)}`;

  const res = await fetch(url);
  const json = (await res.json()) as {
    error?: { message?: string };
    field_data?: FieldDatum[];
    created_time?: string;
    form_id?: string;
    ad_id?: string;
    campaign_id?: string;
  };

  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Graph API ${res.status}`);
  }
  return json;
}

const normalizePhone = (raw?: string | null) => (raw ? raw.replace(/\D/g, "") || null : null);

function pickFields(fieldData: FieldDatum[]) {
  const get = (...names: string[]) => {
    for (const n of names) {
      const hit = fieldData.find((f) => f.name?.toLowerCase() === n);
      const v = hit?.values?.[0]?.trim();
      if (v) return v;
    }
    return "";
  };

  const full = get("full_name", "full name", "name");
  const first = get("first_name", "first name");
  const last = get("last_name", "last name");
  const name = full || [first, last].filter(Boolean).join(" ").trim();

  const known = new Set([
    "full_name", "full name", "name", "first_name", "first name", "last_name", "last name",
    "phone_number", "phone number", "phone", "email",
  ]);
  const extras = fieldData
    .filter((f) => !known.has(f.name?.toLowerCase()))
    .map((f) => `${f.name}: ${(f.values || []).join(", ")}`);

  return {
    name,
    phone: get("phone_number", "phone number", "phone") || null,
    email: get("email") || null,
    extras,
  };
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Shu leadgen_id avval saqlanganmi? (Meta webhook'ni bir necha marta yuboradi)
 * Oddiy LIKE '%Lead ID: 123%' ishlatilsa, "123" ID'si allaqachon saqlangan
 * "1234" ID'siga mos kelib qoladi (substring xatosi) — shuning uchun qator
 * boshida va ID'dan keyin qator tugashi/yangi qatorni talab qiladigan regex
 * ishlatiladi.
 */
async function alreadySaved(leadgenId: string) {
  const pattern = `^Lead ID: ${escapeRegex(leadgenId)}($|\\n)`;
  const rows = await db
    .select({ id: schema.leads.id })
    .from(schema.leads)
    .where(sql`${schema.leads.notes} ~ ${pattern}`)
    .limit(1);
  return rows.length > 0;
}

async function resolveSellerId(): Promise<string | null> {
  const rows = await db
    .select({ userId: schema.userRoles.userId })
    .from(schema.userRoles)
    .where(inArray(schema.userRoles.role, ["admin", "rop"]))
    .limit(1);
  return rows[0]?.userId ?? null;
}

/**
 * Kanban lidlarni leads.stage (stages.id UUID) bo'yicha guruhlaydi. Schema'dagi
 * matnli standart qiymat ("yengi_mijoz") hech qaysi stage UUID'iga mos kelmaydi,
 * shuning uchun birinchi bosqich aniq belgilanadi — aks holda lid bazada bor,
 * lekin kanban ustunlarining birortasida ko'rinmaydi.
 */
async function resolveFirstStageId(): Promise<string | null> {
  const rows = await db
    .select({ id: schema.stages.id })
    .from(schema.stages)
    .orderBy(asc(schema.stages.displayOrder))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function handleLeadgen(value: { leadgen_id: string; page_id?: string; form_id?: string; ad_id?: string }) {
  const leadgenId = String(value.leadgen_id);

  if (await alreadySaved(leadgenId)) {
    console.log(`[facebook] ${leadgenId} allaqachon saqlangan, o'tkazib yuborildi`);
    return;
  }

  const sellerId = await resolveSellerId();
  if (!sellerId) {
    console.error("[facebook] admin/rop roli topilmadi — lid biriktirib bo'lmadi");
    return;
  }

  const pageToken = resolvePageToken(value.page_id);
  const stageId = await resolveFirstStageId();
  if (!stageId) {
    console.error("[facebook] birorta stage topilmadi — lid kanbanda ko'rinmasligi mumkin");
  }

  let name = "Facebook Lead";
  let phone: string | null = null;
  let email: string | null = null;
  const noteLines = [`Lead ID: ${leadgenId}`];
  if (value.form_id) noteLines.push(`Form ID: ${value.form_id}`);
  if (value.ad_id) noteLines.push(`Ad ID: ${value.ad_id}`);

  if (!pageToken) {
    noteLines.push("⚠️ Page access token sozlanmagan — ism/telefon olinmadi");
    console.error("[facebook] page token yo'q, lid bo'sh saqlanadi");
  } else {
    try {
      const details = await fetchLeadDetails(leadgenId, pageToken);
      const picked = pickFields(details.field_data || []);
      if (picked.name) name = picked.name;
      phone = picked.phone;
      email = picked.email;
      if (picked.extras.length) noteLines.push("", ...picked.extras);
    } catch (err) {
      noteLines.push(`⚠️ Graph API xatosi: ${(err as Error).message}`);
      console.error("[facebook] lid ma'lumotini olishda xato:", err);
    }
  }

  await db.insert(schema.leads).values({
    sellerId,
    customerName: name,
    customerPhone: phone,
    customerPhoneNorm: normalizePhone(phone),
    customerEmail: email,
    leadType: "Yangi lid",
    activity: "new",
    source: "Facebook",
    notes: noteLines.join("\n"),
    status: "new",
    ...(stageId ? { stage: stageId } : {}),
  });

  console.log(`[facebook] yangi lid saqlandi: ${leadgenId} (${name})`);
}

// ---------------------------------------------------------------- webhook

router.post("/webhook", (req, res) => {
  if (!verifySignature(req as never)) {
    console.error("[facebook] imzo (signature) noto'g'ri — so'rov rad etildi");
    return res.sendStatus(403);
  }

  // Meta javobni ~20 soniya kutadi, aks holda qayta yuboradi.
  // Shuning uchun darhol 200 qaytaramiz, qolganini fonda bajaramiz.
  res.json({ success: true });

  const body = req.body;
  if (body?.object !== "page") return;

  void (async () => {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === "leadgen" && change.value?.leadgen_id) {
          try {
            await handleLeadgen(change.value);
          } catch (err) {
            console.error("[facebook] leadgen xatosi:", err);
          }
        }
      }
    }
  })();
});

export default router;
