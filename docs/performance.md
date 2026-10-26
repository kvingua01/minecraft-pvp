# Phase 6 performance and synchronization

Static collision bounds and spawn gates are compiled once. Immutable temporary
wall sets are cached until they change. Remote material styles and hotbar content
update only when needed, preserving animations and status effects. Static world
meshes remain instanced. Auto resolution ranges from 55% to 100%; manual modes
remain available. Paused/menu rendering caps at 30 FPS; hidden tabs stop rendering.

The server advances fixed 60 Hz simulation steps, bounds catch-up after stalls,
and emits snapshots every third step (20 Hz). Remote avatars interpolate buffered
server timestamps with shortest-path yaw and no extrapolation past the latest
packet. Respawns/large teleports clear history. Measured ping synchronizes clocks
and selects a 100–200 ms interpolation delay. Existing authoritative combat,
local prediction, collision-safe reconciliation and reconnect reservations remain.

## Measured checks

Measurements below are the original Phase 6 baseline before the pixel-texture
visual update. They came from this cloud machine, not Chromebook hardware.
The later visual update adds tiled original textures and instanced clouds; its
ten-client latency test also passes, with 241 draw calls before cloud batching.
Software frame times vary with concurrent browser tests and do not predict device FPS.

| Check | Result |
| --- | --- |
| Collision benchmark, before | 785.02 ms median per 30,000 steps |
| Same benchmark, after | 23.30 ms median per 30,000 steps |
| Collision behavior comparison | 10,000 seeded steps matched old positions/grounding, including walls and spawn gates |
| Delayed multiplayer | 10 real clients, all eight classes, about 196 ms measured RTT |
| Browser rendering with nine other avatars | At most 181 draw calls in sampled frames |
| Headless software rendering | 50 ms median frame, 83.4 ms p95 |

`npm run benchmark:physics` warms 10 actors for 10,000 steps and reports the median
of five 30,000-step samples. The before/after comparison used Node 24.19.0 and the
same input on the same host. It measures collision CPU work, not whole-game FPS.

`npm run test:network-browser` adds 80 ms plus bounded jitter in each direction,
checks movement interpolation, room isolation, capacity, delayed melee damage,
rejection of forged damage, real ping/FPS display and graphics controls. Chromium
uses SwiftShader in this environment: those frame times do not establish hardware
or Chromebook performance. Run on an actual Chromebook with ten players before
claiming a target FPS. Hero balance still needs real-player playtesting.

## Fourteen-hero master upgrade

The expanded world now shares a512px atlas of original16px tiles and a single
merged world mesh. Pixel tools and summon bodies use merged geometry; summoned
units are capped40 per room and pixel particles160. Hidden tabs stop rendering.

Final ten-client jitter run:217ms RTT,173 maximum sampled draw calls,83.3ms median
and383.4ms p95 frame intervals in headless SwiftShader. These are functional smoke
measurements from this cloud host, not a hardware FPS target or Chromebook result.
The expanded collision benchmark reported130.55ms median per30,000 steps, with10
actors; terrain and movement complexity differ from the old baseline above.
Hardware frame rates, human balance and crowded summon movement remain unverified.
