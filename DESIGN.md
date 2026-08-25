# DESIGN.md (v2 — Glassmorphism / Spatial Professional)
## SecureDocs — UI/UX Design System

**Supersedes:** Original `DESIGN.md` v1 (flat/minimal-only direction). This version replaces Sections 1–3 of the original with a more refined, "confidently professional" direction — glassmorphism + spatial depth, with both dark and light modes. Sections 4–6 (Memory, locked decisions log) still apply — update them once this direction is implemented.

**Design Philosophy (Updated):** Still a government/security tool — trust and precision remain non-negotiable. But "professional" does not have to mean flat and lifeless. This version aims for the feel of **Linear, Vercel, Arc Browser, or Raycast** — tools that are unmistakably serious and enterprise-grade, but have enough visual depth, glass texture, and spatial polish that they feel expensive and current, not like a bare-bones admin panel from 2015.

**One-line brief:** If a judge saw a screenshot with no context, it should look like a well-funded security startup's flagship product — polished, spatial, quietly confident — not a plain government form, and not a gaming UI either.

---

## 1. UI/UX Principles (Updated)

### 1.1 Core Rules
- **Depth with restraint.** Glassmorphism and spatial layering are allowed and encouraged — frosted panels, soft elevation, layered z-depth — but every glass effect must aid hierarchy (what's "in front," what's "background context"), never just decorate.
- **One flex moment per screen.** Each major view (Dashboard, Document Detail, Security) gets ONE standout visual element that shows polish — e.g., the dashboard's live activity feed panel, or the document detail's signature badge. Everything else stays calm around it. Don't make every card compete for attention.
- **Density is still respected.** Glass/spatial styling does not mean sparse layouts — tables stay tables, data stays dense and scannable. The glass/depth treatment applies to containers and chrome (cards, panels, modals, sidebar), not to how much data fits on screen.
- **Motion is subtle and physical.** Elements should feel like they have weight — soft spring-based easing on hover/open, not linear or bouncy. 150–250ms for most transitions.
- **Consistency across modes.** Dark and light mode are equally polished — neither is an afterthought inversion of the other.

### 1.2 Layout Structure (Unchanged from v1)
- Persistent left sidebar navigation
- Top bar with global search, notification bell, user/role badge
- Single consistent max-width content container
- Tables remain the default for lists (documents, cases, audit logs); cards for dashboard summary stats

### 1.3 Glassmorphism Rules
- **Where to use glass:** Sidebar background, top navbar, stat cards, modals, notification/search dropdowns, the "flex moment" panel per screen
- **Where NOT to use glass:** Table rows/bodies (must stay fully opaque and legible — legal documents data cannot sit on a translucent background), form inputs, body text areas
- **Glass recipe (both modes):**
  - `backdrop-filter: blur(16–20px)`
  - Semi-transparent background fill (see color tokens in Section 2)
  - A 1px border using a semi-transparent lighter/darker tone of the surface (creates the "edge catching light" effect)
  - Very subtle inner shadow or top-highlight (1px, low opacity) to suggest a glass surface catching light from above
- **Depth/elevation scale:** Use 3 consistent elevation levels — base surface, raised (cards), floating (modals/dropdowns) — each with progressively stronger blur + shadow. Do not invent ad hoc shadow values per component.

### 1.4 Spatial UI Rules
- Cards get a very subtle 3D tilt-on-hover (max 2–4 degrees, mouse-position-based) on Dashboard stat cards and Document/Case cards only — not on every clickable element, that would be excessive
- Modals and dropdowns animate in with a slight scale + fade + upward motion (from `scale(0.96) translateY(4px) opacity(0)` to full state) — suggests they're "arriving" from a spatial layer above the page
- Sidebar active-item indicator: a soft glowing pill/bar that smoothly slides between nav items on selection (not an instant snap)
- Notification bell: unread badge has a soft pulse animation (slow, 2s cycle, subtle scale — not attention-grabbing/annoying)

### 1.5 What to Still Avoid
- ❌ No gaming-UI elements — no HUD overlays, no particle backgrounds, no cursor trails, no scan-line boot sequences. This is not the portfolio project.
- ❌ No more than the defined elevation scale — don't stack random blur/shadow combinations per-component
- ❌ No glass effect so heavy that text legibility suffers — always verify contrast ratio on the actual blurred background, not just the flat color underneath
- ❌ No emoji in the product UI
- ❌ No colorful icon backgrounds per stat card (this was the flagged issue in the reviewed screenshot) — see Section 2.3 for the correct approach now

