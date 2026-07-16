# Asset Production Contract 05-07

## Runtime package

Delivered files:

- `/assets/world/school-act/school-passage.glb` - Meshopt delivery with authored geometry and named interaction pivots.
- `/assets/vertical-slice/v1/05-07-school/camera.desktop.json` - continuous desktop curve for chapters 05-07.
- `/assets/vertical-slice/v1/05-07-school/camera.mobile.json` - separately composed mobile curve.
- `/assets/projects/aegis.webp` - temporary Aegis proxy mounted on the phone and audit terminal.
- `/assets/projects/schoolmate.webp` - temporary SchoolMate proxy mounted on classroom and secretariat screens.

Final evidence replacements still requested:

- `aegis-phone.webp` and `aegis-gate.webp` - approved phone, result, and audit captures.
- `schoolmate-classroom.webp` and `schoolmate-secretariat.webp` - approved workflow captures.
- Optional KTX2/baked-light atlas if later material look-development introduces texture maps.

## Required GLB nodes

- `VS05_07_School_ROOT`
- `ENV_School_GothicEntry`
- `ENV_School_Corridor`
- `ENV_School_Classroom`
- `ENV_School_Secretariat`
- `ENV_School_DescentThreshold`
- `PRP_Aegis_Phone`
- `PRP_Aegis_Scanner`
- `PRP_Aegis_Turnstile`
- `PRP_Aegis_TurnstilePivot`
- `PRP_Aegis_AuditTerminal`
- `PRP_SchoolMate_ClassroomScreen`
- `PRP_SchoolMate_SecretariatScreen`
- `PRP_SchoolMate_NoticeRail`
- `FX_Aegis_ScanPlane`
- `FX_Aegis_TransactionCore`
- `FX_SchoolMate_RequestThread`
- `ANC_School_Entry`
- `ANC_Aegis_PhoneFocus`
- `ANC_Aegis_ScannerFocus`
- `ANC_Aegis_Crossing`
- `ANC_SchoolMate_ClassroomFocus`
- `ANC_SchoolMate_SecretariatFocus`
- `ANC_School_HandoffDescent`

## Runtime animation ownership

The GLB supplies geometry, material slots, and stable pivots. React Three Fiber drives the following from deterministic state:

- phone raise;
- scan-plane visibility and travel;
- five transaction chambers;
- turnstile rotation;
- corridor practical light sequence;
- SchoolMate request thread;
- screen texture swaps.

No animation depends on elapsed wall-clock time for its final state. Ambient motion may use time, but all narrative states must derive from scroll progress or canonical scan progress.

## Camera contract

- 241 finite monotonic samples per delivery tier.
- Each sample contains position, target, FOV, and roll.
- Desktop range target: 42-53 degrees FOV.
- Mobile range target: 52-64 degrees FOV.
- Chapter handoffs must match position within 0.02 m, target within 0.04 m, FOV within 0.25 degrees.
- Phone/reader must remain fully visible inside a 9:16 safe frame during the scan hold.

## Media requested from the team

These are not required for geometry and camera work, but they block final evidence lock.

### Aegis

- One native phone screen recording, 8-12 seconds, showing token generation/presentation. Preferred: 1080x1920 or original device resolution, no messenger overlays.
- Three lossless/native screenshots: token ready, gate result, audit/role view.
- Optional 10-20 second real gate demonstration if physical hardware exists.

### SchoolMate

- Four to six original screenshots at 1440 px width or native device resolution: student, teacher, announcement/schedule, request, approval, secretariat.
- One 15-25 second clean recording of a direct student-to-secretariat request, from creation through approval or rejection and the updated history status.
- Confirm which live portal data may be shown publicly; redact personal data before delivery.

### Credits and evidence

- Exact contribution of each team member to Aegis and SchoolMate.
- Official competition wording, year, placement, and source URL for each related award.
- Original award image(s), with identities and publication permission confirmed.

## Placeholder policy

Until approved media arrives, screens use the current repository captures and are marked internally as proxy assets. We do not invent names, logs, school records, or operational outcomes. Proxy media can establish framing but cannot be captioned as final proof.

## Budgets

### Desktop cinematic

- GLB transfer: 1 MB target, 2 MB hard cap.
- Media activated in chapter: 1.6 MB target.
- Visible triangles: 75k target, 100k hard cap.
- Draw calls: 100 target, 115 hard cap, including the cinematic shadow/post-processing pass.
- Real-time lights: 5 maximum; only one shadowed key.

### Mobile composed

- GLB transfer: 1.4 MB target, 2 MB hard cap.
- Media activated in chapter: 800 KB target.
- Visible triangles: 70k target, 90k hard cap.
- Draw calls: 60 target, 70 hard cap.
- No real-time shadow requirement.

## Acceptance gates

- Valid GLB with no validator errors and identity root transform.
- Named pivots and anchors exist exactly once.
- Direct-link canonical states pass for chapters 05, 06, and 07.
- Scroll can always continue without activating the scan button.
- Keyboard and touch activation produce the same canonical scan.
- Reduced-motion and editorial modes preserve all project facts and links.
- No layout overlap at 390x844, 768x1024, 1440x900, and 1920x1080.
- Chapter 07 hands off to chapter 08 without a blank world frame.
