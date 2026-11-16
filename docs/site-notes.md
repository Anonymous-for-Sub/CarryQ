# Precision workcell

The site contains one procedural tabletop workcell with two insertion tasks:

1. A USB-C plug approaching, aligning with and entering a fixed USB-C receptacle.
2. A generic rounded white charger aligning two AC blades with a power strip.
   The USB-C receptacle remains part of the charger body; it is not inserted
   into the AC outlet.

## Controls

- **Play both tasks / Pause / Resume:** run or stop the scripted sequence.
- **Reset:** return both tasks to their initial poses.
- **Task selection:** choose a station and its close-up camera.
- **Camera views:** overview, USB-C, charger or top; drag to orbit and scroll to zoom.
- **Fine adjustment:** change two transverse offsets and the connector angle.
- **Auto-align:** play a scripted correction to the target pose.
- **Try insertion:** advance only when the illustrative geometric gate is met.

The inset follows the active station. On small screens, controls appear below
the scene. Playback starts only on request and pauses when the tab is hidden.

## Scope

This is an interactive **kinematic visualization**, not a benchmark or a
contact-physics simulation. The arms follow analytical geometric poses; the
parts follow scripted trajectories. Model-space offsets and alignment gates
are illustrative, not measured robot tolerances. There is no π₀.₅ inference,
CarryQ comparison, electrical sensing or physical success claim in this page.
The charger is unbranded and is not an exact product or electrical design.

## Local preview and publishing

From the repository root:

```bash
python -m http.server 8000 --directory docs
```

Open `http://localhost:8000`. No Node build or remote asset service is required.
The page uses only relative asset paths and is served by GitHub Pages from
`main:/docs`. Existing `api.md` and `integration.md` remain available.

The state-machine tests use Node.js:

```bash
node --test web-tests/*.test.mjs
```

All scene meshes are procedural. Three.js r170 and its OrbitControls and
RoundedBoxGeometry helpers are included locally under their retained MIT
[license](assets/vendor/THREE-LICENSE.txt). The page makes no analytics calls
and loads no external fonts, model files or libraries.
