# Engine changes (Playwright HL) – 2025-10-05

This file logs generic, platform‑agnostic improvements made to the HL engine.

## 2025-10-05 – Iframe + stability + new steps

Motivation: make iframe interactions and dynamic SPAs (e.g., Angular/legacy apps in iframes) more reliable; reduce flakiness during navigation; enable extra HL steps helpful for dynamic forms and date pickers. All changes are generic and do not embed any SwissLife-specific logic.

Changes

- Linux/WSL browser detection
  - detect `/usr/bin/chromium-browser`, `/usr/bin/chromium`, `/usr/bin/google-chrome(-stable)`, `/snap/bin/chromium` in addition to Windows Chrome/Edge paths.
  - Effect: allows running from WSL/Linux CI without the Windows wrapper.

- New HL steps
  - `waitForNetworkIdle` → waits for `page.waitForLoadState('networkidle')` (page-level) when needed.
  - `pressKey { key, field? }` → sends a key to a field (focus + `locator.press`) or to the active context keyboard; useful after date pickers.
  - `scrollIntoView { field }` → ensures the element is within viewport before clicking/filling.
  - `typeField { field, value }` → type sequentially (pressSequentially + blur) for forms that rely on key events instead of simple `.fill()`.
  - `waitForNetworkIdle` accepte désormais `timeout_ms` (par défaut: 20 s) pour gérer les interfaces lentes.

- enterFrame improved
  - Supports `{ selector }` (existing) or `{ urlContains }` to target a frame by URL substring. Always resolves frames from the main page.

- Safer screenshots
  - Introduced `safeScreenshot` with a retry after `domcontentloaded` if the page is navigating. Screenshot errors no longer fail the whole step.

- JS listeners collection for frames
  - Keep CDP collection on the main page.
  - Added a fallback for frames using `frame.evaluate` to check inline handlers (onclick, onchange, etc.).
  - Gracefully skips unsupported selectors in frames (e.g., `text=`, `:has-text()`); records a small metadata stub instead of failing.

- SelectField fallback
  - When `options.items` is omitted, the engine now executes `selectOption(value)` directly or, if `option_selector_template` is provided, interpolates `{{value}}`/`{{valueLower}}`/`{{valueUpper}}` before targeting the option.
  - The fallback also désélectionne proprement les autres options puis déclenche `input`/`change`, ce qui reste utile pour tous les `<select>` hérités qui attendent des événements clavier.

Notes

- No SwissLife‑specific selectors or logic were added to the engine; all features are reusable across platforms.
- Existing flows benefit automatically (e.g., more robust date handling and iframe targeting).

---

Artifacts reference

- Last green headless run for SwissLifeOne SLSIS (after these changes): see `admin/runs-cli/swisslifeone_slsis/<runId>/report.html` below in the task handoff message.
