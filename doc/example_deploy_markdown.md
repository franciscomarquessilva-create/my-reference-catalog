DEPLOY.md — Cloudflare Tunnel + Traefik + Docker Gateway
Agent context file. Use this document when generating deployment code, Docker Compose configs, or infrastructure scaffolding for this project. All new services must follow the patterns described here.

Architecture Overview
This project uses a centralized application gateway pattern. All public-facing Docker services are exposed through a single infrastructure layer — no open inbound ports, no manual TLS, no DNS changes per service.

Internet
   ↓
Cloudflare DNS (*.yourdomain.com)  ← wildcard CNAME → tunnel
   ↓
Cloudflare Tunnel (cloudflared)    ← outbound-only connection
   ↓
Traefik Reverse Proxy              ← dynamic routing via Docker labels
   ↓
Docker Services                    ← any container on the `proxy` network
Key constraint: every service that needs a public URL must be on the proxy Docker network and carry the correct Traefik labels. Nothing else is needed.

Stack
Component	Role	Image
Traefik	Reverse proxy — auto-discovers containers via Docker labels	traefik:v2.11
cloudflared	Cloudflare Tunnel connector — secure ingress, no open ports	cloudflare/cloudflared:latest
Docker	Container runtime	—
Pre-Deploy Validation
Agent rule: before generating or applying any configuration, run these checks to read existing server state. Never overwrite a value that is already correctly configured.

1. Check for an existing .env file
cat .env 2>/dev/null || echo "No .env file found"
If .env exists and CLOUDFLARE_TUNNEL_TOKEN is already set, do not regenerate or overwrite it. Use the existing value.
Only scaffold a new .env if the file is absent or the variable is missing.
2. Check if the gateway containers are already running
docker ps --filter "name=traefik" --filter "name=cloudflared" --format "table {{.Names}}\t{{.Status}}"
If traefik and cloudflared are already running, do not redeploy the core stack. Skip straight to adding the new service.
If either container is missing or in an error state, investigate before proceeding.
3. Check for port conflicts
# Check if port 8080 (Traefik dashboard) is already bound
ss -tlnp | grep 8080

# Check if port 80 is already bound
ss -tlnp | grep ':80 '
If a port is already in use by a process other than Traefik, do not proceed. Report the conflict and ask the user how to resolve it.
Do not change port mappings in docker-compose.yml without explicit user confirmation.
4. Check if the proxy network exists
docker network ls --filter "name=proxy" --format "{{.Name}}"
If the network already exists, skip the docker network create proxy step — running it again will error.
Use docker network inspect proxy to confirm existing containers attached to it before making changes.
5. Check for existing service containers with the same name
docker ps -a --filter "name=<service-name>" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
If a container with the target name already exists (even stopped), resolve the conflict before deploying.
Do not run docker compose up -d blindly if a name collision exists — it may silently reuse stale config.
Decision tree for agents
.env exists and token is set?
  ├── YES → preserve token, do not touch .env
  └── NO  → scaffold .env with placeholder, instruct user to fill in

traefik + cloudflared running?
  ├── YES → skip core stack deployment
  └── NO  → deploy core stack first, verify tunnel connection before continuing

Port conflict detected?
  ├── YES → stop, report conflict to user
  └── NO  → proceed

proxy network exists?
  ├── YES → skip network creation
  └── NO  → run docker network create proxy

Service name already in use?
  ├── YES → stop, report conflict to user
  └── NO  → proceed with service deployment
Environment Variables
Defined in .env at the project root. Never hardcode these values.

CLOUDFLARE_TUNNEL_TOKEN=<token-from-cloudflare-zero-trust-dashboard>
Note for agents: do not generate .env files with real tokens. Use placeholder values and instruct the user to fill them in.

Core Infrastructure (docker-compose.yml)
The gateway stack — deploy once, leave running. All application services are separate from this file.

services:

  traefik:
    image: traefik:v2.11
    container_name: traefik
    restart: unless-stopped
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=proxy"
      - "--entrypoints.web.address=:80"
      - "--api.dashboard=true"
      - "--api.insecure=true"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - "8080:8080"     # Traefik dashboard — do not expose externally in production
    networks:
      - proxy

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    restart: unless-stopped
    networks:
      - proxy

