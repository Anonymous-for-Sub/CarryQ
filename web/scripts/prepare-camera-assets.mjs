import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const url = process.argv[2] || "http://127.0.0.1:36832/CarryQ/";
const output = process.argv[3] || "public/camera-rig/models.json.gz";
const browser = await chromium.launch({headless:true,args:["--disable-gpu"]});
try {
  const page = await browser.newPage();
  await page.goto(url, {waitUntil:"domcontentloaded"});
  const converted = await page.evaluate(async () => {
    const base = new URL(".", location.href).pathname;
    const THREE = await import(base + "node_modules/three/build/three.module.js");
    const {ColladaLoader} = await import(base + "node_modules/three/examples/jsm/loaders/ColladaLoader.js");
    const {OBJLoader} = await import(base + "node_modules/three/examples/jsm/loaders/OBJLoader.js");
    const {GLTFLoader} = await import(base + "node_modules/three/examples/jsm/loaders/GLTFLoader.js");
    const {MeshoptDecoder} = await import(base + "node_modules/three/examples/jsm/libs/meshopt_decoder.module.js");
    async function loadTripod() {
      const bytes = await fetch(base+"camera-rig/source/camera-tripod.glb").then(r=>r.arrayBuffer());
      const header = new DataView(bytes);
      const jsonLength = header.getUint32(12, true);
      const doc = JSON.parse(new TextDecoder().decode(bytes.slice(20,20+jsonLength)));
      for (const material of doc.materials || []) {
        delete material.normalTexture;
        delete material.occlusionTexture;
        delete material.emissiveTexture;
        if (material.pbrMetallicRoughness) {
          delete material.pbrMetallicRoughness.baseColorTexture;
          delete material.pbrMetallicRoughness.metallicRoughnessTexture;
        }
      }
      doc.extensionsRequired = (doc.extensionsRequired || []).filter(x=>x!=="KHR_texture_basisu");
      const json = new TextEncoder().encode(JSON.stringify(doc));
      const paddedLength = Math.ceil(json.length/4)*4;
      const bin = new Uint8Array(bytes,20+jsonLength);
      const packed = new Uint8Array(20+paddedLength+bin.length);
      packed.set(new Uint8Array(bytes,0,12));
      const view = new DataView(packed.buffer);
      view.setUint32(8,packed.length,true);view.setUint32(12,paddedLength,true);view.setUint32(16,0x4e4f534a,true);
      packed.fill(32,20,20+paddedLength);packed.set(json,20);packed.set(bin,20+paddedLength);
      return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(packed.buffer,base);
    }
    const [dae, obj, glb] = await Promise.all([
      fetch(base+"camera-rig/source/d435.dae").then(r=>r.text()),
      fetch(base+"camera-rig/source/camera_mount.obj").then(r=>r.text()),
      loadTripod(),
    ]);
    const camera = new ColladaLoader().parse(dae, base).scene;
    const mount = new OBJLoader().parse(obj);
    const tripod = glb.scene;
    const {mergeGeometries, mergeVertices} = await import(base + "node_modules/three/examples/jsm/utils/BufferGeometryUtils.js");
    const {MeshoptSimplifier} = await import(base + "node_modules/meshoptimizer/meshopt_simplifier.module.js");
    await MeshoptSimplifier.ready;
    const results = {};
    const mountMaterial=new THREE.MeshStandardMaterial({color:"#333941",roughness:.72});
    for (const [name, model] of Object.entries({camera, mount, tripod})) {
      model.updateMatrixWorld(true);
      const root = new THREE.Group();
      let count=0;
      const parts=[];
      model.traverse(o=>{
        if(!o.isMesh)return;
        const geometry = new THREE.BufferGeometry().copy(o.geometry);
        delete geometry.parameters;
        for(const [key,attribute]of Object.entries(geometry.attributes)){
          if(attribute.normalized || !(attribute.array instanceof Float32Array)){
            const values=[];
            const getters=["getX","getY","getZ","getW"];
            for(let i=0;i<attribute.count;i++)for(let c=0;c<attribute.itemSize;c++)values.push(attribute[getters[c]](i));
            geometry.setAttribute(key,new THREE.Float32BufferAttribute(values,attribute.itemSize));
          }
        }
        const mesh = new THREE.Mesh(geometry, o.material);
        if(name==="mount")mesh.material=mountMaterial;
        o.matrixWorld.decompose(mesh.position,mesh.quaternion,mesh.scale);
        mesh.updateMatrix();
        geometry.applyMatrix4(o.matrixWorld);
        geometry.deleteAttribute("uv");
        if(name!=="tripod")geometry.deleteAttribute("normal");
        else if(!geometry.attributes.normal)geometry.computeVertexNormals();
        parts.push(geometry.index?geometry.toNonIndexed():geometry);count++;
      });
      const merged=mergeVertices(mergeGeometries(parts), 0.000001);
      if(merged.index && name!=="tripod") {
        const positions=merged.attributes.position.array;
        const [indices]=MeshoptSimplifier.simplify(new Uint32Array(merged.index.array),positions,3,name==="camera"?15000:12000,0.003);
        merged.setIndex(new THREE.BufferAttribute(indices,1));
      }
      const material=name==="mount"?mountMaterial:parts.length?model.children.find(x=>x.isMesh)?.material:null;
      let firstMaterial;
      model.traverse(o=>{if(o.isMesh&&!firstMaterial)firstMaterial=o.material;});
      const optimized=mergeVertices(merged,0.000001);
      if(!optimized.attributes.normal)optimized.computeVertexNormals();
      root.add(new THREE.Mesh(optimized,name==="mount"?mountMaterial:firstMaterial));
      root.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(root);
      results[name]={object:root.toJSON(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},meshes:count};
    }
    return JSON.stringify(results);
  });
  const parsed=JSON.parse(converted);
  for(const asset of Object.values(parsed)){
    for(const geometry of asset.object.geometries){
      for(const attribute of Object.values(geometry.data?.attributes||{})){
        if(!attribute.array)continue;
        const data=new Float32Array(attribute.array);
        attribute.base64=Buffer.from(data.buffer).toString("base64");
        attribute.type="Float32Array";
        delete attribute.array;
      }
    }
  }
  const packed=JSON.stringify(parsed);
  await writeFile(output,gzipSync(packed,{level:9}));
  console.log(Object.fromEntries(Object.entries(parsed).map(([name,value])=>[name,{bounds:value.bounds,meshes:value.meshes}])));
  console.log("Saved",output,gzipSync(packed).length);
}finally{await browser.close()}
