import { Router } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";

const router = Router();
router.use(requireAuth);

interface OrderData {
  order_id?: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  customer_phone2?: string;
  region?: string;
  district?: string;
  products: Array<{ product_name: string; quantity: number; price: number }>;
  total_amount: number;
  advance_payment?: number;
  notes?: string;
  seller_name: string;
  status?: string;
}

const normalize = (value: string | undefined | null) => (value ?? "").trim();

const sendTelegramMessage = async (args: {
  botToken: string;
  chatId: string;
  text: string;
  messageThreadId?: number;
}) => {
  const payload: Record<string, unknown> = {
    chat_id: args.chatId,
    text: args.text,
    parse_mode: "HTML",
  };
  if (typeof args.messageThreadId === "number" && !Number.isNaN(args.messageThreadId)) {
    payload.message_thread_id = args.messageThreadId;
  }

  const res = await fetch(`https://api.telegram.org/bot${args.botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { ok: boolean; result?: { message_id: number } };
  return { res, data };
};

const formatMessage = (order: OrderData, isEdit: boolean) => {
  const productsList = order.products.map((p, i) => `${i + 1}. ${p.product_name}`).join("\n");
  const remainingAmount = order.total_amount - (order.advance_payment || 0);
  const now = new Date();
  const orderDateTime = now.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  });
  const statusEmoji = order.status === "delivered" ? "✅" : order.status === "cancelled" ? "❌" : "🔄";
  const statusText = order.status === "delivered" ? "Tugallandi" : order.status === "cancelled" ? "Bekor qilindi" : "Jarayonda";
  const prefix = isEdit ? `✏️ <b>Tahrirlangan buyurtma #${order.order_number}</b>` : `🆕 <b>Yangi buyurtma #${order.order_number}</b>`;

  return `
${prefix}

👤 <b>Mijoz:</b> ${order.customer_name}
📞 <b>Telefon:</b> ${order.customer_phone}${order.customer_phone2 ? `\n📞 <b>Telefon 2:</b> ${order.customer_phone2}` : ""}
📍 <b>Manzil:</b> ${order.region || "-"}, ${order.district || "-"}

📦 <b>Mahsulotlar:</b>
${productsList}

💰 <b>Jami summa:</b> ${order.total_amount.toLocaleString()} so'm
💵 <b>Oldindan to'lov:</b> ${(order.advance_payment || 0).toLocaleString()} so'm
💳 <b>Qoldiq:</b> ${remainingAmount.toLocaleString()} so'm

${statusEmoji} <b>Status:</b> ${statusText}
👨‍💼 <b>Sotuvchi:</b> ${order.seller_name}
${order.notes ? `\n📝 <b>Izoh:</b> ${order.notes}` : ""}

📅 <b>${isEdit ? "Yangilangan" : "Buyurtma"} sanasi:</b> ${orderDateTime}
  `.trim();
};

const formatAdminSalesMessage = (order: OrderData, dailySales: { total: number; bySeller: Record<string, number> }) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString("uz-UZ", { timeZone: "Asia/Tashkent" });
  const sellersList = Object.entries(dailySales.bySeller)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => `   • ${name}: ${amount.toLocaleString()} so'm`)
    .join("\n");

  return `
🔔 <b>Yangi zakaz!</b>

💰 <b>Summa:</b> ${order.total_amount.toLocaleString()} so'm
👨‍💼 <b>Sotuvchi:</b> ${order.seller_name}
👤 <b>Mijoz:</b> ${order.customer_name}

━━━━━━━━━━━━━━━━━━━━
📊 <b>Bugungi (${dateStr}) savdo:</b>

💵 <b>Jami:</b> ${dailySales.total.toLocaleString()} so'm

👥 <b>Hodimlar bo'yicha:</b>
${sellersList || "   Hali savdo yo'q"}
━━━━━━━━━━━━━━━━━━━━
  `.trim();
};

const formatStatusChangeMessage = (orderNumber: number, customerName: string, newStatus: string) => {
  const statusEmoji = newStatus === "delivered" ? "✅" : "❌";
  const statusText = newStatus === "delivered" ? "Tasdiqlandi" : "Bekor qilindi";
  const now = new Date();
  const dateTime = now.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  });

  return `
${statusEmoji} <b>Zakaz statusi o'zgardi!</b>

📋 <b>Zakaz raqami:</b> #${orderNumber}
👤 <b>Mijoz:</b> ${customerName}
${statusEmoji} <b>Yangi status:</b> ${statusText}

📅 <b>O'zgargan vaqt:</b> ${dateTime}
  `.trim();
};

