# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - TDZ Collision: `let profile` vs `function profile()`
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the TDZ collision on page load
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — loading `profile.html` after `app.js` has bound `function profile()` to `window`
  - Create a minimal JS test fixture that replicates the load order:
    1. Evaluate `function profile() {}` in the same scope (simulating `app.js` load)
    2. Then evaluate `let profile = { name: "Test" }` (simulating the old inline script)
    3. Assert that `profile.name` is accessible without throwing a ReferenceError
  - Additional test case: Open `profile.html` in a browser (unfixed), wait for `DOMContentLoaded`, assert `document.getElementById("displayName").innerText !== ""`
  - Additional test case: Simulate click on "✏️ Edit Profile" button and assert modal fields are pre-populated (reads `profile.name` internally)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS — `ReferenceError: Cannot access 'profile' before initialization` is thrown (this is correct — it proves the bug exists)
  - Document counterexamples found, e.g. `document.getElementById("displayName").innerText` is empty, console shows `ReferenceError`
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - `profile()` Nav Dropdown Unaffected on All Pages
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: On `home.html` (unfixed, no collision there), clicking the navbar avatar icon opens the profile dropdown panel — `document.getElementById("profile-panel")` is created and visible
  - Observe: Clicking the avatar icon again removes `#profile-panel` (toggle behavior)
  - Observe: `toggleDarkMode()` correctly cycles `body.classList` between dark and default on all pages
  - Observe: `loadNavigation()` + `setActiveNav()` runs on page load and adds `.active` to the correct nav button
  - Write property-based test: for any page context (home, post-task, my-task, messages) where `isBugCondition` is false (i.e., no `let profile` collision), clicking the navbar avatar must create `#profile-panel` on first click and remove it on second click
  - Write test: `localStorage.getItem("taskhero-profile")` key is unaffected by navigating between non-profile pages
  - Verify all tests PASS on UNFIXED code (these behaviors work correctly before the fix)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3. Fix TDZ collision — rename `profile` data variable to `profileData`

  - [ ] 3.1 Rename `let profile` declaration to `let profileData` in the inline script
    - Locate the IIFE declaration at the top of the inline `<script>` in `profile.html`: `let profile = (function() { ... }())`
    - Rename to `let profileData = (function() { ... }())`
    - This single rename is the root fix — it removes the identifier from the TDZ caused by the pre-existing `function profile()` binding in `app.js`
    - _Bug_Condition: `isBugCondition` is true when `function profile` EXISTS in `window` scope AND inline script declares `let profile` — renaming to `profileData` makes `isBugCondition` false_
    - _Expected_Behavior: `profileData` is accessible immediately after declaration; `renderAll()` completes without ReferenceError; all profile sections render with correct data from localStorage_
    - _Preservation: `function profile()` in `app.js` (line 163) remains the sole owner of the `profile` identifier in the global scope; navbar avatar dropdown continues to open/close as before_
    - _Requirements: 2.1, 2.2_

  - [ ] 3.2 Replace all remaining `profile.` references with `profileData.` in the inline script
    - Approximately 60–70 references across: save handlers (`saveProfile`, `saveBio`, `saveAvatar`, `saveBanner`, `saveContact`, `saveExpertise`), render functions (`renderAll`, `renderSkills`, `renderExpertise`, `renderContact`, `renderCerts`, `renderWorkExp`, `renderPortfolio`, `renderStats`), CRUD functions (`addSkill`, `removeSkill`, `addCert`, `removeCert`, `addWorkExp`, `removeWorkExp`, `addPortfolioItem`, `removePortfolioItem`), and the `DOMContentLoaded` initializer
    - Use a systematic find-and-replace within the inline `<script>` block only — do NOT touch `js/app.js`
    - Verify no bare `profile` identifier remains in the inline script (search for `\bprofile\b` excluding the word `profileData`)
    - _Requirements: 2.1, 2.2_

  - [ ] 3.3 Replace fragile inline `onclick` handlers in emoji/banner pickers with `data-*` + delegated listeners
    - **Cert icon picker** (`renderEmojiPicker` for `certIconPicker`): Remove any `onclick="selectedCertIcon='...'"` inline strings; add `data-picker="certIcon"` and `data-emoji="<emoji>"` attributes to each `.emoji-option` div; wire up a single `document.addEventListener("click", ...)` delegated handler that reads these attributes and updates `selectedCertIcon`, then re-renders the picker
    - **Work exp icon picker** (`renderEmojiPicker` for `workExpIconPicker`): Same pattern with `data-picker="workIcon"` and `data-emoji` attributes; delegated handler updates `selectedWorkIcon`
    - **Avatar picker** (`renderAvatarPicker`): Use `data-picker="avatarPicker"` and `data-emoji` attributes; delegated handler updates `selectedAvatar` and re-renders
    - **Banner gradient picker** (`renderBannerOptions`): Replace inline `onclick` strings containing raw CSS gradient values with `data-val="<gradient>"` on each `.banner-opt` div; add delegated handler that reads `data-val` and calls `renderBannerOptions()` to refresh selection highlight
    - **Thumbnail picker** (`renderThumbPicker`): Use `data-thumb="<emoji>"` on each `.thumb-option` div; add delegated handler that reads `data-thumb`, sets `selectedThumb`, and calls `renderThumbPicker()`
    - All delegated handlers must use `e.target.closest(...)` to handle clicks on child elements inside option divs
    - _Requirements: 2.3, 2.4_

  - [ ] 3.4 Implement Work Experience section functions
    - Wire up `renderWorkExp()`: reads from `profileData.workExp[]`; each entry renders as `.exp-entry` with `.exp-timeline-dot` (icon), `.exp-entry-title`, `.exp-entry-company`, `.exp-entry-years`, `.exp-entry-desc`; remove button (`.exp-entry-remove`) hidden via `IS_VIEW_MODE` guard; staggered `animation-delay` at `i * 0.08s`; empty state shows placeholder text
    - Wire up `addWorkExp()`: reads `we-title`, `we-company`, `we-years`, `we-desc` inputs; validates title and company are non-empty; pushes `{ icon: selectedWorkIcon, title, company, years, desc }` to `profileData.workExp`; calls `saveToStorage()`, `renderWorkExp()`, `closeModal('workExpModal')`, `showToast(...)`
    - Wire up `removeWorkExp(index)`: splices `profileData.workExp` at index; calls `saveToStorage()`, `renderWorkExp()`
    - `openModal('workExpModal')` path: clears all inputs, resets `selectedWorkIcon = '💼'`, calls `renderEmojiPicker('workExpIconPicker', WORK_EXP_ICONS, 'workIcon')`
    - _Requirements: 2.5_

  - [ ] 3.5 Implement Portfolio section functions
    - Wire up `renderPortfolio()`: reads from `profileData.portfolio[]`; each card renders as `.portfolio-item` with `.portfolio-thumb` (emoji), `.portfolio-info` (h4 title, p desc), optional `.portfolio-cat-tag` pill, optional `.portfolio-link` anchor with `rel="noopener"`; hover-reveal `.port-del` remove button hidden in view mode via `IS_VIEW_MODE`; staggered `animation-delay` at `i * 0.07s`; appends "Add Work Sample" `.portfolio-add` tile in edit mode only
    - Wire up `addPortfolioItem()`: reads `port-title`, `port-desc`, `port-cat`, `port-link` inputs; validates title is non-empty; pushes `{ icon: selectedThumb, title, desc, cat, link }` to `profileData.portfolio`; calls `saveToStorage()`, `renderPortfolio()`, `closeModal('portfolioModal')`, `showToast(...)`
    - Wire up `removePortfolioItem(index)`: splices `profileData.portfolio` at index; calls `saveToStorage()`, `renderPortfolio()`
    - All user-provided strings passed through `escHtml()` before insertion into innerHTML
    - _Requirements: 2.6_

  - [ ] 3.6 Implement Certifications section functions
    - Wire up `renderCerts()`: reads from `profileData.certs[]`; each row renders as `.cert-item` with `.cert-icon`, `.cert-name`, `.cert-issuer` (+ year if present), `.cert-badge` "Verified"; `.cert-remove` button hidden via `IS_VIEW_MODE`; staggered `animation-delay` at `i * 0.08s`; empty state shows placeholder text
    - Wire up `addCert()`: reads `cert-name`, `cert-issuer`, `cert-year` inputs; validates name and issuer are non-empty; pushes `{ icon: selectedCertIcon, name, issuer, year }` to `profileData.certs`; calls `saveToStorage()`, `renderCerts()`, `closeModal('certModal')`, `showToast(...)`
    - Wire up `removeCert(index)`: splices `profileData.certs` at index; calls `saveToStorage()`, `renderCerts()`
    - `openModal('certModal')` path: clears inputs, resets `selectedCertIcon = '🏆'`, calls `renderEmojiPicker('certIconPicker', CERT_ICONS, 'certIcon')`
    - _Requirements: 2.7_

  - [ ] 3.7 Implement view mode guard
    - Derive `IS_VIEW_MODE`: `const IS_VIEW_MODE = new URLSearchParams(window.location.search).has("view")`
    - Apply class: `if (IS_VIEW_MODE) document.body.classList.add("view-mode")`
    - CSS rule already present: `body.view-mode .edit-controls { display: none !important }` — verify it covers all edit buttons (`banner-edit-btn`, `edit-section-btn`, `btn-primary.edit-controls`, `skill-input-row`, `skill-add-btn`)
    - Add `IS_VIEW_MODE` guard at the top of `openModal()`: `if (IS_VIEW_MODE) return;`
    - Update `handleAvatarClick()`: only call `openModal('avatarModal')` when `!IS_VIEW_MODE`
    - Implement `copyProfileLink()`: constructs `window.location.href.split('?')[0] + '?view=1'`; uses `navigator.clipboard.writeText()` with fallback `showToast`
    - The `.view-mode-banner` div is already in HTML; the CSS rule `body.view-mode .view-mode-banner { display: block }` makes it visible when `IS_VIEW_MODE` is true
    - _Requirements: 2.8, 2.9_

  - [ ] 3.8 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - `profileData` Accessible; `renderAll()` Completes Without Error
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior: no ReferenceError, `displayName` is populated, edit modal fields are pre-populated
    - Run bug condition exploration test from step 1 on the FIXED code
    - **EXPECTED OUTCOME**: Test PASSES — `profileData` is accessible, `renderAll()` runs to completion, `document.getElementById("displayName").innerText` equals the stored profile name
    - _Requirements: 2.1, 2.2 (Expected Behavior Properties from design)_

  - [ ] 3.9 Verify preservation tests still pass
    - **Property 2: Preservation** - `profile()` Nav Function and All Page Behaviors Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2 on the fixed code
    - **EXPECTED OUTCOME**: Tests PASS — `function profile()` in `app.js` still opens/closes the navbar dropdown on all pages; dark mode, active nav highlight, and other localStorage keys are unaffected
    - Confirm no regressions: other pages (`home.html`, `post-task.html`, `my-task.html`, `messeges-page.html`) must behave identically before and after the fix

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite (exploration test + preservation tests)
  - Manually verify `profile.html` loads with all sections rendered (hero, stats, bio, skills, expertise, contact, certifications, work experience, portfolio, reviews)
  - Manually verify edit → save → reload cycle: edit name, save, reload, confirm name persists in localStorage under `"taskhero-profile"`
  - Manually verify view mode: load `profile.html?view=1`, confirm zero `.edit-controls` elements are visible, confirm view-mode banner is shown, confirm no modal can be triggered
  - Manually verify cross-page nav: click navbar avatar on `home.html` — `#profile-panel` opens; click again — it closes
  - Ensure all tests pass; ask the user if questions arise
