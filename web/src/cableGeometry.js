import { CatmullRomCurve3, TubeGeometry, Vector3, Quaternion, DynamicDrawUsage } from "three";

export const CABLE_RADII = {usb:.0021,power:.0038};
export const CABLE_SEGMENTS = 192;
export const CABLE_SIDES = 8;
export const USB_FREE_END = [.73,-.67,.004];

// Visual routing: the connector moves the first point; the free tail stays
// on the bench, clear of the insertion fixture. No cable forces are simulated.
export function usbCablePoints(pose) {
  const q=new Quaternion(...pose.quaternion),origin=new Vector3(...pose.position);
  const world=point=>new Vector3(...point).applyQuaternion(q).add(origin);
  const a=world([0,0,.087]),b=world([.014,0,.082]),c=world([.04,0,.075]);
  return [a,b,c,new Vector3(c.x+.08,c.y-.09,Math.max(.09,c.z-.05)),
    new Vector3(.69,-.61,Math.max(.025,c.z-.16)),
    new Vector3(.73,-.66,.012),new Vector3(.83,-.81,.004),
    new Vector3(.94,-.78,.004),new Vector3(.94,-.64,.004),
    new Vector3(.81,-.59,.004),new Vector3(...USB_FREE_END)];
}

export function powerCablePoints() {
  return [[.321,.42,.113],[.297,.42,.113],[.27,.47,.085],[.32,.6,.018],
    [.44,.72,.006],[.63,.79,.006],[.8,.73,.006],[.86,.59,.006],[.77,.54,.006]].map(p=>new Vector3(...p));
}

class BenchCurve extends CatmullRomCurve3 {
  constructor(points,radius) { super(points,false,"centripetal");this.minimumHeight=radius+.0008; }
  getPoint(t,target=new Vector3()) {
    const point=super.getPoint(t,target);
    point.z=Math.max(this.minimumHeight,point.z);
    return point;
  }
}

export function createCableGeometry(points,radius) {
  const curve=new BenchCurve(points,radius);
  const geometry=new TubeGeometry(curve,CABLE_SEGMENTS,radius,CABLE_SIDES,false);
  geometry.getAttribute("position").setUsage(DynamicDrawUsage);
  geometry.getAttribute("normal").setUsage(DynamicDrawUsage);
  geometry.computeBoundingSphere();
  return geometry;
}

// Reuse vertex buffers, using the plug's current pose even during arbitrary
// seeks and reset. A preceding saved cable mesh must never control this frame.
export function updateCableGeometry(geometry,points,radius) {
  const curve=new BenchCurve(points,radius);
  const frames=curve.computeFrenetFrames(CABLE_SEGMENTS,false);
  const position=geometry.getAttribute("position"),normal=geometry.getAttribute("normal");
  const center=new Vector3();
  for(let i=0;i<=CABLE_SEGMENTS;i++) {
    curve.getPointAt(i/CABLE_SEGMENTS,center);
    const n=frames.normals[i],b=frames.binormals[i];
    for(let j=0;j<=CABLE_SIDES;j++) {
      const theta=j/CABLE_SIDES*Math.PI*2,cos=-Math.cos(theta),sin=Math.sin(theta);
      const nx=cos*n.x+sin*b.x,ny=cos*n.y+sin*b.y,nz=cos*n.z+sin*b.z;
      const index=i*(CABLE_SIDES+1)+j;
      position.setXYZ(index,center.x+radius*nx,center.y+radius*ny,center.z+radius*nz);
      normal.setXYZ(index,nx,ny,nz);
    }
  }
  geometry.parameters.path=curve;
  position.needsUpdate=true;normal.needsUpdate=true;
  geometry.computeBoundingSphere();
}

export function handPoseFromCableAnchor(position,quaternion) {
  const q=new Quaternion(...quaternion);
  const origin=new Vector3(...position).sub(new Vector3(0,0,.09).applyQuaternion(q));
  return {position:origin.toArray(),quaternion};
}
