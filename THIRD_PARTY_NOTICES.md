# Third-party notices

The root MIT license covers VORO’s original source and VORO-provided material to the extent applicable rights are held. Third-party materials retain their own terms.

| Material                         | Source and license                                                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Bricolage Grotesque              | [Upstream](https://github.com/ateliertriay/bricolage); [SIL OFL 1.1](brand/fonts/bricolage-grotesque-LICENSE.txt)                         |
| DM Sans                          | [Upstream](https://github.com/googlefonts/dm-fonts); [SIL OFL 1.1](brand/fonts/dm-sans-LICENSE.txt)                                       |
| FlightHelmet KTX2 normal texture | Microsoft’s CC0 sample via Khronos; [fixture attribution](tests/fixtures/ATTRIBUTION.md)                                                  |
| Contributor Covenant 2.0         | [Code of Conduct](CODE_OF_CONDUCT.md), adapted under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), with attribution retained |

The VORO sprout is original vector geometry. The painted miniature world was generated with OpenAI image generation; [provenance](brand/art/provenance.json) records its prompt. Screenshots contain synthetic geometry and illustrative review text; see [asset provenance](docs/images/README.md).

Application builds generate `dist/THIRD_PARTY_NOTICES.txt` from the installed runtime dependency licenses and bundled fonts/decoder notices. Preserve that file and Electron’s shipped licenses when redistributing a package. Runtime packages include React, React DOM, Three.js, Zod, Chokidar, Lucide, and their dependencies; the lockfile records exact resolved versions. npm packages retain their upstream license files. Build/test tools are development dependencies and are not relicensed by VORO.

The archived `site/` snapshot also contains copies of the branded fonts and art. Active website development and its notices are maintained separately in [usevoro/website](https://github.com/usevoro/website).
