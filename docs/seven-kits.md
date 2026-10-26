# Seven-kit addition

Added Demolitionist, Trident Warrior, Illusionist, Wither Mage, Blaze, Slime and
Evoker. All 14 existing classes remain, for 21 total selection entries. All seven
personal weapons, 14 basic abilities and seven earned ultimates are implemented.
There are no placeholder actions or shields.

## Implementation

- `shared/heroes.js` and `shared/combat.js`: seven class definitions, class-specific
  three-weapon loadouts, health/armor, primary attacks and ability cooldowns.
- `lib/extra-kits.js`: new server-owned projectiles, fused TNT, warned barrages,
  explosive falloff, returning trident, riptide, wall-blocked wave, Mirror Swap,
  decoys, non-stacking wither, timed flight, moving fire zones, orbiting rods,
  single additional slime bounce, sticky patches, slime summons and sequenced fangs.
- `lib/heroes.js`, `lib/units.js`, `lib/combat.js`: small integration hooks into the
  existing validation, damage, cooldown, charge, summon and effect lifecycle.
- `shared/world.js` and `server.js`: one optional authoritative flight velocity
  shared with client prediction. Only the two new timed flight abilities set it;
  normal movement follows the original path. Flight respects ceilings and bounds.
- `public/extra-kit-view.js`, `public/hero-view.js`, `public/combat-view.js`,
  `public/units-view.js`, `public/skins.js`, `public/pixel-items.js`,
  `public/particles.js`, `public/audio.js`: models, existing-style portraits and
  16-pixel item icons, projectile visuals, warning effects, particles and sounds.
- `public/potion-view.js`: Wither countdown in the existing effect list.
- `public/game.js`: new visual diagnostics, hiding the held trident while thrown,
  spinning its Riptide model, and refreshing an avatar's skin after a class change.
- `test/seven-kits.test.js`, `scripts/seven-kits-smoke.cjs`: focused mechanics and
  two-browser synchronization tests. `test/heroes.test.js`,
  `scripts/heroes-smoke.cjs`, `scripts/hero-picker-smoke.cjs`: selection count 21.
- `package.json`: `npm run test:seven-kits-browser`; `README.md`: kit reference.

Decoys and summons live in the existing summon collection, never the real-player
room map. They cannot capture or contest points. New summons have health, capped
counts and lifetimes, and disappear on owner death, disconnect or respawn. The
Slime owner keeps their original identity, health and inventory while three small
summons fight independently, then converge at expiry without extra healing.

TNT and skull barrages have advance area warnings and real falling projectiles.
Explosions cannot alter terrain or hurt teammates and check line of sight. Fangs
require valid visible ground; each ultimate ring can damage a victim once.
Mirror Swap refuses obstructed or invalid destinations without spending cooldown.
The trident cannot be thrown twice or used for melee until it has returned.
Soul Flight ends at four seconds and Flame Rise at three seconds; normal gravity
resumes afterward. Wither uses one damage timer rather than stacking tick streams.

## Validation

- `npm test`: 132 tests passed, including 25 focused new-kit tests and all existing
  server tests for combat, classes, inventory, movement, captures, rooms and bots.
- `npm run test:seven-kits-browser`: two connected Chromium pages verified 21 class
  cards and lobby options, all seven primary inputs, all Q/E/R inputs, cooldowns,
  ultimate charge consumption, remote classes, rendered effects and summons;
  no JavaScript errors.
- `npm run test:heroes-browser`: original class switching, Assassin, Paladin and
  Mace behavior passed, with no JavaScript errors.
- `npm run test:new-heroes-browser`: Necromancer, Engineer, Pyromancer, Samurai,
  Druid and Plague Doctor used real Q/E/R inputs and replicated effects.
- Production Docker build and `npm run test:production`: non-root startup,
  production dependencies, PORT, health/assets, 5v5 sockets, private rooms, host
  permissions, balancing bots, three points and graceful restart passed.

No map or terrain definitions, capture/scoring rules, team sizes, respawn rules,
room codes, host permissions, HUD layout, textures, renderer or Railway
configuration were changed. Existing shields remain disabled. No requested kit
is incomplete. Bots can choose all 21 kits through their existing selection logic;
Q/E/R bot decision-making remains outside this addition, as before.

After the commit reaches GitHub main, Railway should automatically redeploy through
the existing repository connection. Wait for that deployment to be Active, refresh,
and create a lobby to see all 21 classes. Deployment itself is not verified from
this environment.
