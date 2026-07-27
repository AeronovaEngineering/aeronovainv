// Formatting helpers for TND currency, dates, and number-to-french-words.

export function formatTND(value: number | string | null | undefined, opts: { symbol?: boolean } = {}) {
  const n = Number(value ?? 0);
  const formatted = n.toLocaleString("fr-FR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
  return opts.symbol === false ? formatted : `${formatted} DT`;
}

export function formatShortTND(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT`;
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(date: string | Date | null | undefined) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function formatDocNumber(number: number, year: number) {
  return `${number}-${year}`;
}

// ---------- Number to French words (Tunisia: dinars + millimes) ----------

const UNITS = ["zéro","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"];
const TENS = ["","","vingt","trente","quarante","cinquante","soixante","soixante","quatre-vingt","quatre-vingt"];

function belowThousand(n: number): string {
  if (n === 0) return "";
  if (n < 20) return UNITS[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 || t === 9) {
      const base = TENS[t];
      const rest = 10 + u;
      return u === 1 && t === 7 ? `${base} et ${UNITS[rest]}` : `${base}-${UNITS[rest]}`;
    }
    if (u === 0) return TENS[t] + (t === 8 ? "s" : "");
    if (u === 1 && t !== 8) return `${TENS[t]} et un`;
    return `${TENS[t]}-${UNITS[u]}`;
  }
  const h = Math.floor(n / 100);
  const r = n % 100;
  const hundredPart = h === 1 ? "cent" : `${UNITS[h]} cent${r === 0 ? "s" : ""}`;
  return r === 0 ? hundredPart : `${hundredPart} ${belowThousand(r)}`;
}

function integerToWords(n: number): string {
  if (n === 0) return "zéro";
  if (n < 0) return `moins ${integerToWords(-n)}`;
  const parts: string[] = [];
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (billions) parts.push(`${billions === 1 ? "un" : integerToWords(billions)} milliard${billions > 1 ? "s" : ""}`);
  if (millions) parts.push(`${millions === 1 ? "un" : integerToWords(millions)} million${millions > 1 ? "s" : ""}`);
  if (thousands) parts.push(thousands === 1 ? "mille" : `${belowThousand(thousands)} mille`);
  if (rest) parts.push(belowThousand(rest));
  return parts.join(" ").trim();
}

/** Convert amount in dinars.millimes to French words: e.g. 500.800 -> "cinq cents dinars et huit cents millimes" */
export function amountInWordsFR(amount: number): string {
  const rounded = Math.round(amount * 1000);
  const dinars = Math.floor(rounded / 1000);
  const millimes = rounded % 1000;
  const dinarsWords = `${integerToWords(dinars)} dinar${dinars > 1 ? "s" : ""}`;
  if (millimes === 0) return dinarsWords.toUpperCase();
  const millimesWords = `${integerToWords(millimes)} millime${millimes > 1 ? "s" : ""}`;
  return `${dinarsWords} et ${millimesWords}`.toUpperCase();
}
