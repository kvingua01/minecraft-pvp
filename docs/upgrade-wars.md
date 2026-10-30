# Upgrade Wars

Upgrade Wars is an eighth mode in the existing lobby. It uses the same maps,
three control points, teams, movement, kits, six-second respawns, server and
Socket.io clients as the existing game. All registered kits are eligible. Existing
modes retain their original rules.

## Match and armory

Select a kit in the lobby. It is locked for the entire match, including shopping
between rounds. Each round is a race to 150 points; two round wins wins the match.
Ownership, capture progress, combat effects, health, potion charges, ultimate
charge and ability cooldowns reset for each round. Money and purchased items
carry between rounds. At match end the economy and all item bonuses are removed.

Every round begins with an exactly 45-second server-timed shopping phase. Ready
is informational and can be canceled; it never shortens the timer. Players are
frozen and cannot attack, cast, capture or earn combat income in the armory. When
the deadline expires the armory closes automatically. Click the normal Resume
button to capture the mouse for combat.

The Item Armory has all/green/blue/purple filters, thirty original 16×16 item
icons, details, affordability/ownership states, full-refund sales and six item
slots. Drag between the six slots to rearrange purchased items. These slots are
separate from the existing weapon/potion hotbar. All thirty items are available
to every kit. Duplicates, insufficient funds, seventh items, fabricated catalog
IDs and late transactions are rejected on the server.

## Personal economy

Players start with $1,000. A real elimination earns $100. Other players who dealt
actual enemy damage in the previous ten seconds earn $50 assists. Each victim's
life can pay only once. A legitimate control-point capture pays $100 to players
who contributed at least one second to that capture; merely revisiting an owned
point does not pay.

Actual allied healing accumulates toward $50 per 100 HP. Self-heals and overheals
do not count. Tank defensive abilities similarly accumulate actual mitigation
and absorbed temporary HP toward $50 per 100 damage prevented. Barriers count
real intercepted hostile damage projectiles whose remaining unobstructed path
threatens an eligible ally, capped at the ally's available HP. Misses, wind
charges, friendly projectiles, and idle barriers do not generate credit.

Each completed round pays $500 to participants plus $250 for the winning team.
Partial healing/defense progress, money and item ownership persist between rounds.
Money and item arrays reset after the final payout at match end. Existing
transport reconnect reservations retain the same player object and economy;
reconnecting never grants another starting balance. A new participant joining an
active match starts at $1,000, locks their chosen kit, and must wait for the next
shop to purchase if combat is already active.

## Combat and stacking

The exact catalog, prices, effects and balance constants are centralized in
`shared/upgrade-items.js`. Different flat HP bonuses add. Item percentages for
speed, attack speed, healing and charge add within their respective statistic;
item bonuses multiply the existing kit modifiers. Item resistance is capped at
30%; item ultimate generation bonus is capped at 35%, separately from kit effects.
Feather Charm uses square-root scaling of jump velocity for 15% greater height.

A primary-input weapon hit is a validated left-click attack or bow release with
the equipped weapon, including backups and healer damage weapons. The combat
server stamps that origin before projectiles are created. Q/E/R, summon attacks,
healing, periodic damage and item-generated damage cannot increment weapon-hit
counters. Item damage cannot recursively trigger Echo or lightning. Sharp Edge
and attack-speed bonuses use weapon input, while Mana Crystal changes Q/E only.
Blast Core changes only explicitly marked explosive radii, never their damage or
ordinary non-explosive attacks.

Regeneration is interrupted by real enemy damage. Phoenix Heart is once per
round, including across deaths or attempts to sell/rebuy it; it grants 20 HP and
one second of protection. Selling an item removes its stats, counters, timed
buffs and outgoing item slows immediately. Each round clears temporary proc
state. The combat HUD displays round wins, personal money and six equipped item
icons, with bounded reward notifications.

## Verification

```sh
npm test
npm run test:upgrade-wars-browser
npm run test:browser
npm run build:production -- --environment-proxy # managed proxy environment
npm run test:production
```

Unit tests exercise deadlines, round flow, all 44 catalog transactions,
stacking, rewards, proc classification, caps, expiry, inventory restrictions and
all registered kits. Socket tests cover independent balances, synchronized
phases, forged messages, late transactions and transport reconnects. The browser
smoke uses two real Chromium clients to buy/rearrange items, filter the catalog,
Ready/cancel, enter combat, receive rewards, carry items into the next shop and
finish a best-of-three match. Test fixtures may advance phase deadlines; no
production endpoint exposes that capability.

