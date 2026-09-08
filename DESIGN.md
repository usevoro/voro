---
'name': 'VORO'
'description': 'An artsy local 3D review workspace for people making worlds.'
colors:
  'rail': '#332a3c'
  'lilac': '#dcd0e9'
  'butter': '#f2d58d'
  'ink': '#332a3c'
  'muted': '#6b626c'
  'paper': '#fffdfa'
  'ground': '#f5f1ee'
  'stage': '#e9e7e6'
  'line': '#d8cfd6'
  'plum': '#755087'
  'plum-hover': '#604070'
  'plum-soft': '#eee5f3'
  'rail-muted': '#d9cedf'
  'apricot': '#ef9a79'
  'success': '#346348'
  'success-bg': '#e9f2e8'
  'warning': '#85452d'
  'warning-bg': '#fbeae1'
  'error': '#a03949'
  'error-bg': '#fbe9ec'
  'white': '#ffffff'
typography:
  display:
    'fontFamily': 'Bricolage Grotesque, sans-serif'
    'fontSize': '60px'
    'fontWeight': 800
    'lineHeight': 0.98
    'letterSpacing': '-0.015em'
  headline:
    'fontFamily': 'Bricolage Grotesque, sans-serif'
    'fontSize': '30px'
    'fontWeight': 700
    'lineHeight': 1
    'letterSpacing': '-0.015em'
  title:
    'fontFamily': 'Bricolage Grotesque, sans-serif'
    'fontSize': '23px'
    'fontWeight': 700
    'lineHeight': 1.1
  body:
    'fontFamily': 'DM Sans, sans-serif'
    'fontSize': '13px'
  label:
    'fontFamily': 'DM Sans, sans-serif'
    'fontSize': '12px'
    'fontWeight': 600
  wordmark:
    'fontFamily': 'Bricolage Grotesque, sans-serif'
    'fontSize': '40px'
    'fontWeight': 800
    'lineHeight': 1
    'letterSpacing': '-0.035em'
rounded:
  'control': '10px'
  'panel': '18px'
  'asset': '12px'
  'badge': '9px'
spacing:
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '6': '24px'
  '8': '32px'
components:
  button-primary:
    'backgroundColor': '{colors.plum}'
    'textColor': '{colors.white}'
    'rounded': '{rounded.control}'
    'padding': '8px 12px'
  button-secondary:
    'backgroundColor': '{colors.paper}'
    'textColor': '{colors.ink}'
    'rounded': '{rounded.control}'
    'padding': '8px 12px'
  input:
    'backgroundColor': '{colors.paper}'
    'textColor': '{colors.ink}'
    'rounded': '{rounded.control}'
    'padding': '9px 11px'
  navigation-active:
    'backgroundColor': '{colors.apricot}'
    'textColor': '{colors.ink}'
    'rounded': '{rounded.control}'
    'padding': '10px'
  status-approved:
    'backgroundColor': '{colors.success-bg}'
    'textColor': '{colors.success}'
    'rounded': '{rounded.badge}'
    'padding': '3px 5px'
  asset-card:
    'rounded': '{rounded.asset}'
    'height': '240px'
    'width': '100%'
  modal:
    'backgroundColor': '{colors.paper}'
    'textColor': '{colors.ink}'
    'rounded': '{rounded.panel}'
    'padding': '28px'
    'width': '500px'
  brand-lockup:
    'textColor': '{colors.butter}'
    'typography': '{typography.wordmark}'
---

# Design System: VORO

## Overview

**Creative North Star: "Game-jam artbook"**

VORO feels like a game-jam artbook opened beside a working project. A curious sprout mascot, expressive lowercase wordmark, and painted miniature world establish an artsy game-development identity. The product name remains VORO; the visible wordmark is voro.

Warm paper supports compact review controls and readable notes. Deep plum anchors navigation, while neutral gray stages let source models lead. Painterly material lives in the key art; the working interface uses crisp controls and restrained motion.

