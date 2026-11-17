// hash.js: the chapter someone is reading, kept in the page address as  #db=choke:c_malacca
//
//   #db=region:indo   a region overview          #db=choke:c_malacca / #db=shock:s_scs   a sub-chapter
//   #db=concl         the conclusions            (no hash)   the introduction
//
// Written with replaceState, so clicking around neither jumps the page nor fills the back button.
// Anything that does not start with #db= (Drupal's endnote anchors, say) is left alone.

const KINDS = ["choke", "shock", "region"];

// the route in the address, checked against the content; null if there is none or it is stale
export function readRoute(D) {
  const m = location.hash.match(/^#db=([a-z]+)(?::(.+))?$/);
  if (!m) return null;
  const [, type, id] = m;
  if (type === "intro" || type === "concl") return { type };
  if (!KINDS.includes(type) || !id) return null;
  const known = { choke: D.C, shock: D.S, region: D.R }[type];
  return known?.[id] ? { type, id } : null;
}

// state -> route string (null = introduction, no hash)
export function routeOf(state) {
  if (state.sel) return `${state.sel.t}:${state.sel.id}`;
  if (state.chap === "intro") return null;
  if (state.chap === "concl") return "concl";
  return `region:${state.chap}`;
}

export function writeRoute(route) {
  const base = location.pathname + location.search;
  if (route) {
    history.replaceState(history.state, "", `${base}#db=${route}`);
  } else if (location.hash.startsWith("#db=")) {
    history.replaceState(history.state, "", base); // back to the introduction: drop our hash, keep anyone else's
  }
}
