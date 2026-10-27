// theme.js: EUISS palette and shared chart settings

export const theme = {
  // palette
  teal: "#309ebe",
  fuchsia: "#df3144",
  navy: "#1d3956",
  orange: "#f28d22",
  teal3: "#1d3956",
  fuchsia2: "#df3144",
  fuchsia3: "#a41e26",
  lightorange: "#f9b466",
  teal2: "#376882",
  mauve: "#33163a",
  mint: "#99cb92",
  egg: "#ffde75",
  grey: "#595959",
  light: "#c6c6c6",
  light: "#ececec",
  nearWhite: "#f9f9f9",
  // neutral: "#1a1a1a", // 90% black; deliberately not the EU teal
  neutral: "#333333",
  ink: "#1d1d1b",
  muted: "#646363",

  // one colour per actor, the same in every chart (keys = actor codes in actors.csv).
  // Actors without an entry (and "other") use `light`.
  actorColors: {
    EU: "#309ebe", // teal
    USA: "#1d3956", // teal3
    CHN: "#df3144", // fuchsia2
    RUS: "#a41e26", // fuchsia3
    TUR: "#f9b466", // lightorange
    ISR: "#376882", // teal2
    IRN: "#99cb92", // mint
    IND: "#ffde75", // egg
    JPN: "#595959", // grey
    GCC: "#7e24a8", // purple
    gcc: "#7e24a8", // purple
    // individual Gulf states (official finance) share the Gulf colour: the rows are named
    SAU: "#7e24a8",
    OMN: "#7e24a8",
    BHR: "#7e24a8",
    ARE: "#7e24a8",
    QAT: "#7e24a8",
    KWT: "#7e24a8",
    KOR: "#4fd6d0", // aqua
    // France and Germany (soft power chapter, rows "of which") use the EU colour: no new colour
    FRA: "#309ebe",
    DEU: "#309ebe",
  },

  // deployment types (spikes), kept apart from the actor colours
  typeColors: {
    Bilateral: "#33163a", // mauve
    PMC: "#a41e26", // fuchsia3
    UN: "#595959", // frog
    Other: "#8e8e8e",
  },

  // maps: white land with light-grey outlines on the page background
  land: "#ffffff",
  border: "#c6c6c6",

  font: "'PT Sans Narrow', 'Arial Narrow', sans-serif",

  // dimmed items keep their own colour at this opacity
  dim: 0.2,

  // transition length in ms (0 when the reader prefers reduced motion)
  duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700,
};
