import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../db/index.js";

interface SellerStat {
  name: string;
  orderCount: number;
  completedOrders: number;
  orderTotal: number;
  completedTotal: number;
  soldLeads: number;
  leadTotal: number;
}

const formatNumber = (num: number) => num.toLocaleString("uz-UZ");

export async function generateSalesReport(reportType: "daily" | "monthly" | "custom", customDate?: string): Promise<string> {
  const now = new Date();
  const uzbekistanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tashkent" }));

  let startDate: Date;
  let endDate: Date;
  let periodName: string;

  if (reportType === "monthly") {
    startDate = new Date(uzbekistanTime.getFullYear(), uzbekistanTime.getMonth(), 1);
    endDate = new Date(uzbekistanTime.getFullYear(), uzbekistanTime.getMonth() + 1, 0, 23, 59, 59);
    periodName = `${uzbekistanTime.toLocaleString("uz-UZ", { month: "long", year: "numeric" })} oylik`;
  } else if (reportType === "custom" && customDate) {
    const selectedDate = new Date(customDate);
    startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
    periodName = selectedDate.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
  } else {
    startDate = new Date(uzbekistanTime.getFullYear(), uzbekistanTime.getMonth(), uzbekistanTime.getDate());
    endDate = new Date(uzbekistanTime.getFullYear(), uzbekistanTime.getMonth(), uzbekistanTime.getDate(), 23, 59, 59);
    periodName = uzbekistanTime.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const sellers = await db.select({ id: schema.profiles.id, fullName: schema.profiles.fullName }).from(schema.profiles);
  const allOrders = await db.select().from(schema.orders);
  const allLeads = await db.select().from(schema.leads);
  const allStages = await db.select().from(schema.stages);
  const stageNameById = new Map(allStages.map((s) => [s.id, s.name]));

  const periodOrders = allOrders.filter((o) => o.createdAt >= startDate && o.createdAt <= endDate);
  const periodLeads = allLeads.filter((l) => l.updatedAt >= startDate && l.updatedAt <= endDate);

  let totalOrderAmount = 0;
  let totalCompletedSales = 0;
  let totalOrderCount = 0;
  let completedOrderCount = 0;
  let pendingOrderCount = 0;
  let cancelledOrderCount = 0;

  const sellerStats: Record<string, SellerStat> = {};
  for (const seller of sellers) {
    sellerStats[seller.id] = {
      name: seller.fullName,
      orderCount: 0,
      completedOrders: 0,
      orderTotal: 0,
      completedTotal: 0,
      soldLeads: 0,
      leadTotal: 0,
    };
  }

  for (const order of periodOrders) {
    totalOrderCount++;
    const amount = Number(order.totalAmount || 0);

    if (order.status !== "cancelled") {
      totalOrderAmount += amount;
      if (sellerStats[order.sellerId]) sellerStats[order.sellerId].orderTotal += amount;
    }

    if (order.status === "delivered" || order.status === "completed") {
      completedOrderCount++;
      totalCompletedSales += amount;
      if (sellerStats[order.sellerId]) {
        sellerStats[order.sellerId].completedOrders += 1;
        sellerStats[order.sellerId].completedTotal += amount;
      }
    } else if (order.status === "pending") {
      pendingOrderCount++;
    } else if (order.status === "cancelled") {
      cancelledOrderCount++;
    }

    if (sellerStats[order.sellerId]) sellerStats[order.sellerId].orderCount += 1;
  }

  for (const lead of periodLeads) {
    const stageName = lead.stage ? stageNameById.get(lead.stage) : undefined;
    if (stageName === "Sotildi" && lead.price) {
      const price = Number(lead.price || 0);
      totalOrderAmount += price;
      totalCompletedSales += price;
      if (sellerStats[lead.sellerId]) {
        sellerStats[lead.sellerId].soldLeads += 1;
        sellerStats[lead.sellerId].leadTotal += price;
      }
    }
  }

  let message = `📊 <b>${reportType === "monthly" ? "OYLIK" : "KUNLIK"} SAVDO HISOBOTI</b>\n`;
  message += `📅 ${periodName}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `💰 <b>Jami savdo:</b> ${formatNumber(totalOrderAmount)} so'm\n`;
  message += `✅ <b>Bajarilgan savdo:</b> ${formatNumber(totalCompletedSales)} so'm\n`;
  message += `📦 <b>Jami buyurtmalar:</b> ${totalOrderCount} ta\n`;
  message += `   ✅ Bajarilgan: ${completedOrderCount} ta\n`;
  message += `   ⏳ Jarayonda: ${pendingOrderCount} ta\n`;
  message += `   ❌ Bekor: ${cancelledOrderCount} ta\n\n`;
  message += `👥 <b>Hodimlar bo'yicha:</b>\n\n`;

  const sortedSellers = Object.values(sellerStats)
    .filter((s) => s.orderTotal > 0 || s.leadTotal > 0 || s.orderCount > 0)
    .sort((a, b) => b.orderTotal + b.leadTotal - (a.orderTotal + a.leadTotal));

  if (sortedSellers.length === 0) {
    message += `<i>Bu davr uchun faoliyat yo'q</i>\n`;
  } else {
    sortedSellers.forEach((seller, index) => {
      const totalSales = seller.orderTotal + seller.leadTotal;
      message += `${index + 1}. <b>${seller.name}</b>\n`;
      message += `   📦 Buyurtmalar: ${seller.orderCount} ta (${seller.completedOrders} bajarilgan)\n`;
      if (seller.soldLeads > 0) {
        message += `   🎯 Sotilgan lidlar: ${seller.soldLeads} ta\n`;
      }
      message += `   💵 Jami savdo: ${formatNumber(totalSales)} so'm\n\n`;
    });
  }

  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🕐 Hisobot vaqti: ${uzbekistanTime.toLocaleString("uz-UZ")}`;

  return message;
}

export async function getAdminTelegramRecipients() {
  const admins = await db.select({ userId: schema.userRoles.userId }).from(schema.userRoles).where(eq(schema.userRoles.role, "admin"));
  if (admins.length === 0) return [];

  return db
    .select({ id: schema.profiles.id, fullName: schema.profiles.fullName, telegramUserId: schema.profiles.telegramUserId })
    .from(schema.profiles)
    .where(inArray(schema.profiles.id, admins.map((a) => a.userId)))
    .then((rows) => rows.filter((r): r is typeof r & { telegramUserId: string } => !!r.telegramUserId));
}