**Key Characteristics:**

- Original leafy sprout mascot and lowercase voro wordmark.
- Gouache key art with lilac, apricot, and butter accents.
- Dense desktop review workspace with warm reading surfaces and neutral model stages.

This record describes the shipped implementation in `brand/tokens.css`, `brand/identity.json`, `src/renderer/styles.css`, and the React UI. `brand/index.html` is the visual brand reference; `brand/README.md` records export usage. Generated illustration provenance is recorded in `brand/art/provenance.json`.

## Colors

Plum, apricot, butter, and lilac establish the artbook palette; warm neutrals support sustained reviewing. Frontmatter names preserve the exact `--voro-` suffixes: `colors.plum` maps to `--voro-plum`, and likewise for every color except `white`, the literal white used on primary buttons. Rail and ink intentionally share a value while keeping distinct roles.

### Primary

- **Plum:** primary actions, focus, selected asset names and outlines; plum-hover darkens actions and plum-soft supports pressed controls.
- **Deep plum rail:** persistent navigation with rail-muted supporting text.
- **Apricot:** active navigation and the mascot leaf accent.

### Secondary

- **Butter:** the sidebar mascot and wordmark.
- **Lilac:** the open-folder action and background beneath painted key art.

### Neutral

- **Paper:** toolbar, notes, fields, dialogs, and welcome reading area.
- **Ground:** the gallery and surrounding workspace.
- **Stage:** default model preview background.
- **Ink / muted / line:** primary text, supporting text, and separators.
- **White:** primary-action labels and high-emphasis rail text.

Success, warning, and error each have a foreground/background pair for approved, needs-changes, and failure feedback. Status remains legible through labels or icons as well as color.

**The Neutral Stage Rule.** Keep model thumbnails and default viewer stages neutral so the artwork being reviewed supplies their color.

## Typography

**Display Font:** Bricolage Grotesque, sans-serif fallback. **Body Font:** DM Sans, sans-serif fallback. Both variable families are self-hosted with Latin and Latin Extended coverage and bundled licenses. The expressive display shapes make the identity playful; the body face keeps paths, controls, and notes quiet.

Frontmatter captures representative shipped roles. The welcome display reduces from 60px to 44px at compact width or height; collection headings reduce from 30px to 28px. Inspector titles use 23px; welcome secondary headings use 24px; modal headings use 32px. The wordmark is lowercase and reduces from 40px to 34px at compact width. The brand-reference cover uses a larger 76px heading.

The base UI is 13px. Controls and notes commonly use 12px, supporting text 11px, and metadata 9–10px. Comment prose uses 1.65 line height; welcome supporting prose uses 14px/1.75 with a 35ch measure. Counts use tabular numerals. No separate monospace family is established for paths.

**The Two Voices Rule.** Use Bricolage Grotesque for the wordmark and short expressive headings; use DM Sans for controls, paths, and annotations.

## Layout

A full-height desktop shell places a 46px titlebar above a fixed rail and flexible main area. The rail is 224px, the toolbar 55px high, and the compact inspector 402px wide with a 48% maximum. Clicking a card opens a full workspace preview with a 350px review column; Compact view restores the adjacent gallery. The preview stage fills the remaining width and height, and review notes scroll independently. The virtual contact sheet uses 260px rows, 240px cards, and a column count derived from available gallery width with a 224px divisor. Thumbnails are 182px high.

The welcome composition uses two columns (1.05fr / 1fr), a 48px gap, and a 1160px maximum width. Main workspace gutters are typically 28px. The canonical spacing scale is 4, 8, 12, 16, 24, and 32px; observed layout-specific values remain local.

At widths up to 1200px, the rail becomes 195px, compact inspector 366px and full-view review column 310px, main gutters 22px, and welcome gap 30px. At heights up to 780px, vertical spacing compresses and the viewer becomes 200px high. The native window minimum is 1080 × 700. The reviewed desktop sizes are 1480 × 960 and 1080 × 700; no mobile product layout is shipped.