networks:
  proxy:
    external: true
Prerequisites before deploying this stack
# Create the shared Docker network (one-time, idempotent)
docker network create proxy

# Start the gateway
docker compose up -d

# Confirm tunnel is connected
docker logs cloudflared | grep "Registered tunnel"
Adding a New Service
Every new application service follows this exact template. Generate service-specific docker-compose.yml files using this pattern.

services:

  <service-name>:
    image: <image>
    container_name: <service-name>
    restart: unless-stopped
    # ... service-specific config (env vars, volumes, etc.)
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.<service-name>.rule=Host(`<subdomain>.yourdomain.com`)"
      - "traefik.http.routers.<service-name>.entrypoints=web"
      - "traefik.http.services.<service-name>.loadbalancer.server.port=<internal-port>"

networks:
  proxy:
    external: true
Label rules
Label	Purpose	Example
traefik.enable=true	Opt this container into Traefik routing	Required on every service
traefik.http.routers.<name>.rule	Hostname match rule	Host(\api.yourdomain.com`)`
traefik.http.routers.<name>.entrypoints	Entry point	Always web
traefik.http.services.<name>.loadbalancer.server.port	Container's internal port	e.g. 3000, 8080, 80
Agent rule: the <name> segment in all three labels must be identical and must match the service name in docker-compose.yml. Mismatched names cause silent routing failures.

Deploy a service
docker compose up -d
No restart of the gateway required. Traefik auto-detects new containers on the proxy network immediately.

Cloudflare Dashboard Configuration (one-time setup)
These steps are performed manually in the Cloudflare dashboard and do not need to be automated.

Tunnel routing
Zero Trust → Networks → Tunnels → <your-tunnel> → Public Hostnames

Hostname	Service
*.yourdomain.com	http://traefik:80
Wildcard DNS record
Cloudflare DNS → Add record

Type	Name	Target	Proxy
CNAME	*	<tunnel-id>.cfargotunnel.com	✅ Enabled
After this is configured, no further DNS changes are needed for any new service.

Verification Checklist
Run after deploying any new service:

# DNS resolves through Cloudflare
dig <subdomain>.yourdomain.com

# Service is reachable
curl -I https://<subdomain>.yourdomain.com

# Tunnel is healthy
docker logs cloudflared | tail -20

# Traefik dashboard (local only)
open http://<server-ip>:8080/dashboard/
Security Notes
Concern	How it's handled
Inbound attack surface	Zero open ports — tunnel uses outbound-only connection
TLS / HTTPS	Terminated by Cloudflare at the edge — no certs to manage
DDoS	Cloudflare protection included by default
Container isolation	Services communicate only over the internal proxy network
Traefik dashboard	Only accessible on localhost:8080 — never expose via Traefik labels
Common Mistakes to Avoid
When generating code for this pattern, avoid these errors:

Missing network declaration — every docker-compose.yml must declare proxy as an external network
exposedbydefault=false is set — containers without traefik.enable=true are invisible to Traefik
Mismatched router/service names — all three label name segments must be identical
Wrong internal port — the loadbalancer.server.port must match the port the container actually listens on, not the host-mapped port
Deploying to the wrong network — services on networks other than proxy will not be routed
Hardcoding CLOUDFLARE_TUNNEL_TOKEN — always read from .env
Overwriting existing config without checking — always run the Pre-Deploy Validation checks first; never assume the server is in a blank state
Example: Minimal Working Service
A minimal Nginx deployment for reference:

services:

  demo:
    image: nginx:alpine
    container_name: demo
    restart: unless-stopped
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.demo.rule=Host(`demo.yourdomain.com`)"
      - "traefik.http.routers.demo.entrypoints=web"
      - "traefik.http.services.demo.loadbalancer.server.port=80"

networks:
  proxy:
    external: true
After docker compose up -d, the service is live at https://demo.yourdomain.com with no further steps.