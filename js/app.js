/* =========================================================
   TASKHERO - SHARED JAVASCRIPT
   Used by ALL pages.
   ========================================================= */

/* =========================================================
   NAVIGATION
   ========================================================= */

function currentUser() {
    return JSON.parse(localStorage.getItem("taskhero-user") || "null");
}

function requireAuth(target) {
    if (currentUser()) {
        window.location.href = target;
        return true;
    }
    window.location.href = `auth.html?returnTo=${encodeURIComponent(target)}`;
    return false;
}

function goHome()    { window.location.href = "home.html"; }
function postTask()  { requireAuth("post-task.html"); }
function myTasks()   { requireAuth("my-task.html"); }
function messages()  { requireAuth("messeges-page.html"); }
function goBack()    { if (window.history.length > 1) window.history.back(); else goHome(); }
function signOut() {
    localStorage.removeItem("taskhero-user");
    window.location.href = "auth.html";
}

/* =========================================================
   DARK / LIGHT MODE
   ========================================================= */

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const enabled = document.body.classList.contains("dark-mode");
    localStorage.setItem("taskhero-dark-mode", enabled);
    updateThemeButton();
}

function updateThemeButton() {
    const btn   = document.getElementById("themeButton");
    const light = document.getElementById("themeIconLight");
    const dark  = document.getElementById("themeIconDark");
    const isDark = document.body.classList.contains("dark-mode");
    if (btn)   { btn.title = isDark ? "Switch to Light Mode" : "Switch to Dark Mode"; btn.setAttribute("aria-label", btn.title); }
    if (light) light.style.display = isDark ? "none"  : "";
    if (dark)  dark.style.display  = isDark ? "" : "none";
}

function loadTheme() {
    if (localStorage.getItem("taskhero-dark-mode") === "true") {
        document.body.classList.add("dark-mode");
    }
    updateThemeButton();
}

/* =========================================================
   ACTIVE NAV HIGHLIGHT
   Detects the current page and marks the correct nav button.
   ========================================================= */

function setActiveNav() {
    const page = window.location.pathname.split("/").pop() || "home.html";
    const map = {
        "home.html":         0,
        "post-task.html":    1,
        "my-task.html":      2,
        "messeges-page.html":3,
        "profile.html":      4
    };
    const idx = map[page];
    if (idx === undefined) return;

    const buttons = document.querySelectorAll(".nav-links .nav-button");
    buttons.forEach((btn, i) => {
        btn.classList.toggle("active", i === idx);
    });
}

/* =========================================================
   TOAST NOTIFICATION
   ========================================================= */

function showToast(message, type = "info", duration = 3000) {
    // Remove existing toast
    const existing = document.getElementById("taskhero-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "taskhero-toast";
    toast.className = "toast " + type;
    toast.innerText = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add("show"));
    });

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 350);
    }, duration);
}

/* =========================================================
   NOTIFICATIONS PANEL
   ========================================================= */

function notifications() {
    const notifications = JSON.parse(localStorage.getItem("taskhero-notifications") || "[]");

    // Remove existing panel
    const existing = document.getElementById("notif-panel");
    if (existing) { existing.remove(); return; }

    const panel = document.createElement("div");
    panel.id = "notif-panel";
    panel.style.cssText = `
        position: fixed;
        top: 78px;
        right: 24px;
        width: 320px;
        background: ${document.body.classList.contains("dark-mode") ? "#1e1e1e" : "#fff"};
        border: 1px solid ${document.body.classList.contains("dark-mode") ? "#333" : "#eee"};
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.15);
        z-index: 2000;
        overflow: hidden;
        animation: modalIn 0.2s ease;
    `;

    const items = notifications;
    const color = document.body.classList.contains("dark-mode") ? "#f0f0f0" : "#222";
    const subColor = document.body.classList.contains("dark-mode") ? "#aaa" : "#777";

    panel.innerHTML = `
        <div style="padding:18px 20px 14px; border-bottom:1px solid ${document.body.classList.contains("dark-mode") ? "#333" : "#eee"}">
            <strong style="font-size:16px;color:${color}">Notifications</strong>
        </div>
        ${items.length ? items.map(n => `
            <div style="display:flex;gap:12px;padding:14px 20px;border-bottom:1px solid ${document.body.classList.contains("dark-mode") ? "#2a2a2a" : "#f5f5f5"}">
                <span style="font-size:20px">${n.icon}</span>
                <div>
                    <div style="font-size:13px;color:${color};line-height:1.4">${n.text}</div>
                    <div style="font-size:11px;color:${subColor};margin-top:3px">${n.time}</div>
                </div>
            </div>
        `).join("") : `<div style="padding:24px 20px;text-align:center;color:${subColor};font-size:13px">No notifications yet.</div>`}
        <div style="padding:12px 20px;text-align:center">
            <span style="font-size:12px;color:${subColor}">You're all caught up!</span>
        </div>
    `;

    document.body.appendChild(panel);

    // Close when clicking outside
    setTimeout(() => {
        document.addEventListener("click", function closePanel(e) {
            if (!panel.contains(e.target) && e.target.id !== "notif-btn") {
                panel.remove();
                document.removeEventListener("click", closePanel);
            }
        });
    }, 100);
}

