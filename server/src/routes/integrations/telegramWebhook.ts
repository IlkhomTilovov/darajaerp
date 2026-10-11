import { Router } from "express";
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
