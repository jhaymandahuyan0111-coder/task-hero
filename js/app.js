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
function signOut()   { localStorage.removeItem("taskhero-user"); window.location.href = "home.html"; }

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
    const btn = document.getElementById("themeButton");
    if (btn) {
        btn.innerText = document.body.classList.contains("dark-mode") ? "☼" : "◐";
        btn.title = document.body.classList.contains("dark-mode")
            ? "Switch to Light Mode"
            : "Switch to Dark Mode";
    }
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
            loadTheme();      // apply saved theme
            setActiveNav();   // highlight correct button
        })
        .catch(err => console.warn("Navigation load failed:", err));
}

/* =========================================================
   INIT ON PAGE LOAD
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    loadNavigation();
});