Token mapping: `spacing.<n>` maps to `--voro-space-<n>`; the display/wordmark family maps to `--voro-font-display`, and body/label family to `--voro-font-body`.

## Elevation & Depth

Paper, ground, stage, thin borders, and the dark rail establish depth without lifting ordinary cards. Dialogs use `--voro-overlay-shadow` (`0 16px 64px #332a3c2b`) above a translucent plum backdrop (`#332a3c70`).

**The Quiet Surface Rule.** Keep asset cards flat; reserve the diffuse overlay shadow for dialogs.

State-color transitions use `--voro-motion-fast` (160ms). The inspector enters over 180ms with an 8px horizontal offset; asset images enlarge to 1.025 on hover over 240ms. These spatial transitions use `--voro-ease` (`cubic-bezier(0.16, 1, 0.3, 1)`). Reduced motion disables transitions, animations, and the thumbnail enlargement.

## Shapes

Controls use the shared radius (10px); dialogs use the panel radius (18px). Asset cards use 12px corners; their image stages and status badges use 9px. The painted welcome frame has an asymmetric silhouette (24px 70px 24px 24px). The sprout mascot uses the exact original paths from `brand/identity.json`; asset selection uses an inset 2px CSS border that inherits the stage’s 9px radius, so its corners stay consistent at every tile width.

`rounded.control` maps to `--voro-radius` and `rounded.panel` to `--voro-radius-panel`. Asset and badge radii are local CSS values. Keep the mascot's eye-width clear space. Brand exports specify horizontal wordmarks at 260px minimum, compact wordmarks at 180px, and mascot artwork at 24px; the native icon also has a dedicated 16px export.

## Components

- **Primary button:** plum with white text, shared rounded shape, and 8px 12px base padding. Hover darkens to plum-hover; active darkens again. Disabled buttons use 0.45 opacity. Keyboard focus is a 2px plum outline with a 3px offset.
- **Secondary button:** paper, ink, and a line border. Hover uses ground and a stronger border; active uses stage. It shares primary-button geometry and focus treatment.
- **Input:** paper and ink with a line border, 9px 11px padding, and plum caret. Search uses a enclosing focus-within outline. The comment editor signals focus with a plum border and retains multiline resizing.
- **Navigation:** plum rail, muted-light default labels, and a translucent paper hover. Active navigation uses apricot and ink; rail focus uses apricot. The open-folder control is lilac and becomes paper on hover.
- **Review badge:** compact rounded status label with icon; approved uses the success pair and needs-changes uses the warning pair. Status selectors use the corresponding pairs at full field width.
- **Asset card:** flat, open contact-sheet layout with a neutral image stage and filename beneath it. A rounded plum selection outline fades in on hover and becomes fully opaque on selection; selection also colors the name plum.
- **Dialog:** paper panel with generous 28px padding, panel corners, and the overlay shadow. Content scrolls above an 84vh maximum height.
- **Brand lockup:** original sprout silhouette with apricot leaf and a lowercase Bricolage Grotesque wordmark. The rail version uses butter. Exported wordmarks are outlined vectors; the welcome and brand cover reuse the generated gouache world.

## Do's and Don'ts

### Do:

- Do reuse brand/tokens.css and brand/identity.json as the canonical palette, font, and mascot sources.
- Do pair review-state color with a visible label or icon.
- Do preserve visible keyboard focus and the reduced-motion override.
- Do keep the generated key art and its provenance together in brand/art/.

### Don't:

- Don't stretch the mascot, add a glow, replace its apricot leaf, or place it directly over a busy object.
- Don't use apricot as body text on white.
- Don't turn model stages into decorative painted backgrounds.
- Don't treat the compact desktop breakpoint as a shipped mobile layout.
