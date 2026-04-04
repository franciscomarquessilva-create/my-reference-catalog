# Deployment Configuration

This guide covers deploying my-reference-catalog using Docker, with optional Traefik reverse proxy support.

## Prerequisites

- [ ] SSH access to your remote server
- [ ] Docker & Docker Compose installed on the server
- [ ] (Optional) Traefik already running on the server with a `proxy` network
- [ ] PowerShell (v5.0+) on your local machine (Windows) — for the included scripts

## Before First Deployment

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env with your OPENAI_API_KEY and APP_HOSTNAME
```

### 2. Test SSH connection

```bash
ssh user@your-server "docker --version"
```

### 3. Create app directory on server

```bash
ssh user@your-server "mkdir -p /srv/my-reference-catalog"
```

### 4. (Optional) Create Traefik proxy network

If using Traefik, ensure the `proxy` network exists on the server:

```bash
ssh user@your-server "docker network create proxy"
```

## Deployment

### Method 1: Using the Batch Script (Recommended for Windows)

```batch
dp_remote.bat -Server your-server -User your-user
```

This will:
1. Verify SSH connection
2. Copy all necessary files to the server
3. Build the Docker image
4. Start the container
5. Run health checks

### Method 2: Using PowerShell Directly

```powershell
.\deploy.ps1 -Server your-server -User your-user
```

### Method 3: Manual SSH Deployment

```bash
# Copy files
scp -r . user@your-server:/srv/my-reference-catalog/

# Connect and deploy
ssh user@your-server
cd /srv/my-reference-catalog
./deploy-remote.sh
```

## Verifying Deployment

```bash
# Check container status
docker ps | grep my-reference-catalog

# View container logs
docker logs my-reference-catalog

# Test the endpoint
curl http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | No | Enables LLM generation/augmentation when set |
| `AI_MODEL` | No | Default model for LLM calls. Defaults to `gpt-4o` |
| `APP_HOSTNAME` | No | Hostname for Traefik routing (e.g. `my-catalog.example.com`) |
| `NODE_ENV` | No | Standard Node runtime mode |

See `.env.example` for a template.

## Container Details

- **Image**: Built from local Dockerfile (multi-stage: Node.js 20 Alpine)
- **Port**: Exposed on 3000 (internal), optionally routed via Traefik
- **Service Name**: `my-reference-catalog`
- **Restart Policy**: `unless-stopped`
- **Network**: `proxy` (existing shared Traefik network, if using Traefik)

## Traefik Labels

The Docker labels in `docker-compose.yml` tell Traefik how to route requests.
The hostname is read from the `APP_HOSTNAME` environment variable:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.my-reference-catalog.rule=Host(`${APP_HOSTNAME:-my-reference-catalog.example.com}`)"
  - "traefik.http.routers.my-reference-catalog.entrypoints=web"
  - "traefik.http.services.my-reference-catalog.loadbalancer.server.port=3000"
```

## Troubleshooting

### Container won't start

```bash
docker logs my-reference-catalog
```

### Traefik not routing traffic

```bash
# Check Traefik dashboard
curl http://your-server:8080/dashboard/

# Verify labels were picked up
docker inspect my-reference-catalog | grep -A 20 Labels
```

### Need to rebuild

```bash
cd /srv/my-reference-catalog
docker compose build --no-cache
docker compose up -d
```

## Rollback Procedure

Backups are automatically created in `/srv/my-reference-catalog-backups/`:

```bash
cd /srv/my-reference-catalog
docker compose down

# Restore previous backup
tar -xzf /srv/my-reference-catalog-backups/my-reference-catalog_YYYYMMDD_HHMMSS.tar.gz -C .

docker compose up -d
```

## Health Checks

The container includes health checks:
- Every 30 seconds, tests endpoint availability
- Starts checks after 40 seconds
- Marks unhealthy after 3 failed attempts

View health status:

```bash
docker ps --filter "name=my-reference-catalog"
```

Look for `(healthy)` or `(unhealthy)` in the STATUS column.

## Performance Notes

- Multi-stage Docker build reduces image size
- Node.js 20 Alpine base (~150 MB)
- Production npm packages only (no devDependencies)
- `dumb-init` ensures proper signal handling
- Health checks verify container responsiveness
