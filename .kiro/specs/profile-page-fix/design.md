# Profile Page Fix + Portfolio/Credentials Bugfix Design

## Overview

The profile page (`profile.html`) crashed on load because the inline `<script>` declared a data
variable named `profile`, colliding with the `function profile()` already bound to the global
scope by `js/app.js` (which is loaded first). In browsers, a `let` declaration in the same scope
as an existing function binding creates a Temporal Dead Zone conflict: the `profile` identifier
becomes unreachable before the `let` statement executes, and every subsequent reference (button
clicks calling `openModal(...)`, `renderAll()`, etc.) throws a ReferenceError.

The fix renames the data object from `profile` to `profileData` throughout the inline script,
eliminating the name collision. The same release also ships three new feature sections
(Portfolio, Certifications, Work Experience) and a read-only view mode, all of which depend on
the fix being in place first.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — the inline script declares
  `let profile = ...` while `function profile()` already exists in the global scope from `app.js`.
- **Property (P)**: The desired behavior when the page loads — `profileData` is accessible,
  `renderAll()` completes without error, and all interactive buttons function correctly.
- **Preservation**: The `profile()` nav dropdown function in `app.js` must continue to open the
  profile panel when the navbar avatar icon is clicked; no existing page behavior may regress.
- **profileData**: The renamed data object in `profile.html`'s inline `<script>` that holds the
  user's profile state (name, bio, skills, portfolio, etc.) in `localStorage`.
- **profile()**: The function defined in `js/app.js` (line 163) that opens the profile dropdown
  panel in the navbar. This name must remain uncontested in the global scope.
- **TDZ (Temporal Dead Zone)**: A JavaScript engine rule: a `let` or `const` variable cannot be
  read or written between the start of its enclosing block and the point where its declaration is
  evaluated. Collision with a pre-existing binding makes the identifier permanently broken in
  that scope.
- **IS_VIEW_MODE**: Boolean derived from `?view=1` URL param; gates all edit controls via
  `body.view-mode .edit-controls { display: none !important }`.
- **STORAGE_KEY**: `"taskhero-profile"` — the localStorage key used to persist profile data.

---

## Bug Details

### Bug Condition

The bug manifests when `profile.html` is loaded in a browser. `js/app.js` is loaded first via
`<script src="js/app.js">` and registers `function profile()` on the global `window` object.
The inline `<script>` that follows then attempts `let profile = (function() { ... }())`, which
the JS engine interprets as a re-declaration of an already-bound identifier using `let`. The
engine enters a Temporal Dead Zone for `profile` that is never resolved, causing any code that
references `profileData` (under the old name `profile`) to throw a `ReferenceError`.

**Formal Specification:**
```
FUNCTION isBugCondition(pageLoad)
  INPUT: pageLoad of type PageLoadEvent
  OUTPUT: boolean

  LET appJsDefines = "function profile" EXISTS IN window scope
                     BEFORE inline script executes
  LET inlineScriptDeclares = inline <script> contains
                             "let profile" OR "var profile" OR "const profile"

  RETURN appJsDefines AND inlineScriptDeclares
END FUNCTION
```

### Examples

- **Example 1 — Page Load Crash**: User navigates to `profile.html`. Console shows:
  `ReferenceError: Cannot access 'profile' before initialization` at the `renderAll()` call
  inside `DOMContentLoaded`. The page renders HTML but all data stays at defaults; no dynamic
  content loads.

- **Example 2 — Button Click Failure**: User clicks "✏️ Edit Profile". `openModal()` is called,
  which internally reads `profile.name` → same ReferenceError. Modal opens but fields are blank
  and saving throws again, losing the entered data.

- **Example 3 — Skill Add Failure**: User types a skill and presses Add. `addSkill()` tries
  `profile.skills.push(val)` → ReferenceError. Skill is never persisted or rendered.

- **Edge Case — Navbar Profile Button**: `profile()` (the nav function in `app.js`) continues to
  work on other pages because the collision only exists inside `profile.html`'s script context.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The `profile()` function in `app.js` must continue to open and close the profile dropdown
  panel in the navbar on all pages (home, post-task, my-task, messages).
- Dark/light mode toggling via `toggleDarkMode()` must remain fully functional on `profile.html`.
- The `loadNavigation()` / `setActiveNav()` lifecycle from `app.js` must continue to run on page
  load, correctly highlighting the profile nav button.
- All `localStorage` reads and writes must continue to use the key `"taskhero-profile"`.
- All existing HTML structure (`#portfolioGrid`, `#certList`, `#workExpList`, modals, etc.) must
  remain intact and functional.

**Scope:**
All inputs that do NOT involve the `profile` identifier collision — i.e., all non-`profile.html`
pages and all interactions that don't reference the data object — must be completely unaffected.
This includes:
- Mouse clicks on navbar buttons across all pages
- Dark mode toggle on all pages
- Any other localStorage keys (`taskhero-tasks`, `taskhero-accepted`, `taskhero-notifications`)
- Touch inputs and keyboard navigation throughout the site

