# Blockward — Phase 2

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
requires a second click. There are no bots: two real players are needed to duel.

| Control | Action |
| --- | --- |
| WASD / mouse | Move / look (always first-person) |
| Space / Shift | Jump / sprint |
| 1 / 2 / 3 | Sword / axe / mace |
| 4 / 5 | Bow / crossbow |
| Left click | Melee attack or fire crossbow |
| Hold and release left click | Draw and fire bow |
| Hold right click | Raise offhand shield with a melee weapon |
| Tab / Escape | Player scores / unlock mouse and pause your input |

Walk out of the colored spawn sanctuary to fight. Spawn sanctuaries protect
players and prevent attacks from inside. There is also a two-second grace period
after spawning. Pause is local: other players can still attack you outside spawn.

## Combat rules

All players currently share a 100-health training loadout with four armor pieces:
helmet (4%), chestplate (8%), leggings (5%), boots (3%), totaling 20% damage
reduction. Armor does not reduce fall damage. Class-specific equipment arrives
with the hero phase. Combat is free-for-all until teams arrive in Phase 3.

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

## Foundation and performance

The symmetric arena includes keeps, gate tunnels, cover, stairs, elevated terraces,
and wooden crossings. No mining, crafting, building, or third-person gameplay.
The menu has sensitivity and graphics resolution controls; performance mode lowers
resolution. Static map geometry is instanced by material. Physics runs at 60 Hz;
snapshots at 20 Hz. Clients predict local movement and interpolate remote avatars.
Rooms support up to ten players and are removed when empty. All room state lives
in memory; restarting the server ends active rooms.

Not yet implemented: teams, capture objectives, team scoring, hero classes,
abilities, potions, and match results. The center platform is scenery until Phase 3.
The initial combat values are provisional and need real-player balance testing.

## Validation

`npm test` runs physics, combat, and real Socket.io integration tests, including
cooldowns, armor, shields, axe shield disable, blocked line of sight, ranged
collisions, draw/reload timing, falling/critical damage, knockback, spawn safety,
room isolation, death, respawning, and rejection of client damage claims.

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
