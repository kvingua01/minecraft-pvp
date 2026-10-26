# Master upgrade — phase report

Rollback point: `eccabc2`, retained on GitHub as
`rollback/before-master-upgrade-eccabc2`. The original game is still `/practice/`.
Express / Socket.io / Three.js and the existing Railway Docker configuration are
preserved. No equipment shields, block inputs, shield breaking, shield models,
shield-specific combat skills or shield sounds are implemented.

| Phase | Implemented / main modified files | Validation | Git checkpoint |
| --- | --- | --- | --- |
| 1 — Visuals | `public/voxel-look.js`, `skins.js`, `pixel-items.js`, `hud-icons.js`, `particles.js`, `game.js`, `style.css`, `index.html`, `shared/world.js`: original 16px atlas, constructed buildings/windows/roofs, class skins/portraits, merged pixel tools, hearts/armor, nine-slot hotbar, bounded particles | Browser rendering, two-browser combat/movement, visible class cards; no shader errors | `dea4b50`, with final icon refinements in phase 7 |
| 2 — Combat | `shared/combat.js`, `shared/heroes.js`, `public/combat-view.js`, `test/extended-combat.test.js`: katana/dagger/pickaxe stats, reach/cadence, real nine-key equipment, original potions/bow/crossbow/mace/wind authority preserved | 73 server tests at checkpoint; real bow/crossbow/melee, potion and wind inputs | `dea4b50` |
| 3 — Objectives | `lib/objective.js`, `public/objective-view.js`, `server.js`: independent A/B/C, ten-second solo capture, capped acceleration, neutralization, contest, one income per owned point per second, first to300, six-second respawn | 74 server tests; real two-browser capture/contest/win/rematch | `f16afe8` |
| 4 — Heroes | `shared/heroes.js`, `lib/heroes.js`, `lib/units.js`, `public/units-view.js`:14 classes, all Q/E/R, real destructible skeletons/zombie/turrets/station/guardian; parry, poison, cleanse, roots and reduced healing | 80 server tests; all14 cards join; six new classes use actual Q/E/R input and replicate effects | `eb215ca` |
| 5 — Maps | `shared/maps.js`, `shared/world.js`, `lib/potions.js`, `public/game.js`: six separate collision layouts, mirrored spawns,18 objective locations, stairs/half-step movement, cave/dungeon, alternate bridges, void/lava/ice behavior | 83 server tests including route traversal; all six maps rendered and replicated in Chromium | `d7e298d` |
| 6 — Lobbies | `server.js`, `lib/objective.js`, `public/lobby.js`, `public/objective-view.js`: host-only map/start, team/class changes, connected roster, automatic host transfer, real result statistics, Return to Lobby | 84 server tests; two browsers exercised map/start permissions, class change, shared turret, victory, return and host departure | `326a490` |
| 7 — Polish | `public/audio.js`, `runtime.js`, `hud-icons.js`, merged unit rendering, browser scripts, production smoke, README/setup docs: Low/Medium/High/Auto, actual FPS/ping, bounded render work, no shield audio, deployment checks | Final evidence below | Latest main commit |

## Final verification

- `npm test`: **84 passed**, zero failed/skipped.
- Combat, original hero, new hero, all14 picker, seven-potion/audio, all14 wind,
  reconnect, all-six-map and two-browser lobby scripts passed.
- Delayed-network smoke: ten real clients,5v5 capacity and private rooms,80ms plus
  jitter each way,217ms measured RTT,173 maximum sampled draw calls. Real delayed
  melee and rejection of forged target/damage fields passed.
- Actual pinned Dockerfile builds with verified TLS. Production image smoke checks
  non-root execution, production-only dependencies, PORT8080, assets/health,
  ten-player capacity, private rooms, host-only map/start, three points and clean
  restart announcement / SIGTERM exit0.
- Existing `/practice/`, multiplayer recovery and single-replica settings retained.
- Browser combat fixtures use constructor-only `autoStart:true`; public `npm start`
  requires a host-controlled lobby. Network clients cannot bypass that setting.
- The network test uses a flat Desert Outpost location. Its former position is now
  inside Castle Siege's dungeon opening and correctly causes real fall damage.

## What remains outside automated verification

Human balance and map playtests, actual Chromebook FPS, browser audio quality,
and complex summoned-unit crowd navigation still need human/hardware evaluation.
The units use collision steering, not a full navigation mesh. No persistent room
store or multi-replica matchmaking is provided. Existing ultimate values are
configurable and provisional.

## How to try it / release

Create Lobby, share the room code, join from a second browser on the other team,
choose classes, and have the host select a map / Start Match. Click Resume to
capture the mouse. Check A/B/C,1–9 weapons,Q/E/R,F/G potions and right-click wind
charges. Leave spawn before fighting. Results return the room to its lobby so the
host can choose another map. Try all six maps and the six new classes.

Each checkpoint is committed and pushed. Railway must deploy the **latest** main
commit; a push alone does not confirm deployment. This environment cannot reach the
public Railway site because of network policy, so live deployment is unverified.
Once Railway reports Active, hard-refresh and look for14 heroes / no shields.

## Later class-kit update

The user replaced the original nine-slot requirement with exactly three weapons
per class: personal primary in1, one distinct melee backup in2, and one ranged
backup in3. Personal weapons are unchanged. The server rejects unowned equipment;
removed keys4–9 do not equip hidden weapons. Configurations are in shared/heroes.js.
Mace smash now adds10 raw damage per fallen block before armor. Bounded server
pose history includes descent/fall distance so a strike clicked just before
landing can retain its bonus under network delay. Grounded hits have no fall bonus.
Unit coverage:85 passing tests, including all class kits, rejection of unowned
weapons, increasing drop heights, grounded attacks and a delayed landing strike.
The all14-class three-slot browser check, two-browser combat regression and
production-container checks also passed for this update.

## Later hotbar / inventory update

Class kits remain three weapons each, but the item hotbar now has nine slots shared
by weapons and potions. Storage has27 slots; overflow potions go there. Number keys
1–9 and wheel input select a hotbar item. Z opens a click-pickup/place/swap interface.
Carried items are returned on close/disconnect. Moves are revision-checked and
server-owned, and item layouts are private. Empty/potion slots cannot use a hidden
weapon. Same-class layouts are retained while potion charges refill on respawn.
93 server tests cover slot counts, overflow, click swaps, replay/invalid requests,
no-loss closing, no hidden attacks, private replication and reconnect preservation.
The real-browser inventory, all14 class-kit, combat, potion/audio and reconnect
regressions passed; the production image built and passed its smoke checks.

## Later host-balancing bot update

The host can enable automatic team-balancing bots in the lobby. Bots fill only
the smaller connected-human team and are removed when human teams become equal.
Human joins replace bot seats. Team caps and reconnect reservations are respected.
Only humans can host; last-human departure removes the room and all its bots.
Bots are explicitly labeled Knight AI players with server-owned navigation, actual
melee/bow combat, capture, health, deaths and six-second respawns. They cannot
teleport or deal unvalidated damage. Nav routes and physical capture are tested
on all six maps; bots currently use weapons rather than class ability casts.
105 server tests, the two-browser bot/lobby checks, and the production image
passed. Coverage includes team-size differences, even-team removal, replacing
bots with humans in full rooms, host authority, sanctuary exit, normal combat/
respawn, physical capture on six maps, reconnect reservations and room cleanup.
