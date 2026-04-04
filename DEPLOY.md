# Deploying with Docker + Traefik

This guide covers deploying my-reference-catalog using Docker and an optional Traefik reverse proxy.

## ⚡ Quick Start

From your project root, run:

```batch
dp_remote.bat -Server your-server -User your-user
```

Or with PowerShell directly:

```powershell
.\deploy.ps1 -Server your-server -User your-user
```

This will:
1. Connect to your remote server (SSH)
2. Copy all files and build context
3. Build the Docker image
4. Start the container
5. Run health checks

## 📋 What Was Set Up

| Component | File | Description |
|-----------|------|-------------|
| **Docker Image** | `Dockerfile` | Multi-stage Next.js build (Node.js 20 Alpine) |
| **Compose Config** | `docker-compose.yml` | Service definition with optional Traefik labels |
| **Deploy Script (Batch)** | `dp_remote.bat` | Windows — runs PowerShell deployment |
| **Deploy Script (PS1)** | `deploy.ps1` | Copies files via SCP, runs remote deploy |
| **Deploy Script (Bash)** | `deploy-remote.sh` | Runs on the server to build & start app |
| **Full Guide** | `DEPLOYMENT.md` | Detailed setup, troubleshooting, rollback |

## 🔧 Prerequisites

- [ ] SSH access to your remote server
- [ ] Docker on the remote server
- [ ] (Optional) Traefik already running with a `proxy` network

### Verify Prerequisites

```bash
ssh user@your-server "docker --version"
```

### If using Traefik

If the `proxy` network doesn't exist, create it on the server:

```bash
docker network create proxy
```

## ⚙️ Configuration

### Hostname (Traefik)

The Traefik router hostname is read from the `APP_HOSTNAME` environment variable:

```bash
APP_HOSTNAME=my-catalog.example.com docker compose up -d
```

Or add it to your `.env` file:

```
APP_HOSTNAME=my-catalog.example.com
```

### Environment Variables

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

See `.env.example` for all available variables.

## 🔄 Redeployment

Just run the deployment script again. It will:
1. Back up the current state
2. Build a fresh image
3. Replace the running container
4. Verify health

## 📊 Monitoring

Check your deployment:

```bash
# View logs
docker logs my-reference-catalog

# View container status
docker ps | grep my-reference-catalog
```

## ❌ Troubleshooting

| Issue | Solution |
|-------|----------|
| Container won't start | `docker logs my-reference-catalog` |
| DNS not resolving | Check your DNS / reverse proxy configuration |
| Traefik not routing | Verify container labels: `docker inspect my-reference-catalog` |
| SSH connection fails | Test: `ssh -v user@your-server "echo test"` |

See [DEPLOYMENT.md](DEPLOYMENT.md) for more details.

---

**Ready?** Run the deploy script and your app will be live! 🚀

