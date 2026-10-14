import { Router } from "express";
import { asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { generateSalesReport, getAdminTelegramRecipients } from "../../lib/salesReport.js";

const router = Router();

const tg = (botToken: string, method: string, body: unknown) =>
  fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const UZ_MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];

// ----------------------------------------------------- Telegram lead capture
//
// A separate bot/service ("Daraja Web sayt Lid") posts a structured message
// into a group whenever the Telegram Mini App order form is submitted. Our
// own bot (TELEGRAM_BOT_TOKEN, webhooked here) just needs to be a member of
// that same group with Group Privacy turned OFF in BotFather to receive
// those messages as regular `message` updates, same chat as anyone else's -
// we don't control or run the posting bot itself.

const normalizePhone = (raw?: string | null) => (raw ? raw.replace(/\D/g, "") || null : null);

const LEAD_MESSAGE_FIELDS: { key: "name" | "phone" | "company" | "employees" | "books"; label: string; pattern: RegExp }[] = [
  { key: "name", label: "Ism", pattern: /Ism:\s*(.+)/ },
  { key: "phone", label: "Telefon", pattern: /Telefon(?:\s*raqami)?:\s*(.+)/ },
  { key: "company", label: "Kompaniya", pattern: /Kompaniya(?:\s*nomi)?:\s*(.+)/ },
  { key: "employees", label: "Xodimlar soni", pattern: /Xodimlar\s*soni:\s*(.+)/ },
  { key: "books", label: "Kitoblar", pattern: /Kitoblar:\s*(.+)/ },
];

function parseLeadMessage(text: string) {
  if (!text || !text.includes("Yangi buyurtma")) return null;

  const fields: Record<string, string> = {};
  for (const line of text.split("\n")) {
    for (const field of LEAD_MESSAGE_FIELDS) {
      const match = line.match(field.pattern);
      if (match) fields[field.key] = match[1].trim();
    }
  }

  if (!fields.name || !fields.phone) return null;
  return fields;
}

async function resolveSellerId(): Promise<string | null> {
  const rows = await db
    .select({ userId: schema.userRoles.userId })
    .from(schema.userRoles)
    .where(inArray(schema.userRoles.role, ["admin", "rop"]))
    .limit(1);
  return rows[0]?.userId ?? null;
}