Railway should build the existing Dockerfile from the pushed commit and run one
replica. No new secrets, database, services or deployment configuration are
needed. Verify the newest Railway deployment becomes Active and compare `/health`
revision with the final commit. Local production checks and a Git push do not
verify the live Railway deployment.

Completed validation: all 658 automated tests passed, with no failures or skips.
The Upgrade Wars two-client Chromium smoke and original gameplay browser smoke
passed with no browser runtime errors. The pinned production Docker build and
container smoke passed, including Upgrade Wars funds, shopping, duplicate-item
rejection and kit locks. Charged bows honor item attack speed, explicit ability
knockback honors Sturdy Boots, and overlapping defensive buffs credit only the
active protecting ability. Live Railway deployment was not verified.

## Fourteen-item expansion

The catalog contains 44 items: 15 green, 15 blue and 14 purple. The original
30 definitions, prices, icons and effects are preserved; the regression fixture
records every original field. No Colossus was added. Every kit uses the same
six slots, duplicate protection, full refunds, 45-second shop and Ready behavior.

New green items: Heavy Fists ($350), Lucky Charm ($300), Quick Recovery ($300),
Long Reach ($400), Lightweight Armor ($350). New blue items: Executioner's Blade
($1,150), Adrenaline Rush ($1,050), Reflective Shield ($1,100), Combat Medic
($950), Bounty Hunter ($1,000). New purple items: Blood Pact ($2,600), Chain
Reaction ($2,800), Time Warp ($2,700), Overcharge ($3,000). Exact numerical
behavior is displayed in the Armory and defined in the shared catalog.

Lucky Charm adds $10 per elimination and $5 per assist; Bounty Hunter separately
adds $50 per elimination. Together they pay $160/$55. Base rewards for capture,
healing, prevention and round completion/wins remain unchanged. Kill-life guards
also apply to these bonuses. No retroactive bonuses are awarded.

Executioner and Overcharge add to primary weapon damage percentages. Adrenaline
adds to primary attack speed, refreshes rather than stacks, and affects bow draw.
Time Warp adds to item movement speed only after successful Q/E. All timed
states reset each round and disappear on sale or match end. Blood Pact uses
actual HP removed (excluding absorbed overhealth), without healing on protected
hits, abilities, periodic ticks or item effects. Combat Medic accepts real
teammate weapon/ability healing, including auras, but excludes self/overhealing.

Reflective Shield uses actual HP damage and emits at most 10 raw reflected
damage per second through normal defenses; it may retaliate on a lethal hit.
Chain Reaction uses a four-block explosion with line of sight and normal armor,
excluding allies. Both are classified as item damage, cannot trigger weapon
passives or reflect, and item kills cannot produce another Chain Reaction.

Small shared-system compatibility changes route existing enemy slow application
through a duration helper (unchanged without Quick Recovery), pass authoritative
pre-hit target data and kill source metadata to item hooks, and allow a server-only
reflection to retaliate after its owner dies. Existing item slows remain exactly
the same unless the target equips Quick Recovery. Melee reach still uses the
existing server wall raycast and bounded pose rewind; projectile ranges and
ability knockback remain unchanged. No Railway configuration change is needed;
the connected service must deploy the pushed commit through its normal flow.

Expansion release validation: `npm test` passed 732/732 tests, including 59
expansion tests and the new two-client transaction test. The updated Upgrade Wars
browser smoke passed all 44 catalog entries, 15/15/14 filters, 14 distinct new
pixel icons, buy/sell, six slots, Ready/deadline, round carryover and match reset
with zero browser runtime errors. Production container build and
`npm run test:production` both passed. Live Railway deployment was not inspected.

## Earnings bonus

All earned rewards now receive a global 1.5× multiplier after item reward
bonuses: eliminations $150, assists $75, captures $150, each healing/defense
reward $75, round completion $750 and round wins $375. Lucky Charm and Bounty
Hunter together pay $240 per elimination and $82.50 per assist. Fractional
rewards are retained exactly, without rounding away the 50% increase. Reward
notifications and synchronized balances use the final multiplied amount.
Starting funds remain $1,000; item prices and 100% sale refunds are unchanged.
The base reward values and catalog descriptions above precede this multiplier.
