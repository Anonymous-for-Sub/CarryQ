import React, { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useMujoco, findBodyByName } from 'mujoco-react';
import * as THREE from 'three';

// Fixed external views and rigid hand-relative views. Coordinates are metres.
// These are nominal illustration cameras, not calibrated physical sensors.
export const CAMERA_SPECS = {
  'global-usb': { position: [.69, -.10, .34], target: [.48, -.42, .25], fov: 32 },
  'global-charger': { position: [.77, .08, .33], target: [.48, .42, .205], fov: 30 },
  'wrist-usb': { hand: 'usb_hand', position: [-.06, -.075, .08], target: [0, 0, .16], fov: 68 },
  'wrist-charger': { hand: 'charger_hand', position: [-.06, -.075, .09], target: [0, 0, .157], fov: 68 },
};

function cameraFor(spec) {
  const camera = new THREE.PerspectiveCamera(spec.fov, 4 / 3, .002, 20);
  camera.position.set(...spec.position);
  camera.up.set(...(spec.hand ? [0, 0, -1] : [0, 0, 1]));
  camera.lookAt(...spec.target);
  return camera;
}

export function TaskCameras({ view }) {
  const sim = useMujoco();
  const { gl, scene, camera: main, size } = useThree();
  const rig = useMemo(() => Object.fromEntries(Object.entries(CAMERA_SPECS).map(([key, spec]) => {
    const camera = cameraFor(spec);
    const local = camera.quaternion.clone();
    const housing = new THREE.Group();
    housing.userData.sensorOverlay = true;
    const body = new THREE.Mesh(new THREE.BoxGeometry(.07, .022, .018), new THREE.MeshStandardMaterial({ color: '#444b50', roughness: .6 }));
    body.position.z = .013;
    housing.add(body);
    for (const x of [-.024, 0, .024]) {
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .003, 16), new THREE.MeshStandardMaterial({ color: '#152333', metalness: .4, roughness: .2 }));
      lens.rotation.x = Math.PI / 2;
      lens.position.set(x, 0, .002);
      housing.add(lens);
    }
    const stand = new THREE.Group();
    if (!spec.hand) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, spec.position[2], 12), new THREE.MeshStandardMaterial({ color: '#62696b' }));
      pole.rotation.x = Math.PI / 2;
      pole.position.set(spec.position[0], spec.position[1], spec.position[2] / 2);
      const base = new THREE.Mesh(new THREE.BoxGeometry(.055, .055, .008), pole.material);
      base.position.set(spec.position[0], spec.position[1], .004);
      stand.add(pole, base);
    } else {
      // A simple rigid side bracket connects the housing to the hand.
      const points = [[-.025, -.025, .02], [spec.position[0], spec.position[1], .02], spec.position];
      const material = new THREE.MeshStandardMaterial({ color: '#444b50', roughness: .7 });
      for (let i = 1; i < points.length; i++) {
        const a = new THREE.Vector3(...points[i - 1]), b = new THREE.Vector3(...points[i]);
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(.003, .003, a.distanceTo(b), 10), material);
        bar.position.copy(a).add(b).multiplyScalar(.5);
        bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
        stand.add(bar);
      }
    }
    stand.userData.sensorOverlay = true;
    return [key, { camera, local, housing, stand, spec, hand: -1 }];
  })), []);

  const update = () => {
    const data = sim.mjDataRef?.current;
    for (const item of Object.values(rig)) {
      const { camera, spec, local, hand, housing } = item;
      if (spec.hand && data && hand >= 0) {
        const q = data.xquat.slice(hand * 4, hand * 4 + 4);
        const rotation = new THREE.Quaternion(q[1], q[2], q[3], q[0]);
        camera.position.set(...spec.position).applyQuaternion(rotation).add(new THREE.Vector3(...data.xpos.slice(hand * 3, hand * 3 + 3)));
        camera.quaternion.copy(rotation).multiply(local);
        item.stand.position.set(...data.xpos.slice(hand * 3, hand * 3 + 3));
        item.stand.quaternion.copy(rotation);
      }
      camera.updateMatrixWorld(true);
      housing.position.copy(camera.position);
      housing.quaternion.copy(camera.quaternion);
    }
  };

  useEffect(() => {
    for (const item of Object.values(rig)) scene.add(item.housing, item.stand);
    return () => {
      for (const item of Object.values(rig)) {
        scene.remove(item.housing, item.stand);
        for (const group of [item.housing, item.stand]) group.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
      }
    };
  }, [rig, scene]);

  useEffect(() => {
    if (sim.status !== 'ready') return;
    for (const item of Object.values(rig)) if (item.spec.hand) item.hand = findBodyByName(sim.mjModelRef.current, item.spec.hand);
    if (!new URLSearchParams(location.search).has('capture')) return;
    window.__taskCapture = {
      specs: CAMERA_SPECS,
      scene,
      pause: () => sim.api.setPaused(true),
      restore: snapshot => sim.api.restoreState(snapshot),
      render: (key, width = 1600, height = 1200) => {
        if (!rig[key]) throw new Error(`Unknown camera ${key}`);
        update();
        const camera = rig[key].camera;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        const target = new THREE.WebGLRenderTarget(width, height, { samples: 4 });
        target.texture.colorSpace = THREE.SRGBColorSpace;
        const previous = gl.getRenderTarget();
        const viewport = gl.getViewport(new THREE.Vector4());
        const scissor = gl.getScissor(new THREE.Vector4());
        const scissorTest = gl.getScissorTest();
        const hidden = [];
        scene.traverse(o => { if (o.userData.sensorOverlay && o.visible) { hidden.push(o); o.visible = false; } });
        try {
          scene.updateMatrixWorld(true);
          gl.setRenderTarget(target);
          gl.setViewport(0, 0, width, height);
          gl.setScissorTest(false);
          gl.clear();
          gl.render(scene, camera);
          const pixels = new Uint8Array(width * height * 4);
          gl.readRenderTargetPixels(target, 0, 0, width, height, pixels);
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const context = canvas.getContext('2d');
          const frame = context.createImageData(width, height);
          for (let y = 0; y < height; y++) frame.data.set(pixels.subarray((height - y - 1) * width * 4, (height - y) * width * 4), y * width * 4);
          context.putImageData(frame, 0, 0);
          return { png: canvas.toDataURL('image/png'), time: sim.api.getTime(), position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov };
        } finally {
          hidden.forEach(o => { o.visible = true; });
          gl.setRenderTarget(previous); gl.setViewport(viewport); gl.setScissor(scissor); gl.setScissorTest(scissorTest);
          target.dispose();
        }
      },
    };
    return () => { delete window.__taskCapture; };
  }, [sim.status, rig]);

  useFrame(() => {
    update();
    const selected = rig[view]?.camera;
    if (!selected) return;
    main.position.copy(selected.position);
    main.quaternion.copy(selected.quaternion);
    // Preserve the sensor's horizontal coverage on narrow screens.
    main.fov = size.width < size.height ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(selected.fov / 2)) * (4 / 3) / (size.width / size.height))) : selected.fov;
    main.updateProjectionMatrix();
  });
  return null;
}
