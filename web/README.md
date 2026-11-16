# Precision insertion scene

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
terminal. The check uses software rendering and verifies both insertions,
measured seating, reset, pause/resume and a mobile viewport. Unit tests run with
`npm test`. The production site can be checked by passing its URL after `--`.

The build writes the static site to `docs/` for GitHub Pages at `/CarryQ/`.
`scripts/build-scene.mjs` generates the task MJCF from `public/franka/panda.xml`.
The two arms start with their tools rigidly attached. Control writes joint actuator
targets; MuJoCo advances joint state and contacts. Success is a geometric seating
check. This is a task illustration, not a learned policy or electrical simulation.

Each task includes an offset approach, coarse registration, lateral centering,
final alignment and insertion. The curved cable meshes are presentation geometry
updated from the connector pose, not a flexible-body cable simulation.

The Panda assets are from MuJoCo Menagerie (Apache-2.0); their license is preserved
in `public/franka/LICENSE`. The copied model retains the reference application's
actuator tuning. USB-C and two-blade socket geometry is illustrative rather than
a certified connector CAD model. Do not use this controller on physical hardware.
