# Data Guide — how to organize email data for Email Brain

This visual is driven entirely by one file: **`data.js`**. To plug in a real
inbox, regenerate that file. Nothing else needs to change.

This guide is written so a coding agent (or a person) can produce a valid
`data.js` from a raw mailbox.

---

## 1. The format

`data.js` assigns a single global object:

```js
window.EMAIL_BRAIN = {
  categories: {
    work:    { label: "Work",    color: "#63b3ff" },
    finance: { label: "Finance", color: "#4ade80" }
    // ...
  },
  emails: [
    { sender: "GitHub", subject: "PR #42 merged", category: "work" },
    { sender: "Chase",  subject: "Statement ready", category: "finance" }
    // ...
  ]
};
```

### `categories` (object, optional)

A map of `key → { label, color }`.

| Field   | Type   | Required | Notes                                            |
| ------- | ------ | -------- | ------------------------------------------------ |
| key     | string | yes      | Short id used by `email.category` (e.g. `work`). |
| `label` | string | yes      | Display name shown on the hub and in the legend. |
| `color` | string | rec.     | Hex color `#rrggbb`. Auto-assigned if omitted.   |

If you omit `categories` entirely, categories are auto-generated from whatever
`category` values appear on the emails, each getting a fallback color. Providing
them is recommended so you control labels and colors.

### `emails` (array, required)

Each item is one email node.

| Field      | Type   | Required | Notes                                                       |
| ---------- | ------ | -------- | ----------------------------------------------------------- |
| `sender`   | string | yes      | Display name. Emails with the **same sender are linked**.   |
| `subject`  | string | yes      | Shown on hover/selection and in the detail card.            |
| `category` | string | yes      | Must match a key in `categories` (auto-created if missing). |

> `cat` is accepted as an alias for `category`, for convenience.

---

## 2. How the graph is built from the data

Understanding this helps you pick good categories/senders:

1. **Each category becomes a large "hub" node**, arranged in a ring.
2. **Each email becomes a small node**, pulled toward its category hub — so a
   category with many emails forms a dense cluster.
3. **Emails from the same `sender` are chained together** with extra links, so
   e.g. all `GitHub` emails visibly stick together inside the Work cluster.
4. **Clicking** a node lights up everything it's connected to (its hub + same-
   sender siblings) and lists them in the detail card.

The two levers you control through data:

- **`category`** decides which cluster an email lives in (the big structure).
- **`sender`** decides the fine-grained sub-clustering and link density.

---

## 3. Turning a raw mailbox into `data.js`

A recommended pipeline for an agent:

### Step 1 — Pull the fields you need

For each message, extract:

- **From name** → `sender` (prefer the display name, e.g. `GitHub`, not
  `notifications@github.com`). Normalize so the same source always yields the
  same string, or same-sender linking won't work.
- **Subject** → `subject` (trim; a sentence or less reads best).
- Signals for categorization: from-domain, list headers
  (`List-Unsubscribe`, `Precedence: bulk`), folder/label, etc.

### Step 2 — Assign a category

Map each email to one category key. A simple, effective rule set:

| Category         | Heuristic                                                            |
| ---------------- | ------------------------------------------------------------------- |
| `important`      | Known personal contacts; direct human senders; VIP list.           |
| `work`           | Work domain; dev tools (GitHub, Figma, Slack, Notion); calendar.   |
| `finance`        | Banks, payments, invoices, tax (Chase, Stripe, PayPal).            |
| `newsletters`    | Has `List-Unsubscribe` / bulk headers; Substack, TLDR, etc.       |
| `shopping`       | Order/shipping/receipt senders (Amazon, Uber, DoorDash, Apple).   |
| `social`         | Social networks (LinkedIn, X, Instagram, Reddit, Discord).        |

Use whatever categories fit the story you want to tell — the visual adapts to
any set of keys. **6–8 categories** looks best; more than ~10 gets crowded.

### Step 3 — Choose colors (optional)

Give each category a distinct hex color. Colors that pop on the dark background
(the built-in palette): `#63b3ff` `#ffd166` `#4ade80` `#a78bfa` `#f472b6`
`#22d3ee` `#fb923c` `#e879f9`.

### Step 4 — Write `data.js`

Emit the object exactly as shown in section 1, assigned to
`window.EMAIL_BRAIN`. Keep it as plain data — no logic.

---

## 4. Sizing recommendations

| Emails      | Result                                                    |
| ----------- | -------------------------------------------------------- |
| 30–80       | Ideal — clean, readable, great for marketing clips.      |
| 80–200      | Works; zoom in to read. Denser, more "brain"-like.       |
| 200+        | Consider sampling the most representative messages.      |

Aim for a few senders with **multiple** emails each (2–5) — those repeated
senders create the connective tissue that makes it look like a brain rather
than a starburst.

---

## 5. Minimal example

```js
window.EMAIL_BRAIN = {
  categories: {
    work:    { label: "Work",    color: "#63b3ff" },
    finance: { label: "Finance", color: "#4ade80" }
  },
  emails: [
    { sender: "GitHub", subject: "PR #42 merged",        category: "work" },
    { sender: "GitHub", subject: "Build failed on main", category: "work" },
    { sender: "Slack",  subject: "3 unread threads",     category: "work" },
    { sender: "Chase",  subject: "Statement ready",      category: "finance" },
    { sender: "Chase",  subject: "Payment posted",       category: "finance" }
  ]
};
```

That renders two hubs (Work, Finance), five email nodes, with the two GitHub and
two Chase emails linked to their same-sender siblings.

---

## 6. JSON alternative (if you prefer)

If your agent would rather emit pure JSON than JS, write a `data.json` with the
same shape (`{ "categories": {...}, "emails": [...] }`) and change the last two
lines of `index.html` from loading `data.js` to a tiny loader:

```html
<script>
  fetch('data.json')
    .then((r) => r.json())
    .then((d) => { window.EMAIL_BRAIN = d; })
    .then(() => import('./graph.js'));
</script>
```

Note: `fetch` needs the page served over http (e.g. `python3 -m http.server`),
not opened via `file://`. The default `data.js` approach works either way, so
it's the recommended path unless you specifically need JSON.
