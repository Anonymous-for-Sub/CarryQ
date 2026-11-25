// Presentation colors only; no geometry, controller or physics changes.
export const WORKCELL_COLORS = {
  background: "#242a36",
  floor: "#3a3c43",
  mat: "#294c72",
  gridMajor: "#596172",
  gridMinor: "#424853",
};

export function linearRgba(hex) {
  const channels = hex.match(/[\da-f]{2}/gi).map(value => parseInt(value, 16) / 255);
  return [...channels.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4), 1].join(" ");
}
