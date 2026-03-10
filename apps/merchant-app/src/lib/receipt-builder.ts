/**
 * Builds receipt JSON commands per RECEIPT_FORMAT.md for Epson TM-T82 (80mm paper).
 * POST the returned object to http://<printer-ip>:9100/print
 */

interface ReceiptItem {
  description?: string;
  name?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total?: number;
}

interface ReceiptPayment {
  method: string;
  amount: number;
  tipAmount?: number;
}

interface ReceiptMerchant {
  name: string;
  phone?: string;
  abn?: string;
  address?: string;
  suburb?: string;
  state?: string;
  postalCode?: string;
}

interface ReceiptData {
  merchant: ReceiptMerchant;
  items: ReceiptItem[];
  subtotal: number;
  total: number;
  payments: ReceiptPayment[];
  changeAmount?: number;
  bookingNumber?: string;
  customerName?: string;
  date: Date;
}

type Command =
  | { type: "text"; text: string; align?: string; bold?: boolean; size?: string }
  | { type: "columns"; cols: Array<{ text: string; width: number; align?: string; truncate?: boolean }>; bold?: boolean }
  | { type: "separator"; style?: string }
  | { type: "feed"; lines?: number }
  | { type: "cut" };

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${day}/${month}/${year} ${h12}:${minutes} ${ampm}`;
}

function formatPaymentMethod(method: string): string {
  switch (method?.toUpperCase()) {
    case "CASH":
      return "CASH";
    case "CARD":
      return "CARD";
    case "EFTPOS":
      return "EFTPOS";
    default:
      return method?.toUpperCase() || "OTHER";
  }
}

export function buildReceiptCommands(data: ReceiptData): { commands: Command[] } {
  const commands: Command[] = [];

  // ---- HEADER ----
  commands.push({ type: "text", text: data.merchant.name, align: "center", bold: true, size: "large" });

  if (data.merchant.address) {
    const addressParts = [data.merchant.address];
    if (data.merchant.suburb) {
      addressParts.push(data.merchant.suburb);
    }
    if (data.merchant.state && data.merchant.postalCode) {
      addressParts.push(`${data.merchant.state} ${data.merchant.postalCode}`);
    }
    // Split into lines if needed (keep under 44 chars per line)
    const fullAddress = addressParts.join(", ");
    if (fullAddress.length <= 44) {
      commands.push({ type: "text", text: fullAddress, align: "center" });
    } else {
      commands.push({ type: "text", text: data.merchant.address, align: "center" });
      const cityLine = [data.merchant.suburb, data.merchant.state, data.merchant.postalCode]
        .filter(Boolean)
        .join(" ");
      if (cityLine) {
        commands.push({ type: "text", text: cityLine, align: "center" });
      }
    }
  }

  if (data.merchant.phone) {
    commands.push({ type: "text", text: data.merchant.phone, align: "center" });
  }
  if (data.merchant.abn) {
    commands.push({ type: "text", text: `ABN: ${data.merchant.abn}`, align: "center" });
  }

  commands.push({ type: "separator", style: "equals" });

  // ---- TITLE ----
  commands.push({ type: "text", text: "TAX INVOICE", align: "center", bold: true });

  // Date and booking number
  commands.push({ type: "text", text: formatDate(data.date), align: "center" });
  if (data.bookingNumber) {
    commands.push({ type: "text", text: `Ref: ${data.bookingNumber}`, align: "center" });
  }
  if (data.customerName) {
    commands.push({ type: "text", text: data.customerName, align: "center" });
  }

  commands.push({ type: "separator" });

  // ---- COLUMN HEADERS ----
  commands.push({
    type: "columns",
    cols: [
      { text: "Item", width: 22, align: "left" },
      { text: "Qty", width: 8, align: "right" },
      { text: "Price", width: 14, align: "right" },
    ],
    bold: true,
  });
  commands.push({ type: "separator" });

  // ---- LINE ITEMS ----
  for (const item of data.items) {
    const name = item.description || item.name || "Item";
    const lineTotal = item.total ?? (item.unitPrice * item.quantity - (item.discount || 0));
    commands.push({
      type: "columns",
      cols: [
        { text: name, width: 22, align: "left" },
        { text: item.quantity.toString(), width: 8, align: "right" },
        { text: formatCurrency(lineTotal), width: 14, align: "right" },
      ],
    });
  }

  // ---- TOTALS ----
  commands.push({ type: "separator" });

  // Subtotal (ex GST)
  const gstAmount = data.total / 11; // GST inclusive at 10%
  const subtotalExGst = data.total - gstAmount;

  commands.push({
    type: "columns",
    cols: [
      { text: "SUBTOTAL", width: 30, align: "left", truncate: false },
      { text: formatCurrency(subtotalExGst), width: 14, align: "right" },
    ],
  });

  commands.push({
    type: "columns",
    cols: [
      { text: "GST (10%)", width: 30, align: "left", truncate: false },
      { text: formatCurrency(gstAmount), width: 14, align: "right" },
    ],
  });

  commands.push({ type: "separator", style: "equals" });

  commands.push({
    type: "columns",
    cols: [
      { text: "TOTAL", width: 30, align: "left", truncate: false },
      { text: formatCurrency(data.total), width: 14, align: "right" },
    ],
    bold: true,
  });

  commands.push({ type: "separator", style: "equals" });

  // ---- PAYMENT ----
  commands.push({ type: "feed", lines: 1 });

  for (const payment of data.payments) {
    commands.push({
      type: "columns",
      cols: [
        { text: formatPaymentMethod(payment.method), width: 30, align: "left", truncate: false },
        { text: formatCurrency(payment.amount), width: 14, align: "right" },
      ],
    });
  }

  if (data.changeAmount && data.changeAmount > 0) {
    commands.push({
      type: "columns",
      cols: [
        { text: "CHANGE", width: 30, align: "left", truncate: false },
        { text: formatCurrency(data.changeAmount), width: 14, align: "right" },
      ],
    });
  }

  // ---- FOOTER ----
  commands.push({ type: "feed", lines: 1 });
  commands.push({ type: "text", text: "Thank you for visiting!", align: "center" });
  commands.push({ type: "feed", lines: 3 });
  commands.push({ type: "cut" });

  return { commands };
}

export async function printReceipt(printerIp: string, data: ReceiptData): Promise<void> {
  const payload = buildReceiptCommands(data);
  const url = `http://${printerIp}:9100/print`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Print failed: ${response.status} ${text}`);
  }

  const json = await response.json().catch(() => null);
  if (json && json.ok === false) {
    throw new Error(json.error || "Printer returned an error");
  }
}
