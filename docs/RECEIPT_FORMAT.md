# POS Print — Receipt Formatting Guide

API endpoint: `POST http://<device-ip>:9100/print`

Send a JSON body with a `"commands"` array. Each element is a command object with a `"type"` field.

---

## Hardware constraints

| Property         | Value |
|------------------|-------|
| Printer          | Epson TM-T82 (80 mm paper) |
| Paper width      | 48 characters |
| Margin           | 2 chars each side (auto-applied by renderer) |
| **Content width**| **44 characters** |
| Font             | Monospace, fixed-pitch |
| Large text       | 2x width and height — each char takes 2 columns |
| QR codes         | Not supported on TM-T82 (falls back to URL text) |

**Key rule:** Column widths in a `columns` command must sum to **44** (the content width). The renderer adds the margin automatically — you never pad for margins in your payload.

---

## Command types

### text

Prints a single line of text.

```json
{ "type": "text", "text": "Hello", "align": "center", "bold": true, "size": "large" }
```

| Field   | Type    | Default    | Values                        |
|---------|---------|------------|-------------------------------|
| text    | string  | (required) | The text to print             |
| align   | string  | `"left"`   | `"left"`, `"center"`, `"right"` |
| bold    | boolean | `false`    | Emphasized text               |
| size    | string  | `"normal"` | `"small"`, `"normal"`, `"large"` |

Notes:
- `"small"` renders identically to `"normal"` on TM-T82 (hardware minimum is 1x1).
- `"large"` doubles character width and height. A 10-char string occupies 20 columns. Use only for short centered text (store name, totals). **Never use large inside columns** — it will break alignment.
- `"center"` uses the printer's native alignment and centres across the full 48-char paper width.

### columns

Prints a single line split into fixed-width columns.

```json
{
  "type": "columns",
  "cols": [
    { "text": "Flat White",  "width": 22, "align": "left" },
    { "text": "2",           "width": 8,  "align": "right" },
    { "text": "$10.00",      "width": 14, "align": "right" }
  ],
  "bold": true
}
```

**Top-level fields:**

| Field | Type    | Default    | Values                          |
|-------|---------|------------|---------------------------------|
| cols  | array   | (required) | Array of column objects          |
| bold  | boolean | `false`    | Applies to entire row            |
| size  | string  | `"normal"` | `"small"`, `"normal"`, `"large"` |

**Column object fields:**

| Field    | Type    | Default  | Values                            |
|----------|---------|----------|-----------------------------------|
| text     | string  | (required)| Column content                   |
| width    | int     | (required)| Width in characters (must be > 0) |
| align    | string  | `"left"` | `"left"`, `"center"`, `"right"`   |
| truncate | boolean | `true`   | If true, clips text to fit width. If false, allows overflow |

