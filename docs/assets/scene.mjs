import * as THREE from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const palette = {
  ivory: 0xf4f3e9,
  white: 0xf9faf6,
  metal: 0xa4afa9,
  dark: 0x273b36,
  black: 0x18251f,
  green: 0x376f5a,
  orange: 0xca8859,
  table: 0xdbe0d5,
};
function mat(color, roughness = 0.6, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function mesh(parent, geometry, material, position = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(parent, w, h, d, material, pos = [0, 0, 0], r = 0.002) {
  return mesh(
    parent,
    new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3)),
    material,
    pos,
  );
}
function cylinder(parent, r, h, material, pos = [0, 0, 0]) {
  return mesh(parent, new THREE.CylinderGeometry(r, r, h, 24), material, pos);
}
function rounded(w, h, r, Path = THREE.Shape) {
  const p = new Path(),
    x = -w / 2,
    y = -h / 2;
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r);
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r);
  p.quadraticCurveTo(x, y, x + r, y);
  return p;
}
function rim(parent, w, h, iw, ih, depth, material, pos = [0, 0, 0]) {
  const s = rounded(w, h, h / 2);
  s.holes.push(rounded(iw, ih, ih / 2, THREE.Path));
  return mesh(
    parent,
    new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: false,
      curveSegments: 12,
    }),
    material,
    pos,
  );
}
function label(parent, text, w, pos, fg = "#dbe9df", bg = "#28483b") {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = fg;
  ctx.font = "500 38px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 384, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = mesh(
    parent,
    new THREE.PlaneGeometry(w, w / 6),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
    pos,
  );
  m.rotation.x = -Math.PI / 2;
  m.castShadow = false;
  return m;
}
function line(parent, points, color, r = 0.002) {
  const curve = new THREE.CatmullRomCurve3(points);
  return mesh(
    parent,
    new THREE.TubeGeometry(curve, 40, r, 8, false),
    mat(color, 0.9),
  );
}
function receptacle(parent, pos, rotation = 0) {
  const g = new THREE.Group();
  g.position.set(...pos);
  g.rotation.x = rotation;
  parent.add(g);
  const metal = mat(0x949d98, 0.26, 0.55),
    black = mat(0x15211d, 0.8);
  rim(g, 0.016, 0.0068, 0.0137, 0.0049, 0.0015, metal, [0, 0, -0.0015]);
  box(g, 0.0133, 0.0045, 0.001, black, [0, 0, -0.005], 0.001);
  box(g, 0.01, 0.0011, 0.003, mat(0x62665e), [0, 0, -0.0026], 0.0003);
  for (let i = 0; i < 10; i++)
    box(
      g,
      0.0004,
      0.00018,
      0.0016,
      mat(0xbc9e64, 0.3, 0.6),
      [-0.0042 + i * 0.00093, 0.00063, -0.002],
      0.00004,
    );
  return g;
}
function usbPlug() {
  const g = new THREE.Group();
  const metal = mat(0xbcc6c3, 0.25, 0.55);
  rim(g, 0.0133, 0.0051, 0.0115, 0.0034, 0.0085, metal);
  box(g, 0.0108, 0.0028, 0.001, mat(0x26322e), [0, 0, 0.007], 0.0005);
  box(g, 0.0165, 0.009, 0.024, mat(palette.ivory, 0.35), [0, 0, 0.0205], 0.004);
  for (let z = 0.035; z < 0.046; z += 0.0025) {
    const r = cylinder(g, 0.004, 0.0018, mat(0xdddcd3), [0, 0, z]);
    r.rotation.x = Math.PI / 2;
  }
  return g;
}
function charger() {
  const g = new THREE.Group();
  const white = mat(palette.white, 0.3);
  box(g, 0.06, 0.061, 0.046, white, [0, 0.0465, 0], 0.007);
  box(g, 0.058, 0.0012, 0.044, mat(0xd9ded5), [0, 0.017, 0], 0.0005);
  for (const x of [-0.007, 0.007]) {
    box(
      g,
      0.004,
      0.016,
      0.0018,
      mat(0xbac1bc, 0.22, 0.65),
      [x, 0.008, 0],
      0.0005,
    );
    const hole = mesh(g, new THREE.CircleGeometry(0.0011, 12), mat(0x617069), [
      x,
      0.004,
      0.00094,
    ]);
    hole.castShadow = false;
  }
  receptacle(g, [0, 0.0772, 0], -Math.PI / 2);
  return g;
}
function createRobot(scene, base, color, handWidth) {
  const group = new THREE.Group();
  scene.add(group);
  const white = mat(palette.ivory, 0.4),
    dark = mat(palette.dark, 0.4, 0.2),
    accent = mat(color, 0.4);
  box(group, 0.145, 0.026, 0.14, dark, [base.x, 0.773, base.z], 0.014);
  cylinder(group, 0.054, 0.095, white, [base.x, 0.825, base.z]);
  cylinder(group, 0.056, 0.013, accent, [base.x, 0.851, base.z]);
  const shoulder = V(base.x, 0.91, base.z);
  const joints = [0, 1, 2].map(() =>
    mesh(group, new THREE.SphereGeometry(0.039, 20, 12), dark),
  );
  const links = [0, 1].map(() => {
    const g = new THREE.Group();
    group.add(g);
    const outer = cylinder(g, 0.034, 1, white);
    const accentStrip = box(
      g,
      0.018,
      0.55,
      0.003,
      accent,
      [0, 0, 0.033],
      0.001,
    );
    return { g, outer, accentStrip };
  });
  const wrist = cylinder(group, 0.025, 0.05, white);
  const hand = new THREE.Group();
  group.add(hand);
  box(hand, 0.068, 0.025, 0.042, dark, [0, 0, 0], 0.006);
  box(hand, 0.052, 0.006, 0.043, accent, [0, 0.012, 0], 0.002);
  for (const s of [-1, 1]) {
    box(
      hand,
      0.009,
      0.05,
      0.025,
      mat(0x7d8b85, 0.4, 0.5),
      [s * handWidth, -0.033, 0],
      0.002,
    );
    box(
      hand,
      0.008,
      0.015,
      0.025,
      dark,
      [s * (handWidth - 0.003), -0.054, 0],
      0.002,
    );
  }
  // A small wrist camera housing is illustrative, not a calibrated sensor model.
  box(hand, 0.042, 0.018, 0.02, mat(0x525d57), [0, 0.005, -0.037], 0.003);
  for (const x of [-0.012, 0.012]) {
    const lens = cylinder(hand, 0.005, 0.003, mat(0x0f2b36, 0.15), [
      x,
      0.005,
      -0.049,
    ]);
    lens.rotation.x = Math.PI / 2;
  }
  return {
    update(target, yaw = 0) {
      const end = target.clone();
      const d = end.clone().sub(shoulder);
      const length = Math.min(0.57, Math.max(0.12, d.length()));
      const direction = d.normalize();
      let up = V(0, 1, 0).addScaledVector(direction, -direction.y);
      if (up.length() < 0.01) up = V(0, 0, 1);
      up.normalize();
      const a = (0.31 ** 2 - 0.29 ** 2 + length ** 2) / (2 * length),
        h = Math.sqrt(Math.max(0, 0.31 ** 2 - a * a));
      const elbow = shoulder
        .clone()
        .addScaledVector(direction, a)
        .addScaledVector(up, h);
      const points = [shoulder, elbow, end];
      joints.forEach((j, i) => j.position.copy(points[i]));
      links.forEach((link, i) => {
        const v = points[i + 1].clone().sub(points[i]);
        link.g.position.copy(points[i]).addScaledVector(v, 0.5);
        link.g.quaternion.setFromUnitVectors(V(0, 1, 0), v.clone().normalize());
        link.g.scale.y = v.length();
      });
      hand.position.copy(end).add(V(0, -0.047, 0));
      hand.rotation.y = yaw;
      wrist.position.copy(end).add(V(0, -0.018, 0));
    },
  };
}