---

## Hypothesized Root Cause

Based on the bug description and codebase analysis, the confirmed and secondary causes are:

1. **`let` re-declaration of a function-bound global (Confirmed Root Cause)**: `app.js` uses a
   `function` declaration for `profile()`, which hoists to the global scope before any script
   runs. The inline script's `let profile = ...` then tries to shadow that binding in the same
   global scope. `let` disallows re-declaration of an existing binding — the TDZ applies
   immediately and permanently for that identifier.

2. **Inline `onclick` attribute fragility (Contributing Factor)**: Emoji picker and banner
   gradient options were originally built with inline `onclick="..."` strings containing CSS
   gradient values (commas, parentheses, color functions). These strings broke HTML attribute
   parsing and caused silent failures in picker selection, independent of the TDZ bug.

3. **`data-*` attribute absence in pickers (Contributing Factor)**: Without `data-*` attributes,
   picker state (`selectedCertIcon`, `selectedWorkIcon`, `selectedThumb`, `selectedAvatar`,
   `selectedBanner`) could not be read reliably from delegated event listeners.

4. **No view-mode guard on edit functions (Secondary Issue)**: Without the `IS_VIEW_MODE` check,
   someone accessing `profile.html?view=1` could still trigger modals and mutate another user's
   profile data in their own localStorage.

---

## Correctness Properties

Property 1: Bug Condition — Profile Data Variable Accessible on Load

_For any_ page load of `profile.html` where `js/app.js` is loaded first, the fixed inline script
SHALL declare the profile data under the name `profileData` (not `profile`), allowing
`renderAll()` to complete without a ReferenceError and all profile sections to render with
correct data from localStorage.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — `profile()` Nav Function Unaffected

_For any_ click on the navbar avatar/profile icon on any page (including `profile.html`), the
fixed code SHALL invoke `function profile()` from `app.js` exactly as before — opening the
profile dropdown panel — because the global `profile` identifier now exclusively refers to that
function with no competing `let` binding in scope.

**Validates: Requirements 3.1, 3.2, 3.3**

---

## Fix Implementation

### Changes Required

**File**: `profile.html` — inline `<script>` block only

**Root Fix:**

1. **Rename data variable**: Replace every occurrence of `let profile =` / `profile.` / `profile[`
   with `profileData` / `profileData.` / `profileData[` throughout the inline script. This is a
   pure identifier rename with no logic changes.
   - Approximately 60–70 references across save handlers, render functions, modal openers,
     and the `DOMContentLoaded` initializer.

**Supporting Fixes (inline `onclick` → `data-*` delegation):**

2. **Emoji pickers**: Replace `onclick="selectedCertIcon='🏆'"` style inline handlers in
   `renderEmojiPicker()` with `data-picker="certIcon" data-emoji="🏆"` attributes. Add a single
   `document.addEventListener("click", ...)` delegated handler that reads these attributes and
   updates the appropriate `selected*` variable.

3. **Banner picker**: Replace inline `onclick` in `renderBannerOptions()` (which contained full
   CSS gradient strings) with `data-val="..."` attributes on each banner option div. Add a
   delegated click handler that reads `data-val` and calls `renderBannerOptions()` to refresh
   selection state.

4. **Thumbnail picker**: Same pattern for `renderThumbPicker()` — use `data-thumb="..."` and a
   delegated handler.

**New Feature Sections (HTML already present, JS handlers needed):**

5. **Portfolio CRUD**: `renderPortfolio()`, `addPortfolioItem()`, `removePortfolioItem(i)` —
   reads from / writes to `profileData.portfolio[]`. Each card shows emoji thumb, title, desc,
   optional category pill and link. Remove button visible on hover in edit mode only.

6. **Certifications CRUD**: `renderCerts()`, `addCert()`, `removeCert(i)` — reads from / writes
   to `profileData.certs[]`. Each row shows icon, name, issuer+year, "Verified" badge.

7. **Work Experience CRUD**: `renderWorkExp()`, `addWorkExp()`, `removeWorkExp(i)` — reads from /
   writes to `profileData.workExp[]`. Each entry shows icon dot, title, company, years, desc.

8. **View mode**: `IS_VIEW_MODE = new URLSearchParams(window.location.search).has("view")`.
   When true: `document.body.classList.add("view-mode")`. CSS rule
   `body.view-mode .edit-controls { display: none !important }` hides all edit buttons.
   `copyProfileLink()` appends `?view=1` to the shared URL.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate
the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the TDZ collision BEFORE implementing the fix.
Confirm the root cause is specifically the `let profile` / `function profile` name conflict.
If the fix is already applied (variable already renamed to `profileData`), these tests will pass
on the current code and serve as regression guards.

**Test Plan**: Create a minimal HTML test fixture that replicates the load order:
1. Load `app.js` (which defines `function profile()`)
2. Then execute `let profile = { name: "Test" }`
3. Assert whether `profile.name` is accessible

Run on UNFIXED code to observe the ReferenceError, confirming root cause.

