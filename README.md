# Blockward — fourteen-hero control-point arena

First-person multiplayer voxel combat for desktop browsers, built on Three.js,
Express and Socket.io. All pixel artwork and procedural audio are original.
**There are no equipment shields, blocking, shield models, shield breaking or
shield-specific abilities.** Wind charges work with every class and weapon.
The original game remains at `/practice/`.

## Run

Node.js 20+:

```sh
npm ci
npm test
npm start
```

The server binds `0.0.0.0` and `PORT` (default 3000). `/health` reports readiness,
version and revision. Create Lobby, share the six-character code, and choose a
team and class. The host selects a map and starts once each team has a connected
player. Other players click Resume after starting to capture the mouse. Lobbies
allow five players per team. The host transfers immediately on disconnect.
Only the host can select a map or start. Results include eliminations, deaths,
healing and time on objectives; Return to Lobby lets the room choose another map.

## Controls

| Input | Action |
| --- | --- |
| WASD / mouse | Move / look, always first-person |
| Space / Shift | Jump / sprint |
| 1–9 / mouse wheel | Select a hotbar slot |
| Z | Open / close the 27-slot storage inventory |
| Left click | Attack, use a held potion, or hold/release a bow |
| Right click | Throw offhand wind charge, with any weapon |
| Q / E / R | Two class abilities / earned ultimate |
| F / G / Shift+G | Use potion / cycle forward / backward |
| Tab / Escape | Team scoreboard / release mouse and pause locally |

Aim wind charges at your feet outside spawn to launch yourself. They have a
three-second cooldown and protect the next landing. The offhand remains visible
while cooling down; failed throws explain spawn protection or cooldown. Mace
hits made while descending gain ten raw damage per block fallen without the
old bonus cap. Successful descending hits reset accumulated fall and protect the
landing. Armor/resistance still reduce damage. Ordinary misses do not reset falls.

Neutral A, B and C are simultaneously active. Stand on their marked platforms to
capture: ten seconds solo, up to twice as fast with teammates. Enemies contest
that point, freezing its capture and income; other points continue. Enemy points
must be neutralized first. Each owned point earns one score per second; first to
300 wins. Capture/income pause while a team has no connected players. Respawns
take six seconds. Spawn sanctuaries protect players and prevent attacks inside.

## Hotbar and inventory

Every class still owns just three weapons: its personal weapon, one melee backup,
and one ranged backup. Those start in hotbar slots1–3; six potion types fill the
remaining slots. Overflow goes into the27-slot storage area. Healing's two charges
share a stack. Press **Z**, click an item to pick it up, then click an empty slot
to place it or an occupied slot to swap. Storage and hotbar items can be moved
freely. Numbers1–9 and the scroll wheel select the hotbar, including potion and
empty slots. Click a held potion to use it; F also works. Empty slots cannot swing
a hidden weapon.

Z or Close returns to play; Escape closes into the pause menu. Closing while
carrying returns the item to an available slot. Movement and attacks stop while
the inventory is open, but the match and incoming damage continue. Item locations
survive reconnects and same-class respawns; potion charges refill as before.
Changing class rebuilds its allowed weapons. Moves, quantities and ownership are
server-validated; full item layouts and carried items are only sent to their owner.

## Heroes

Stats, primary weapons, abilities, cooldowns and three-weapon kits live in
[shared/heroes.js](shared/heroes.js). Ultimates start at zero and are earned by
real damage, healing allies and objective participation. Death resets charge.
Changing class during a match queues it for respawn; lobby changes apply at once.

| Hero | Primary | Q / E / R |
| --- | --- | --- |
| Knight | Iron sword | Battle Charge / Battle Cry / Fortress |
| Berserker | Heavy axe | Rage / Leap / Rampage |
| Assassin | Dual sword presentation | Dash / Vanish / Shadow Strike |
| Archer | Bow, crossbow backup | Grappling Arrow / Explosive Arrow / Arrow Storm |
| Paladin | Sword | Healing Aura / Holy Protection / Divine Protection |
| Alchemist | Potion launcher | Healing Splash / Poison Cloud / Mega Potion |
| Mace Warrior | Mace | Rocket Jump / Ground Slam / Meteor Strike |
| Frost Mage | Frost staff | Ice Bolt / Ice Wall / Blizzard |
| Necromancer | Dark staff | Summon Skeletons / Life Drain / Undead Army |
| Engineer | Crossbow, pickaxe backup | Turret / Repair Station / Mega Turret |
| Pyromancer | Fire staff | Fireball / Flame Dash / Inferno |
| Samurai | Katana | Quick Slash / timed sword Parry / five-strike Blade Storm |
| Druid | Nature staff | Healing Roots / Entangle / Forest Guardian |
| Plague Doctor | Poison crossbow | Toxic Dart / Antidote / Plague Cloud |