export function createScene(viewport, insetCanvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9eee8);
  scene.fog = new THREE.Fog(0xe9eee8, 3.5, 8);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  viewport.appendChild(renderer.domElement);
  const detailRenderer = new THREE.WebGLRenderer({
    canvas: insetCanvas,
    antialias: true,
    powerPreference: "low-power",
  });
  detailRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  detailRenderer.outputColorSpace = THREE.SRGBColorSpace;
  detailRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  detailRenderer.toneMappingExposure = 1.25;
  const camera = new THREE.PerspectiveCamera(37, 1, 0.005, 20);
  const detailCamera = new THREE.PerspectiveCamera(30, 1, 0.001, 5);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.07;
  controls.maxDistance = 3.6;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.target.set(0, 0.86, 0);
  camera.position.set(1.18, 1.64, 1.65);
  controls.update();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x899c82, 2.3));
  const light = new THREE.DirectionalLight(0xfff6e8, 3.4);
  light.position.set(-1.1, 3, 1.5);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, {
    left: -1.3,
    right: 1.3,
    top: 1.4,
    bottom: -1.1,
    near: 0.1,
    far: 6,
  });
  light.shadow.bias = -0.0002;
  scene.add(light);
  const fill = new THREE.DirectionalLight(0xd7eee7, 1.5);
  fill.position.set(2, 1.8, -2);
  scene.add(fill);
  const floor = mesh(scene, new THREE.PlaneGeometry(100, 100), mat(0xe9eee8));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  floor.castShadow = false;
  const white = mat(palette.ivory, 0.6),
    steel = mat(0xbac6bc, 0.55, 0.2),
    dark = mat(palette.dark, 0.5);
  box(scene, 1.48, 0.055, 0.85, mat(palette.table), [0, 0.7325, 0], 0.014);
  box(scene, 1.4, 0.025, 0.78, mat(0x87968a, 0.65), [0, 0.695, 0], 0.004);
  for (const x of [-0.63, 0.63])
    for (const z of [-0.32, 0.32]) {
      box(scene, 0.045, 0.66, 0.045, steel, [x, 0.36, z], 0.002);
      box(scene, 0.07, 0.025, 0.07, dark, [x, 0.033, z], 0.004);
    }
  for (const x of [-0.63, 0.63])
    box(scene, 0.03, 0.03, 0.64, steel, [x, 0.25, 0]);
  // Two independent task fixtures on one shared work surface.
  const usbTarget = V(-0.275, 0.863, 0.035),
    acTarget = V(0.26, 0.81, -0.045);
  box(scene, 0.27, 0.008, 0.34, mat(0x6f8b79), [-0.275, 0.764, -0.04], 0.018);
  box(scene, 0.47, 0.008, 0.34, mat(0xa8957c), [0.26, 0.764, -0.04], 0.018);
  label(scene, "01   USB-C  /  ALIGN + INSERT", 0.235, [-0.275, 0.769, 0.107]);
  label(
    scene,
    "02   CHARGER  /  DUAL-PIN ALIGNMENT",
    0.4,
    [0.26, 0.769, 0.107],
    "#fff3df",
    "#8a7052",
  );
  // Fixed adapter receptacle: a front plate with a genuine aperture.
  box(scene, 0.1, 0.045, 0.086, mat(0x435c4d), [-0.275, 0.79, -0.002], 0.008);
  box(scene, 0.065, 0.064, 0.052, white, [-0.275, 0.8445, 0.005], 0.007);
  // Cutout centered at port height; outer plate is asymmetric around the opening.
  const plate = new THREE.Shape();
  plate.moveTo(-0.03, -0.047);
  plate.lineTo(0.03, -0.047);
  plate.lineTo(0.03, 0.012);
  plate.lineTo(-0.03, 0.012);
  plate.closePath();
  plate.holes.push(rounded(0.016, 0.0068, 0.0034, THREE.Path));
  mesh(
    scene,
    new THREE.ExtrudeGeometry(plate, { depth: 0.001, bevelEnabled: false }),
    white,
    [usbTarget.x, usbTarget.y, usbTarget.z - 0.002],
  );
  box(
    scene,
    0.014,
    0.005,
    0.001,
    mat(palette.black),
    [usbTarget.x, usbTarget.y, usbTarget.z - 0.003],
    0.001,
  );
  receptacle(scene, usbTarget.toArray());
  for (const x of [-0.318, -0.232])
    box(scene, 0.009, 0.078, 0.066, steel, [x, 0.827, -0.005], 0.002);
  const plug = usbPlug();
  scene.add(plug);
  let cable;
  const cableMat = mat(0xd5d9cc, 0.7);
  // Power strip top has actual modeled holes, including a pair for the active adapter.
  box(scene, 0.39, 0.035, 0.096, white, [0.26, 0.7885, -0.045], 0.012);
  const top = rounded(0.38, 0.088, 0.012);
  for (const cx of [-0.125, 0, 0.125])
    for (const dx of [-0.007, 0.007]) {
      const hole = new THREE.Path();
      hole.moveTo(cx + dx - 0.003, -0.002);
      hole.lineTo(cx + dx - 0.003, 0.002);
      hole.lineTo(cx + dx + 0.003, 0.002);
      hole.lineTo(cx + dx + 0.003, -0.002);
      hole.closePath();
      top.holes.push(hole);
    }
  const topMesh = mesh(
    scene,
    new THREE.ExtrudeGeometry(top, { depth: 0.003, bevelEnabled: false }),
    white,
    [0.26, 0.81, -0.045],
  );
  topMesh.rotation.x = -Math.PI / 2;
  for (const cx of [-0.125, 0, 0.125]) {
    box(
      scene,
      0.055,
      0.002,
      0.036,
      mat(0xe7e9e1),
      [0.26 + cx, 0.807, -0.045],
      0.006,
    );
    for (const dx of [-0.007, 0.007])
      box(
        scene,
        0.006,
        0.002,
        0.004,
        mat(0x17231b),
        [0.26 + cx + dx, 0.809, -0.045],
        0.0005,
      );
  }
  // A static indicator on the power strip is decorative, not an electrical reading.
  box(scene, 0.017, 0.003, 0.011, mat(0xb6c4b6), [0.423, 0.815, -0.017], 0.004);
  line(
    scene,
    [
      V(0.455, 0.789, -0.045),
      V(0.52, 0.79, -0.1),
      V(0.6, 0.77, -0.26),
      V(0.72, 0.75, -0.35),
      V(0.79, 0.5, -0.38),
    ],
    0xbbbfb2,
    0.004,
  );
  const adapter = charger();
  scene.add(adapter);
  // Table fixtures and a fixed global-view camera make the scene a coherent workcell.
  for (const x of [-0.68, 0.68]) {
    cylinder(scene, 0.019, 0.37, steel, [x, 0.945, -0.32]);
    box(scene, 0.045, 0.008, 0.05, dark, [x, 0.765, -0.32], 0.003);
  }
  box(scene, 1.36, 0.025, 0.025, steel, [0, 1.125, -0.32], 0.004);
  box(scene, 0.1, 0.035, 0.035, mat(0x465750), [0, 1.107, -0.303], 0.005);
  for (const x of [-0.033, 0.033]) {
    const lens = cylinder(scene, 0.009, 0.003, mat(0x152b35, 0.2), [
      x,
      1.107,
      -0.283,
    ]);
    lens.rotation.x = Math.PI / 2;
  }
  label(
    scene,
    "PRECISION WORKCELL  /  CARRYQ",
    0.42,
    [0, 0.7625, 0.35],
    "#4f6655",
    "#dbe0d5",
  );
  const armA = createRobot(scene, V(-0.54, 0.76, 0.19), palette.green, 0.014),
    armB = createRobot(scene, V(0.53, 0.76, 0.19), palette.orange, 0.036);
  const targetRings = {};
  for (const key of ["usb", "ac"]) {
    const r = mesh(
      scene,
      new THREE.TorusGeometry(key === "usb" ? 0.023 : 0.03, 0.0006, 6, 64),
      new THREE.MeshBasicMaterial({
        color: palette.green,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    );
    r.castShadow = false;
    r.position.copy(key === "usb" ? usbTarget : acTarget);
    if (key === "ac") r.rotation.x = -Math.PI / 2;
    else r.position.z += 0.002;
    targetRings[key] = r;
  }
  const presets = {
    overview: { pos: V(1.18, 1.64, 1.65), target: V(0, 0.84, 0) },
    usb: {
      pos: V(-0.1, 1.0, 0.39),
      target: usbTarget.clone().add(V(0, 0.01, 0.025)),
    },
    ac: {
      pos: V(0.04, 1.08, 0.36),
      target: acTarget.clone().add(V(0, 0.035, 0)),
    },
    top: { pos: V(0.001, 2.25, 0.05), target: V(0, 0.78, 0) },
  };
  let transition = null,
    frame = 0,
    lastCable = V(100, 100, 100);
  function setView(view, instant = false) {
    const preset = presets[view] || presets.overview;
    if (instant) {
      camera.position.copy(preset.pos);
      controls.target.copy(preset.target);
      controls.update();
      transition = null;
    } else
      transition = {
        from: camera.position.clone(),
        to: preset.pos.clone(),
        start: controls.target.clone(),
        end: preset.target.clone(),
        t: 0,
      };
  }
  controls.addEventListener("start", () => {
    transition = null;
  });
  function resize() {
    const r = viewport.getBoundingClientRect();
    renderer.setSize(r.width, r.height);
    camera.aspect = r.width / r.height;
    camera.fov = camera.aspect < 0.9 ? 57 : 37;
    camera.updateProjectionMatrix();
    const ir = insetCanvas.parentElement.getBoundingClientRect();
    detailRenderer.setSize(ir.width, ir.height, false);
    detailCamera.aspect = ir.width / ir.height;
    detailCamera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);
  observer.observe(insetCanvas.parentElement);
  resize();
  function render(state, dt) {
    const a = state.tasks.usb,
      b = state.tasks.ac;
    plug.position.copy(usbTarget).add(V(a.x / 1000, a.y / 1000, a.gap / 1000));
    plug.rotation.z = (a.angle * Math.PI) / 180;
    adapter.position
      .copy(acTarget)
      .add(V(b.x / 1000, b.gap / 1000, b.y / 1000));
    adapter.rotation.y = (b.angle * Math.PI) / 180;
    armA.update(plug.position.clone().add(V(0, 0.099, 0.023)), 0);
    armB.update(
      adapter.position.clone().add(V(0, 0.141, 0)),
      (b.angle * Math.PI) / 180,
    );
    const start = plug.position.clone().add(V(0, 0, 0.045));
    if (start.distanceTo(lastCable) > 0.0002) {
      if (cable) {
        scene.remove(cable);
        cable.geometry.dispose();
      }
      const curve = new THREE.CatmullRomCurve3([
        start,
        start.clone().add(V(0, -0.025, 0.06)),
        V(-0.36, 0.778, 0.24),
        V(-0.46, 0.773, 0.3),
        V(-0.56, 0.775, 0.32),
      ]);
      cable = mesh(
        scene,
        new THREE.TubeGeometry(curve, 32, 0.0028, 8, false),
        cableMat,
      );
      lastCable.copy(start);
    }
    for (const key of ["usb", "ac"]) {
      targetRings[key].visible =
        state.active === key && !state.tasks[key].seated;
      targetRings[key].material.color.set(
        state.tasks[key].blocked
          ? 0xb75e3c
          : key === "usb"
            ? palette.green
            : palette.orange,
      );
    }
    if (transition) {
      transition.t = Math.min(1, transition.t + dt * 1.8);
      const t = transition.t * transition.t * (3 - 2 * transition.t);
      camera.position.lerpVectors(transition.from, transition.to, t);
      controls.target.lerpVectors(transition.start, transition.end, t);
      if (transition.t === 1) transition = null;
    }
    controls.update();
    renderer.render(scene, camera);
    if (frame++ % 2 === 0) {
      if (state.active === "usb") {
        detailCamera.position.copy(usbTarget).add(V(0.065, 0.037, 0.115));
        detailCamera.lookAt(usbTarget.clone().add(V(0, 0, 0.012)));
      } else {
        detailCamera.position.copy(acTarget).add(V(0.115, 0.13, 0.145));
        detailCamera.lookAt(acTarget.clone().add(V(0, 0.023, 0)));
      }
      detailRenderer.render(scene, detailCamera);
    }
  }
  return {
    render,
    setView,
    dispose() {
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      detailRenderer.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
      });
    },
    scene,
  };
}
