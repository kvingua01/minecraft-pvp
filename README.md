# Blockward — Phase 1

An original first-person multiplayer voxel arena, built with Three.js, Express,
and Socket.io. The original click-target game remains available at `/practice/`.

## Run locally

Use Node.js 20 or newer:

```sh
npm ci
npm test
npm start
```

Open the server on port 3000 in a desktop browser. Create an arena, copy the
six-character room code, and join that code in another browser window or computer.
Click **Resume** if mouse capture is not granted immediately. Use WASD to move,
mouse to look, Space to jump, Shift to sprint, Tab to show players, and Escape to
release the mouse. The pause menu pauses only your input, not the server.

The menu offers look sensitivity and graphics resolution controls. Performance
mode reduces resolution. Static map geometry is instanced by material; the server
simulates physics at 60 Hz and publishes snapshots at 20 Hz. The client predicts
local movement and interpolates remote avatars. The server accepts movement inputs,
never client coordinates. Rooms support up to ten real players and are removed
when empty. All room state is in memory; a server restart ends active rooms.

## Phase 1 scope

Implemented: first-person camera only; pointer lock; jumping, gravity, sprinting,
solid map collisions; camera-mounted hand and training blade; remote block avatars
with walking and head movement; private room creation/joining; connection handling.
The symmetric arena has keeps, gate tunnels, cover, stairs, elevated terraces,
and wooden crossings. There is no mining or building.

Not yet implemented: combat or hit validation, health, shields, hero classes,
abilities, potions, teams, capture objectives, scoring, respawning, or match results.
The center platform is scenery, not a functioning capture point. The training
blade does not attack. These systems belong to subsequent development phases.

## Validation

`npm test` exercises physics, collision, jumping, diagonal normalization, two real
Socket.io clients exchanging movement, room isolation, invalid input handling,
static module routes, disconnects, and cleanup. Browser smoke testing should use
two independent browser contexts: join one room, capture the mouse, move and jump,
confirm both avatars are visible to the other player, then disconnect one player.

## Railway

Deploy this repository as a Node.js service. Use `npm ci` to install and `npm start`
to launch. The server binds `0.0.0.0` and Railway's `PORT`; health endpoint: `/health`.
Generate a domain under the service's Networking settings. Use one replica for now:
rooms are process-local and horizontal scaling is not supported. WebSockets must
be enabled by the hosting proxy. No API keys or external assets are required.

Source files are prepared locally; publication to GitHub and Railway is separate.
