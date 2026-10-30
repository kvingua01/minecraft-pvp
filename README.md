# Blockward — twenty-one-hero control-point arena

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
team and class. The host selects a map and starts once each team has an active
participant. The optional balancing-bot setting lets a solo host start against a bot. Other players click Resume after starting to capture the mouse. Lobbies
allow five players per team. The host transfers immediately on disconnect.
Only the host can select a map or start. Results include eliminations, deaths,
healing and time on objectives; Return to Lobby lets the room choose another map.

## Host-controlled balancing bots

Before Start Match, the host can enable **Automatically balance teams with bots**.
Only the host can change this setting, and only in the lobby. It starts disabled.
Bots fill only the smaller connected-human team, up to the five-per-team limit:

| Human teams | Bots added |
| --- | --- |
| 1 Red / 0 Blue | 1 Blue bot |
| 2 Red / 1 Blue | 1 Blue bot |
| 3 Red / 1 Blue | 2 Blue bots |
| 2 Red / 2 Blue | None |

Counts update after human joins, departures, team changes and reconnects. Humans
replace bot seats, including in a full room. Reconnecting humans keep their reserved
seats, so bot additions never overfill a team. Bots cannot become host, and rooms
are removed when their last human leaves. The lobby, roster and connection display
clearly label bots separately from humans.

These are server-controlled players choosing from all 21 class kits, not decorative/fake participants.
They navigate shared map collisions, move to objectives, fight using ordinary
melee/bow rules, take damage, die and respawn normally. Bot pathfinding covers all
all sixteen maps and avoids lava/void routes. They now use class Q/E/R abilities with normal cooldowns and earned ultimate charge.

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
npm run test:bots-browser
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


## Seven additional kits

The original 14 classes are preserved. Selection now includes 21 classes, using
exactly the existing selection cards, lobby, controls, 9-slot hotbar and inventory.

| New kit | Personal weapon | Q / E / R |
| --- | --- | --- |
| Demolitionist | TNT Launcher | TNT Toss / Blast Jump / TNT Barrage |
| Trident Warrior | Returning thrown Trident | Riptide / Tidal Mend / Tidal Wave |
| Illusionist | Enchanted Bow | Decoy / Mirror Swap / Hall of Mirrors |
| Wither Mage | Wither Staff | Wither Skull / Soul Flight / Wither Barrage |
| Blaze | Blaze Rods | Fire Spin / Flame Rise / Blaze Storm |
| Slime | Slime Fists | Bounce / Sticky Splash / Slime Split |
| Evoker | Totem Staff | Fangs / Vex / Fang Circle |

Damage, cooldowns, ultimate charge, projectiles, flight, teleportation and summons
remain server-owned. TNT and fang ultimates have replicated advance warnings;
explosions respect cover and do not destroy terrain or hurt teammates. Soul Flight
ends after 4 seconds and Flame Rise after 3 seconds, with swept ceiling collisions
and arena bounds. The primary trident throw prevents another throw or personal-weapon attack
until its visible return completes. Decoys are attackable, harmless summon entities;
they never count as players, capture or contest points. Mirror Swap requires a live
decoy and two clear, visible destinations. Wither has a single non-stacking damage
timer. Slime Bounce grants one additional bounce; Slime Split keeps the original
player, inventory and health, with three temporary summons returning at expiry.
Summons expire and are removed on their owner's death. Bots can select the new
kits too; their AI uses class weapons and context-sensitive Q/E/R abilities.

`npm test` covers the new kit mechanics and existing game regressions.
`npm run test:seven-kits-browser` uses two real browser clients to check all seven
primary inputs, all 21 Q/E/R activations, selection entries and replicated effects
and summons. Production checks remain `npm run build:production` followed by
`npm run test:production`. No map, capture, scoring, team-size, HUD-layout,
texture-resolution or Railway configuration changes are part of this addition.


Trident Warrior now throws its returning trident with primary attack; E is Tidal
Mend, healing 35 HP on a 10-second cooldown (no cooldown is spent at full health).
Normal and enchanted bows have no post-shot cooldown, but every shot still needs a
server-timed draw: 1 second for full power, at least 150 ms for a weaker shot.
Crossbow reloads are unchanged. Pyromancer Fireball base damage is slightly reduced
from 32 to 30; its other abilities, weapon, health and cooldowns are unchanged.
`node scripts/trident-bows-smoke.cjs` verifies primary throwing, return, healing and
immediate consecutive charged bow shots using two browser clients.


## Ten-map expansion and gameplay reliability

The original six maps remain intact. The existing host map selectors now also
include Nether Fortress, End City, Pirate Cove, Mushroom Kingdom, Underwater
Ruins, Volcano Island, Haunted Mansion, Candy Land, Ancient Egypt and Steampunk
City. Every map has three simultaneous A/B/C objectives, the same mirrored team
spawns and alternate routes accessible without a kit movement ability.

Nether soul sand slows slightly; Nether and Volcano lava damage players. End City
has real void gaps and bounded movement. Pirate and Underwater water is scenic;
there is no new swimming or oxygen system. Chocolate is harmless. New textures
are original 16×16 atlas tiles; map geometry remains merged into one world mesh.

Collision recovery handles small floor/wall penetrations, stairs settle onto their
steps, and cached spatial queries reduce collision work. Death immediately clears
active buffs, movement abilities, combos and held bow charge; owned projectiles,
summons and effects are removed. Projectiles carry their owner's life generation.
Disconnected avatars are hidden and reserved bodies no longer intercept attacks.
Summon hitboxes follow their visible model sizes, and AI aims at those bodies.
Remote interpolation resets for real teleports, respawns and connection changes.

