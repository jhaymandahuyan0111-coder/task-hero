/* Shared API configuration for local development and GitHub Pages. */
window.TASKHERO_API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000/api"
  : "https://taskhero-api.onrender.com/api";