/* Replace the old placeholder panel with the signed-in user's real account data. */
function profile() {
    if (!currentUser()) {
        window.location.href = "auth.html?returnTo=profile.html";
        return;
    }
    window.location.href = "profile.html";
}

/* =========================================================
   LOAD SHARED NAVIGATION
   ========================================================= */

function loadNavigation() {
    const container = document.getElementById("shared-navigation");
    if (!container) return;

    const page = window.location.pathname.split("/").pop();
    const protectedPages = ["", "home.html", "post-task.html", "my-task.html", "messeges-page.html", "profile.html"];
    if (protectedPages.includes(page) && !currentUser()) {
        window.location.href = `auth.html?returnTo=${encodeURIComponent(page)}`;
        return;
    }

    fetch("components/navigation.html")
        .then(r => r.text())
        .then(html => {
            container.innerHTML = html;
            container.classList.add("is-ready");
            loadTheme();          // apply saved theme
            setActiveNav();       // highlight correct button
            initUserSearch();     // wire up user search
            updateNavAvatar();    // show user's profile initial/photo
        })
        .catch(err => console.warn("Navigation load failed:", err));
}

/* =========================================================
   NAV PROFILE AVATAR + DROPDOWN
   ========================================================= */

function updateNavAvatar() {
    const el   = document.getElementById("navProfileAvatar");
    const user = currentUser();
    if (!el) return;

    // Build avatar content
    let avatarHtml;
    if (user && user.avatar && user.avatar.length > 2) {
        avatarHtml = `<img src="${user.avatar}" alt="${user.name || 'Profile'}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    } else if (user) {
        const letter = (user.name || user.avatar || "?").trim().charAt(0).toUpperCase();
        avatarHtml = letter;
    } else {
        avatarHtml = "?";
    }
    el.innerHTML = avatarHtml;

    // Also populate the dropdown user info panel
    const menuAvatar = document.getElementById("navMenuAvatar");
    const menuName   = document.getElementById("navMenuName");
    const menuEmail  = document.getElementById("navMenuEmail");
    if (menuAvatar && user) {
        menuAvatar.innerHTML = user.avatar && user.avatar.length > 2
            ? `<img src="${user.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
            : (user.name || "?").trim().charAt(0).toUpperCase();
    }
    if (menuName  && user) menuName.textContent  = user.name  || "Account";
    if (menuEmail && user) menuEmail.textContent = user.email || "";
}

function toggleProfileMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById("navProfileMenu");
    const btn  = document.getElementById("navProfileBtn");
    if (!menu) return;
    const isOpen = menu.classList.toggle("open");
    btn.setAttribute("aria-expanded", isOpen);
    if (isOpen) {
        // Close when clicking anywhere outside
        setTimeout(() => {
            document.addEventListener("click", _closeProfileMenuOutside);
        }, 0);
    }
}

function closeProfileMenu() {
    const menu = document.getElementById("navProfileMenu");
    const btn  = document.getElementById("navProfileBtn");
    if (menu) menu.classList.remove("open");
    if (btn)  btn.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", _closeProfileMenuOutside);
}

function _closeProfileMenuOutside(e) {
    const menu = document.getElementById("navProfileMenu");
    const btn  = document.getElementById("navProfileBtn");
    if (menu && !menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        closeProfileMenu();
    }
}

