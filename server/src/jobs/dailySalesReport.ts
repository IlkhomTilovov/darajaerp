import cron from "node-cron";
import { generateSalesReport, getAdminTelegramRecipients } from "../lib/salesReport.js";

async function sendDailyReport() {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) return;

  const recipients = await getAdminTelegramRecipients();
  if (recipients.length === 0) return;

  const message = await generateSalesReport("daily");

  for (const admin of recipients) {
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: admin.telegramUserId, text: message, parse_mode: "HTML" }),
      });
    } catch (err) {
      console.error(`Failed to send daily report to ${admin.fullName}:`, err);
    }
  }
}

// Every day at 21:00 Tashkent time
export const scheduleDailySalesReport = () => {
  cron.schedule("0 21 * * *", sendDailyReport, { timezone: "Asia/Tashkent" });
};
