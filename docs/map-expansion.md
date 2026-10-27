# Ten-map expansion and reliability fixes

Baseline: `2a65f1a`, six implemented maps, 21 implemented kits, 137 passing tests,
and a successful production Docker build. Rollback branch:
`rollback/before-ten-maps-2a65f1a`.

## Maps added

| Map | A | B | C |
| --- | --- | --- | --- |
| Nether Fortress | Fortress Tower | Lava Bridge | Nether Throne Room |
| End City | End Tower | Central Gateway | Floating Temple |
| Pirate Cove | Pirate Ship | Harbor Docks | Lighthouse |
| Mushroom Kingdom | Giant Mushroom | Mushroom Village | Underground Mycelium Cave |
| Underwater Ruins | Sunken Ship | Ocean Temple | Coral Fortress |
| Volcano Island | Jungle Outpost | Volcano Crater | Lava Cave |
| Haunted Mansion | Graveyard | Mansion Great Hall | Underground Crypt |
| Candy Land | Candy Castle | Chocolate Bridge | Giant Cake Tower |
| Ancient Egypt | Pyramid Summit | Temple Courtyard | Pharaoh's Tomb |
| Steampunk City | Clock Tower | Central Factory | Train Station |

The existing map selectors automatically list all sixteen maps. Maps retain the
same room/lobby permissions, mirrored spawn coordinates and A/B/C scoring rules.
Each new objective has navigable routes from both teams without class movement
abilities, including alternate routes around a blocked direct spawn lane. Elevated
objectives have stairs from multiple sides; underground rooms have two entrances.

New architecture includes Nether brick battlements and lava falls, multi-level
purpur towers, boardable stationary ships and cabins, coastal caves and lighthouse,
mushroom platforms with wooden bridges, glass ocean tunnels and air-filled temple
rooms, a volcano crater and lava cave, lit mansion/library/crypt, candy architecture,
stepped pyramid/tomb and copper factories with static gears and roof walkways.

Nether soul sand applies a mild terrain slowdown. Nether rivers/falls and Volcano
lava damage players; bridges provide safe crossings. End City uses void death and
bounded movement. Water is scenic because the existing game has no swimming system;
there is no oxygen mechanic. Chocolate is harmless. Gears are static, so machinery
cannot move a collision body into a player.

All textures remain 16×16 pixel tiles in the existing nearest-filtered atlas. New
maps contain 143–243 boxes and share one merged world mesh/material, rather than
one draw call per voxel. Existing art and renderer are retained.

## Reproduced issues fixed

1. **Small penetrations could fall through floors or stick in walls.** Swept
   collisions assumed a valid starting position. A shared recovery pass now moves
   an overlapping body to a clear face, including safe recovery out of enemy spawn
   volumes. Stair stepping now settles onto its supporting step instead of briefly
   hovering after a raised move.
2. **Collision work scanned distant terrain repeatedly.** Cached spatial cells
   filter solid bounds before the existing swept collision checks. Query caches
   are bounded; static/dynamic collision invalidation remains separate.
3. **Death left active state behind.** Death immediately clears buffs, flight,
   dashes, slams, combos, extra bounce, drinking and held bow charge. Dead owners'
   summons/effects are removed instead of lingering or pausing until respawn.
4. **Projectiles could outlive their owner's active life.** All weapon, ability,
   turret and potion projectiles carry a life generation; dead, disconnected or
   previous-life owners cannot keep an old attack active.
5. **Disconnected avatars remained visible, and their reserved bodies intercepted
   shots.** Reserved sessions remain available for the existing recovery window,
   but world avatars hide immediately and those bodies are excluded from combat
   targets. Their cleanup/recovery does not create another player identity.
6. **Remote teleports could interpolate through intervening space.** Avatar
   interpolation resets for respawns, connection changes and meaningful jumps
   accompanying a motion serial. Ordinary movement and stationary abilities keep
   normal interpolation.
7. **Summon hits could register in invisible space.** Small slimes, Vexes, rods,
   devices and the large guardian now use hit volumes matching their models.
   Bot/turret/rod aim heights follow those bodies. Class damage, health, cooldowns,
   loadouts and ability definitions are preserved.

## Files changed

- Maps/art: `shared/extra-maps.js`, `shared/maps.js`, `public/index.html`,
  `public/voxel-look.js`.
- Movement/combat/lifecycle: `shared/world.js`, `shared/combat.js`, `lib/combat.js`,
  `lib/heroes.js`, `lib/potions.js`, `lib/units.js`, `lib/bots.js`,
  `lib/extra-kits.js`, `public/game.js`.
- Server: `server.js` only updates the invalid-map error text; host permissions and
  networking architecture are unchanged.
- Tests/tools: `test/map-expansion.test.js`, `test/gameplay-reliability.test.js`,
  `test/maps.test.js`, `test/bots.test.js`, `scripts/map-expansion-smoke.cjs`,
  `scripts/production-smoke.cjs`, `scripts/benchmark-physics.cjs`, `package.json`.
- Documentation: `README.md`, this report.

No capture/scoring logic, kit roster, kit definitions, weapon balance, controls,
HUD layout, team/lobby rules or Railway deployment configuration was changed.
Structured-data fingerprints guard all original six maps, all 21 class definitions
and all weapon balance values against the baseline.

## Validation

- `npm test`: 160 passing tests. New coverage physically follows collision-aware
  routes and captures all three points from both teams on each new map, checks all
  ten spawn seats, alternate routes, void/bounds, soul sand and lava, preservation
  fingerprints, overlap recovery, stairs, frame-rate-independent movement, death,
  stale projectiles/potions, disconnected bodies and summon hit volumes. Existing
  combat, all-kit abilities, temporary effects, capture/scoring, room, respawn,
  reconnect and bot tests also pass.
- `npm run test:map-expansion-browser`: two Chromium clients use the real host map
  selector across all sixteen maps, start matches, move with real keys, agree on
  A/B/C ownership, and return to the lobby between rounds. Repeated map load/unload
  and effect resets, safe team spawns, 16×16 atlas use, draw-call budget, no JS/shader
  errors, and disconnect hide/cleanup are checked. Browser capture tests seed the
  last half-point of capture progress to keep this integration test short; full
  timed captures and physical traversal are covered by server tests.
- `npm run test:seven-kits-browser`: two-browser regression for primary inputs,
  Q/E/R, cooldowns, ultimate consumption and replicated effects/summons.
- Production build plus `npm run test:production`: non-root image, production-only
  dependencies, PORT, health/assets (including the new map module), all sixteen
  host map selections, 5v5 sockets, private rooms, bots, three points and clean
  shutdown/restart.
- A local median-of-five physics comparison, 30,000 fixed steps/sample:

| Map | Before | After |
| --- | ---: | ---: |
| Castle | 124.8 ms | 81.0 ms |
| Nether | 67.8 ms | 23.5 ms |
| Candy | 95.2 ms | 22.4 ms |
| Steampunk | 83.5 ms | 22.9 ms |

These are CPU microbenchmarks in this execution environment, not measured
Chromebook frame rates. Map geometry disposal, bounded spatial caches and bounded
particle pools were reviewed; repeated map changes passed. Long sessions on a
physical Chromebook and real-world poor Wi-Fi latency remain unverified. The fixes
address reproduced causes; they do not establish that every possible lag condition
or gameplay glitch is eliminated.

## Deployment

Commit and push the tested changes and rollback branch. The existing Railway
GitHub integration should automatically redeploy main. Wait for that release to
show Active, refresh, and select a map in the lobby. Railway's live deployment
status is not accessible from this environment.
