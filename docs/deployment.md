# Railway deployment checks

Push to the connected GitHub `main` branch. Railway should build the root
`Dockerfile` using `railway.toml`, start Node, and wait for `/health` to return 200.
Keep one replica and the existing region; rooms are in memory and cannot span
processes. The public domain must target the service's injected `PORT`.

Before publishing, run `npm test`, the browser smoke scripts documented in the
README, `npm run build:production`, and `npm run test:production`. The production
smoke launches an isolated container on PORT 8080, checks assets/health, non-root
execution, absence of Playwright, ten-player capacity and private rooms, then
verifies a restart announcement and exit code zero on SIGTERM.

In this managed cloud environment, Docker builds need the provided egress proxy
and trusted CA. Use:

```sh
DOCKER_CONFIG=/workspace/.docker-build npm run build:production -- --environment-proxy
DOCKER_CONFIG=/workspace/.docker-build npm run test:production
```

The committed Railway Dockerfile uses standard Docker instructions without secret mounts.
The optional local build helper generates a temporary Dockerfile with a CA secret
mount only for this managed proxy machine. It resolves the supplied proxy hostname for BuildKit,
passes proxy arguments by environment variable name, and mounts provided public
CA certificates as a temporary build secret. It retains TLS verification and
removes its temporary bundle afterward. Ordinary Railway builds do not need this
flag or a custom CA. Browser binaries are not installed in production.

After pushing, check the newest Railway deployment is green. Visit `/health` and
compare its revision with the pushed commit; then create a room, join from another
browser, move outside spawn and verify combat/capture. Check all eight hero cards,
resume after a brief connection loss, and Auto graphics/FPS/ping controls.

The previously shown `frontend gRPC server closed unexpectedly` error came from
the Railway build daemon. Retry the latest deployment there if it recurs; a local
Docker pass cannot guarantee Railway's build infrastructure or live deployment.
This environment has no Railway credentials and public Railway requests are
blocked by its network policy, so live deployment has not been verified here.

Deployments terminate matches. A graceful signal marks health unhealthy, rejects
new joins, announces the update and closes sockets. Players must create a new room
afterward; the 30-second reconnect reservation applies only while the process lives.
