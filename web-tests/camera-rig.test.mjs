import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {gunzipSync} from "node:zlib";
import {ObjectLoader,Vector3,Quaternion,Box3} from "../web/node_modules/three/build/three.module.js";
import {CAMERA_SPECS,SENSOR_KEYS,createCameraRig,unpackGeometry} from "../web/src/cameraRig.js";

const data=JSON.parse(gunzipSync(readFileSync(new URL("../web/public/camera-rig/models.json.gz",import.meta.url))));
const assets=Object.fromEntries(Object.entries(data).map(([name,asset])=>{
  asset.object.geometries.forEach(unpackGeometry);
  return [name,{model:new ObjectLoader().parse(asset.object),bounds:asset.bounds}];
}));
test("published D435 and wrist mount retain physical dimensions",()=>{
  const cameraSize=new Box3().setFromObject(assets.camera.model).getSize(new Vector3());
  assert.ok(cameraSize.x>.089 && cameraSize.x<.091);
  assert.ok(cameraSize.y>.024 && cameraSize.y<.026);
  assert.ok(cameraSize.z>.024 && cameraSize.z<.026);
  const mountSize=new Box3().setFromObject(assets.mount.model).getSize(new Vector3());
  assert.ok(mountSize.x>.079 && mountSize.x<.083);
});
test("external cameras use raised three-leg assets and wrist views follow the hand",()=>{
  const rig=createCameraRig(assets);
  assert.equal(Object.keys(rig.sensors).length,4);
  const quaternion=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),Math.PI);
  const position=[.35,-.42,.4];
  rig.update({"usb_hand":{position,quaternion:quaternion.toArray()}});
  const local=rig.sensors["wrist-usb"].camera.position.clone().sub(new Vector3(...position)).applyQuaternion(quaternion.clone().invert());
  assert.ok(local.distanceTo(new Vector3(...CAMERA_SPECS["wrist-usb"].position))<1e-8);
  for(const key of SENSOR_KEYS.filter(key=>key.startsWith("global"))){
    const item=rig.sensors[key];
    assert.ok(item.camera.position.z>.9);
    const size=new Box3().setFromObject(item.support).getSize(new Vector3());
    assert.ok(Math.abs(size.z-1.1)<.002);
  }
});
