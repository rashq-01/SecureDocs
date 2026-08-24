# DESIGN.md
## SecureDocs — UI/UX Design System

**Companion Documents:** `PRD.md` · `ARCHITECTURE.md` · `RULES.md` · `PHASES.md`

**Design Philosophy:** This is a government/law-enforcement document management system — not a consumer app. Every design decision should communicate **trust, precision, and seriousness**. No playful colors, no decorative animation, no "startup" aesthetic. Think: the software a Ministry's IT department would actually approve for handling case files — closer to enterprise admin tools (Linear, Notion's clean mode, GitHub's UI density) than to a marketing site.

**One-line brief:** If a judge from MHA looked at a screenshot with no context, it should look like it belongs in a government security audit tool — not a hackathon side project.

---

## 1. UI/UX Principles

### 1.1 Core Rules
- **Function over decoration.** Every visual element must earn its place by aiding clarity, hierarchy, or usability. If it's "just for style," cut it.
- **Density over whitespace-for-its-own-sake.** This is a data-heavy tool (tables, logs, document lists) — follow enterprise admin-panel density, not landing-page spaciousness. But never cramped — maintain clear breathing room around data.
- **Consistency over novelty.** Same component looks and behaves the same everywhere. A button is a button everywhere in the app.
- **Predictability.** Users (officers, reviewers, auditors) are working under real operational pressure — the UI should never surprise them. No hidden gestures, no ambiguous icons without labels.
- **Role clarity at a glance.** The moment a user logs in, it should be visually obvious what role they're in and what they can/cannot do — via clear section labeling, not decoration.

### 1.2 Layout Structure
- **Persistent left sidebar navigation** (not a hamburger menu) — standard for admin/dashboard tools, always visible on desktop
- **Top bar:** shows logged-in user's name, role badge (subtle, text-based — not a colorful pill), and logout
- **Main content area:** single consistent max-width container, generous internal padding, no full-bleed decorative sections
- **Tables are the default view for lists** (documents, cases, audit logs) — not cards. Cards are reserved for dashboard summary stats only.

### 1.3 Component Standards
| Component | Style Rule |
|---|---|
| Buttons | Rectangular with slight border-radius (4–6px), solid fill for primary actions, outline for secondary, text-only for tertiary/cancel actions |
| Forms | Labels above inputs (not floating labels), clear required-field indicators, inline validation messages in neutral red text (not alarming bright red) |
| Tables | Zebra-striping optional (very subtle if used), sortable column headers, sticky header on scroll, row hover state (light gray background) |
| Modals | Used sparingly — only for confirmations (e.g., "Approve this document?") and forms that don't warrant a full page |
| Status badges | Small, text-based, subtle background tint (see Section 2.3) — never large or attention-grabbing |
| Icons | Used only to reinforce a text label, never as the sole indicator of an action (accessibility + clarity) |

### 1.4 What to Avoid
- ❌ No gradients as decoration (a very subtle gradient for depth on a card border is acceptable, nothing more)
- ❌ No glassmorphism, neumorphism, or "trendy" effects — this is not a personal portfolio
- ❌ No large hero sections, marketing-style illustrations, or stock photography
- ❌ No more than 2 accent colors in the entire interface (see Section 2)
- ❌ No emoji in the interface itself (fine in this documentation, not in the product UI)
- ❌ No bouncy/playful animation easing — if animation is used, it should be fast, subtle, and purposeful (e.g., 150–200ms fade/slide on modal open, nothing more elaborate)
- ❌ No dark-mode-only "hacker" aesthetic carried over from personal projects — this needs to look institutional

---

## 2. Color Theme

**Approach:** Monochrome-driven neutral palette with a single restrained accent color. Status/semantic colors are muted, not saturated.

### 2.1 Primary Palette (Neutral Base)

| Token | Hex | Usage |
|---|---|---|
| `--bg-primary` | `#FFFFFF` | Main content background |
| `--bg-secondary` | `#F7F8FA` | Sidebar, page background behind cards |
| `--bg-tertiary` | `#EEF0F3` | Table row hover, subtle section dividers |
| `--border` | `#E1E4E8` | All borders, dividers, table lines |
| `--text-primary` | `#1A1D23` | Headings, primary body text |
| `--text-secondary` | `#5B6270` | Secondary text, labels, metadata |
| `--text-tertiary` | `#9AA1AC` | Placeholder text, disabled states |

### 2.2 Accent Color (Single, Restrained)

| Token | Hex | Usage |
|---|---|---|
| `--accent` | `#1F4E79` (deep institutional navy/blue) | Primary buttons, active nav item, links, focus rings |
| `--accent-hover` | `#183C5D` | Hover state for accent elements |
| `--accent-subtle` | `#EAF0F6` | Very light tint — active nav background, selected row |

**Why navy:** Reads as institutional, secure, and serious across government, banking, and legal-tech products. Avoid bright blues (too "tech startup"), avoid purple (too "creative agency").

