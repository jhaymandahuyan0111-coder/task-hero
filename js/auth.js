const API_BASE = "http://localhost:3000/api";
let isSignup = new URLSearchParams(window.location.search).get("mode") === "signup";

const form = document.getElementById("authForm");
const nameField = document.getElementById("nameField");
const nameInput = document.getElementById("name");
const passwordInput = document.getElementById("password");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authSubmit = document.getElementById("authSubmit");
const authError = document.getElementById("authError");
const switchPrompt = document.getElementById("switchPrompt");
const switchMode = document.getElementById("switchMode");
const googleButton = document.getElementById("googleButton");
const googleError = document.getElementById("googleError");

function updateMode() {
    nameField.hidden = !isSignup;
    nameInput.required = isSignup;
    authTitle.textContent = isSignup ? "Create your account" : "Sign in";
    authSubtitle.textContent = isSignup
        ? "Create an account to post tasks, accept work, and message people directly."
        : "Sign in to manage tasks and message people directly.";
    authSubmit.textContent = isSignup ? "Create account" : "Sign in";
    switchPrompt.textContent = isSignup ? "Already have an account?" : "New to TaskHero?";
    switchMode.textContent = isSignup ? "Sign in" : "Create an account";
    passwordInput.autocomplete = isSignup ? "new-password" : "current-password";
}

switchMode.addEventListener("click", () => {
    isSignup = !isSignup;
    authError.textContent = "";
    updateMode();
});

googleButton.addEventListener("click", () => {
    googleError.textContent = "Google sign-in needs a configured Google OAuth client ID.";
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    authError.textContent = "";
    authSubmit.disabled = true;
    authSubmit.textContent = isSignup ? "Creating account..." : "Signing in...";

    const payload = {
        email: document.getElementById("email").value.trim(),
        password: passwordInput.value,
    };
    if (isSignup) payload.name = nameInput.value.trim();

    try {
        const response = await fetch(`${API_BASE}/users/${isSignup ? "register" : "login"}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.errors?.join(" ") || result.message || "Unable to authenticate.");
        }

        localStorage.setItem("taskhero-user", JSON.stringify(result.data));
        const returnTo = new URLSearchParams(window.location.search).get("returnTo");
        window.location.href = returnTo || "home.html";
    } catch (error) {
        authError.textContent = error.message.includes("Failed to fetch")
            ? "The TaskHero server is unavailable. Start the backend and try again."
            : error.message;
        authSubmit.disabled = false;
        updateMode();
    }
});

updateMode();
