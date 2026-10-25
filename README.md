# Blockward — Phase 4

An original first-person multiplayer voxel arena, built with Three.js, Express,
and Socket.io. The original click-target game remains available at `/practice/`.

## Run and play

Use Node.js 20 or newer:

```sh
npm ci
npm test
npm start
```

Open the server on port 3000 in a desktop browser. Create an arena and share its
six-character room code with another player. Click **Resume** if mouse capture
requires a second click. Select Red, Blue, or Auto balance before creating or joining a room. There are no
bots: at least one real player on each team is required to advance the match.

| Control | Action |
| --- | --- |
| WASD / mouse | Move / look (always first-person) |
| Space / Shift | Jump / sprint |
| 1 / 2 / 3 | Sword / axe / mace |
| 4 / 5 | Bow / crossbow |
| Left click | Melee attack or fire crossbow |
| Hold and release left click | Draw and fire bow |
| Hold right click | Raise offhand shield with a melee weapon |
| Q / E / R | Class abilities / earned ultimate |
| Tab / Escape | Player scores / unlock mouse and pause your input |

Walk out of the colored spawn sanctuary to fight. Spawn sanctuaries protect
players and prevent attacks from inside. There is also a two-second grace period
after spawning. Pause is local: other players can still attack you outside spawn.

## Capture the point

Each room supports up to five Red players and five Blue players. Auto balance
chooses the smaller team; explicit team selection is honored unless that team is
full. Red spawns in the western keep, Blue in the eastern keep. Enemies cannot
enter your spawn sanctuary. Return to your own sanctuary for protection, but you
cannot attack from inside it.

The center courtyard's raised square is the objective. Jump onto the platform
and stay within its marked area. A living player standing on the point advances
capture by 20% per second, reaching full ownership in five seconds. Airborne
players above the objective do not capture it. With both teams present the point
is contested: capture and score freeze. An enemy must neutralize existing capture
progress before taking full ownership. Partial capture persists when abandoned.

The owner earns 2% score per second, including while the point is empty. An enemy
standing on the point pauses that income while recapturing it. Scores do not fall
when ownership changes. The first team to 100% wins; movement and combat stop,
and everyone sees victory or defeat plus real scores and eliminations. The host
can start a rematch, resetting health, spawns, point ownership, score, projectiles,
and eliminations. The host transfers automatically if the previous host leaves.
If either team has no connected players, scoring and capturing pause until both
teams have players again. Dead players still count as connected team members.

The HUD shows team scores, capture progress, ownership, contested/waiting state,
and your team. The center ring and flag change color with ownership. Tab groups
player eliminations by team. There are no fake participants or simulated scores.

## Combat rules

Heroes have different maximum health, armor, movement speed, primary weapons,
and shield availability. Armor reduces direct and area damage but not fall damage.
All classes retain backup weapons in their five-slot hotbar; slot 1 is always the
class primary. Only Knight, Paladin, and Mace Warrior can raise shields. Friendly
fire is disabled, including abilities; support effects heal or protect allies.

| Weapon | Base damage before armor | Cooldown | Mechanic |
| --- | --- | --- | --- |
| Sword | 20 | 0.45s | Fast melee; 3.2-unit reach |
| Axe | 32 | 0.95s | Disables a blocking shield for 3s |
| Mace | 28 | 1.15s | Falling adds up to 60 damage |
| Bow | 8–32 | 0.4s after release | Server-timed draw; full charge at 1s |
| Crossbow | 38 | 1.8s | Reloads after every shot |

Descending melee attacks deal 1.5× base damage. Sprint attacks increase knockback.
Shields block within a 120-degree horizontal arc. A blocked axe hit disables the
shield instead of damaging health, opening the target to follow-up attacks.
All melee weapons have approximately three-unit reach. Bow and crossbow arrows
have gravity, finite lifetimes, and swept player/map collisions. Falling more than
3.5 units deals damage based on distance. Eliminated players respawn after four
seconds with full health. Kills and deaths persist until leaving the room.

The HUD shows health, armor, hotbar, attack/reload cooldown, bow charge, shield
state, hit markers, damage flashes, kill feed, and respawn countdown. Hand and
weapon animations remain first-person. Other players see weapon swings, reloads,
head movement, armor, shields, and walking animations.

The server owns health, equipment selection, cooldowns, draw duration, projectiles,
shield direction, hit validation, knockback, fall damage, kills, and respawns.
Client damage and target claims are ignored. Switching weapons cannot reset attack
cooldowns. Melee uses authoritative pose history with at most 150ms of rewind;
static cover is checked on the server. Projectiles use current server positions.

## Heroes and abilities

Choose a hero before joining. To queue another class, press Escape and change
**Next respawn hero**. The change applies on your next respawn or rematch, never
restoring health in the middle of a fight. Maximum health and the health bar adjust
to the chosen class. All balance values are provisional for real-player testing.