### 2.3 Semantic / Status Colors (Muted — Do Not Use Bright/Saturated Versions)

| Status | Text Color | Background Tint |
|---|---|---|
| Success / Approved | `#1E6B3E` | `#E8F3EC` |
| Warning / Under Review | `#8A6116` | `#FBF3E1` |
| Danger / Rejected / Tamper Alert | `#9B2C2C` | `#FBEAEA` |
| Neutral / Draft / Archived | `#5B6270` | `#EEF0F3` |
| Info | `#1F4E79` | `#EAF0F6` |

**Rule:** These colors appear **only** as small badges/labels and thin left-borders on alert banners — never as large fill areas, never as full-page backgrounds.

### 2.4 What Is Explicitly Banned
- No neon/bright colors anywhere (no `#FF0000`, no `#00FF00`, no saturated purple/pink)
- No more than the palette above — do not introduce new colors ad hoc per component
- No colorful charts — dashboard stat visualizations (if any) use the neutral + single accent palette only, distinguished by pattern/label, not a rainbow of colors

---

## 3. Fonts & Typography

### 3.1 Font Families

| Use Case | Font | Reasoning |
|---|---|---|
| UI / Body text | **Inter** | Clean, highly legible at small sizes, the de facto standard for professional admin/enterprise interfaces |
| Monospace (IDs, hashes, timestamps, code-like data) | **JetBrains Mono** or **IBM Plex Mono** | For displaying document hashes, case IDs, audit log technical details — reinforces "this is a precise system" |

Do not use a decorative or display font anywhere. Inter for everything except the specific technical-data cases above.

### 3.2 Type Scale

| Token | Size | Weight | Usage |
|---|---|---|---|
| `--text-xs` | 12px | 400/500 | Metadata, timestamps, table secondary info |
| `--text-sm` | 13px | 400 | Table body text, form helper text |
| `--text-base` | 14px | 400 | Default body text, form inputs |
| `--text-md` | 16px | 500 | Card titles, section labels |
| `--text-lg` | 20px | 600 | Page titles |
| `--text-xl` | 24px | 600 | Dashboard main headline (used sparingly — only on dashboard) |

**Note:** Base size is intentionally 14px, not 16px — matches enterprise dashboard density (GitHub, Linear, Notion all use 13–14px base). This is not a marketing site that needs large, airy type.

### 3.3 Typography Rules
- Line height: 1.5 for body text, 1.3 for headings
- Font weight for emphasis: use 500/600 (medium/semibold), avoid full 700/800 bold except rare page titles
- Letter-spacing: default (0) everywhere except uppercase labels (e.g., table column headers, status badges), which get `+0.02em`
- Numbers/data (hashes, IDs, counts) always use the monospace font and tabular-nums for alignment in tables

---

## 4. Memory (UI Preferences — Persistent Design Decisions)

This section is the single source of truth for UI decisions already made. **Before proposing a new UI pattern, check here first — if it's listed, don't re-litigate it, just follow it.**

### 4.1 Locked Decisions
| Decision | Value | Locked On |
|---|---|---|
| Overall aesthetic | Professional, minimal, institutional — no colorful/playful UI | Project start |
| Primary accent color | Deep navy `#1F4E79` | Project start |
| Base font | Inter | Project start |
| Monospace font | JetBrains Mono (fallback: IBM Plex Mono) | Project start |
| Navigation pattern | Persistent left sidebar (desktop) | Project start |
| List views | Tables by default, cards only for dashboard summary stats | Project start |
| Dark mode | Not required for MVP — light mode only unless team explicitly decides to add it | Project start |
| Status badge style | Small, text + subtle tint background, never large/bold | Project start |
| Animation | Minimal — 150–200ms functional transitions only, no decorative motion | Project start |

### 4.2 Open Questions (Update as Decided)
- [ ] Should the sidebar be collapsible? *(default: yes, standard admin pattern — collapse to icon-only)*
- [ ] Logo/branding treatment for "SecureDocs" — wordmark only, no icon needed for hackathon scope
- [ ] Table pagination vs. infinite scroll for document lists — *(default: pagination, more predictable and "enterprise" than infinite scroll)*

### 4.3 Reference Inspiration (Tone Only — Do Not Copy Layouts Directly)
- Linear (app.linear.app) — density, sidebar pattern, subtle color use
- GitHub's dashboard/settings UI — table density, badge style
- Notion's "clean" table views — typography restraint
- Any Indian government e-Governance portal redesign (e.g., DigiLocker's newer UI) — for tonal appropriateness to the actual domain

**Explicitly NOT inspiration:** Personal portfolio sites, SaaS marketing landing pages, glassmorphism/gaming UI trends — these are wrong for this domain and this document overrides any prior direction toward that aesthetic for this specific project.

---

*Companion to `PRD.md`, `ARCHITECTURE.md`, `RULES.md`, and `PHASES.md` — Smart India Hackathon 2026, Problem Statement SIH26190, Ministry of Home Affairs*