// Mirrors facebookWebhook.ts's resolveFirstStageId: leads.stage's text default
// ("yengi_mijoz") matches no real stage UUID, so the first kanban column is
// picked explicitly — otherwise the lead exists but shows in no column.
async function resolveFirstStageId(): Promise<string | null> {
  const rows = await db
    .select({ id: schema.stages.id })
    .from(schema.stages)
    .orderBy(asc(schema.stages.displayOrder))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function alreadySaved(telegramLeadId: string) {
  const rows = await db.select({ id: schema.leads.id }).from(schema.leads).where(eq(schema.leads.telegramLeadId, telegramLeadId)).limit(1);
  return rows.length > 0;
}

async function handleLeadMessage(telegramLeadId: string, fields: Record<string, string>) {
  if (await alreadySaved(telegramLeadId)) return;

  const sellerId = await resolveSellerId();
  if (!sellerId) {
    console.error("[telegram] admin/rop roli topilmadi — lid biriktirib bo'lmadi");
    return;
  }
  const stageId = await resolveFirstStageId();

  const formAnswers = [
    fields.company ? { question: "Kompaniya", answer: fields.company } : null,
    fields.employees ? { question: "Xodimlar soni", answer: fields.employees } : null,
    fields.books ? { question: "Kitoblar", answer: fields.books } : null,
  ].filter((a): a is { question: string; answer: string } => a !== null);

  await db.insert(schema.leads).values({
    sellerId,
    customerName: fields.name,
    customerPhone: fields.phone,
    customerPhoneNorm: normalizePhone(fields.phone),
    leadType: "Yangi lid",
    activity: "new",
    source: "Telegram",
    telegramLeadId,
    telegramFormAnswers: formAnswers.length ? formAnswers : null,
    status: "new",
    ...(stageId ? { stage: stageId } : {}),
  });

  console.log(`[telegram] yangi lid saqlandi: ${telegramLeadId} (${fields.name})`);
}

async function sendMainMenu(botToken: string, chatId: number, messageId?: number) {
  const menuText = `📊 <b>Savdo Hisoboti</b>\n\nQuyidagi variantlardan birini tanlang:`;
  const keyboard = {
    inline_keyboard: [
      [
        { text: "📊 Kunlik hisobot", callback_data: "daily_report" },
        { text: "📈 Oylik hisobot", callback_data: "monthly_report" },
      ],
      [{ text: "📅 Boshqa kunni tanlash", callback_data: "pick_date" }],
    ],
  };

  await tg(botToken, messageId ? "editMessageText" : "sendMessage", {
    chat_id: chatId,
    ...(messageId ? { message_id: messageId } : {}),
    text: menuText,
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

// Public webhook: called by Telegram, not by our own frontend, so no JWT auth here.
router.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) return res.status(200).json({ success: false, error: "TELEGRAM_BOT_TOKEN not configured" });

    const body = req.body;

    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data as string;

      await tg(BOT_TOKEN, "answerCallbackQuery", { callback_query_id: callbackQuery.id });

      let reportMessage = "";

      if (data === "daily_report") {
        reportMessage = await generateSalesReport("daily");
      } else if (data === "monthly_report") {
        reportMessage = await generateSalesReport("monthly");
      } else if (data.startsWith("custom_")) {
        reportMessage = await generateSalesReport("custom", data.replace("custom_", ""));
      } else if (data === "pick_date") {
        const now = new Date();
        const monthButtons = [];
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          monthButtons.push([{ text: `${UZ_MONTHS[date.getMonth()]} ${date.getFullYear()}`, callback_data: `month_${date.getFullYear()}_${date.getMonth()}` }]);
        }
        monthButtons.push([{ text: "⬅️ Orqaga", callback_data: "main_menu" }]);

        await tg(BOT_TOKEN, "editMessageText", {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id,
          text: "📅 <b>Oyni tanlang:</b>",
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: monthButtons },
        });
        return res.json({ success: true });
      } else if (data.startsWith("month_")) {
        const [yearStr, monthStr] = data.replace("month_", "").split("_");
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10);
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const today = new Date();

        const dayButtons: Array<Array<{ text: string; callback_data: string }>> = [];
        let row: Array<{ text: string; callback_data: string }> = [];
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, monthIndex, day);
          if (date > today) continue;
          const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          row.push({ text: String(day), callback_data: `custom_${dateStr}` });
          if (row.length === 7) {
            dayButtons.push(row);
            row = [];
          }
        }
        if (row.length > 0) dayButtons.push(row);
        dayButtons.push([{ text: "⬅️ Orqaga", callback_data: "pick_date" }]);

        await tg(BOT_TOKEN, "editMessageText", {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id,
          text: `📅 <b>${UZ_MONTHS[monthIndex]} ${year} - Kunni tanlang:</b>`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: dayButtons },
        });
        return res.json({ success: true });
      } else if (data === "main_menu") {
        await sendMainMenu(BOT_TOKEN, chatId, callbackQuery.message.message_id);
        return res.json({ success: true });
      }

      if (reportMessage) {
        await tg(BOT_TOKEN, "editMessageText", {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id,
          text: reportMessage,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "⬅️ Orqaga", callback_data: "main_menu" }]] },
        });
      }

      return res.json({ success: true });
    }

    // Lead capture: only messages posted by a bot (the lead-posting service,
    // never a human chatting in the same group) are ever considered, and only
    // in the configured group if one is set - keeps this from misfiring on
    // ordinary conversation in a group our bot happens to sit in.
    const leadsChatId = process.env.TELEGRAM_LEADS_CHAT_ID;
    if (body.message) {
      console.log(
        "[telegram] xabar qabul qilindi:",
        JSON.stringify({
          chatId: body.message.chat?.id,
          fromIsBot: body.message.from?.is_bot,
          fromUsername: body.message.from?.username,
          textPreview: (body.message.text || "").slice(0, 80),
        }),
      );
    }
    if (
      body.message?.from?.is_bot &&
      body.message?.text &&
      (!leadsChatId || String(body.message.chat?.id) === leadsChatId)
    ) {
      const fields = parseLeadMessage(body.message.text);
      console.log("[telegram] parseLeadMessage natijasi:", JSON.stringify(fields));
      if (fields) {
        const telegramLeadId = `${body.message.chat.id}:${body.message.message_id}`;
        try {
          await handleLeadMessage(telegramLeadId, fields);
        } catch (err) {
          console.error("[telegram] lid saqlashda xato:", err);
        }
        return res.json({ success: true });
      }
    }

    if (body.message?.text === "/start") {
      const chatId = body.message.chat.id;
      const userId = body.message.from?.id;
      const firstName = body.message.from?.first_name || "";

      let welcomeMessage = `👋 <b>Assalomu alaykum${firstName ? ", " + firstName : ""}!</b>\n\n`;
      welcomeMessage += `🆔 <b>Sizning Telegram ID:</b>\n<code>${userId}</code>\n\n`;
      welcomeMessage += `📋 Bu ID ni Admin panelda "Telegram ID" maydoniga kiriting, shunda sizga kunlik hisobotlar keladi.\n\n`;
      welcomeMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
      welcomeMessage += `Hisobot olish uchun /hisobot buyrug'ini yuboring.`;

      await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: welcomeMessage, parse_mode: "HTML" });
      return res.json({ success: true });
    }

    if (body.message?.text === "/hisobot") {
      await sendMainMenu(BOT_TOKEN, body.message.chat.id);
      return res.json({ success: true });
    }

    if (body.report_type) {
      const reportMessage = await generateSalesReport(body.report_type);
      const recipients = await getAdminTelegramRecipients();
      for (const admin of recipients) {
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: admin.telegramUserId,
          text: reportMessage,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📊 Kunlik", callback_data: "daily_report" },
                { text: "📈 Oylik", callback_data: "monthly_report" },
              ],
              [{ text: "📅 Boshqa kun", callback_data: "pick_date" }],
            ],
          },
        });
      }
      return res.json({ success: true });
    }

    res.json({ success: true, message: "No action taken" });
  }),
);

export default router;
