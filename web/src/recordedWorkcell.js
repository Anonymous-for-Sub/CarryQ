import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {unpackGeometry,loadPackedJson,loadCameraModels,createCameraRig,renderCameraViews} from "./cameraRig.js";
import { WORKCELL_COLORS } from "./workcellAppearance.js";
import { loadWorkcellSurfaces, applyWorkcellSurface } from "./workcellSurfaces.js";
import { CABLE_RADII, createCableGeometry, updateCableGeometry, usbCablePoints, powerCablePoints, handPoseFromCableAnchor } from "./cableGeometry.js";

export async function createRecordedWorkcell(container, { signal, onTime, onReady }) {
  const [recording, assets, surfaces] = await Promise.all([
    loadPackedJson(import.meta.env.BASE_URL+"media/workcell.json.gz",signal),
    loadCameraModels(),
    loadWorkcellSurfaces(),
  ]);
  signal.throwIfAborted();
  recording.object.geometries.forEach(unpackGeometry);
  const objectLoader = new THREE.ObjectLoader();
  const model = objectLoader.parse(recording.object);
  const objects = new Map();
  model.traverse((object) => objects.set(object.name, object));
  applyWorkcellSurface(objects.get("mesh_0"),"floor",surfaces);
  applyWorkcellSurface(objects.get("mesh_1"),"mat",surfaces);
  const cableRoles=recording.cables || {usb:"mesh_204",power:"mesh_205",usbAnchor:"mesh_58"};
  const usbCable=objects.get(cableRoles.usb),powerCable=objects.get(cableRoles.power),usbAnchor=objects.get(cableRoles.usbAnchor);
  const connectorPose=()=>handPoseFromCableAnchor(usbAnchor.position.toArray(),usbAnchor.quaternion.toArray());
  usbCable.geometry.dispose();powerCable.geometry.dispose();
  usbCable.geometry=createCableGeometry(usbCablePoints(connectorPose()),CABLE_RADII.usb);
  powerCable.geometry=createCableGeometry(powerCablePoints(),CABLE_RADII.power);
  const animated = recording.meshes.filter(item=>![cableRoles.usb,cableRoles.power].includes(item.name) && (item.frames.length > 1 || item.geometryFrames.length)).map((item) => {
    const object = objects.get(item.name);
    const geometries = item.geometryFrames.map(({index, geometry}) => {
      unpackGeometry(geometry);
      return { index, geometry: objectLoader.parseGeometries([geometry])[geometry.uuid] };
    });
    return { ...item, object, geometries };
  });
  const rig=createCameraRig(assets);
  const scene = new THREE.Scene();
  scene.add(rig.root);
  scene.background = new THREE.Color(WORKCELL_COLORS.background);
  scene.add(model, new THREE.HemisphereLight("#ffffff", "#9a9c9b", 2.35));
  const light = new THREE.DirectionalLight("#ffffff", 2.0);
  light.position.set(1, -2, 5);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, {left: -1.5, right: 1.5, top: 1.5, bottom: -1.5, near: 0.1, far: 10});
  light.shadow.bias = -0.0005;
  scene.add(light);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.002, 30);
  camera.up.set(0, 0, 1);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(WORKCELL_COLORS.background);
  renderer.domElement.setAttribute("aria-label", "Rotatable recorded MuJoCo insertion workcell");
  container.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.minDistance = 0.05;
  controls.maxDistance = 4;
  const duration = recording.times.at(-1);
  let current = 0;
  let playing = false;
  let visible = true;
  let disposed = false;
  let request = 0;
  let last = performance.now();
  let lastReport = -1;
  let task = "both";
  let view = "overview";
  const temporary = new THREE.Quaternion();
  const endQuaternion = new THREE.Quaternion();
  const render = () => {
    if(disposed||!visible)return;
    const selected=rig.sensors[view]?.camera;
    if(selected){
      camera.position.copy(selected.position);camera.quaternion.copy(selected.quaternion);camera.fov=selected.fov;
    }
    renderCameraViews(renderer,scene,camera,rig,container.clientWidth,container.clientHeight);
  };
  const limits = () => task === "usb" ? [0, recording.times[7]] : task === "charger" ? [recording.times[7], duration] : [0, duration];

  function seek(time) {
    current = Math.max(0, Math.min(duration, time));
    let index = 0;
    while (index < recording.times.length - 2 && recording.times[index + 1] < current) index++;
    const fraction = Math.min(1, (current - recording.times[index]) /
      (recording.times[index + 1] - recording.times[index]));
    for (const item of animated) {
      if (item.frames.length > 1) {
        const a = item.frames[index], b = item.frames[index + 1];
        item.object.position.set(
          THREE.MathUtils.lerp(a[0], b[0], fraction),
          THREE.MathUtils.lerp(a[1], b[1], fraction),
          THREE.MathUtils.lerp(a[2], b[2], fraction),
        );
        temporary.fromArray(a, 3);
        endQuaternion.fromArray(b, 3);
        item.object.quaternion.copy(temporary).slerp(endQuaternion, fraction);
      }
      const geometry = item.geometries.findLast((frame) => frame.index <= index);
      if (geometry) item.object.geometry = geometry.geometry;
    }
    updateCableGeometry(usbCable.geometry,usbCablePoints(connectorPose()),CABLE_RADII.usb);
    if(recording.handFrames){
      const a=recording.handFrames[index],b=recording.handFrames[index+1];
      const hands={};
      for(const name of Object.keys(a)){
        temporary.fromArray(a[name].quaternion);
        endQuaternion.fromArray(b[name].quaternion);
        temporary.slerp(endQuaternion,fraction);
        hands[name]={
          position:a[name].position.map((value,i)=>THREE.MathUtils.lerp(value,b[name].position[i],fraction)),
          quaternion:temporary.toArray(),
        };
      }
      rig.update(hands);
    }
    if (Math.abs(lastReport - current) > 0.09 || !playing) {
      lastReport = current;
      const label = recording.labels[fraction >= 0.999999 ? index + 1 : index];
      onTime(current, label.task === "both" ? "Ready" : (label.task === "usb" ? "USB-C" : "Charger") + " · " + label.label);
    }
    render();
  }

  function setView(next) {
    view = next;
    controls.enabled=!rig.sensors[next];
    camera.fov=42;
    let target = [0.48, 0, 0.27];
    let position = [1.03, -1.55, 1.22];
    if(next==="setup"){target=[.65,0,.35];position=[2.5,-2.6,2.2];}
    if (next === "usb") { target = [0.48, -0.42, 0.25]; position = [0.7, -0.16, 0.43]; }
    if (next === "charger") { target = [0.48, 0.42, 0.205]; position = [0.7, 0.14, 0.37]; }
    if (container.clientWidth < 600 && next === "overview") position = [1.5, -1.75, 1.4];
    camera.position.set(...position);
    controls.target.set(...target);
    controls.update();
    render();
  }
  const resize = new ResizeObserver(() => {
    const width = container.clientWidth, height = container.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render();
  });
  resize.observe(container);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    last = performance.now();
    render();
  }, { threshold: 0.05 });
  observer.observe(container);
  controls.addEventListener("change", render);
  let lastRender=0;
  function tick(now) {
    if (disposed) return;
    const delta = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (playing && visible && !document.hidden) {
      const [start,end]=limits();
      current=current+delta>end?start:current+delta;
      if(now-lastRender>40){lastRender=now;seek(current);}
    }
    request = requestAnimationFrame(tick);
  }
  setView(view);
  seek(0);
  request = requestAnimationFrame(tick);
  onReady(duration);
  return {
    seek,
    setView,
    play: (value) => { playing = value; },
    task: (value) => { task = value; seek(limits()[0]); },
    reset: () => seek(limits()[0]),
    dispose() {
      disposed = true;
      cancelAnimationFrame(request);
      resize.disconnect();
      observer.disconnect();
      controls.dispose();
      const geometries = new Set(), materials = new Set();
      model.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (Array.isArray(object.material)) object.material.forEach((material) => materials.add(material));
        else if (object.material) materials.add(object.material);
      });
      animated.forEach((item) => item.geometries.forEach((frame) => geometries.add(frame.geometry)));
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
