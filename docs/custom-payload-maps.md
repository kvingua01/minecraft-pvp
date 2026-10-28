# Five custom Payload Escort maps

Added all five requested maps using the existing block renderer and 16×16 texture atlas. They appear only in the lobby's Payload Escort map list. The 16 existing maps and their compatibility remain available. Switching to another mode restores the last selected general-purpose map.

| Map | Start | Checkpoint 1 | Checkpoint 2 | Destination | One escort, uncontested |
| --- | --- | --- | --- | --- | --- |
| Minecart Canyon | Mine Entrance | Canyon Bridge | Mining Town | Train Depot | 3:24 |
| Nether Railway | Nether Mine | Lava Bridge | Fortress Gate | Portal Station | 3:35 |
| Castle Supply Run | Village Supply Depot | Drawbridge | Courtyard | Storage Room | 3:35 |
| Frozen Express | Mountain Mine | Ice Bridge | Snow Village | Frozen Station | 3:53 |
| Jungle Expedition | Jungle Camp | River Crossing | Ancient Temple | Treasure Vault | 3:49 |

The existing escort speed of 0.55 blocks/second and its existing multi-attacker boost are unchanged. These travel times come from the new route lengths, not a speed adjustment. The five-minute timer, contesting rules, protected spawns, respawns, and victory conditions are unchanged. Existing maps retain their original routes.

## Builds and gameplay

- Minecart Canyon includes sandstone cliffs, a timber-supported mine tunnel, a mining crane, desert buildings around the railway, wooden canyon bridges, and elevated walkways.
- Nether Railway includes basalt cliffs and tunnels, Nether-brick towers, lava bridges and waterfalls, soul sand, soul lighting, and an obsidian portal station. Lava uses the existing hazard system, with multiple safe pedestrian crossings.
- Castle Supply Run includes village buildings, a wide drawbridge gate, crenellated walls, towers, a courtyard, barricades, and a storage vault beneath masonry.
- Frozen Express includes mountain/ice tunnels, snowy cabins and village, pine trees, frozen waterfalls, railway bridges and a large station. Ice regions use the existing movement behavior.
- Jungle Expedition includes a camp, a lowered river, wooden crossings, limited jungle foliage and vines, tree platforms, waterfalls, a stone temple, and a covered treasure vault.

Tracks follow explicit connected waypoints with rounded bends. Both visual rails and the server movement use the same points. The server measures actual segment length so curved samples do not change speed. Small render-only rotations align rail blocks and sleepers; other map blocks and the atlas remain unchanged. The minecart sits on the rail surface.

Each track has two progress markers. Reaching one saves its index and timestamp in match state, changes the track marker color, displays **CHECKPOINT REACHED**, and plays an existing-style two-note sound. Clients joining later receive the current checkpoint state. Checkpoints never add time or roll the cart backward. Returning to the lobby/new match clears them.

The builds have protected spawns, cover, broad ground-level escort lanes, elevated positions, connected bank catwalks, flanks, and half-block steps out of the ravines. Their bot-navigation metadata keeps routine routes on the safe upper walkways. Bot navigation and physics for the old maps are unchanged.

The maps contain approximately 1,000–1,200 block descriptions each, merged into the existing world mesh. Checkpoints add only two small markers. No new particle system, texture pack, graphics setting, kit, weapon balance, control, game mode, or deployment configuration was introduced.

## Changed files

- New map builds and mode-compatible registry: `shared/payload-maps.js`, `shared/maps.js`.
- Loading and authoritative map selection: `server.js`, `lib/objective.js`, `public/index.html`, `public/lobby.js`, `public/game.js`.
- Explicit route sampling and checkpoint state: `lib/payload-routes.js`, `lib/extended-modes.js`.
- New-map bot path safety: `lib/bot-navigation.js`.
- Existing renderer/HUD/audio integration: `public/voxel-look.js`, `public/extended-modes-view.js`, `public/audio.js`.
- Verification: `test/payload-maps.test.js`, `test/payload-maps-network.test.js`, `scripts/payload-maps-smoke.cjs`, `scripts/production-smoke.cjs`, `package.json`.
- Documentation: `README.md`, this report.

## Validation

- `npm test`: full existing regression suite plus map exclusivity, unchanged hashes for all 16 original maps, actual route length/clearance/support, rail alignment, ten safe spawn positions per map, solid wall sweeps, normal physical walks from both spawns, flanks, usable ravine exits, bots physically escorting every track, complete uninterrupted escorts, two ordered checkpoints, delivery and timeout, host permissions, two-client checkpoint synchronization, and mode/map cleanup.
- `npm run test:payload-maps-browser`: two Chromium clients load and render every custom map, escort and contest the cart, receive both checkpoint messages and sounds, verify the unchanged deadline, finish delivery, return to the lobby, and restore original CTF/map selection. Screenshots are captured from the actual renderer; draw calls must stay below the existing 300-call smoke-test budget. This is not a Chromebook hardware FPS guarantee.
- `npm run test:modes-browser`: original four-mode multiplayer regression check.
- `npm run build:production -- --environment-proxy`: production Docker build using the cloud environment's existing proxy helper; Railway's Dockerfile is unchanged.
- `npm run test:production`: production container, non-root runtime, served assets including the new shared map module, all five new map selections, a solo host starting Payload Escort with a bot, existing multiplayer/modes/bots, and graceful shutdown.

The existing Railway integration should redeploy a push to `main`. Local build and container checks do not verify the live Railway deployment.

### Completed checks

- **364 automated tests passed**, zero failures.
- **All five maps passed the two-client Chromium suite**, including rendered rails/markers, escorting, contesting, both checkpoint messages and sounds, unchanged deadlines, delivery wins, and lobby/map cleanup. No browser JavaScript errors.
- **Original Normal CTF, Random Kit, 1v1 Duels and FFA passed the two-client browser regression suite.**
- **Production Docker build passed.**
- **Production container smoke test passed**, including selecting all five custom maps and starting a payload game with a bot.
- All 16 original map hashes are unchanged; kit definitions, weapon statistics, other mode definitions, controls, Dockerfile and Railway configuration were checked unchanged.

No unresolved problems were found by these checks. Live Railway deployment has not been verified.
