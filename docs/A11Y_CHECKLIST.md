# Accessibility checklist — Common Name (Phase 5.3)

WCAG 2.1 Level AA basics for MVP. Sign off in PR before merge.

## Keyboard

- [x] Proposed-name field reachable via Tab; visible label (not placeholder-only)
- [x] Submit via Enter from field
- [x] Focus ring visible on interactive controls (`:focus-visible`)
- [x] No keyboard trap on home / about
- [x] MCA verify link keyboard-activatable

## Live regions & semantics

- [x] `#results` uses `aria-live="polite"` and `aria-busy` while loading
- [x] Signal uses `role="status"` with text + lucide icon (`aria-hidden` on decorative icon)
- [x] Field errors use `role="alert"` + `aria-invalid`
- [x] Loading button sets `aria-busy`

## Contrast (signal / text)

| Token                 | Hex       | Use                      | AA note                       |
| --------------------- | --------- | ------------------------ | ----------------------------- |
| `--color-success`     | `#1f7a4c` | Unique icon              | ≥ 3:1 UI on white             |
| `--color-warning`     | `#b86e00` | Similar icon             | ≥ 3:1 UI on white             |
| `--color-error`       | `#b42318` | Taken / unavailable icon | ≥ 3:1 UI on white             |
| `--color-neutral-900` | `#152026` | Body / signal message    | ≥ 4.5:1 on white / neutral-50 |
| `--color-neutral-600` | `#4f6571` | Meta / disclaimer        | ≥ 4.5:1 on neutral-50         |

Signal message always in `text-neutral-900` — color is not the only cue.

## Motion

- [x] `prefers-reduced-motion: reduce` collapses animation/transition durations in `app/globals.css`
- [x] Results fade / button scale are non-essential; disabled under reduced motion

## Touch / targets

- [x] Primary submit and MCA link ≥ 44×44px (`min-h-11`)

## Manual sign-off

| Check                               | Date       | Reviewer               |
| ----------------------------------- | ---------- | ---------------------- |
| Keyboard-only home happy path       | 2026-09-19 | Phase 5 implementation |
| Contrast tokens vs white/neutral-50 | 2026-09-19 | Phase 5 implementation |
| Reduced-motion CSS present          | 2026-09-19 | Phase 5 implementation |
| E2E smoke covers signal + MCA link  | 2026-09-19 | `pnpm test:e2e`        |

**Verdict:** Pass for MVP ship criteria (IMPLEMENTATION_PLAN Phase 5.3).
