# Master upgrade progress

Rollback branch: `rollback/before-master-upgrade-eccabc2` (the prior published game).
Express / Socket.io server, Three.js browser, shared physics and rules; existing
Dockerfile and railway.toml retained. No equipment shields, blocking, shield
models, shield breaking, or shield audio. Wind charges remain for every weapon.

1. Visuals: original 16px atlas, batched geometry, constructed lodges / roof details /
   windows / bridge fences, class skins and portraits, merged pixel tools, hearts,
   armor icons, nine working inventory slots, bounded instanced particles.
2. Combat: existing server authority preserved; katana, dagger and pickaxe definitions,
   reach and attack cadence, all nine keys mapped to real equipment. Existing potions,
   mace falling attacks, ranged weapons and wind charges preserved.
3. Three points: pending.
4. Fourteen classes and authoritative summoned units: pending.
5. Six maps and hazards: pending.
6. Host-selected map lobby and lifecycle: pending.
7. Integration / performance / deployment validation: pending.

Phase 1/2 checks: unit suite and two-browser combat regression; render checked in
Chromium with an actual atlas shader. Screenshot /tmp/master-p1-menu.png is local
validation, not a hosted release. Railway deployment must be checked separately.