| Hero | HP / armor | Primary | Q | E | R ultimate |
| --- | --- | --- | --- | --- | --- |
| Knight | 180 / 35% | Sword + shield | Shield Charge | Battle Cry | Fortress |
| Berserker | 130 / 20% | Axe | Rage | Leap | Rampage |
| Assassin | 95 / 10% | Dual swords | Directional Dash | Vanish | Shadow Strike |
| Archer | 110 / 12% | Bow; crossbow backup | Grappling Arrow | Explosive Arrow | Arrow Storm |
| Paladin | 160 / 30% | Sword + shield | Healing Aura | Holy Shield | Divine Protection |
| Alchemist | 120 / 20% | Potion launcher | Healing Splash | Poison Cloud | Mega Potion |
| Mace Warrior | 160 / 30% | Mace + shield | Rocket Jump | Ground Slam | Meteor Strike |
| Frost Mage | 105 / 12% | Frost staff; sword backup | Ice Bolt | Ice Wall | Blizzard |

The class menu describes each ability. The HUD shows Q/E cooldowns, active status
effects, and ultimate charge. Mouse aim selects a target; ground zones project to
the aimed surface (up to 16 units). Grappling Arrow needs a block within 22 units.
Walls require clear space three units ahead and cannot trap players or intersect
terrain. Temporary walls block movement and shots on both server and client, then
expire. Poison, storm and healing zones check distance and line of sight. Area
damage bypasses directional shields; direct ice bolts can be blocked.

Ultimates start at 0% and require 100%. Actual enemy damage and actual healing of
other teammates grant 0.15% charge per health point. Standing on the live objective
grants 3% per second, including contesting it. Empty-team matches, overhealing,
self-healing, and ultimate damage do not create free charge. Charge is capped at
100%, spent on successful use, reset on death/respawn, and does not accumulate for
eight seconds after activating an ultimate. Invalid casts keep their charge.

Battle Cry gives nearby allies 25% resistance for 5s. Holy Shield protects an aimed
ally (or yourself if none is aimed at) for 4s; Divine Protection buffs nearby allies
for 5s. Healing Aura follows its caster. Assassin movement remains collision-safe;
Vanish renders the actual remote avatar at 15% opacity and breaks on attacking or
receiving damage. Rage speeds up attacks; Rampage boosts damage, speed and knockback.
Mace launch abilities prevent their landing damage; slam effects trigger on landing.
Alchemist's primary projectiles heal allies and damage enemies in a small splash.
Frost's basic staff bolts briefly slow, with Q applying a longer slow.

```sh
npm run test:heroes-browser
```

This second two-browser test checks class descriptions, Frost abilities and solid
ice walls, charge validation, Blizzard, queued respawn class changes, real remote
invisibility, Assassin dashes, healing feedback, and Mace launch/slam landings.
Deterministic server-side fixtures shorten respawns and supply a full ultimate for
the ultimate UI check. Production clients cannot set health, class stats, cooldowns,
or charge; unit/network tests independently verify how charge is earned.

## Foundation and performance

The symmetric arena includes keeps, gate tunnels, cover, stairs, elevated terraces,
and wooden crossings. No mining, crafting, building, or third-person gameplay.
The menu has sensitivity and graphics resolution controls; performance mode lowers
resolution. Static map geometry is instanced by material. Physics runs at 60 Hz;
snapshots at 20 Hz. Clients predict local movement and interpolate remote avatars.
Rooms support up to ten players and are removed when empty. All room state lives
in memory; restarting the server ends active rooms.

Not yet implemented: consumable potion inventory, potion charges, additional
sound design, and final deployment/performance polish. Alchemist abilities and
the potion launcher work now; these are separate from the Phase 5 potion items.
The initial combat values are provisional and need real-player balance testing.

## Validation

`npm test` runs physics, combat, and real Socket.io integration tests, including
cooldowns, armor, shields, axe shield disable, blocked line of sight, ranged
collisions, draw/reload timing, falling/critical damage, knockback, spawn safety,
room isolation, death, respawning, and rejection of client damage claims. Match
tests also cover capture/contest/recapture, full scoring to 100%, friendly fire,
team caps, enemy spawn restrictions, host transfer, and rematch authorization.

For an automated two-browser combat check:

```sh
npx playwright install chromium  # Only if no system Chromium is available
npm run test:browser
```

The browser script starts an isolated test server and two real browser contexts.
It uses server-side fixtures to position those clients for deterministic duels;
there is no production teleport endpoint. It tests shield controls, melee, bow,
crossbow reloads, damage HUDs, elimination, kill feed, respawn, and Escape/resume.
It uses system Chromium when available, or Playwright's installed Chromium.
Set `BROWSER_EXECUTABLE_PATH` to select another Chromium executable. Browser
installation is unnecessary on Railway; it is only needed to run browser tests.

## Railway

Deploy this repository as a Node.js service. Use `npm ci` to install and `npm start`
to launch. The server binds `0.0.0.0` and Railway's `PORT`; health endpoint: `/health`.
Generate a domain under the service's Networking settings. Use one replica for now:
rooms are process-local and horizontal scaling is not supported. WebSockets must
be enabled by the hosting proxy. No API keys or external assets are required.

GitHub publication and a successful Railway deployment are separate. Inspect
Railway's deployment status before assuming the public site is updated.
