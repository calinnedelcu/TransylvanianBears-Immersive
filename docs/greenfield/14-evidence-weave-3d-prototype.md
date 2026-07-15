# Evidence Weave: 3D vertical slice

## Intent

Evidence Weave is not a trophy shelf and not a conventional archive grid. It is a spatial
instrument that binds each outcome to a project, a date, and an evidence state. The first
vertical slice proves the complete visual language with Project Nexus, Aegis, and Infect.exe
before the full archive is added.

## Story beats

1. The research axis arrives edge-on and bends into a mechanical astrolabe.
2. The mechanism unfolds while the camera crosses its rings instead of orbiting a hero object.
3. Real evidence images live on suspended screens connected to the core by visible filaments.
4. Project name, date, result, and evidence state are rendered on physical label plates.
5. The camera visits Nexus, Aegis, and Infect.exe as one continuous path.
6. At the exit, the rings rotate into a top-down plan for the future citadel chapter.

## Technical decision

- A dedicated React Three Fiber canvas owns this chapter so its camera, textures, and lifecycle
  are independent from the opening corridor.
- Drei supplies texture loading and WebGL line geometry while staying compatible with React 18
  and React Three Fiber 8.
- Project evidence is mapped onto actual planes in the 3D world. The labels use canvas textures,
  so typography shares perspective, light, and motion with the artifact.
- The scene mounts only near the viewport. DPR is capped and connectors remain simple geometry.
- A semantic DOM mirror and keyboard-operable selector preserve the evidence when WebGL or
  motion is unavailable.

## Asset pipeline

The procedural astrolabe is the interaction prototype. A later Blender pass may replace its
central mechanism with a glTF asset using baked PBR textures and transform animation. Higgsfield
is reserved for authored cinematic transitions where video adds more than real-time geometry;
it is not used for selectable evidence nodes.

## Expansion rule

The remaining archive entries are added only after the three-node slice passes desktop, mobile,
reduced-motion, and GPU-budget checks. Pending evidence must remain visibly incomplete rather
than being styled as verified.
