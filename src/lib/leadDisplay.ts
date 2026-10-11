export interface LeadSourceStyle {
  label: string;
  badgeClassName: string;
  dotClassName: string;
}

const DEFAULT_SOURCE_STYLE: LeadSourceStyle = {
  label: "Boshqa",
  badgeClassName: "bg-slate-100 text-slate-600 border-slate-200",
  dotClassName: "bg-slate-400",
};

const LEAD_SOURCE_STYLES: Record<string, LeadSourceStyle> = {
  Instagram: { label: "Instagram", badgeClassName: "bg-pink-50 text-pink-600 border-pink-200", dotClassName: "bg-pink-500" },
  Facebook: { label: "Facebook", badgeClassName: "bg-blue-50 text-blue-600 border-blue-200", dotClassName: "bg-blue-500" },
  Sayt: { label: "Sayt", badgeClassName: "bg-teal-50 text-teal-600 border-teal-200", dotClassName: "bg-teal-500" },
  Telegram: { label: "Telegram", badgeClassName: "bg-sky-50 text-sky-600 border-sky-200", dotClassName: "bg-sky-500" },
  Forma: { label: "Forma", badgeClassName: "bg-violet-50 text-violet-600 border-violet-200", dotClassName: "bg-violet-500" },
};

export const getLeadSourceStyle = (source?: string | null): LeadSourceStyle => {
  if (!source) return DEFAULT_SOURCE_STYLE;
  return LEAD_SOURCE_STYLES[source] ?? { ...DEFAULT_SOURCE_STYLE, label: source };
};

export const LEAD_SOURCE_OPTIONS = Object.keys(LEAD_SOURCE_STYLES);

export interface LeadTypeStyle {
  badgeClassName: string;
}

const LEAD_TYPE_STYLES: Record<string, LeadTypeStyle> = {
  "Yangi lid": { badgeClassName: "bg-orange-100 text-orange-700 border-orange-200" },
  Baza: { badgeClassName: "bg-slate-200 text-slate-700 border-slate-300" },
};

export const getLeadTypeStyle = (leadType?: string | null): LeadTypeStyle =>
  LEAD_TYPE_STYLES[leadType ?? ""] ?? { badgeClassName: "bg-muted text-muted-foreground border-transparent" };

export const getInitials = (name?: string | null) =>
  (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const AVATAR_PALETTE = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

export const getAvatarColor = (seed?: string | null) => {
  if (!seed) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[hash];
};
