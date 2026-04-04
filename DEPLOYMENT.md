# Deployment Configuration for fraserver01

This guide covers deploying my-reference-catalog using the Traefik + Cloudflare Tunnel infrastructure.

## Prerequisites

- [ ] SSH access to fraserver01 (user: francis)
- [ ] Docker & Docker Compose installed on fraserver01
- [ ] Traefik already running on fraserver01 with `proxy` network
- [ ] Cloudflare Tunnel configured for `*.aiops3000.com`
- [ ] PowerShell (v5.0+) on your local machine (Windows)

## Before First Deployment

### 1. Test SSH Connection

```powershell
ssh francis@fraserver01 "docker network ls | grep proxy"
```

Should see output with `proxy` network. If not, you need to create it on the server:

```bash
docker network create proxy
```

### 2. Create App Directory on Server

```bash
ssh francis@fraserver01 "mkdir -p /srv/my-reference-catalog"
```

### 3. Verify Traefik Configuration

On fraserver01, ensure Traefik is configured to watch Docker:

```bash
docker logs traefik | grep "docker"
```

Should show provider configuration messages.

## Deployment

### Method 1: Using the Batch Script (Recommended for Windows)

```batch
dp_remote.bat
```

This will:
1. Verify SSH connection
2. Copy all necessary files to fraserver01
3. Build the Docker image
4. Start the container with Traefik labels
5. Run health checks

### Method 2: Using PowerShell Directly

```powershell
.\deploy.ps1 -Server fraserver01 -User francis
```

### Method 3: Manual SSH Deployment

```bash
# Copy files
scp -r . francis@fraserver01:/srv/my-reference-catalog/

# Connect and deploy
ssh francis@fraserver01
cd /srv/my-reference-catalog
./deploy-remote.sh
```

## Verifying Deployment

Once deployment completes, verify the application:

### From Your Machine

```bash
# Check DNS resolution
dig my-reference-catalog.aiops3000.com

# Test the endpoint
curl https://my-reference-catalog.aiops3000.com
```

### On fraserver01

```bash
# View container logs
docker logs my-reference-catalog

# Check Traefik routing
docker logs traefik | grep my-reference-catalog

# View container status
docker ps
```

## Environment Variables

Create a `.env` file locally if needed for build-time configuration:

```bash
NODE_ENV=production
```

The docker-compose.yml automatically sets this for the container.

## Container Details

- **Image**: Built from local Dockerfile (multi-stage: Node.js 20 Alpine)
- **Port**: Exposed on 3000 (internal), routed via Traefik
- **Service Name**: `my-reference-catalog`
- **Hostname**: `my-reference-catalog.aiops3000.com`
- **Restart Policy**: `unless-stopped`
- **Network**: `proxy` (existing shared Traefik network)

## Traefik Labels Explained

The Docker labels in `docker-compose.yml` tell Traefik:

```yaml
labels:
  - "traefik.enable=true"                                    # Enable routing for this service
  - "traefik.http.routers.my-reference-catalog.rule=Host(`my-reference-catalog.aiops3000.com`)"  # Match hostname
  - "traefik.http.routers.my-reference-catalog.entrypoints=web"  # Listen on web (80)
  - "traefik.http.services.my-reference-catalog.loadbalancer.server.port=3000"  # Forward to port 3000
```

## Troubleshooting

### Container won't start

```bash
ssh francis@fraserver01
docker logs my-reference-catalog
```

### DNS resolution fails

```bash
# On fraserver01
docker logs cloudflared
```

### Traefik not routing traffic

```bash
# Check Traefik dashboard
curl http://fraserver01:8080/dashboard/

# Verify labels were picked up
docker inspect my-reference-catalog | grep -A 20 Labels
```

### Need to rebuild

```bash
ssh francis@fraserver01
cd /srv/my-reference-catalog
docker compose build --no-cache
docker compose up -d
```

## Rollback Procedure

Backups are automatically created in `/srv/my-reference-catalog-backups/`:

```bash
ssh francis@fraserver01
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
- Node.js 20 Alpine base (~150MB)
- Production npm packages only (no devDependencies)
- Dumb-init ensures proper signal handling
- Health checks verify container responsiveness

## Next Steps

1. Run `dp_remote.bat` to deploy
2. Wait ~60 seconds for container startup
3. Visit `https://my-reference-catalog.aiops3000.com`
4. Monitor logs: `ssh francis@fraserver01 "docker logs -f my-reference-catalog"`

## Support

For issues with:
- **Traefik/routing**: Check Traefik dashboard or logs
- **Container**: Review `docker logs my-reference-catalog`
- **SSH/Connection**: Verify `ssh -v francis@fraserver01 "echo test"`
