import * as THREE from "three";

export const SENSOR_KEYS = ["global-usb", "wrist-usb", "global-charger", "wrist-charger"];
export const SENSOR_LABELS = ["USB-C · external", "USB-C · wrist", "Charger · external", "Charger · wrist"];
export const CAMERA_SPECS = {
  "global-usb": {position:[1.55,-.74,1.09],target:[.48,-.42,.22],fov:47},
  "global-charger": {position:[1.55,.74,1.09],target:[.48,.42,.19],fov:47},
  "wrist-usb": {hand:"usb_hand",position:[0,.058,.072],target:[0,0,.22],fov:62},
  "wrist-charger": {hand:"charger_hand",position:[0,.058,.072],target:[0,0,.225],fov:62},
};

export function unpackGeometry(geometry) {
  for (const attribute of Object.values(geometry.data?.attributes || {})) {
    if (!attribute.base64) continue;
    const bytes=Uint8Array.from(atob(attribute.base64),char=>char.charCodeAt(0));
    attribute.array=new Float32Array(bytes.buffer);
    delete attribute.base64;
  }
}

export async function loadPackedJson(url, signal) {
  const response=await fetch(url,{signal});
  if(!response.ok)throw new Error("Unable to load scene asset "+response.status);
  const bytes=new Uint8Array(await response.arrayBuffer());
  const compressed=bytes[0]===0x1f && bytes[1]===0x8b;
  return new Response(compressed?new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")):bytes).json();
}

let assetPromise;
export function loadCameraModels() {
  if(!assetPromise){
    assetPromise=loadPackedJson(import.meta.env.BASE_URL+"camera-rig/models.json.gz").then(data=>{
      const loader=new THREE.ObjectLoader();
      return Object.fromEntries(Object.entries(data).map(([name,asset])=>{
        asset.object.geometries.forEach(unpackGeometry);
        return [name,{model:loader.parse(asset.object),bounds:asset.bounds}];
      }));
    }).catch(error=>{assetPromise=null;throw error;});
  }
  return assetPromise;
}

export function createCameraRig(assets) {
  const root=new THREE.Group();
  root.name="Observation camera hardware";
  root.userData.sensorOverlay=true;
  const sensors={};
  const up=new THREE.Vector3(0,0,1);
  for(const [key,spec]of Object.entries(CAMERA_SPECS)){
    const camera=new THREE.PerspectiveCamera(spec.fov,4/3,.002,20);
    camera.up.copy(spec.hand?new THREE.Vector3(0,1,0):up);
    camera.position.set(...spec.position);
    camera.lookAt(...spec.target);
    const localRotation=camera.quaternion.clone();
    const hardware=new THREE.Group();
    hardware.name=key;
    hardware.userData.sensorOverlay=true;
    const housing=assets.camera.model.clone(true);
    housing.rotation.x=-Math.PI/2;
    hardware.add(housing);
    let support;
    if(spec.hand){
      support=assets.mount.model.clone(true);
      support.userData.sensorOverlay=true;
      root.add(support);
    }else{
      support=new THREE.Group();
      support.userData.sensorOverlay=true;
      const tripod=assets.tripod.model.clone(true);
      const height=assets.tripod.bounds.max[1]-assets.tripod.bounds.min[1];
      tripod.position.y=-assets.tripod.bounds.min[1];
      const adjust=new THREE.Group();
      adjust.add(tripod);
      adjust.rotation.x=Math.PI/2;
      const scale=1.1/height;
      adjust.scale.setScalar(scale);
      support.add(adjust);
      support.position.set(spec.position[0],spec.position[1],-.055);
      root.add(support);
      // The RealSense bottom screw seat sits on the tripod's quick-release head.
      const screw=new THREE.Vector3(0,-.0125,.0125).applyQuaternion(camera.quaternion);
      camera.position.set(spec.position[0],spec.position[1],1.045).sub(screw);
    }
    root.add(hardware);
    sensors[key]={camera,hardware,support,localRotation,spec};
  }
  function update(hands){
    for(const item of Object.values(sensors)){
      const {spec,camera,localRotation,hardware,support}=item;
      if(spec.hand&&hands?.[spec.hand]){
        const pose=hands[spec.hand];
        const rotation=new THREE.Quaternion(...pose.quaternion);
        const position=new THREE.Vector3(...pose.position);
        camera.position.set(...spec.position).applyQuaternion(rotation).add(position);
        camera.quaternion.copy(rotation).multiply(localRotation);
        support.position.copy(position);
        support.quaternion.copy(rotation);
      }
      camera.updateMatrixWorld(true);
      hardware.position.copy(camera.position);
      hardware.quaternion.copy(camera.quaternion);
    }
    root.updateMatrixWorld(true);
  }
  update();
  return {root,sensors,update};
}

export function feedHeight(width,height) {
  return Math.min(Math.round(width/4*.72),Math.round(height*.29));
}

// A single WebGL renderer draws the workcell and the four synchronized sensors.
export function renderCameraViews(renderer,scene,main,rig,width,height) {
  const strip=feedHeight(width,height);
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;
  renderer.setScissorTest(false);
  renderer.setViewport(0,0,width,height);
  renderer.setClearColor("#0b0e16",1);
  renderer.clear();
  renderer.setScissorTest(true);
  renderer.setViewport(0,strip,width,height-strip);
  renderer.setScissor(0,strip,width,height-strip);
  main.aspect=width/(height-strip);
  main.updateProjectionMatrix();
  renderer.render(scene,main);
  for(let i=0;i<SENSOR_KEYS.length;i++){
    const sensor=rig.sensors[SENSOR_KEYS[i]];
    const x=Math.round(i*width/4),end=Math.round((i+1)*width/4);
    const camera=sensor.camera;
    camera.aspect=(end-x-4)/(strip-4);
    camera.updateProjectionMatrix();
    // Hide camera fixtures in the sensor image, while retaining them in the workcell.
    rig.root.visible=false;
    renderer.setViewport(x+2,2,end-x-4,strip-4);
    renderer.setScissor(x+2,2,end-x-4,strip-4);
    renderer.clear();
    renderer.render(scene,camera);
    rig.root.visible=true;
  }
  renderer.setScissorTest(false);
  renderer.setViewport(0,0,width,height);
}
