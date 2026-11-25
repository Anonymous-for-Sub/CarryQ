import React, { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useMujoco, findBodyByName, findGeomByName, getName } from "mujoco-react";
import * as THREE from "three";
import { CAMERA_SPECS, createCameraRig, loadCameraModels, renderCameraViews } from "./cameraRig.js";
import { loadWorkcellSurfaces, applyWorkcellSurface } from "./workcellSurfaces.js";
export { CAMERA_SPECS } from "./cameraRig.js";

export function TaskCameras({view}) {
  const sim=useMujoco();
  const {gl,scene,camera:main,size}=useThree();
  const [rig,setRig]=useState(null);
  const handIds=useRef({});
  const surfaces=useRef(null), surfaceIds=useRef({}), surfacesApplied=useRef(false);
  useEffect(()=>{
    let disposed=false;
    loadCameraModels().then(assets=>{
      if(!disposed)setRig(createCameraRig(assets));
    });
    loadWorkcellSurfaces().then(assets=>{if(!disposed)surfaces.current=assets;});
    return ()=>{disposed=true;};
  },[]);
  useEffect(()=>{
    if(!rig)return;
    scene.add(rig.root);
    return ()=>scene.remove(rig.root);
  },[rig,scene]);
  useEffect(()=>{
    if(sim.status!=="ready")return;
    handIds.current=Object.fromEntries(["usb_hand","charger_hand"].map(name=>[name,findBodyByName(sim.mjModelRef.current,name)]));
    surfaceIds.current=Object.fromEntries(["floor","table"].map(name=>[name,findGeomByName(sim.mjModelRef.current,name)]));
  },[sim.status]);

  const handPoses=()=>{
    const data=sim.mjDataRef?.current;
    if(!data)return {};
    return Object.fromEntries(Object.entries(handIds.current).map(([name,id])=>{
      const q=data.xquat.slice(id*4,id*4+4);
      return [name,{position:Array.from(data.xpos.slice(id*3,id*3+3)),quaternion:[q[1],q[2],q[3],q[0]]}];
    }));
  };
  useEffect(()=>{
    if(!rig||sim.status!=="ready"||!new URLSearchParams(location.search).has("capture"))return;
    window.__taskCapture={
      specs:CAMERA_SPECS,scene,handPoses,
      geomName:object=>{
        const id=object.userData.geomID,model=sim.mjModelRef.current;
        return id===undefined?null:getName(model,model.name_geomadr[id]);
      },
      pause:()=>sim.api.setPaused(true),
      restore:snapshot=>sim.api.restoreState(snapshot),
      render:(key,width=1600,height=1200)=>{
        if(!rig.sensors[key])throw new Error("Unknown camera "+key);
        rig.update(handPoses());
        const camera=rig.sensors[key].camera;
        camera.aspect=width/height;camera.updateProjectionMatrix();
        const target=new THREE.WebGLRenderTarget(width,height,{samples:4});
        target.texture.colorSpace=THREE.SRGBColorSpace;
        const previous=gl.getRenderTarget();
        const viewport=gl.getViewport(new THREE.Vector4());
        const scissor=gl.getScissor(new THREE.Vector4());
        const scissorTest=gl.getScissorTest();
        rig.root.visible=false;
        try{
          scene.updateMatrixWorld(true);
          gl.setRenderTarget(target);gl.setViewport(0,0,width,height);gl.setScissorTest(false);gl.clear();gl.render(scene,camera);
          const pixels=new Uint8Array(width*height*4);
          gl.readRenderTargetPixels(target,0,0,width,height,pixels);
          const canvas=document.createElement("canvas");
          canvas.width=width;canvas.height=height;
          const context=canvas.getContext("2d");
          const frame=context.createImageData(width,height);
          for(let y=0;y<height;y++)frame.data.set(pixels.subarray((height-y-1)*width*4,(height-y)*width*4),y*width*4);
          context.putImageData(frame,0,0);
          return {png:canvas.toDataURL("image/png"),time:sim.api.getTime(),position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov};
        }finally{
          rig.root.visible=true;gl.setRenderTarget(previous);gl.setViewport(viewport);gl.setScissor(scissor);gl.setScissorTest(scissorTest);target.dispose();
        }
      },
    };
    return ()=>{delete window.__taskCapture;};
  },[sim.status,rig]);

  useFrame(()=>{
    if (surfaces.current && !surfacesApplied.current && sim.status==="ready") {
      let count=0;
      scene.traverse(mesh=>{
        if(!mesh.isMesh || mesh.userData.geomID===undefined)return;
        if(mesh.userData.geomID===surfaceIds.current.floor){applyWorkcellSurface(mesh,"floor",surfaces.current);count++;}
        if(mesh.userData.geomID===surfaceIds.current.table){applyWorkcellSurface(mesh,"mat",surfaces.current);count++;}
      });
      surfacesApplied.current=count===2;
    }
    if(!rig){gl.render(scene,main);return;}
    rig.update(handPoses());
    const selected=rig.sensors[view]?.camera;
    if(selected){main.position.copy(selected.position);main.quaternion.copy(selected.quaternion);main.fov=selected.fov;}
    gl.autoClear=false;
    renderCameraViews(gl,scene,main,rig,size.width,size.height);
  },1);
  return null;
}
