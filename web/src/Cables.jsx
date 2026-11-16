import React, { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CatmullRomCurve3, TubeGeometry, Vector3, Quaternion } from "three";
import { useMujoco, findBodyByName } from "mujoco-react";

const tube = (points, radius) =>
  new TubeGeometry(
    new CatmullRomCurve3(points.map((p) => new Vector3(...p))),
    240,
    radius,
    10,
    false,
  );
// Presentation-only curves; the MuJoCo controller does not receive cable forces.
export function Cables() {
  const sim = useMujoco(),
    cable = useRef(),
    power = useRef();
  const hand = useRef(-1),
    previous = useRef(null),
    lastTime = useRef(-1);
  useEffect(() => {
    if (sim.status !== "ready") return;
    hand.current = findBodyByName(sim.mjModelRef.current, "usb_hand");
    power.current.geometry = tube(
      [
        [0.321, 0.42, 0.113],
        [0.297, 0.42, 0.113],
        [0.27, 0.47, 0.085],
        [0.32, 0.6, 0.018],
        [0.44, 0.72, 0.006],
        [0.63, 0.79, 0.006],
        [0.8, 0.73, 0.006],
        [0.86, 0.59, 0.006],
        [0.77, 0.54, 0.006],
      ],
      0.0038,
    );
    return () => {
      cable.current?.geometry.dispose();
      power.current?.geometry.dispose();
    };
  }, [sim.status]);
  useFrame(() => {
    const data = sim.mjDataRef?.current,
      id = hand.current;
    if (data && data.time < lastTime.current) lastTime.current = -1;
    if (
      !data ||
      id < 0 ||
      !cable.current ||
      data.time - lastTime.current < 0.05
    )
      return;
    lastTime.current = data.time;
    const pos = new Vector3(...data.xpos.slice(id * 3, id * 3 + 3));
    const q = data.xquat.slice(id * 4, id * 4 + 4),
      rot = new Quaternion(q[1], q[2], q[3], q[0]);
    const world = (p) =>
      new Vector3(...p).applyQuaternion(rot).add(pos).toArray();
    const a = world([0, 0, 0.087]),
      b = world([0.014, 0, 0.082]),
      c = world([0.04, 0, 0.1]);
    if (
      previous.current &&
      Math.hypot(...a.map((v, i) => v - previous.current[i])) < 0.00005
    )
      return;
    previous.current = a;
    const points = [
      a,
      b,
      c,
      [c[0] + 0.09, c[1] - 0.08, Math.max(0.025, c[2] - 0.07)],
      [0.73, -0.66, 0.012],
      [0.83, -0.81, 0.004],
      [0.94, -0.78, 0.004],
      [0.94, -0.64, 0.004],
      [0.81, -0.59, 0.004],
      [0.73, -0.67, 0.004],
    ];
    const next = tube(points, 0.0021);
    cable.current.geometry.dispose();
    cable.current.geometry = next;
  });
  return (
    <group>
      <mesh ref={cable} castShadow>
        <bufferGeometry />
        <meshStandardMaterial color="#e9e7dd" roughness={0.68} />
      </mesh>
      <mesh ref={power} castShadow>
        <bufferGeometry />
        <meshStandardMaterial color="#deded5" roughness={0.72} />
      </mesh>
      <group position={[0.73, -0.67, 0.004]} rotation={[0, 0, -0.65]}>
        <mesh position={[0, -0.011, 0]} castShadow>
          <capsuleGeometry args={[0.0035, 0.016, 5, 10]} />
          <meshStandardMaterial color="#eeeae2" roughness={0.55} />
        </mesh>
        <mesh position={[0, -0.024, 0]}>
          <boxGeometry args={[0.007, 0.008, 0.0024]} />
          <meshStandardMaterial
            color="#aab2b7"
            metalness={0.75}
            roughness={0.27}
          />
        </mesh>
      </group>
    </group>
  );
}
