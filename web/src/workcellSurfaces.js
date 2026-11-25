import * as THREE from "three";

let pending;
export function loadWorkcellSurfaces() {
  if (!pending) {
    const loader = new THREE.TextureLoader();
    pending = Promise.all(["dark_wood", "denim_fabric_06"].map(async asset => {
      const textures = await Promise.all(["color", "normal", "roughness"].map(async channel => {
        const texture = await loader.loadAsync(import.meta.env.BASE_URL + `materials/${asset}_${channel}.webp`);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 8;
        if (channel === "color") texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      }));
      return {map:textures[0], normalMap:textures[1], roughnessMap:textures[2]};
    })).then(([floor,mat])=>({floor,mat})).catch(error=>{pending=null;throw error;});
  }
  return pending;
}

export function applyWorkcellSurface(mesh, kind, surfaces) {
  const previousMaterial = mesh.material;
  mesh.geometry = mesh.geometry.clone();
  const positions = mesh.geometry.getAttribute("position");
  const uv = new Float32Array(positions.count * 2);
  const tile = kind === "floor" ? 1.6 : .8;
  for (let i=0;i<positions.count;i++) {
    uv[i*2] = positions.getX(i)/tile;
    uv[i*2+1] = positions.getY(i)/tile;
  }
  mesh.geometry.setAttribute("uv",new THREE.BufferAttribute(uv,2));
  // A matte scanned surface replaces the live scene's mirror shader.
  if (mesh.getRenderTarget) {
    mesh.getRenderTarget().dispose();
    mesh.onBeforeRender = () => {};
  }
  mesh.material = new THREE.MeshStandardMaterial({
    ...surfaces[kind],
    color:kind === "floor" ? new THREE.Color("#bdc9d7") : new THREE.Color("#d5e6ff").multiplyScalar(1.5),
    normalScale:new THREE.Vector2(kind === "floor"?.3:.55,kind === "floor"?.3:.55),
    roughness:kind === "floor"?.88:1,
    metalness:0,
  });
  mesh.receiveShadow = true;
  previousMaterial.dispose();
}
