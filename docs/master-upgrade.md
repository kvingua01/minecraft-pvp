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
3. Three simultaneous server-owned points, ten-second solo capture, capped teammate acceleration, neutralization, independent contesting and income, first to 300, six-second respawns.
4. Fourteen playable classes; all Q/E/R implemented. Server-owned skeletons, zombie, turrets, repair station and guardian have health, targeting, collisions and finite lifetimes. Timed sword parry, poison, cleanse, roots and healing reduction are validated. 80 server tests, 14-class picker and real new-class Q/E/R browser input passed.
5. Six distinct map layouts, protected spawns, three locations each, tested walking routes, half-block stepping, Sky void deaths, lava and lower-friction ice. Atlas rendering and replicated map selection checked in a browser.
6. Host-selected map lobby and lifecycle: pending.
7. Integration / performance / deployment validation: pending.

Phase 1/2 checks: unit suite and two-browser combat regression; render checked in
Chromium with an actual atlas shader. Screenshot /tmp/master-p1-menu.png is local
validation, not a hosted release. Railway deployment must be checked separately.
