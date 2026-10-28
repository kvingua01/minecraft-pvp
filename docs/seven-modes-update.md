# Seven-mode update

The lobby now offers Normal CTF, 1v1 Duels, Random Kit, Free-for-All, Kit Ladder, Payload Escort, and Juggernaut. Mode selection remains host-controlled, replicated to everyone, and preserved when returning to the lobby.

## New modes

- **Kit Ladder:** All players share a sequence shuffled once from the 21 playable kits. Each confirmed player elimination advances one kit immediately. Progress survives death and session recovery. Old kit effects, summons, projectiles, cooldowns, and ultimate charge clear on advancement; health is capped to the next kit's maximum without healing. A final-kit elimination wins. Environmental deaths and destroyed summons do not advance progress. Manual kit selection is locked during the match.
- **Payload Escort:** Red attacks and Blue defends for five minutes. A server-controlled minecart moves along a checked route when living Red players escort it and no living Blue player contests it within three blocks. Summons and decoys cannot escort or contest. Movement scales modestly with up to three escorts; temporary ability walls stop the cart. Red wins on delivery, Blue on timeout. The minecart is indestructible. Clients interpolate its position.
- **Juggernaut:** One randomly chosen player keeps their selected kit and receives triple maximum health, full enhanced health, 1.5× outgoing damage, 50% knockback resistance, and a gold overhead marker. Hunters cannot damage each other or allied summons. A confirmed boss elimination transfers the role once to a living credited attacker; environmental deaths or disconnections choose another living player. If no eligible player is alive, assignment resumes as soon as someone is available. A shared boss health bar and role-time HUD update for everyone. Seven-minute standings rank accumulated live, connected role time, then boss eliminations; equal leaders share victory. Role buffs clear at the end.

Kit Ladder and Juggernaut require two connected human players. Payload requires both teams. Existing balancing bots remain available in Normal CTF and Random Kit, with their existing behavior.

## Payload maps

Available: Castle Siege, Sky Islands, Lava Mines, Frozen Village, Jungle Temple, Desert Outpost, Nether Fortress, Pirate Cove, Mushroom Kingdom, Underwater Ruins, Volcano Island, Haunted Mansion, Candy Land, Ancient Egypt, and Steampunk City.

**End City is unavailable for Payload Escort:** its raised bridges and void gaps do not provide a continuous level minecart lane with full ground support and wall clearance. The lobby disables this option for Payload Escort and explains the limitation; the server rejects an unsupported start. End City remains available in the other modes.

Routes are calculated from existing static geometry and checked across the complete cart footprint, including points between route nodes. Maps and textures are unchanged. Team respawns remain outside the route endpoints. The original four modes keep their scoring, timers, respawns, and rules.

## Changed files

- Mode implementation and routes: `lib/extended-modes.js`, `lib/payload-routes.js`, `lib/game-modes.js`, `shared/modes.js`.
- Authoritative mode integration, kill/role hooks, attributed periodic damage, and summon allegiance: `server.js`, `lib/combat.js`, `lib/heroes.js`, `lib/extra-kits.js`, `lib/potions.js`, `lib/objective.js`, `lib/bots.js`, `shared/combat.js`, `shared/world.js`.
- Existing lobby/HUD integration, cart rendering, gold boss marker, and opponent health bars: `public/extended-modes-view.js`, `public/objective-view.js`, `public/lobby.js`, `public/hero-view.js`, `public/game.js`, `public/enemy-health.js`, `public/style.css`.
- Validation: `test/extended-modes.test.js`, `test/extended-modes-network.test.js`, `scripts/extended-modes-smoke.cjs`, `scripts/game-modes-smoke.cjs`, `scripts/production-smoke.cjs`, `package.json`.
- Documentation: `README.md`, this report.

## Validation commands

- `npm test`: existing regression tests plus new progression, routes, escort/contest, victory conditions, role buffs/transfers, timers, old-effect cleanup, summons, reconnects, host permissions, and fabricated-event rejection tests. Includes unchanged kit/weapon fingerprints and map/loading/navigation regressions.
- `npm run test:extended-modes-browser`: two Chromium clients exercise all three new modes, shared HUD/objective state, full 21-kit ladder victory, cart delivery, Juggernaut transfer, results, selection persistence, and return to Normal CTF.
- `npm run test:modes-browser`: two Chromium clients recheck all four original modes.
- `npm run build:production -- --environment-proxy`: production Docker image build using the cloud environment's existing local proxy helper. Railway's Dockerfile and configuration are unchanged.
- `npm run test:production`: production container health, non-root user, served assets, seven host-only mode choices, 5v5 socket connections, private rooms, original CTF, bots, and graceful shutdown.

The existing Railway integration should deploy a push to `main`. A successful local production build does not verify Railway deployment status.

### Completed validation

- **293 automated tests passed**, zero failures.
- **New-mode browser suite passed** with two clients and no JavaScript errors.
- **Original four-mode browser suite passed** with two clients and no JavaScript errors.
- **Final production Docker build passed.**
- **Final production container smoke test passed.**
- Kit definitions, map geometry, texture/rendering sources, Dockerfile, and Railway configuration were checked unchanged. The only change in shared weapon rules is recognizing the new individual modes for spawn-sanctuary behavior; weapon statistics are unchanged.

The intentional limitation is End City's unavailability in Payload Escort. Live Railway deployment has not been verified.
