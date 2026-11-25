import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {gunzipSync} from "node:zlib";
import {Vector3,Quaternion,Box3} from "../web/node_modules/three/build/three.module.js";
import {CABLE_RADII,CABLE_SIDES,createCableGeometry,updateCableGeometry,usbCablePoints,powerCablePoints,handPoseFromCableAnchor} from "../web/src/cableGeometry.js";

const recording=JSON.parse(gunzipSync(readFileSync(new URL("../web/public/media/workcell.json.gz",import.meta.url))));
const frames=recording.meshes.find(mesh=>mesh.name===recording.cables.usbAnchor).frames;
function anchorAt(index,fraction) {
  const a=frames[index],b=frames[index+1];
  const position=new Vector3(...a.slice(0,3)).lerp(new Vector3(...b.slice(0,3)),fraction);
  const quaternion=new Quaternion(...a.slice(3)).slerp(new Quaternion(...b.slice(3)),fraction);
  return {position,quaternion};
}
const obstacles=[
  new Box3(new Vector3(.438,-.454,0),new Vector3(.522,-.386,.158)),
  new Box3(new Vector3(.456,-.44,.158),new Vector3(.504,-.40,.174)),
  new Box3(new Vector3(.4692,-.425,.174),new Vector3(.4908,-.415,.192)),
  new Box3(new Vector3(.334,.384,.099),new Vector3(.626,.456,.146)),
];
test("USB cable remains attached between saved poses and after backward seeks",()=>{
  const initial=anchorAt(0,0);
  const geometry=createCableGeometry(usbCablePoints(handPoseFromCableAnchor(initial.position.toArray(),initial.quaternion.toArray())),CABLE_RADII.usb);
  const buffer=geometry.getAttribute('position').array;
  for(const index of [...Array(frames.length-1).keys()].reverse())for(const fraction of [0,.23,.5,.77,.999]) {
    const anchor=anchorAt(index,fraction);
    const pose=handPoseFromCableAnchor(anchor.position.toArray(),anchor.quaternion.toArray());
    updateCableGeometry(geometry,usbCablePoints(pose),CABLE_RADII.usb);
    assert.equal(geometry.getAttribute('position').array,buffer,'buffer must be reused');
    const center=new Vector3();
    for(let j=0;j<CABLE_SIDES;j++)center.add(new Vector3().fromBufferAttribute(geometry.getAttribute('position'),j));
    center.divideScalar(CABLE_SIDES);
    const expected=new Vector3(0,0,-.003).applyQuaternion(anchor.quaternion).add(anchor.position);
    assert.ok(center.distanceTo(expected)<1e-7,'cable detached from rendered connector');
    for(let i=0;i<geometry.getAttribute('position').count;i++)assert.ok(geometry.getAttribute('position').getZ(i)>.00079,'cable penetrated the mat');
    for(let i=0;i<=192;i++) {
      const point=geometry.parameters.path.getPointAt(i/192);
      for(const obstacle of obstacles)assert.ok(obstacle.distanceToPoint(point)>CABLE_RADII.usb,'cable intersects an insertion fixture');
    }
  }
  geometry.dispose();
});
test("power cable stays above the mat and outside the power-strip body",()=>{
  const geometry=createCableGeometry(powerCablePoints(),CABLE_RADII.power);
  for(let i=0;i<geometry.getAttribute('position').count;i++)assert.ok(geometry.getAttribute('position').getZ(i)>.00079);
  for(let i=0;i<=192;i++)assert.ok(obstacles[3].distanceToPoint(geometry.parameters.path.getPointAt(i/192))>CABLE_RADII.power);
  geometry.dispose();
});
