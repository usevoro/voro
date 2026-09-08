---
name: VORO website
description: The VORO game-jam artbook identity expressed as a responsive product landing page.
typography:
  display:
    fontFamily: Bricolage Grotesque, sans-serif
    fontSize: clamp(3.4rem, 6.5vw, 6rem)
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.035em
  headline:
    fontFamily: Bricolage Grotesque, sans-serif
    fontSize: clamp(2.25rem, 4.1vw, 3.75rem)
    fontWeight: 750
    lineHeight: 1.06
    letterSpacing: -0.03em
  body:
    fontFamily: DM Sans, sans-serif
    fontSize: 1rem
    lineHeight: 1.6
---

# Design System: VORO website

## Overview

**Creative North Star: "Game-jam artbook"**

This is a surface supplement to [the incumbent design system](../DESIGN.md). The desktop identity and its [.impeccable/design.json](../.impeccable/design.json) remain authoritative for the shared visual world. [BRIEF.md](BRIEF.md) records this page's persuasion strategy; [PRODUCT.md](../PRODUCT.md) supplies product truth. The larger type, more generous spacing, and mobile layout here belong to the website and do not redefine the desktop workspace.

Warm paper, expressive headings, the original sprout, and the existing gouache world carry the identity into a spacious reading experience. Real application captures provide working proof. Their neutral model stages remain part of the application image, while lilac frames the demonstration outside it.

**Key Characteristics:**

- A two-page artbook hero that becomes a vertical composition on phones.
- The incumbent palette, self-hosted fonts, mascot, and painted world.
- Readable product evidence, visible platform availability, and restrained interaction.

Documentation evidence: the current `public/styles.css`, `scripts/render.mjs`, `public/main.js`, image provenance, and README were checked against the parent design record. `public/brand/tokens.css`, all four WOFF2 files, both font licenses, both mascot SVGs, and the native PNG were verified byte-identical to their canonical `brand/` sources. Image provenance records the existing illustration conversion and actual Electron captures with deterministic fixtures. The review owner confirmed the scoped visual review after both mobile word-spacing fixes. This documentation pass did not repeat browser inspection. No additional pre-existing drift was identified in the checked inheritance; no incumbent design files were repaired or regenerated.

## Colors

The page imports `public/brand/tokens.css`, the distribution copy of `../brand/tokens.css`. Shared palette values remain in that canonical source and the parent design record.

### Primary

Plum colors the primary action, expressive hero accent, and keyboard focus. Its existing hover tone darkens actions. Deep plum anchors the selected screenshot control and closing section.

### Secondary

Lilac frames the app demonstration and supports the painted hero. Butter colors selection and the closing action, whose hover uses apricot. The mascot preserves its original apricot leaf.

### Neutral

Paper supplies the main reading surface; ground separates the portable-feedback section. Ink, muted text, and fine line dividers organize supporting information. Warning colors label illustrative review status and success colors label persistence, always with words.

**The Inheritance Rule.** Update distribution assets from the canonical brand sources; do not independently recolor or redesign website copies.

## Typography

The frontmatter records the website's main desktop hierarchy. Bricolage Grotesque carries short headings and the lowercase wordmark; DM Sans carries descriptions, navigation, and release information. General prose has a maximum measure (65ch), with a narrower hero description (37ch).

The hero description is larger than body text (1.24rem/1.65). The header wordmark uses the existing expressive weight (800) at website scale (46px); the footer reduces it (36px). Supporting captions generally range from 0.8rem to 0.9rem. Release architecture labels use the body family so they read as practical information.

At widths up to 800px, the hero heading becomes 3.25rem. At widths up to 600px, it becomes fluid again (`clamp(2.75rem, 10vw, 3.8rem)`). These are website adaptations of the two established type voices.

## Layout

The centered reading width is capped at 1280px, with 48px side gutters. The header is 110px tall. The hero uses two unequal columns (1.15fr / 1fr), a 45px gap, and vertical padding (58px above, 85px below). At 1600px and wider, its gap increases to 70px and the artwork is capped at 550px.

Sections generally use 110px vertical padding. Workflow, portable feedback, and FAQ pair explanatory text with evidence or details; their wide-screen gaps are 90px. Platform availability uses three equal columns, separated by fine rules. Screenshot images retain the desktop capture ratio (1480 / 960), with a full-size image link in each caption.

Responsive behavior follows the implemented breakpoints:

- **Up to 1100px:** side gutters become 32px; paired-section gaps become 50px; screenshot choices stack vertically beside the introduction.
- **Up to 800px:** gutters become 24px; the header becomes 92px tall and its separate CTA disappears; the hero remains two columns; workflow becomes one column; section padding becomes 78px. The notes and FAQ still use paired columns.
- **Up to 600px:** gutters become 20px; the header becomes 82px tall; the hero, notes, and FAQ stack. Screenshot choices return to a full-width horizontal pair. Platform sections become stacked rows with a heading column and a build-information column. General section padding becomes 65px, with local exceptions for the notes and closing sections. The footer wraps.

Desktop-only line breaks disappear in selected mobile headings and prose. Explicit spaces around those breaks preserve word boundaries when hidden. The website's mobile presentation does not imply a mobile desktop-app release.

## Elevation & Depth

The page uses tonal layering and borders without drop shadows. Paper, ground, lilac, and deep plum separate moments in the reading flow. The illustrative review sheet tilts slightly (2 degrees), decreases at medium widths (1 degree), and lies flat on phones.

## Shapes

Primary actions retain the shared control radius (10px). The hero preserves the incumbent asymmetric art frame (24px 70px 24px 24px), reducing it on phones (20px 60px 20px 20px). The demonstration frame uses softer outer corners (20px), with smaller screenshot corners (12px); both reduce on phones. The review sheet echoes the asymmetric artbook shape (16px 45px 16px 16px).

## Components

- **Primary action:** plum and white, at least 52px high, with 14px 22px padding. The smaller header action is at least 44px high. Hover uses the existing 160ms background transition. Focus is a visible plum outline (3px, offset 5px); the dark closing section uses butter focus.
- **Screenshot switcher:** ordinary anchor links remain the baseline, with both captures available without JavaScript. Enhancement shows one capture, updates the URL hash and `aria-current`, and fades its opacity over 240ms using the shared easing. Modified link clicks retain native behavior.
- **Review sheet:** explicitly illustrative feedback accompanies a real sidecar example. Status and saved state use visible text, and filenames can wrap rather than overflow.
- **Platform availability:** macOS, Windows, and Linux remain manually inspectable. Unavailable architectures show text, not inert download buttons. A detected desktop OS may add a suggestion without hiding other platforms. Download actions appear only for verified available builds.
- **FAQ:** native `details` and `summary` preserve keyboard interaction and work without JavaScript. Fine rules separate questions; the disclosure arrow changes orientation when open.
- **Navigation:** the header and footer use ordinary links. On phones, the header omits the workflow link and GitHub icon while keeping the GitHub text link and availability access. A skip link appears on focus.

Reduced-motion preferences disable animation, transitions, and smooth scrolling. The page introduces no forms, dialogs, or live 3D viewer components.

## Do's and Don'ts

- Do preserve the original mascot geometry, palette, licensed fonts, and illustration provenance.
- Do retain actual app captures, their full-size links, and accurate illustrative labels.
- Do check word boundaries whenever a responsive rule hides a line break.
- Do keep release status legible without JavaScript or platform detection.
- Don't promote website typography, mobile breakpoints, or spacing into the desktop design system.
- Don't imply public builds, stars, testimonials, or repository access that the configured evidence does not support.