Summons/devices have server-owned targeting, attacks, health, collisions and expiry.
They are separate entities, not fake players, and can be destroyed by real attacks.
Skeletons chase enemies; turrets fire actual projectiles. Repair stations heal;
guardians attack and grant nearby resistance. Summons are capped at 40 per room
and disappear on expiry, owner life change or room reset. Movement uses collision
steering; complex crowd navigation and class balance still need human playtesting.
Parry is a 350 ms sword counter window, with no physical blocking equipment.
Plague reduces incoming healing, poison ticks on the server and Antidote cleanses.

Active potion effects appear in the top-left corner with an icon, name and live
remaining-time countdown. Slowness, poison and burning are shown too; expired
effects disappear automatically, and respawning clears the effect display. Instant heals/damage
do not show a timed buff.

Timed potions (Speed, Strength, Regeneration, Slowness and Fire Resistance) last
**30 seconds**. Healing and splash damage are instant.

Seven limited-charge potions: Healing (two), Regeneration, Strength, Speed,
Slowness splash, Damage splash and Fire Resistance (one each per life). F uses
and G cycles; pause also offers an inventory picker. Shared cooldown: eight
seconds. Drinking takes 650 ms and prevents attacks/casts. Death/disconnect
interrupts drinking; respawn/rematch refills charges, reconnect does not.

## Maps and visuals

[shared/maps.js](shared/maps.js) builds six independent layouts with shared client
and server collision geometry, two protected spawns and three accessible points.

| Map | A / B / C | Environment |
| --- | --- | --- |
| Castle Siege | Castle Tower / Courtyard / Underground Dungeon | Lodges, battlements, windows, gates, tower stairs, two dungeon exits |
| Sky Islands | Northern / Central / Southern islands | Floating terrain, multiple bridges, waterfalls, trees; void kills |
| Lava Mines | Mineshaft / Lava Bridge / Forge | Cavern ceiling, wooden supports, lava channels, rail details; lava burns |
| Frozen Village | Frozen Lake / Village Square / Ice Fortress | Snow roofs, pine trees, ice paths; lake movement has reduced friction |
| Jungle Temple | Canopy / Temple / Hidden Cave | Dense trees, ruins, vines, waterfalls, overhead structures |
| Desert Outpost | Watchtower / Marketplace / Oasis | Sandstone lodges, streets, market stalls, water, rooftop stairs |

Original 16×16 tiles share a 512px atlas with nearest-neighbor sampling, repeated
once per world block rather than stretched across walls. World geometry is merged;
clouds and bounded pixel particles are instanced. Character skins, class armor,
portraits, pixel tool silhouettes, pixel hearts/armor and inventory icons use
original artwork. Low/Medium/High resolution and Auto are available before joining
and while paused. Auto reduces resolution under sustained slow frames. Hidden
tabs stop rendering and clear movement. Optional actual FPS/ping is available.

The server advances fixed 60 Hz physics with bounded catch-up and 20 Hz snapshots.
Clients predict local movement and interpolate remote packet timestamps. Short
transport failures reserve the player for 30 seconds and reconnect without
replaying input. Full deployments/restarts clear in-memory rooms and show an update
message. There is no persistent match database or horizontal room scaling.

## Validation

```sh
npm test
npm run test:browser
npm run test:heroes-browser
npm run test:new-heroes-browser
npm run test:hero-picker-browser
npm run test:loadouts-browser
npm run test:inventory-browser
npm run test:potions-browser
npm run test:wind-browser
npm run test:reconnect-browser
npm run test:maps-browser
npm run test:lobby-browser
npm run test:network-browser
```

Browser checks require system Chromium or Playwright Chromium; production does not.
Set `BROWSER_EXECUTABLE_PATH` to select another Chromium executable. Combat-only fixtures explicitly use
constructor option `autoStart:true`; the public server always requires a lobby.
Deterministic fixtures position clients or supply charge for UI tests; production
clients have no teleport, damage, health or charge-setting endpoint. The latency
check uses ten real Socket.io clients through a jitter proxy; summons are not
counted as players. Headless SwiftShader timings do not prove Chromebook FPS.
Actual Chromebook performance and balance require hardware/human playtests.

## Railway

The existing pinned Node 24 Dockerfile and railway.toml are retained. Run one
replica: rooms are process-local. Railway injects `PORT`; `/health` is the readiness
check. No game API keys or remote assets are needed.

```sh
npm run build:production
npm run test:production
```

The production image is non-root and excludes development dependencies. In this
managed cloud proxy environment, see [deployment.md](docs/deployment.md) for the
optional `--environment-proxy` build flag; TLS verification remains enabled.
A GitHub push is not proof of a successful Railway deployment. Wait for the newest
commit to show Active, then hard-refresh the browser. Live Railway access is
blocked by this environment's egress policy and was not verified here.

Rollback: `rollback/before-master-upgrade-eccabc2` preserves the previous game.
Phase checkpoints and test evidence are in [master-upgrade.md](docs/master-upgrade.md).
