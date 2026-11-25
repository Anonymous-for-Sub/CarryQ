import { readFile, writeFile } from "node:fs/promises";
import { TASKS } from "../src/task.js";
import { WORKCELL_COLORS, linearRgba } from "../src/workcellAppearance.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { capsuleRing, outletDeck } from "./connector-meshes.mjs";
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
await roundedMesh("assets/strip-base.obj", 0.292, 0.072, 0.023, 0.007);
await roundedMesh("assets/usb-base.obj", 0.048, 0.04, 0.016, 0.004);
await capsuleRing(
  new URL("assets/usb-shell.obj", root),
  [0.008, 0.0024],
  [0.0068, 0.0016],
  0.009,
);
await capsuleRing(
  new URL("assets/socket-rim.obj", root),
  [0.0108, 0.005],
  [0.0088, 0.003],
  0.018,
);
await capsuleRing(
  new URL("assets/charger-port.obj", root),
  [0.01, 0.004],
  [0.0084, 0.0026],
  0.0007,
);
await outletDeck(new URL("assets/strip-cover.obj", root));
// Both tasks start pre-grasped: tool is rigidly attached to the hand, not teleported.
// Open sockets are built from separate wall geoms, not solid boxes with painted holes.
for (const t of TASKS) {
  let tool = `<site name="tip" pos="0 0 ${t.tip}" size="0.001" rgba="0 0 0 0"/>`;
  if (t.key === "usb") {
    tool += box("usb_housing", "0 0 0.115", "0.007 0.0042 0.022", "0 0 0 0");
    tool += `<geom name="usb_housing_visual" type="mesh" mesh="usb_rounded" pos="0 0 0.115" rgba="${white}" ${decorative}/>`;
    tool += `<geom name="usb_shell_visual" type="mesh" mesh="usb_shell_mesh" pos="0 0 .1405" rgba="${metal}" ${decorative}/>`;
    for (const sign of [-1, 1]) {
      tool += box(
        `shell_x_${sign}`,
        `${sign * 0.0037} 0 .1405`,
        ".0003 .0012 .0045",
        "0 0 0 0",
      );
      tool += box(
        `shell_y_${sign}`,
        `0 ${sign * 0.001} .1405`,
        ".0034 .0002 .0045",
        "0 0 0 0",
      );
    }
    tool += `<geom name="strain_relief" type="capsule" fromto="0 0 .093 0 0 .087" size=".0027" rgba="${white}" ${decorative}/>`;
    for (let i = 0; i < 3; i++)
      tool += `<geom name="cable_rib_${i}" type="cylinder" pos="0 0 ${0.088 + i * 0.0016}" size=".0029 .00025" rgba=".77 .78 .76 1" ${decorative}/>`;
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
    tool += `<geom name="charger_port_rim" type="mesh" mesh="charger_port_mesh" pos="0 -.0183 .105" euler="1.5707963 0 0" rgba="${metal}" ${decorative}/>`;
    tool += box(
      "charger_port_tongue",
      "0 -.01865 .105",
      ".0028 .00015 .0003",
      "0.27 .28 .27 1",
      decorative,
    );
    tool += box(
      "charger_seam",
      "0 -.01798 .134",
      ".017 .00015 .0003",
      "0.71 .72 .70 1",
      decorative,
    );
  }
  const xml = panda
    .replace(/<keyframe>[\s\S]*?<\/keyframe>/, "")
    .replace(
      "<asset>",
      `<asset><mesh name="${t.key}_rounded" file="${t.key}-rounded.obj"/>${t.key === "usb" ? '<mesh name="usb_shell_mesh" file="usb-shell.obj"/>' : '<mesh name="charger_port_mesh" file="charger-port.obj"/>'}`,
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
  linearRgba(WORKCELL_COLORS.mat),
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
      "0 0 0 0",
    );
    fixtures += `<geom name="usb_base_visual" type="mesh" mesh="usb_base_mesh" pos="0 0 .166" rgba="${white}" ${decorative}/>`;
    // 9.4 × 3.8 mm opening, 8 mm deep. Shell outside width is 8 mm.
    for (const sign of [-1, 1]) {
      fixtures += box(
        `usb_wall_x${sign}`,
        `${sign * 0.00635} 0 0.184`,
        "0.00165 0.0045 0.008",
        "0 0 0 0",
      );
      fixtures += box(
        `usb_wall_y${sign}`,
        `0 ${sign * 0.0032} 0.184`,
        "0.0047 0.0013 0.008",
        "0 0 0 0",
      );
    }
    fixtures += box(
      "usb_socket_floor",
      "0 0 0.175",
      "0.0047 0.0019 0.001",
      dark,
    );
    fixtures += `<geom name="socket_rim_visual" type="mesh" mesh="socket_rim_mesh" pos="0 0 .183" rgba="${metal}" ${decorative}/>`;
    fixtures += box(
      "socket_tongue",
      "0 0 .184",
      ".0027 .00028 .006",
      "0.23 .25 .25 1",
      decorative,
    );
    for (let i = 0; i < 6; i++)
      fixtures += box(
        `socket_contact_${i}`,
        `${(i - 2.5) * 0.00075} -.0003 .187`,
        ".00012 .00006 .0017",
        "0.72 .57 .27 1",
        decorative,
      );
    for (const x of [-0.018, 0.018])
      fixtures += `<geom name="usb_mount_${x}" type="cylinder" pos="${x} 0 .1742" size=".002 .0004" rgba="${metal}" ${decorative}/>`;
  } else {
    fixtures += box(
      "strip_support",
      "0 0 0.050",
      "0.14 0.045 0.05",
      "0.33 0.37 0.39 1",
    );
    fixtures += box("strip_base", "0 0 0.111", "0.135 0.033 0.011", "0 0 0 0");
    fixtures += `<geom name="strip_base_visual" type="mesh" mesh="strip_base_mesh" pos="0 0 .1105" rgba="${white}" ${decorative}/>`;
    fixtures += `<geom name="strip_cover_visual" type="mesh" mesh="strip_cover_mesh" pos="0 0 .1335" rgba="${white}" ${decorative}/>`;
    // Three two-blade sockets. One is used; all have actual open collision slots.
    for (const x of [-0.084, 0, 0.084]) {
      fixtures += `<body name="outlet_${x}" pos="${x} 0 0.1335">`;
      fixtures += box(
        `outlet_mid_${x}`,
        "0 0 0",
        "0.00465 0.026 0.0115",
        "0 0 0 0",
      );
      for (const sign of [-1, 1]) {
        fixtures += box(
          `outlet_side_${x}_${sign}`,
          `${sign * 0.025} 0 0`,
          "0.017 0.026 0.0115",
          "0 0 0 0",
        );
        fixtures += box(
          `outlet_top_${x}_${sign}`,
          `0 ${sign * 0.015} 0`,
          "0.008 0.011 0.0115",
          "0 0 0 0",
        );
      }
      fixtures += "</body>";
      // Recessed dark slot liners and a subtle socket-face border.
      for (const sign of [-1, 1])
        fixtures += box(
          `slot_liner_${x}_${sign}`,
          `${x + sign * 0.00635} 0 .1224`,
          ".0017 .004 .0003",
          dark,
          decorative,
        );
      for (const sign of [-1, 1]) {
        fixtures += box(
          `face_side_${x}_${sign}`,
          `${x + sign * 0.032} 0 .14505`,
          ".0002 .022 .00007",
          "0.72 .73 .71 1",
          decorative,
        );
        fixtures += box(
          `face_end_${x}_${sign}`,
          `${x} ${sign * 0.022} .14505`,
          ".032 .0002 .00007",
          "0.72 .73 .71 1",
          decorative,
        );
      }
    }
    for (const sign of [-1, 1]) {
      fixtures += box(
        `strip_edge_${sign}`,
        `0 ${sign * 0.0295} .1335`,
        ".135 .0035 .0115",
        "0 0 0 0",
      );
      fixtures += box(
        `strip_end_${sign}`,
        `${sign * 0.1305} 0 .1335`,
        ".0045 .026 .0115",
        "0 0 0 0",
      );
    }
    fixtures += box(
      "switch_frame",
      "-.139 0 .126",
      ".006 .012 .0012",
      dark,
      decorative,
    );
    fixtures += box(
      "switch_rocker",
      "-.139 0 .128",
      ".0045 .009 .0015",
      ".43 .45 .44 1",
      decorative,
    );
    fixtures += box(
      "switch_mark",
      "-.139 -.004 .1296",
      ".0004 .002 .0001",
      white,
      decorative,
    );
    fixtures += `<geom name="cord_boot" type="capsule" fromto="-.144 0 .113 -.159 0 .113" size=".005" rgba="${white}" ${decorative}/>`;
    for (let i = 0; i < 4; i++)
      fixtures += `<geom name="cord_boot_rib_${i}" type="cylinder" pos="${-0.148 - i * 0.003} 0 .113" euler="0 1.5707963 0" size=".0054 .00045" rgba=".76 .77 .74 1" ${decorative}/>`;
  }
  fixtures += "</body>";
}
const xml = `<mujoco model="precision insertion">
  <option timestep="0.002" integrator="implicitfast"/>
  <asset><model name="usb_arm" file="usb.xml"/><model name="charger_arm" file="charger.xml"/>
    <mesh name="socket_rim_mesh" file="assets/socket-rim.obj"/>
    <mesh name="strip_base_mesh" file="assets/strip-base.obj"/>
    <mesh name="strip_cover_mesh" file="assets/strip-cover.obj"/>
    <mesh name="usb_base_mesh" file="assets/usb-base.obj"/>
  </asset>
  <worldbody>
    <geom name="floor" type="plane" pos="0 0 -0.055" size="3 3 0.01" rgba="${linearRgba(WORKCELL_COLORS.floor)}"/>
    <frame pos="0 -0.42 0"><attach model="usb_arm" body="link0" prefix="usb_"/></frame>
    <frame pos="0 0.42 0"><attach model="charger_arm" body="link0" prefix="charger_"/></frame>
    ${fixtures}
  </worldbody>
</mujoco>`;
await writeFile(new URL("scene.xml", root), xml);