---

## 2. Color Theme (Dark Mode + Light Mode)

**Approach:** Single accent hue (a refined blue) used consistently across both modes, layered over a neutral glass-surface system. Status colors remain muted and are used sparingly (small badges/borders only, per v1 rule — this still applies).

### 2.1 Dark Mode (Primary/Default)

| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `#0B0E14` | App background (behind all glass surfaces) |
| `--surface-glass` | `rgba(22, 27, 38, 0.65)` | Sidebar, navbar, cards — glass fill |
| `--surface-glass-raised` | `rgba(28, 34, 48, 0.75)` | Modals, dropdowns (one level "higher") |
| `--border-glass` | `rgba(255, 255, 255, 0.08)` | Glass panel borders |
| `--border-glass-highlight` | `rgba(255, 255, 255, 0.14)` | Top-edge highlight on glass panels |
| `--text-primary` | `#F2F4F8` | Headings, primary text |
| `--text-secondary` | `#9CA3B0` | Secondary text, labels |
| `--text-tertiary` | `#5F6674` | Placeholder, disabled |
| `--accent` | `#4C8DFF` | Primary buttons, active states, links, focus rings — brighter than light mode's accent to hold contrast against dark glass |
| `--accent-glow` | `rgba(76, 141, 255, 0.35)` | Soft glow behind accent elements (buttons, active nav indicator) |
| `--accent-subtle` | `rgba(76, 141, 255, 0.12)` | Active nav background, selected row tint |

### 2.2 Light Mode

| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `#F4F6F9` | App background |
| `--surface-glass` | `rgba(255, 255, 255, 0.65)` | Sidebar, navbar, cards — glass fill |
| `--surface-glass-raised` | `rgba(255, 255, 255, 0.85)` | Modals, dropdowns |
| `--border-glass` | `rgba(20, 25, 35, 0.08)` | Glass panel borders |
| `--border-glass-highlight` | `rgba(255, 255, 255, 0.9)` | Top-edge highlight on glass panels |
| `--text-primary` | `#161A22` | Headings, primary text |
| `--text-secondary` | `#5B6270` | Secondary text, labels |
| `--text-tertiary` | `#9AA1AC` | Placeholder, disabled |
| `--accent` | `#1F4E79` | Primary buttons, active states, links, focus rings |
| `--accent-glow` | `rgba(31, 78, 121, 0.18)` | Soft glow behind accent elements |
| `--accent-subtle` | `rgba(31, 78, 121, 0.08)` | Active nav background, selected row tint |

**Toggle placement:** Sun/moon icon toggle in the top navbar, next to the notification bell. Persist choice in `localStorage`. Default to system preference (`prefers-color-scheme`) on first load.

### 2.3 Stat Card Icons — Corrected Approach (Fixes the Reviewed Screenshot Issue)

The previous dashboard screenshot used 5 different colored icon backgrounds (blue, amber, green, purple, red) — this reads as a generic colorful SaaS dashboard, not an institutional security tool, and directly violated the "max 2 accent colors" rule.

**New rule:** All stat card icons use the **same single accent tint** (`--accent-subtle` background, `--accent` icon color) by default — regardless of what the stat represents. The only exception: a stat card is allowed to switch to the semantic danger tint (Section 2.4) **only when its value is actively concerning** (e.g., "Failed Logins: 2" or "Tamper Detections: 1+") — and reverts to the neutral accent tint when the value is 0/clean. This makes color meaningful (something is wrong) rather than decorative (this category happens to be purple).

### 2.4 Semantic / Status Colors (Both Modes — Muted, Used Sparingly)

| Status | Dark Mode Text | Dark Mode Tint BG | Light Mode Text | Light Mode Tint BG |
|---|---|---|---|---|
| Success / Approved | `#4ADE80` | `rgba(74, 222, 128, 0.12)` | `#1E6B3E` | `#E8F3EC` |
| Warning / Under Review | `#FBBF24` | `rgba(251, 191, 36, 0.12)` | `#8A6116` | `#FBF3E1` |
| Danger / Tamper / Rejected | `#F87171` | `rgba(248, 113, 113, 0.12)` | `#9B2C2C` | `#FBEAEA` |
| Neutral / Draft / Archived | `#9CA3B0` | `rgba(156, 163, 176, 0.12)` | `#5B6270` | `#EEF0F3` |

