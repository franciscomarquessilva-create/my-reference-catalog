# Deploy to fraserver01

Your Next.js app is ready to deploy to fraserver01 with automatic Traefik routing.

## ⚡ Quick Start

From your project root, run:

```batch
dp_remote.bat
```

This will:
1. Connect to fraserver01 (SSH)
2. Copy all files and build context
3. Build the Docker image
4. Start the container
5. Run health checks

**That's it!** Your app will be live at: `https://my-reference-catalog.aiops3000.com`

## 📋 What Was Set Up

| Component | File | Description |
|-----------|------|-------------|
| **Docker Image** | `Dockerfile` | Multi-stage Next.js build (Node.js 20 Alpine) |
| **Compose Config** | `docker-compose.yml` | Service definition with Traefik labels |
| **Deploy Script (Batch)** | `dp_remote.bat` | Windows - runs PowerShell deployment |
| **Deploy Script (PS1)** | `deploy.ps1` | Copies files via SCP, runs remote deploy |
| **Deploy Script (Bash)** | `deploy-remote.sh` | Runs on fraserver01 to build & start app |
| **Full Guide** | `DEPLOYMENT.md` | Detailed setup, troubleshooting, rollback |

## 🔧 Prerequisites

- [ ] SSH access to fraserver01 (user: `francis`)
- [ ] Docker on fraserver01
- [ ] Traefik + Cloudflare already running with `proxy` network

### Verify Prerequisites

```powershell
ssh francis@fraserver01 "docker network ls | grep proxy"
```

If the `proxy` network doesn't exist, run on fraserver01:
```bash
docker network create proxy
```

## 📚 Detailed Documentation

See [DEPLOYMENT.md](DEPLOYMENT.md) for:
- Troubleshooting
- Manual deployment steps
- Health checks
- Rollback procedures
- Environment configuration

## 🌐 After Deployment

Your app will be automatically accessible at:

```
https://my-reference-catalog.aiops3000.com
```

Traefik will:
- ✅ Route based on the hostname
- ✅ Load balance your requests
- ✅ Handle HTTPS via Cloudflare
- ✅ Auto-reload if you redeploy

## 🔄 Redeployment

Just run the deployment script again. It will:
1. Backup the current state
2. Build a fresh image
3. Replace the running container
4. Verify health

```batch
dp_remote.bat
```

## 📊 Monitoring

Check your deployment:

```powershell
# View logs
ssh francis@fraserver01 "docker logs my-reference-catalog"

# View container status
ssh francis@fraserver01 "docker ps | grep my-reference-catalog"

# Check if it's being routed
ssh francis@fraserver01 "docker logs traefik | grep my-reference-catalog"
```

## ❌ Troubleshooting

| Issue | Solution |
|-------|----------|
| Container won't start | `ssh francis@fraserver01 "docker logs my-reference-catalog"` |
| DNS not resolving | Check Cloudflare DNS settings for wildcard CNAME record |
| Traefik not routing | Verify container labels: `docker inspect my-reference-catalog` |
| SSH connection fails | Test: `ssh -v francis@fraserver01 "echo test"` |

See [DEPLOYMENT.md](DEPLOYMENT.md) for more details.

---

**Ready?** Run `dp_remote.bat` and your app will be live! 🚀
