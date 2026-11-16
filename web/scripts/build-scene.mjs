import { readFile, writeFile } from "node:fs/promises";
import { TASKS } from "../src/task.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
const root = new URL("../public/franka/", import.meta.url);
const panda = await readFile(new URL("panda.xml", root), "utf8");
const box = (name, pos, size, color, extra = "") =>
  `<geom name="${name}" type="box" pos="${pos}" size="${size}" rgba="${color}" ${extra}/>`;
const white = "0.92 0.92 0.89 1",
  metal = "0.57 0.61 0.64 1",
  dark = "0.13 0.15 0.16 1";
const decorative = 'contype="0" conaffinity="0"';
async function roundedMesh(file, width, height, depth, radius) {
  const g = new RoundedBoxGeometry(width, height, depth, 3, radius);
  const p = g.getAttribute("position");
  const lines = ["# Generated rounded insertion-tool surface"];
  for (let i = 0; i < p.count; i++)
    lines.push(`v ${p.getX(i)} ${p.getY(i)} ${p.getZ(i)}`);
  for (let i = 0; i < p.count; i += 3)
    lines.push(`f ${i + 1} ${i + 2} ${i + 3}`);
  await writeFile(new URL(file, root), lines.join("\n") + "\n");
  g.dispose();
}
await roundedMesh("assets/charger-rounded.obj", 0.042, 0.036, 0.048, 0.004);
await roundedMesh("assets/usb-rounded.obj", 0.014, 0.0084, 0.044, 0.002);
// Both tasks start pre-grasped: tool is rigidly attached to the hand, not teleported.
// Open sockets are built from separate wall geoms, not solid boxes with painted holes.
for (const t of TASKS) {
  let tool = `<site name="tip" pos="0 0 ${t.tip}" size="0.001" rgba="0 0 0 0"/>`;
  if (t.key === "usb") {
    tool += box("usb_housing", "0 0 0.115", "0.007 0.0042 0.022", "0 0 0 0");
    tool += `<geom name="usb_housing_visual" type="mesh" mesh="usb_rounded" pos="0 0 0.115" rgba="${white}" ${decorative}/>`;
    tool += box("usb_shell", "0 0 0.1405", "0.004 0.0012 0.0045", metal);
    tool += `<geom name="usb_cable" type="capsule" fromto="0 0 0.093 0.035 0 0.075" size="0.002" rgba="${white}" ${decorative}/>`;
  } else {
    tool += box("charger_body", "0 0 0.116", "0.021 0.018 0.024", "0 0 0 0");
    tool += `<geom name="charger_body_visual" type="mesh" mesh="charger_rounded" pos="0 0 0.116" rgba="${white}" ${decorative}/>`;
    for (const sign of [-1, 1])
      tool += box(
        `blade_${sign < 0 ? "a" : "b"}`,
        `${sign * 0.00635} 0 0.148`,
        "0.0008 0.0032 0.008",
        metal,
      );
    tool += box(
      "charger_usb_port",
      "0 -0.0181 0.105",
      "0.0043 0.00015 0.0015",
      dark,
      decorative,
    );
  }
  const xml = panda
    .replace(/<keyframe>[\s\S]*?<\/keyframe>/, "")
    .replace(
      "<asset>",
      `<asset><mesh name="${t.key}_rounded" file="${t.key}-rounded.obj"/>`,
    )
    .replace(/(<body name="hand"[^>]*>)/, `$1\n${tool}`);
  await writeFile(
    new URL(`${t.key}.xml`, root),
    `<!-- Adapted Panda model: added pre-grasped insertion tool and tip site; removed keyframe. -->\n${xml}`,
  );
}
let fixtures = box(
  "table",
  "0.30 0 -0.025",
  "0.68 1.0 0.025",
  "0.48 0.51 0.52 1",
);
for (const t of TASKS) {
  fixtures += `<body name="${t.key}_fixture" pos="${t.x} ${t.y} 0">`;
  if (t.key === "usb") {
    fixtures += box(
      "usb_pedestal",
      "0 0 0.079",
      "0.042 0.034 0.079",
      "0.33 0.37 0.39 1",
    );
    fixtures += box(
      "usb_fixture_base",
      "0 0 0.166",
      "0.024 0.020 0.008",
      white,
    );
    // 9.4 × 3.8 mm opening, 8 mm deep. Shell outside width is 8 mm.
    for (const sign of [-1, 1]) {
      fixtures += box(
        `usb_wall_x${sign}`,
        `${sign * 0.00635} 0 0.184`,
        "0.00165 0.0045 0.008",
        metal,
      );
      fixtures += box(
        `usb_wall_y${sign}`,
        `0 ${sign * 0.0032} 0.184`,
        "0.0047 0.0013 0.008",
        metal,
      );
    }
    fixtures += box(
      "usb_socket_floor",
      "0 0 0.175",
      "0.0047 0.0019 0.001",
      dark,
    );
  } else {
    fixtures += box(
      "strip_support",
      "0 0 0.050",
      "0.14 0.045 0.05",
      "0.33 0.37 0.39 1",
    );
    fixtures += box("strip_base", "0 0 0.111", "0.135 0.033 0.011", white);
    // Three two-blade sockets. One is used; all have actual open collision slots.
    for (const x of [-0.084, 0, 0.084]) {
      fixtures += `<body name="outlet_${x}" pos="${x} 0 0.1335">`;
      fixtures += box(
        `outlet_mid_${x}`,
        "0 0 0",
        "0.00465 0.026 0.0115",
        white,
      );
      for (const sign of [-1, 1]) {
        fixtures += box(
          `outlet_side_${x}_${sign}`,
          `${sign * 0.025} 0 0`,
          "0.017 0.026 0.0115",
          white,
        );
        fixtures += box(
          `outlet_top_${x}_${sign}`,
          `0 ${sign * 0.015} 0`,
          "0.008 0.011 0.0115",
          white,
        );
      }
      fixtures += "</body>";
    }
    for (const sign of [-1, 1]) {
      fixtures += box(
        `strip_edge_${sign}`,
        `0 ${sign * 0.0295} .1335`,
        ".135 .0035 .0115",
        white,
      );
      fixtures += box(
        `strip_end_${sign}`,
        `${sign * 0.1305} 0 .1335`,
        ".0045 .026 .0115",
        white,
      );
    }
    fixtures += `<geom name="strip_cord" type="capsule" fromto="-0.135 0 0.115 -0.26 -0.035 0.015" size="0.004" rgba="${white}" ${decorative}/>`;
  }
  fixtures += "</body>";
}
const xml = `<mujoco model="precision insertion">
  <option timestep="0.002" integrator="implicitfast"/>
  <asset><model name="usb_arm" file="usb.xml"/><model name="charger_arm" file="charger.xml"/></asset>
  <worldbody>
    <geom name="floor" type="plane" pos="0 0 -0.055" size="3 3 0.01" rgba="0.77 0.77 0.71 1"/>
    <frame pos="0 -0.42 0"><attach model="usb_arm" body="link0" prefix="usb_"/></frame>
    <frame pos="0 0.42 0"><attach model="charger_arm" body="link0" prefix="charger_"/></frame>
    ${fixtures}
  </worldbody>
</mujoco>`;
await writeFile(new URL("scene.xml", root), xml);
