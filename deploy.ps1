# PowerShell deployment script for my-reference-catalog
# Deploys to fraserver01 via SSH

param(
    [string]$Server = "fraserver01",
    [string]$User = "francis"
)

$ErrorActionPreference = "Stop"

Write-Host "Deploying my-reference-catalog to $Server..." -ForegroundColor Green

# Verify SSH connection
Write-Host "Testing SSH connection..." -ForegroundColor Cyan
try {
    ssh -o ConnectTimeout=5 "$User@$Server" "echo OK" | Out-Null
}
catch {
    Write-Host "SSH connection failed to $User@$Server" -ForegroundColor Red
    exit 1
}

# Copy Dockerfile and docker-compose files
Write-Host "Copying deployment files..." -ForegroundColor Cyan

# First, create the directory on the remote server
ssh "$User@$Server" "mkdir -p /srv/my-reference-catalog"

$FilesToCopy = @(
    "Dockerfile",
    "docker-compose.yml",
    ".dockerignore",
    ".env",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.ts",
    "postcss.config.mjs",
    "public",
    "src",
    "data"
)

foreach ($file in $FilesToCopy) {
    if (Test-Path $file) {
        Write-Host "  Copying $file" -ForegroundColor Gray
        if ((Get-Item $file).PSIsContainer) {
            # For directories, copy recursively with standard scp syntax
            scp -r $file "$User@$Server`:/srv/my-reference-catalog/" 2>$null
        }
        else {
            scp $file "$User@$Server`:/srv/my-reference-catalog/" 2>$null
        }
    }
}

# Copy custom deploy script
Write-Host "  Copying deployment script" -ForegroundColor Gray
scp deploy-remote.sh "$User@$Server`:/srv/my-reference-catalog/" 2>$null

# Make script executable and run deployment
Write-Host "Running deployment on remote server..." -ForegroundColor Cyan
ssh "$User@$Server" "bash /srv/my-reference-catalog/deploy-remote.sh"

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "App available at: https://my-reference-catalog.aiops3000.com" -ForegroundColor Green
