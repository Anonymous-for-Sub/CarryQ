# Franka precision insertion

One MuJoCo workcell contains two Franka Panda arms and two insertion tasks:

1. Insert a USB-C plug into a fixed USB-C receptacle.
2. Insert the two AC blades of a compact white charger into a power strip.

Select one task or both, then **Play**. **Pause / Resume** controls simulation;
**Reset** restores the workcell. The view menu offers the workcell and two
close-ups. Drag to orbit and scroll to zoom.

## Simulation

The scene reuses the reference Franka application's Panda MJCF/mesh assets,
MuJoCo React loader, IK solver and compact control-panel design. Joint actuators
drive the arms, with MuJoCo integration and contact geometry. Socket openings
are built from separate walls. “Seated” checks simulated tip position and
orientation after settling; a timeout does not imply success.

Both tools start rigidly attached to their grippers. Pickup, frictional grasping
and electrical conduction are not simulated. The connector dimensions are
illustrative rather than certified CAD. This page is a task demonstration,
not a learned-policy rollout, CarryQ comparison or experimental result.

## Source and build

Source is under `web/`. With Node.js 22.12+:

```sh
cd web
npm ci
npm run dev
npm run build:pages
```

The build writes to `docs/`, served from GitHub Pages at `/CarryQ/`. All robot
assets and the MuJoCo runtime are served locally with the page. No remote model
service, external font or analytics is used. Existing API and integration docs
remain available.

## Credits

- Franka Panda model and meshes: [MuJoCo Menagerie](https://github.com/google-deepmind/mujoco_menagerie/tree/main/franka_emika_panda), [Apache-2.0 license](franka/LICENSE).
- MuJoCo and MuJoCo React: Apache-2.0.
- React, React Three Fiber, Drei and Three.js: MIT.

The Panda model preserves the reference application's actuator tuning. Task
variants add held objects and tip sites and remove its original home keyframe.
Third-party license notices are retained; the project MIT license does not
replace these asset licenses.
