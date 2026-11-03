---
name: loading-ux
description: Standard for loading states in YTK apps and new projects. Use whenever a page fetches data, shows a list/dashboard/report, or a button submits - to pick between nothing, spinner, skeleton and progress, and to avoid empty-state flashes. Triggers on words like loading, skeleton, spinner, progress bar, slow page, "Loading...", empty state, refresh.
---

# Loading UX standard

Apply these rules to every page or component that waits for data, in any project. Full version: `docs/LOADING_UX.md` in the AIDO repo (`ytk-quotation/src/components/ui/Loading.tsx` is the reference implementation).

## Pick by wait time
- **0-1 s: show nothing.** A flashing placeholder is worse than none. Delay placeholders ~400 ms (`useDelayedFlag`).
- **1-3 s: small local spinner** inside the button / next to the title / at the end of a list. Never a full-screen overlay.
- **3 s+: grey skeleton in the shape of the content + one status line** that says what is being read and how long it usually takes ("Reading quotations, orders and activity… 4s (usually 3-6 s)"). Use a real percentage or "step 1 of 2" when progress is countable.

## Pick by situation
- First visit to a list/dashboard with a known layout -> skeleton.
- Countable progress (upload, download, multi-step read) -> progress bar with % or steps.
- Short action with no countable progress -> local spinner.
- Submit / pay / save -> spinner inside the button and disable it (blocks double clicks), text "Saving...".

## Always
1. Never show an empty message ("No orders", "No customers") before the first load finished - keep a `loaded` flag.
2. Refreshing data already on screen: keep it visible, show only a small "Updating…" line. Do not blank or dim the page.
3. Show a skeleton instead of old data only when the old data would be wrong (period/filter changed).
4. Say what is happening, not just "Loading…".
5. No full-screen overlays for page data; keep title/tabs/filters usable.
6. Switching inside already-loaded data must be instant (compute on the client). Load wide once, slice locally.
7. Do not poll heavy requests on a short timer (>= 60 s, ignore bursts of focus events).
8. Errors replace the loading state with the real error text.
9. Placeholders `aria-hidden` or `role="status"`; status line `aria-live="polite"`.
10. Same look everywhere: grey `bg-black/10` pulse blocks; brand-red moving bar on `bg-brand-yellow/30`; small `currentColor` spinner.

## Make the wait shorter first
Fewer round trips (count with `head: true`, parallel pages), fewer bytes (select only what is shown), cache and show the last result at once, and keep database permission rules cheap (wrap `is_admin()` / `auth.uid()` as `(select ...)`).

## Code (Tailwind + React)
```tsx
const showSkeleton = useDelayedFlag(!loaded);
{!loaded ? (showSkeleton ? <SkeletonCards count={3} /> : null) : <List />}
{loading && <LoadingStatus label="Reading…" seconds={useElapsedSeconds(loading)} expected="usually 3-6 s" />}
<Button disabled={saving}>{saving ? <><Spinner /> Saving...</> : "Save"}</Button>
```
Needs the `loadbar` keyframes: `@keyframes loadbar { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`.

## Checklist
No early empty text - right pattern per wait length - submit buttons spin and disable - background refresh never blanks - period/filter switches inside loaded data are instant - measured on real data in the Network tab.
