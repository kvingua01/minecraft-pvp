# Four-mode update

All four modes are implemented in the existing room, combat, map, kit and rendering
systems. Default is **Normal CTF**. The existing lobby now has a native **Game Mode**
dropdown near the bottom. Everyone sees its value; only the host can change it,
and only in the lobby. The selection persists when the match returns to the lobby.

## Playing

| Mode | Rules | Before starting |
| --- | --- | --- |
| Normal CTF | Original Red/Blue, three simultaneous points, 300 score and six-second respawn | At least one participant per team; existing balancing bots are supported |
| 1v1 Duels | Exactly two humans, first to two round wins, three-second countdown each round, no active-round respawn | Choose kits and both press Ready; extra players must leave before the host can start |
| Random Kit | Normal CTF rules, server-selected starting kit and a different kit on each respawn | Normal team/bot requirements; manual in-match kit selection is disabled |
| Free-for-All | No teams; seven minutes, most kills wins, fewer deaths breaks ties, otherwise shared victory | Host can start with one or more humans; balancing bots do not apply |

Duels reuse opposite safe spawns on the selected existing map and enforce arena
bounds. Countdown blocks movement, attacks, damage, abilities, wind charges and
potions. Each round resets health, equipment/consumables, cooldowns, ultimate,
summons, projectiles and effects. Both dead in the same simulation step replays the
round with no win. Disconnecting forfeits the match to the remaining participant.
There is no spectator system: lobbies with more than two people clearly fail start,
and active duels reject additional joins. Changing a duel kit clears that player's
Ready state.

Random Kit uses all 21 implemented classes, never immediately repeats a class when
alternatives exist, and announces `NEW KIT: [name]`. Normal respawn timing and CTF
score/ownership continue. New kits receive their own three weapons and clean buffs,
cooldowns and ultimate charge. Players cannot bypass the selection lock via socket
messages. Late balancing bots also inherit the active random-kit mode and lock.

FFA uses one server deadline, `start + 420000 ms`. Joining, dying, leaving and
reconnecting cannot reset it. All other players are opponents; Red/Blue protection
and team spawn sanctuary restrictions do not apply. Private per-player ownership
sides let the existing ability/summon engine distinguish an owner from enemies;
public player snapshots have `team: null`. Summons and ground spells also work in
former team spawn areas without permanent immunity.

FFA respawns use validated existing walkable surfaces and choose a position far
from living opponents where possible, with normal spawn protection and respawn
delay. Late joins during active FFA start at zero kills/deaths; joins after its
deadline are rejected until the lobby returns. Confirmed eliminations count once;
environmental deaths add a death without inventing a killer. Departed participants'
results remain on the match leaderboard, so leaving does not erase a score. Combat
and respawns stop at the deadline, even if a packet arrives before the next tick.
A lone remaining player can continue until time runs out.

Individual modes replace only the contents of the existing objective HUD with
round wins or timer/leader/ranked kills/deaths. Capture markers/scoring are disabled
there. Results support individual and shared winners. Returning to Normal CTF
restores Red/Blue teams, capture markers, normal class selection, spawns and clean
scores. Old timers, wins, effects and locks are cleared. The normal CTF objective
calculation itself is unchanged.

## Changed files

- `shared/modes.js`: mode names, requirements and timings.
- `lib/game-modes.js`: server-authoritative rounds, readiness validation, random
  selection, FFA spawns/timer/rankings/results, disconnects and cleanup.
- `server.js`: host mode/ready events, start/join/leave/reset hooks, selection locks,
  snapshots and integration into the existing fixed-step loop.
- `lib/objective.js`: default selected mode and synchronized mode snapshot;
  original control-point update/scoring algorithm is preserved.
- `lib/combat.js`, `lib/heroes.js`, `lib/potions.js`: common countdown/deadline
  validation and per-mode respawn hooks. No duplicate combat engine.
- `lib/bots.js`: balancing bots remain in team modes and inherit Random Kit state.
- `lib/units.js`, `lib/extra-kits.js`: individual-mode ownership/spawn-space handling.
- `shared/world.js`, `shared/combat.js`: countdown freeze, individual arena bounds
  and removal of team sanctuary semantics in individual modes.
- `public/index.html`, `public/lobby.js`, `public/style.css`: mode dropdown, duel
  Ready button and existing-style mode-specific HUD content.
- `public/objective-view.js`, `public/hero-view.js`, `public/game.js`: synchronized
  countdowns, results/rankings, new-kit notification, selection lock and keyboard
  accessibility. Team appearance refreshes when switching modes.
- `public/skins.js`, `public/audio.js`: neutral individual appearance and correct
  individual victory sound. Existing Red/Blue appearance and sounds are preserved.
- `test/game-modes.test.js`, `test/game-modes-network.test.js`,
  `scripts/game-modes-smoke.cjs`, `scripts/production-smoke.cjs`, `package.json`:
  mode tests, production asset/mode selection coverage and browser test command.
- `README.md`, this report.

No kit definitions, weapon damage/balance values, map geometry, textures,
resolution, first-person camera, capture/scoring formula or Railway configuration
were changed. Preservation fingerprints and the existing regressions pass.

## Validation

- `npm test`: 247 passing tests, including 19 new mode tests. Coverage includes
  permissions, ready/player limits, countdown locks and first-frame jumping,
  first-to-two, round cleanup, simultaneous deaths, disconnect forfeits, all 21
  random kits, forced-choice rejection, equipment reset, every FFA opponent pair,
  all sixteen maps' safe FFA spawns, identity preservation, one-time kill scoring,
  late joins/reconnect identity, exact 420000 ms boundary, tiebreaks/shared wins and mode switching.
- `npm run test:modes-browser`: two Chromium clients use the actual dropdown,
  Ready buttons, countdown, kit notification/locks, duel rounds and results, an
  actual FFA melee elimination, timer/ranked HUD, results and keyboard selection
  back to clean Normal CTF. No browser JavaScript errors.
- `npm run test:browser`: original movement/jump, wall sliding, real ten-second
  capture, contesting/scoring, combat, rematch, disconnect and practice regressions.
- Production Docker build and `npm run test:production`: non-root startup,
  production dependencies, health/assets (including the mode registry), all four
  host mode choices, 5v5 rooms, map selection, balancing bots and graceful restart.

The exact seven-minute duration is checked using server timestamps and clock-boundary
tests. Browser FFA finish is accelerated after checking its real starting deadline;
we did not spend seven real minutes waiting in the browser. Tests use controlled
server eliminations for duel round progression; FFA includes a real mouse attack.

All four requested modes are complete. Physical Chromebook testing and live Railway
deployment status are not verified here. After the pushed commit is Active on
Railway, refresh the game. For Duels, remember to have exactly two people and both
press Ready. Normal/Random retain team-balancing bots; individual modes use humans.
Rollback point: `rollback/before-four-modes-049a0e2`.
