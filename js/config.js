// config.js
// BASE_URL = where the data/ folder lives.
// By default it's worked out from where this file is served, so the same code
// runs locally (python -m http.server) and on GitHub Pages without toggling.
// Override only if the data ever lives somewhere else.
export const CONFIG = {
  BASE_URL: new URL("..", import.meta.url).href.replace(/\/$/, ""),
};
