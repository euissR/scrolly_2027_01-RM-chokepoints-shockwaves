// hash.js: the chapter someone is reading, kept in the page address as  #db=choke:c_malacca
//
// Only the open tab and the selected chapter go in (never layers or the guiding-questions toggle).
// Written with replaceState, so clicking around neither jumps the page nor fills the back button.
// Anything that does not start with #db= (Drupal's endnote anchors, say) is left alone.

const KINDS = ["theatre", "choke", "shock", "theme", "region"];

// the route in the address, checked against the content; null if there is none or it is stale
export function readRoute(C) {
  const m = location.hash.match(/^#db=([a-z]+)(?::(.+))?$/);
  if (!m) return null;
  const [, type, id] = m;
  if (type === "patterns") return { type };
  if (!KINDS.includes(type) || !id) return null;
  const known = {
    theatre: C.T,
    choke: C.C,
    shock: C.S,
    theme: C.H,
    region: C.groups,
  }[type];
  return known?.[id] ? { type, id } : null;
}

// state -> route string (null = overview, no hash)
export function routeOf(state) {
  if (state.view === "pat") return "patterns";
  if (state.sel) return `${state.sel.t}:${state.sel.id}`;
  if (state.theme) return `theme:${state.theme}`;
  if (state.region) return `region:${state.region}`;
  return null;
}

export function writeRoute(route) {
  const base = location.pathname + location.search;
  if (route) {
    history.replaceState(history.state, "", `${base}#db=${route}`);
  } else if (location.hash.startsWith("#db=")) {
    history.replaceState(history.state, "", base); // back to the overview: drop our hash, keep anyone else's
  }
}
