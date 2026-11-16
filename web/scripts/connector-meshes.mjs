import { Shape, Path, ExtrudeGeometry } from "three";
import { writeFile } from "node:fs/promises";

function capsule(path, width, height) {
  const r = height / 2,
    c = width / 2 - r;
  path.moveTo(-c, -r);
  path.lineTo(c, -r);
  path.absarc(c, 0, r, -Math.PI / 2, Math.PI / 2, false);
  path.lineTo(-c, r);
  path.absarc(-c, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  path.closePath();
  return path;
}

// A genuinely open, rounded USB-C shell. Physics walls are defined separately.
export async function capsuleRing(file, outer, inner, depth) {
  const shape = capsule(new Shape(), ...outer);
  shape.holes.push(capsule(new Path(), ...inner));
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 16,
  });
  geometry.translate(0, 0, -depth / 2);
  const p = geometry.getAttribute("position"),
    lines = ["# Generated hollow connector shell"];
  for (let i = 0; i < p.count; i++)
    lines.push(`v ${p.getX(i)} ${p.getY(i)} ${p.getZ(i)}`);
  for (let i = 0; i < p.count; i += 3)
    lines.push(`f ${i + 1} ${i + 2} ${i + 3}`);
  await writeFile(file, lines.join("\n") + "\n");
  geometry.dispose();
}

function roundedRect(path, x, y, w, h, r) {
  const l = x - w / 2,
    b = y - h / 2;
  path.moveTo(l + r, b);
  path.lineTo(l + w - r, b);
  path.quadraticCurveTo(l + w, b, l + w, b + r);
  path.lineTo(l + w, b + h - r);
  path.quadraticCurveTo(l + w, b + h, l + w - r, b + h);
  path.lineTo(l + r, b + h);
  path.quadraticCurveTo(l, b + h, l, b + h - r);
  path.lineTo(l, b + r);
  path.quadraticCurveTo(l, b, l + r, b);
  path.closePath();
  return path;
}
export async function outletDeck(file) {
  const shape = roundedRect(new Shape(), 0, 0, 0.27, 0.066, 0.005);
  for (const x of [-0.084, 0, 0.084])
    for (const sign of [-1, 1])
      shape.holes.push(
        roundedRect(new Path(), x + sign * 0.00635, 0, 0.0034, 0.008, 0.0006),
      );
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.023,
    bevelEnabled: false,
    curveSegments: 12,
  });
  geometry.translate(0, 0, -0.0115);
  const p = geometry.getAttribute("position"),
    lines = ["# Generated power-strip cover with six open blade slots"];
  for (let i = 0; i < p.count; i++)
    lines.push(`v ${p.getX(i)} ${p.getY(i)} ${p.getZ(i)}`);
  for (let i = 0; i < p.count; i += 3)
    lines.push(`f ${i + 1} ${i + 2} ${i + 3}`);
  await writeFile(file, lines.join("\n") + "\n");
  geometry.dispose();
}
