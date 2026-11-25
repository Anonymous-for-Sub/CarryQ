import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useMujoco, findBodyByName } from "mujoco-react";
import { CABLE_RADII, createCableGeometry, updateCableGeometry, usbCablePoints, powerCablePoints, USB_FREE_END } from "./cableGeometry.js";

export function Cables() {
  const sim=useMujoco(),hand=useRef(-1);
  const usb=useMemo(()=>createCableGeometry(usbCablePoints({position:[.35,-.42,.64],quaternion:[1,0,0,0]}),CABLE_RADII.usb),[]);
  const power=useMemo(()=>createCableGeometry(powerCablePoints(),CABLE_RADII.power),[]);
  useEffect(()=>{
    if(sim.status==="ready")hand.current=findBodyByName(sim.mjModelRef.current,"usb_hand");
  },[sim.status]);
  useEffect(()=>()=>{usb.dispose();power.dispose();},[usb,power]);
  useFrame(()=>{
    const data=sim.mjDataRef?.current,id=hand.current;
    if(!data||id<0)return;
    const q=data.xquat.slice(id*4,id*4+4);
    const pose={position:Array.from(data.xpos.slice(id*3,id*3+3)),quaternion:[q[1],q[2],q[3],q[0]]};
    updateCableGeometry(usb,usbCablePoints(pose),CABLE_RADII.usb);
  });
  return <group>
    <mesh geometry={usb} castShadow userData={{cableKind:"usb"}}><meshStandardMaterial color="#e9e7dd" roughness={.68}/></mesh>
    <mesh geometry={power} castShadow userData={{cableKind:"power"}}><meshStandardMaterial color="#deded5" roughness={.72}/></mesh>
    <group position={USB_FREE_END} rotation={[0,0,-.65]}>
      <mesh position={[0,-.011,0]} castShadow><capsuleGeometry args={[.0035,.016,5,10]}/><meshStandardMaterial color="#eeeae2" roughness={.55}/></mesh>
      <mesh position={[0,-.024,0]}><boxGeometry args={[.007,.008,.0024]}/><meshStandardMaterial color="#aab2b7" metalness={.75} roughness={.27}/></mesh>
    </group>
  </group>;
}
