# VORO brand suite

**VORO** (VOH-roh) is a short, abstract brand name. It leaves the description to a supporting line: “A local 3D review workspace.”

An artsy identity for people making games: a curious sprout mascot, expressive lowercase lettering, plum and apricot color, and a painted miniature world. The artwork welcomes imagination; the asset-review workspace stays readable.

Open **index.html** for the visual reference. Open **../DESIGN.md** for the implemented design system.

## Included

- `logos/`: Sprout mascot in plum, white/accent, and single-color ink; horizontal and compact outlined wordmarks for light and dark surfaces. SVGs are independent of installed fonts.
- `icons/`: native macOS `.icns`, multi-resolution Windows `.ico`, editable SVG, and transparent 1024px PNG.
- `art/`: generated gouache game-world key art and its prompt/provenance record.
- `templates/`: 1600 × 900 presentation cover as outlined SVG and PNG. Replace its text in the generator to make a new cover; never distort the mark.
- `tokens.css`: canonical colors, local font faces, spacing, radii, and motion used directly by the application.
- `tokens.json`: generated exchange copy of those values.
- `identity.json`: canonical vector paths shared by the React mark and brand export generator.
- `fonts/`: self-hosted DM Sans variable and Bricolage Grotesque web fonts, an export font, and their SIL Open Font License texts.

## Use

Run `npm run brand:build` to regenerate the exports. macOS also produces the ICNS via `iconutil`. Application UI and font assets are bundled locally by `npm run build`. Font licenses are included in the packaged third-party notices. Strategy, review captures, and the source suite are excluded from the application archive.

Use the horizontal wordmark at 260px wide or larger; the compact version at 180px or larger; the mascot at 24px or larger. The native application icon has a separate 16px export. Preserve clear space equal to the width of one mascot eye. Use white artwork on plum or sufficiently dark photography, and ink/plum artwork on paper or neutral gray. Never apply a glow, stretch the artwork, replace its apricot leaf, or place it directly over a busy object.

Keep Bricolage Grotesque for short headings and the wordmark. Use DM Sans for controls, paths, annotations, and reading. Orange is an accent, not body text on white. Review states always pair a label or icon with color. Native app minimum window size is 1080 × 700; this is a desktop product, with no shipped mobile interface.

## Voice

Direct, observant, constructive. Name the object or action. Explain a recovery when something fails. Use “Open a project folder”, “Saved beside asset”, and “Needs changes”. Avoid marketing inside review tasks. The first-run line is “Small details. Bigger worlds.” The supporting thought is “Big worlds start with little things.”

## Provenance

The mascot is original authored vector geometry in identity.json. Asset selection uses a CSS border that follows the thumbnail corners. The game-world illustration in art/little-world.png was generated for VORO; art/provenance.json preserves the exact prompt and the image carries it as embedded metadata. Icons are deterministically rasterized from the mascot. The presentation cover combines the key art, mascot, and typography. Bricolage Grotesque and DM Sans are bundled locally with their SIL Open Font License texts. No stock artwork or commercial claims are used.
