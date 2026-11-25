# CarryQ research project page

The React page combines an interactive encoding example, paper results,
real-robot photographs, eight recorded comparison videos and the insertion
workcell. The workcell is a lazily loaded React component on the same page;
there is no iframe or separate demo route. Colors center on `#8080FF`.

The scene reuses the Franka Panda MJCF and meshes, MuJoCo React loading/rendering,
inverse-kinematics solver, and compact control-panel design of the reference
Franka application. The two insertion fixtures and task controller are new.

Requires Node.js 22.12 or later:

```sh
cd web
npm ci
npm run dev
npm run build:pages
```

For browser checks, start the development server, install Playwright Chromium
with `npx playwright install chromium`, and run `npm run test:browser` in another
terminal. The project-page interaction check is `node scripts/check-project.mjs URL`.
The scene check uses software rendering and verifies both insertions,
measured seating, reset, pause/resume and a mobile viewport. Unit tests run with
`npm test`. The production site can be checked by passing its URL after `--`.

For a portable supplementary build, set `CARRYQ_BASE=./` and
`VITE_SUPPLEMENTARY=true`; this makes resource links point to `../appendix.pdf`
and `../code/README.md`. Serve the package root over HTTP so local JavaScript
modules and MuJoCo assets can load. Remove the duplicate `appendix.pdf` from
that website build; the package uses its unchanged root copy.

The build writes the static site to `docs/` for GitHub Pages at `/CarryQ/`.
`scripts/build-scene.mjs` generates the task MJCF from `public/franka/panda.xml`.
The two arms start with their tools rigidly attached. Control writes joint actuator
targets; MuJoCo advances joint state and contacts. Success is a geometric seating
check. This is a task illustration, not a learned policy or electrical simulation.

Each task includes an offset approach, coarse registration, lateral centering,
final alignment and insertion. The curved cable meshes are presentation geometry
updated from the connector pose, not a flexible-body cable simulation.

## Cameras and process figures

The view menu includes two fixed external cameras (one per insertion station)
and two hand-mounted wrist views, in addition to the orbitable workcell and
close-ups. Wrist extrinsics stay fixed in each hand's frame: they do not track
the target independently. The camera bodies and stands are visual instrumentation,
not added collision bodies or loads. Their nominal fields of view are not a
physical camera calibration. Camera definitions are in `src/TaskCameras.jsx`.

To export seven synchronized external/wrist image pairs per task, start the
development server and run:

```sh
node scripts/capture-sequences.mjs http://localhost:36832/CarryQ/ /path/to/output
python3 scripts/compose-sequences.py /path/to/output
```

The compositor requires Pillow and DejaVu Sans (or pass a TrueType font path
as its second argument). The capture uses CPU software rendering,
records actual MuJoCo states during the two-task sequence, checks measured
seating, and renders both sensors from each identical saved state. It also
writes one 3200 × 2400 insertion detail image per task. The layout script
produces 4 × 1, 7 × 1, and 7 × 2 PNG sheets; dual-view rows are external then
wrist. These are task illustrations, not policy-performance evidence. Large
rendered outputs belong outside the source repository. To re-render saved states
after a camera-only change, pass the original `states.json` as a fourth argument.

The Panda assets are from MuJoCo Menagerie (Apache-2.0); their license is preserved
in `public/franka/LICENSE`. The copied model retains the reference application's
actuator tuning. USB-C and two-blade socket geometry is illustrative rather than
a certified connector CAD model. Do not use this controller on physical hardware.