**Test Cases**:
1. **TDZ Collision Test**: Load order simulation — `function profile(){}` then `let profile = {}`
   in the same scope → should throw `ReferenceError` on unfixed code (will pass on fixed code).
2. **Page Load Render Test**: Load `profile.html`, wait for `DOMContentLoaded`, assert
   `document.getElementById("displayName").innerText !== ""` → will fail on unfixed code.
3. **Button Interaction Test**: Simulate click on "✏️ Edit Profile" button, assert modal opens
   with pre-populated name field → will fail on unfixed code (openModal reads `profile.name`).
4. **Edge Case — Empty localStorage**: Load page with no saved profile data, assert default name
   "TaskHero User" renders correctly → may fail on unfixed code.

**Expected Counterexamples**:
- `document.getElementById("displayName").innerText` is empty or shows placeholder HTML
- Console contains `ReferenceError: Cannot access 'profile' before initialization`
- Possible causes: TDZ from `let` re-declaration, function hoisting conflict

### Fix Checking

**Goal**: Verify that for all page loads where `js/app.js` is loaded first, the renamed
`profileData` variable is accessible and `renderAll()` completes successfully.

**Pseudocode:**
```
FOR ALL pageLoad WHERE isBugCondition(pageLoad) DO
  result := loadProfilePage_fixed(pageLoad)
  ASSERT result.renderAllCompleted === true
  ASSERT result.displayNameContent !== ""
  ASSERT result.consoleErrors.filter(isReferenceError).length === 0
END FOR
```

### Preservation Checking

**Goal**: Verify that for all interactions that do NOT involve the `profile` data variable
collision — specifically `profile()` nav function calls on all pages — the fixed code produces
the same behavior as the original.

**Pseudocode:**
```
FOR ALL interaction WHERE NOT isBugCondition(interaction) DO
  ASSERT navProfilePanel_original(interaction) = navProfilePanel_fixed(interaction)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that the nav `profile()` function works across all page contexts

**Test Plan**: Observe behavior of the navbar profile dropdown on `home.html` (unfixed, no
collision there), capture that behavior, then verify identical behavior after the fix on all pages
including `profile.html`.

**Test Cases**:
1. **Nav Profile Panel Preservation**: Verify clicking the navbar avatar icon on `home.html`
   opens the profile dropdown — observe on unfixed code, then assert same behavior post-fix.
2. **Dark Mode Preservation**: Verify `toggleDarkMode()` still cycles correctly on `profile.html`
   after the fix.
3. **Other localStorage Keys Preservation**: Verify `taskhero-tasks` and `taskhero-accepted`
   reads are unaffected on pages that use them.
4. **View Mode Guard**: Verify that loading `profile.html?view=1` hides all `.edit-controls`
   elements and shows the view-mode banner.

### Unit Tests

- Test that `profileData` is accessible immediately after the inline script executes (no TDZ)
- Test `renderAll()` populates every DOM element with correct values from a fixture `profileData`
- Test `addSkill()` / `removeSkill()` mutate `profileData.skills` and persist to localStorage
- Test `addPortfolioItem()` validates required `title` field before pushing to array
- Test `renderPortfolio()` renders "Add Work Sample" tile in edit mode and omits it in view mode
- Test `renderCerts()` renders Verified badge and remove button (hidden in view mode)
- Test `copyProfileLink()` produces a URL ending in `?view=1`
- Test `escHtml()` correctly encodes `<`, `>`, `&`, `"`, `'`

### Property-Based Tests

- **For any `profileData.name` string**: `renderAll()` must not throw, and
  `document.getElementById("displayName").innerText` must equal the name (after HTML-encoding)
- **For any array of 0–20 skill strings**: `renderSkills()` must render exactly that many
  `.skill-tag` elements
- **For any `profileData.portfolio` array**: `renderPortfolio()` must render N portfolio cards
  plus 1 "Add Work Sample" tile in edit mode, N cards with no tile in view mode
- **For any emoji in `CERT_ICONS`**: selecting it via the picker delegate handler must set
  `selectedCertIcon` to that emoji (tests the `data-*` delegation fix)
- **For any CSS gradient string in `BANNER_GRADIENTS`**: selecting it must set `selectedBanner`
  without HTML attribute parsing errors (tests the `data-val` delegation fix)

### Integration Tests

- **Full profile load**: Load `profile.html` with populated localStorage, verify all 8 sections
  render (hero, stats, bio, skills, expertise, contact, certifications, work experience,
  portfolio, reviews)
- **Edit → Save → Reload cycle**: Edit profile name, save, reload page, verify name persists
- **View mode end-to-end**: Load `profile.html?view=1`, verify zero `.edit-controls` elements
  are visible, verify banner is shown, verify no modal can be triggered
- **Cross-page nav preservation**: After fix, click navbar avatar on `home.html` — profile
  dropdown must open; click again — it must close (toggle behavior preserved)
- **Portfolio add + remove cycle**: Add item via modal, verify card renders; click remove, verify
  card disappears and localStorage is updated