Still governed by the v1 rule: these appear only as small badges and thin borders, never large fills.

---

## 3. Fonts & Typography (Unchanged from v1, one addition)

- UI/body: **Inter**
- Monospace (hashes, IDs, timestamps): **JetBrains Mono**
- **Addition for this version:** Numbers on stat cards (the large counts like "14", "211") can use a slightly heavier weight (600–700) at a larger size (28–32px) than the rest of the type scale — this is the one place "flex" typography is appropriate, since large confident numbers reinforce the "serious, data-driven tool" feel. Keep everything else per the v1 type scale.

---

## 4. Component-Specific Notes for This Version

### Dashboard Stat Cards
- Glass surface, subtle 3D tilt-on-hover
- Icon in a single-accent circular badge (per 2.3)
- Large number in heavier weight
- Thin top border in accent color at low opacity — a small "flex" detail, like a light catching the top edge of glass

### Sidebar
- Full glass panel, blurred over the base background
- Active item: soft glow pill background (`--accent-glow`) sliding smoothly between items on navigation

### Notification Dropdown / Search Dropdown
- `--surface-glass-raised` elevation, scale+fade+slide-up entrance animation
- Unread notification rows get a very subtle left border in accent color, not a full colored background

### Document Detail — Signature Badge
- This is a good candidate for "the one flex moment" on this screen — a glass pill badge with the accent glow behind it, small shield icon, "Digitally Signed" label
- On click (verify action), a brief satisfying micro-animation (checkmark draws in, or subtle glow pulse) before the toast confirms — reinforces that something cryptographic is genuinely happening, not just a static label

### Global Search Dropdown
- Grouped sections (Documents / Cases / Users) separated by a thin `--border-glass` divider, not colored section headers
- Each result row: subtle hover background shift to `--accent-subtle`, no layout shift

---

## 5. Memory — Updated Locked Decisions

*Supersedes the equivalent table in v1 `DESIGN.md`. Old v1 "flat, no-glass, light-only" decisions are now superseded — kept here for history, not for reference.*

| Decision | Value | Locked On |
|---|---|---|
| Overall aesthetic | Glassmorphism + spatial depth, professional/institutional tone maintained — NOT gaming UI, NOT flat-only | v2 update |
| Color mode | Both dark (default) and light mode, user-toggleable, persisted | v2 update |
| Primary accent (dark) | `#4C8DFF` | v2 update |
| Primary accent (light) | `#1F4E79` | v2 update |
| Stat card icons | Single accent tint by default, semantic danger tint only when value indicates a real issue | v2 update (fixes reviewed screenshot) |
| Base font | Inter | Unchanged from v1 |
| Monospace font | JetBrains Mono | Unchanged from v1 |
| Navigation pattern | Persistent left sidebar, now glass-paneled | Unchanged pattern, updated styling |
| List views | Tables remain fully opaque (no glass) for legibility; cards get glass treatment | v2 clarification |
| Animation | Spring-based, 150–250ms, physical/spatial (tilt, scale-fade-slide) — still no decorative/gaming motion | v2 update |

### Still Open
- [ ] Confirm actual contrast ratios once implemented — glass-over-dark-background text legibility must be manually verified, not assumed
- [ ] Confirm 3D tilt-on-hover performance is acceptable on lower-end demo machines — if janky, fall back to a simpler shadow-lift-on-hover instead

### Explicitly NOT This Direction
- Full liquid-glass gaming UI with particle fields, HUD overlays, cursor trails (that direction belongs to the personal portfolio project only, not SecureDocs)
- Flat, zero-depth "government form" look (the original v1 direction, now superseded)

---

*Companion to `PRD.md`, `ARCHITECTURE.md`, `RULES.md`, `PHASES.md`, `MEMORY.md`, `REMAINING_FEATURES.md`, `NEXT_BUILD.md` — Smart India Hackathon 2026, Problem Statement SIH26190, Ministry of Home Affairs*