Use `npm test`, `npm run test:map-expansion-browser`, and the production checks.
`npm run benchmark:physics -- castle` also accepts another map ID. Detailed map,
fix, validation and deployment notes are in [the expansion report](docs/map-expansion.md).


## Bot abilities

All 21 bot classes can use Q, E and earned R ultimates automatically. Healing and
support skills look for injured allies, offensive casts aim at enemies or valid
ground, and summons are not repeatedly recreated while already alive. Mobility
casts avoid obvious walls, lava and void gaps. Bots do not interrupt a bow draw
with routine ability casts. Ordinary player cooldowns, charge, spawn protection,
death, inventory and targeting validation apply; bots receive no free ultimates.

`npm run test:bot-abilities-browser` checks actual autonomous casts, replicated
summons/projectiles and healing in Chromium. `npm test` covers all 63 kit abilities
plus protections, real damage/healing, charge consumption and safe movement.

## Game modes

The host selects **Game Mode** at the bottom of the existing lobby; everyone sees
it, and the choice persists when returning from results.

- **Normal CTF:** existing Red/Blue rules, three points, 300 score, normal respawns.
- **1v1 Duels:** exactly two human players, both press **Ready**, three-second round
  countdown, full round resets, first to two wins. Disconnect forfeits the match.
- **Random Kit:** Normal CTF with a random starting class and a different class on
  every respawn. All 21 kits are available; manual in-match kit selection is locked.
- **Free-for-All:** no teams, seven-minute server timer, ranked kills/deaths. Most
  kills wins; fewer deaths breaks ties, then shared victory. Normal respawn delay
  and safe spawn selection apply. Active late joins do not reset the clock.

Team-balancing bots remain available in Normal CTF and Random Kit. Duels and FFA
use humans. Extra duel participants are not kicked; starting is prevented until
exactly two are present and Ready. Individual modes disable capture objectives.
Switching back to Normal CTF restores its teams, objectives and clean scores.

`npm run test:modes-browser` exercises all four modes with two browser clients.
See [the mode report](docs/game-modes.md) for files, policies and validation details.

### Corner health packs

Normal CTF and Random Kit matches have four health packs, one near each map corner on reachable ground. Walk into a pack while injured to restore up to 25 HP. Each pack disappears for 60 seconds after pickup; that cooldown is shared by all players and bots. Packs reset for a new match and are disabled in Duel and FFA. Run `npm run test:health-packs-browser` to check multiplayer pickups and respawning.

### Player settings and ranged knockback

Open **Settings** on the main menu or press Esc during a match and open **Settings**. Mouse sensitivity, sound volume, graphics quality, FPS/ping display, field of view (60–110), and inverted mouse look are saved in this browser and synchronized between both menus. Browser storage restrictions do not prevent changing settings for the current session.

Bow hits apply three times a normal sword hit’s horizontal and upward knockback. Other ranged weapon hits apply three times normal knockback, including thrown tridents, class projectiles, and the TNT launcher's blast. Melee and ability knockback retain their existing behavior. Run `npm run test:settings-browser` to verify settings synchronization and persistence.

Glass tunnel walls and roofs in Underwater Ruins, End City glass panels, and expanded-map windows have solid collision. Tunnel entrances stay open. `npm run test:wall-collision-browser` checks real client prediction and server movement against the underwater glass; the test suite audits solid wall faces on all 16 maps.

### Seven game modes

The existing lobby mode dropdown now also includes **Kit Ladder**, **Payload Escort**, and **Juggernaut**. The original Normal CTF, 1v1 Duels, Random Kit, and Free-for-All modes remain available. See [the seven-mode update report](docs/seven-modes-update.md) for rules, payload map availability, changed files, and validation commands. Run `npm run test:extended-modes-browser` for the new two-client gameplay checks.

### Testing any mode with bots

As host, choose a mode in the lobby, click **Add bot** as many times as you want, then start. **Remove bot** removes the last manually added bot. Team modes offer an Auto/Red/Blue bot-team choice. Rooms support 10 players including bots (five per team); 1v1 Duels supports one opponent and bots are ready automatically. Manually added bots stay when automatic balancing is switched off and persist across lobby/map changes; switching to a duel trims bots to the two-player limit. Bots fight in FFA and Kit Ladder, advance kits on kills, escort/contest the payload, and can become Juggernaut. Run `npm run test:manual-bots-browser` for all seven solo-host lobby flows.

### Custom Payload Escort railways

Choose **Payload Escort** in the lobby to access **Minecart Canyon**, **Nether Railway**, **Castle Supply Run**, **Frozen Express**, and **Jungle Expedition**, alongside the existing payload maps. Each new railway has a winding functional track, two synchronized checkpoints, protected spawns and alternate routes. Checkpoints mark progress without extending the five-minute timer. See [the custom map report](docs/custom-payload-maps.md) for routes, timings, changed files and validation. Run `npm run test:payload-maps-browser` for the two-client map/checkpoint check.

## Fifteen Specialized Kits

All 21 Normal Kits remain above the new Healers, Damage and Tanks groups in the
same exclusive kit selector. Healers use slot 1 to heal teammates (Life Aura is
passive; hold left-click for Cleric) and slot 2 + left-click for their weak ranged
attack. Right-click remains wind charge. Healers retain Healing and Regeneration
potions; their primary, Q and R never heal themselves. Tanks have 252 HP and
specified defensive abilities; temporary overhealth is a separate 72 HP buffer.
See [specialized-kits.md](docs/specialized-kits.md) for mechanics, controls and
testing. Run `npm test` and `npm run test:specialized-browser` for this update.
