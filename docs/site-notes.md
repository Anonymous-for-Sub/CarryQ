# CarryQ project page

The page presents the paper's temporal-error argument, interactive encoding
arithmetic, real-robot photographs, tabulated results and recorded comparisons.
The purple theme uses `#8080FF`. It has no author-identifying profile,
analytics or external font dependency.

## Interactive encoding

The teaching example computes midpoint quantization directly in grid units.
Change the source increment, reset interval or action step to inspect residuals
and cumulative commands. Its curves are computed examples, not trial statistics.
Results elsewhere on the page come from the paper's tables; comparisons retain
their replay, closed-loop or real-robot evaluation setting.

## Recorded video

Eight complete Memoryless-failure / CarryQ-success comparisons cover scalar,
vector and Praxis replay, LIBERO Spatial/Pro/Plus, robomimic Can and RoboTwin.
Each recording retains its original timeline and side-by-side labels. The
RoboTwin recording is a separate paired SeedPolicy qualitative example.
`media/manifest.json` records video identities, hashes, durations and encoding
quality. The three real-robot photographs show approach, alignment and insertion.

## Embedded live workcell

Choose **Launch live workcell** in the Live demo section. It loads in that
section without navigation to another page. One MuJoCo workcell contains two Franka Panda arms and two insertion tasks:

1. Insert a USB-C plug into a fixed USB-C receptacle.
2. Insert the two AC blades of a compact white charger into a power strip.

Select one task or both, then **Play**. **Pause / Resume** controls simulation;
**Reset** restores the workcell. The view menu offers the workcell and two
close-ups, two fixed global cameras (one per task), and a wrist camera on each
hand. Drag to orbit and scroll to zoom in the workcell and close-up views.
Global cameras remain fixed in world coordinates; wrist cameras remain rigid
in hand coordinates. The sensor views are not orbitable. Camera housings and
stands are visual only and do not change the task dynamics. Fields of view
are nominal illustration settings, not physical sensor calibration.

Before insertion, the arm approaches with a small lateral offset, centers above
the socket, and lowers into alignment. These are scripted joint-control stages,
not observations from a learned policy. Curved cables follow the connector pose
for visualization; flexible-cable forces and electrical conduction are not modeled.

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