router.post(
  "/order",
  asyncHandler(async (req, res) => {
    const { order, action = "create", statusChange } = req.body as {
      order?: OrderData;
      action?: "create" | "edit" | "status_change";
      statusChange?: { order_number: number; customer_name: string; new_status: string; seller_id: string; seller_name: string };
    };

    const BOT_TOKEN = normalize(process.env.TELEGRAM_BOT_TOKEN);
    const CHAT_ID = normalize(process.env.TELEGRAM_CHAT_ID);
    const TOPIC_ID = normalize(process.env.TELEGRAM_TOPIC_ID);

    if (!BOT_TOKEN || !CHAT_ID || !TOPIC_ID) {
      return res.status(200).json({ success: false, error: "Telegram credentials not configured" });
    }

    if (action === "status_change" && statusChange) {
      const [sellerProfile] = await db
        .select({ telegramUserId: schema.profiles.telegramUserId, fullName: schema.profiles.fullName })
        .from(schema.profiles)
        .where(eq(schema.profiles.id, statusChange.seller_id))
        .limit(1);

      if (sellerProfile?.telegramUserId) {
        const statusMessage = formatStatusChangeMessage(statusChange.order_number, statusChange.customer_name, statusChange.new_status);
        const { data } = await sendTelegramMessage({ botToken: BOT_TOKEN, chatId: String(sellerProfile.telegramUserId).trim(), text: statusMessage });
        return res.json({ success: true, data });
      }
      return res.json({ success: true, message: "Seller has no Telegram ID" });
    }

    if (!order) {
      return res.status(400).json({ success: false, error: "Order data is required" });
    }

    const message = formatMessage(order, action === "edit");
    const { res: telegramResponse, data: telegramData } = await sendTelegramMessage({
      botToken: BOT_TOKEN,
      chatId: CHAT_ID,
      messageThreadId: parseInt(TOPIC_ID, 10),
      text: message,
    });

    if (!telegramResponse.ok || !telegramData.ok) {
      return res.status(500).json({ success: false, error: `Telegram API error: ${JSON.stringify(telegramData)}` });
    }

    const telegramMessageId = telegramData.result?.message_id;

    if (order.order_id && telegramMessageId) {
      await db.update(schema.orders).set({ telegramMessageId }).where(eq(schema.orders.id, order.order_id));
    }

    if (action === "create") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const dailySales = { total: 0, bySeller: {} as Record<string, number> };
      const salesRows = await db.select().from(schema.orders);
      const todaySales = salesRows.filter((o) => o.status !== "cancelled" && o.createdAt && o.createdAt >= startOfDay);
      const sellerProfiles = todaySales.length
        ? await db
            .select({ id: schema.profiles.id, fullName: schema.profiles.fullName })
            .from(schema.profiles)
            .where(inArray(schema.profiles.id, [...new Set(todaySales.map((o) => o.sellerId))]))
        : [];
      const nameById = new Map(sellerProfiles.map((p) => [p.id, p.fullName]));
      for (const o of todaySales) {
        const sellerName = nameById.get(o.sellerId) || "Noma'lum";
        const amount = Number(o.totalAmount) || 0;
        dailySales.total += amount;
        dailySales.bySeller[sellerName] = (dailySales.bySeller[sellerName] || 0) + amount;
      }

      const adminRoles = await db.select({ userId: schema.userRoles.userId }).from(schema.userRoles).where(eq(schema.userRoles.role, "admin"));
      if (adminRoles.length > 0) {
        const adminProfiles = await db
          .select()
          .from(schema.profiles)
          .where(inArray(schema.profiles.id, adminRoles.map((a) => a.userId)));

        const adminMessage = formatAdminSalesMessage(order, dailySales);
        for (const admin of adminProfiles) {
          if (!admin.telegramUserId) continue;
          try {
            await sendTelegramMessage({ botToken: BOT_TOKEN, chatId: String(admin.telegramUserId).trim(), text: adminMessage });
          } catch (err) {
            console.error(`Error sending to admin ${admin.fullName}:`, err);
          }
        }
      }
    }

    res.json({ success: true, data: telegramData, message_id: telegramMessageId });
  }),
);

router.post(
  "/task-reminder",
  asyncHandler(async (req, res) => {
    const { task } = req.body as {
      task: { task_id: string; task_title: string; task_description?: string; due_date: string; seller_id: string; customer_name?: string };
    };

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) {
      return res.status(200).json({ success: false, error: "TELEGRAM_BOT_TOKEN not configured" });
    }

    const [profile] = await db
      .select({ fullName: schema.profiles.fullName, telegramUserId: schema.profiles.telegramUserId })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, task.seller_id))
      .limit(1);

    if (!profile?.telegramUserId) {
      return res.json({ success: false, error: "Seller has no telegram_user_id configured" });
    }

    const dueDate = new Date(task.due_date).toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tashkent",
    });

    const message = `
⏰ <b>Vazifa eslatmasi!</b>

👤 <b>Xodim:</b> ${profile.fullName}
📋 <b>Vazifa:</b> ${task.task_title}
${task.customer_name ? `👥 <b>Mijoz:</b> ${task.customer_name}` : ""}
${task.task_description ? `📝 <b>Tavsif:</b> ${task.task_description}` : ""}
📅 <b>Muddat:</b> ${dueDate}

⚠️ Mijoz bilan bog'lanishingiz kerak!
    `.trim();

    const { data } = await sendTelegramMessage({ botToken: BOT_TOKEN, chatId: String(profile.telegramUserId), text: message });
    res.json({ success: true, data });
  }),
);

export default router;
