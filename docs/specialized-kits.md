# Specialized kits

The existing 21 Normal Kits and their balance definitions are unchanged. The same
single `hero` identifier, `hero-select` message and respawn/lobby restrictions now
support 15 Specialized Kits, grouped below Normal Kits as Healers, Damage, Tanks.
There are no additional equipment slots, blocking controls, maps or game modes.

Healers: Cleric, Potion Master, Time Keeper, Phoenix Priest, Life Guardian.
Damage: Chain Reaper, Boomerang Hunter, Bombardier, Firework Raider, Portal Striker.
Tanks: Lava Guardian, Turtle Knight, Frost Warden, Obsidian Sentinel, Copper Automaton.

## Controls and HP

Every Specialized Kit now has its personal weapon in slot 1, a melee backup in
slot 2, and a ranged backup in slot 3, matching Normal Kits. Healers equip a
healing item, a dagger, and their weak ranged damage weapon; left-click uses the equipped item. Hold left-click to channel
the Cleric beam. Life Aura heals passively only while equipped. Right-click
continues to throw the existing wind charge for every kit. Q/E/R retain their
existing bindings. Healers have no damaging splash consumable. Their added dagger is the explicitly
requested exception to the original ranged-only damage restriction.

As explicitly requested, healers **retain Healing and Regeneration potions**.
Those consumables are an exception to E being their only self-healing kit ability.
Primary healing, Q and R exclude the caster, enemies, dead/disconnected players,
and teamless opponents. Ally healing is disabled in FFA, Duels and Kit Ladder;
Juggernaut hunters are explicitly allied to each other. Existing Healing and
Regeneration potion controls and cooldowns are unchanged. Healers do not consume
corner health packs, avoiding another passive self-heal route.

Weak healer projectiles deal 8 raw HP, half the existing Fire Staff's 16. Tank
maximum HP is 180, matching the default Normal Kit Knight’s actual
180 HP (the combat layer’s 100 HP fallback is overridden when kits spawn);
existing Normal Kits retain their individual 95–180 HP values and armor. All
health is displayed as numerical HP and bars, with no heart display. Juggernaut
multiplies the kit's base HP by three (540 for a specialized tank).

Magma Heart and Overcharge Armor grant 72 temporary HP for six seconds. Damage
consumes it before regular HP. A second grant cannot refresh/refill active bonus
HP, healing cannot restore it, and it is retired on expiration, death, disconnect
or donor kit/life change. It never changes maximum HP or healing statistics.

## Implementation and boundaries

`shared/specialized.js` defines kits and weapon metadata and extends the existing
hero/combat registries. `lib/specialized-kits.js` owns server-authoritative healing,
projectiles, collision queries, effects and barriers through the existing combat
loop. Rewind history is sampled every 250 ms, bounded to 13 entries per player and
the last three seconds of their current life; its heal is capped at 35 HP.

Boomerangs allow one hit per target per outgoing/return leg and one primary throw
in flight. Mortar splash uses collision and line-of-sight checks with falloff;
cluster shells split after 450 ms when airborne, or split at an earlier impact.
Barrage warnings precede falling shells. Damage fields use 500 ms hit intervals.
Movement and pulls use existing collision sweeps; Blink additionally validates
clearance and bounds before changing position.

Shell Dome blocks incoming hostile projectiles and lets friendly shots and player
movement through. Glacier Wall and Obsidian Barrier use existing temporary solid
wall geometry, reject occupied placements and expire after six seconds. These are
ability effects, not shield equipment. Normal Kits gain no shield controls/items.

Rendering uses existing Three.js block models, shared snapshot effects, original
16×16 item icons, bounded effect counts and existing procedural attack/ability
sounds. All fifteen kits are in Random Kit, Kit Ladder and the bot pool; bot
abilities use ordinary validated ability casts. No client can set HP, temporary HP,
charge, damage or projectile hits.

## Validation

```sh
npm test
npm run test:specialized-browser
npm run test:browser
npm run build:production -- --environment-proxy # managed proxy environment only
npm run test:production
```

The specialized browser smoke runs two Chromium clients, checks grouping and
exclusive selection, uses all 15 primary weapons, switches through all 30 backups, and uses all 45 Q/E/R bindings,
checks remote HP changes and checks for browser runtime errors. Server tests
exercise actual HP outcomes, consumable exceptions, per-leg hits, barriers,
cleanup, bots and all seven modes. Fixtures position players and grant charge
inside the test runner only; they add no production debug endpoints.

These checks do not establish Chromebook hardware performance or human balance.
Railway deployment must be checked separately; a push or local Docker build alone
does not establish that Railway deployed the commit.

Validation completed for the initial specialized-kit update: 551 automated tests passed with no failures
or skips; the specialized two-client browser smoke and original gameplay browser
smoke passed with no browser runtime errors. The production Docker build and
container smoke passed (non-root, production dependencies only, health/assets,
5v5 sockets, private rooms, host permissions, bots, maps/modes and graceful SIGTERM).
Railway deployment and Chromebook hardware performance were not verified.

The subsequent three-weapon loadout update passed all 589 automated tests,
including real damage from every Specialized Kit’s melee and ranged backup,
inventory persistence, and bot weapon selection for all 36 kits.
The updated two-client browser check passed all 30 backup selections and bow
charging with zero runtime errors. All 45 loadout weapon models and 16×16 icons
were checked. The updated production build and container smoke also passed.