**Rules:**
1. Column widths must sum to exactly **44**.
2. Never use `"size": "large"` on a columns row — it doubles character width and overflows the paper.
3. Use `"truncate": false` on columns where overflow is acceptable (e.g. label columns in totals area where the adjacent column won't be clipped).

### separator

Prints a full-width line of dashes or equals signs.

```json
{ "type": "separator", "style": "equals" }
```

| Field | Type   | Default    | Values                  |
|-------|--------|------------|-------------------------|
| style | string | `"dashes"` | `"dashes"`, `"equals"`  |

Use `"equals"` for major section breaks (before/after totals). Use `"dashes"` for minor breaks.

### feed

Advances the paper by N blank lines.

```json
{ "type": "feed", "lines": 2 }
```

| Field | Type | Default | Notes               |
|-------|------|---------|---------------------|
| lines | int  | `1`     | Minimum value is 1  |

### qr

Prints a QR code (or falls back to printing the URL as text if unsupported).

```json
{ "type": "qr", "data": "https://example.com/receipt/123", "align": "center", "size": 4 }
```

| Field | Type   | Default    | Values                        |
|-------|--------|------------|-------------------------------|
| data  | string | (required) | The data to encode            |
| align | string | `"center"` | `"left"`, `"center"`, `"right"` |
| size  | int    | `4`        | Module size in dots (1–8)     |

### cut

Triggers the auto-cutter. No fields.

```json
{ "type": "cut" }
```

Always place this as the last command.

---

## Recommended column layouts

All widths sum to 44 (the content width after margins).

### 3-column itemised (Item / Qty / Price)

```
| Item (22, left) | Qty (8, right) | Price (14, right) |
```

Good for line items where item names can be up to ~20 characters.

### 2-column summary (Label / Amount)

```
| Label (30, left) | Amount (14, right) |
```

Good for subtotals, tax, total, cash, change.

---

## Receipt structure template

A well-formatted receipt follows this order:

```jsonc
{ "commands": [
  // ---- HEADER ----
  { "type": "text", "text": "<Store Name>",    "align": "center", "bold": true, "size": "large" },
  { "type": "text", "text": "<Address>",       "align": "center" },
  { "type": "text", "text": "<Phone / ABN>",   "align": "center" },
  { "type": "separator", "style": "equals" },

  // ---- TITLE ----
  { "type": "text", "text": "TAX INVOICE",     "align": "center", "bold": true },
  { "type": "separator" },

  // ---- COLUMN HEADERS ----
  { "type": "columns", "cols": [
    { "text": "Item",  "width": 22, "align": "left" },
    { "text": "Qty",   "width": 8,  "align": "right" },
    { "text": "Price", "width": 14, "align": "right" }
  ], "bold": true },
  { "type": "separator" },

  // ---- LINE ITEMS ----
  // Repeat for each item:
  { "type": "columns", "cols": [
    { "text": "<name>",   "width": 22, "align": "left" },
    { "text": "<qty>",    "width": 8,  "align": "right" },
    { "text": "<price>",  "width": 14, "align": "right" }
  ]},

  // ---- TOTALS ----
  { "type": "separator" },
  { "type": "columns", "cols": [
    { "text": "SUBTOTAL", "width": 30, "align": "left", "truncate": false },
    { "text": "<amount>", "width": 14, "align": "right" }
  ]},
  { "type": "columns", "cols": [
    { "text": "GST (10%)", "width": 30, "align": "left", "truncate": false },
    { "text": "<amount>",  "width": 14, "align": "right" }
  ]},
  { "type": "separator", "style": "equals" },
  { "type": "columns", "cols": [
    { "text": "TOTAL",    "width": 30, "align": "left", "truncate": false },
    { "text": "<amount>", "width": 14, "align": "right" }
  ], "bold": true },
  { "type": "separator", "style": "equals" },

  // ---- PAYMENT ----
  { "type": "feed", "lines": 1 },
  { "type": "columns", "cols": [
    { "text": "<method>", "width": 30, "align": "left", "truncate": false },
    { "text": "<amount>", "width": 14, "align": "right" }
  ]},
  { "type": "columns", "cols": [
    { "text": "CHANGE",   "width": 30, "align": "left", "truncate": false },
    { "text": "<amount>", "width": 14, "align": "right" }
  ]},

  // ---- FOOTER ----
  { "type": "feed", "lines": 1 },
  { "type": "text", "text": "Thank you for visiting!", "align": "center" },
  { "type": "feed", "lines": 3 },
  { "type": "cut" }
]}
```

---

## Common pitfalls

| Mistake | Result | Fix |
|---------|--------|-----|
| Column widths don't sum to 44 | Text wraps or leaves a gap on the right | Adjust widths to sum to exactly 44 |
| Using `"size": "large"` on a columns row | Columns overflow — each char is now 2 wide | Only use large on centered `text` commands |
| Forgetting `"cut"` at the end | Paper doesn't cut, next receipt runs on | Always end with `{ "type": "cut" }` |
| Very long item name in 22-wide column | Name is silently clipped to 22 chars | This is by design. Set `"truncate": false` to allow overflow if needed |
| Price string wider than 14 chars | Clips or misaligns | Format prices with max 2 decimal places and keep under 14 chars (e.g. `$99,999.99` = 10 chars, fine) |
| No `"type"` field on a command | Parse error | Every command must have a `"type"` |
| Payload exceeds 64 KB | HTTP 413 rejected | Keep receipts under 64 KB (practical limit ~500 line items) |