(function () {
    const API_BASE = "http://localhost:3000/api";
    let _searchTimer = null;
    let _lastQuery   = "";
    let _activeIndex = -1;   // keyboard-selected result index

    /* Called from navigation.html oninput / onfocus */
    window.navUserSearchInput = function (value) {
        const q = value.trim();

        // Re-open dropdown if already has results for same query
        if (q === _lastQuery && q !== "") {
            _openDropdown();
            return;
        }

        // Clear empty
        if (!q) {
            _lastQuery = "";
            _closeDropdown();
            return;
        }

        // Debounce 250 ms
        clearTimeout(_searchTimer);
        _searchTimer = setTimeout(() => _runSearch(q), 250);
    };

    async function _runSearch(q) {
        const dropdown = document.getElementById("navSearchDropdown");
        if (!dropdown) return;

        _lastQuery   = q;
        _activeIndex = -1;

        // Show loading state
        dropdown.innerHTML = `<div class="nav-search-loading">Searching…</div>`;
        _openDropdown();

        try {
            const res  = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(q)}`);
            const json = await res.json();

            // Bail if the user has already typed something else
            const input = document.getElementById("navSearchInput");
            if (!input || input.value.trim() !== q) return;

            if (!json.success || json.count === 0) {
                dropdown.innerHTML = `<div class="nav-search-empty">No users found for "<strong>${_esc(q)}</strong>"</div>`;
                return;
            }

            _renderResults(json.data, q, dropdown);
        } catch {
            const dropdown2 = document.getElementById("navSearchDropdown");
            if (dropdown2) dropdown2.innerHTML = `<div class="nav-search-empty">Server offline — make sure the backend is running.</div>`;
        }
    }

    function _renderResults(users, q, dropdown) {
        const me = currentUser();

        dropdown.innerHTML = users.map((u, i) => {
            const avatarHtml = u.avatar && u.avatar.length > 2
                ? `<img src="${_esc(u.avatar)}" alt="${_esc(u.name)}">`
                : _esc((u.avatar || u.name.charAt(0)).toUpperCase());

            const isMe   = me && me.id === u.id;
            const subLine = [
                u.tagline  || null,
                u.location || null,
                u.tasksCompleted ? `${u.tasksCompleted} tasks` : null,
            ].filter(Boolean).join(" · ") || "TaskHero member";

            const target = isMe
                ? "profile.html"
                : `profile.html?userId=${encodeURIComponent(u.id)}`;

            return `<a
                class="nav-search-result"
                href="${target}"
                role="option"
                aria-selected="false"
                data-idx="${i}"
                onclick="_navSearchClose()"
            >
                <div class="nav-search-avatar">${avatarHtml}</div>
                <div class="nav-search-info">
                    <div class="nav-search-name">${_highlightMatch(_esc(u.name), q)}</div>
                    <div class="nav-search-sub">${_esc(subLine)}</div>
                </div>
            </a>`;
        }).join("");
    }

    /* Keyboard navigation on the search input */
    document.addEventListener("keydown", function (e) {
        const input    = document.getElementById("navSearchInput");
        const dropdown = document.getElementById("navSearchDropdown");
        if (!input || document.activeElement !== input) return;
        if (!dropdown || !dropdown.classList.contains("open")) return;

        const items = dropdown.querySelectorAll(".nav-search-result");
        if (!items.length) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            _activeIndex = Math.min(_activeIndex + 1, items.length - 1);
            _updateActiveItem(items);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            _activeIndex = Math.max(_activeIndex - 1, -1);
            _updateActiveItem(items);
        } else if (e.key === "Enter" && _activeIndex >= 0) {
            e.preventDefault();
            items[_activeIndex].click();
        } else if (e.key === "Escape") {
            _closeDropdown();
            input.blur();
        }
    });

    function _updateActiveItem(items) {
        items.forEach((el, i) => {
            const active = i === _activeIndex;
            el.setAttribute("aria-selected", active);
            el.classList.toggle("nav-search-result--active", active);
            if (active) el.scrollIntoView({ block: "nearest" });
        });
    }

    /* Close when clicking outside */
    document.addEventListener("click", function (e) {
        const wrap = document.getElementById("navUserSearch");
        if (wrap && !wrap.contains(e.target)) _closeDropdown();
    });

    function _openDropdown() {
        const d = document.getElementById("navSearchDropdown");
        if (d) d.classList.add("open");
    }

    function _closeDropdown() {
        const d = document.getElementById("navSearchDropdown");
        if (d) { d.classList.remove("open"); _activeIndex = -1; }
    }

    /* Called from anchor onclick to close before navigation */
    window._navSearchClose = function () {
        _closeDropdown();
        const input = document.getElementById("navSearchInput");
        if (input) { input.value = ""; _lastQuery = ""; }
    };

    /* Escape HTML entities */
    function _esc(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    /* Wrap matched substring in <mark> */
    function _highlightMatch(escaped, query) {
        const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return escaped.replace(new RegExp(`(${safe})`, "i"), "<mark>$1</mark>");
    }

    /* Wire up keyboard: init is called after nav HTML is injected */
    window.initUserSearch = function () {
        // Nothing extra needed — event listeners use delegation / getElementById
        // and are already attached above via document-level listeners.
    };
}());

/* =========================================================
   INIT ON PAGE LOAD
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    loadNavigation();
});
