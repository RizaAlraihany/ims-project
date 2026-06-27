$ErrorActionPreference = 'Stop'

$requiredFiles = @(
    'backend/.env.production.example',
    'frontend/.env.production.example',
    'deploy/nginx/ims-project.conf',
    'deploy/supervisor/ims-queue-worker.conf',
    'deploy/cron/ims-scheduler',
    'scripts/backup-mysql.sh',
    'scripts/production-smoke.ps1',
    'docs/06_DEPLOYMENT.md',
    'docs/07_PRODUCTION_READINESS.md'
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path -LiteralPath $file)) {
        throw "Missing deployment file: $file"
    }
}

$backendEnv = Get-Content -Raw -Path 'backend/.env.production.example'
foreach ($key in @('APP_ENV=production', 'APP_DEBUG=false', 'QUEUE_CONNECTION=redis', 'SESSION_DRIVER=redis', 'IMS_BACKUP_DIR=')) {
    if ($backendEnv -notlike "*$key*") {
        throw "backend/.env.production.example missing $key"
    }
}

$frontendEnv = Get-Content -Raw -Path 'frontend/.env.production.example'
if ($frontendEnv -notlike '*VITE_API_BASE_URL=https://api.ims.example.com/api/v1*') {
    throw 'frontend/.env.production.example missing production API base URL'
}

$nginxConfig = Get-Content -Raw -Path 'deploy/nginx/ims-project.conf'
foreach ($token in @('ims.example.com', 'api.ims.example.com', 'ssl_certificate', 'try_files $uri $uri/ /index.html', 'backend/public')) {
    if ($nginxConfig -notlike "*$token*") {
        throw "deploy/nginx/ims-project.conf missing $token"
    }
}

$supervisorConfig = Get-Content -Raw -Path 'deploy/supervisor/ims-queue-worker.conf'
if ($supervisorConfig -notlike '*queue:work redis*') {
    throw 'Supervisor queue worker command is missing.'
}

$cronConfig = Get-Content -Raw -Path 'deploy/cron/ims-scheduler'
if ($cronConfig -notlike '*php artisan schedule:run*') {
    throw 'Scheduler cron entry is missing.'
}

$backupScript = Get-Content -Raw -Path 'scripts/backup-mysql.sh'
foreach ($token in @('mysqldump', '--single-transaction', 'gzip -9', 'RETENTION_DAYS')) {
    if ($backupScript -notlike "*$token*") {
        throw "scripts/backup-mysql.sh missing $token"
    }
}

$smokeScript = Get-Content -Raw -Path 'scripts/production-smoke.ps1'
foreach ($token in @('Invoke-WebRequest', '$api/up', 'Production smoke endpoints passed')) {
    if ($smokeScript -notlike "*$token*") {
        throw "scripts/production-smoke.ps1 missing $token"
    }
}

$readinessDoc = Get-Content -Raw -Path 'docs/07_PRODUCTION_READINESS.md'
foreach ($token in @('production sign-off pending', 'Live Environment Checks Required', 'Sign-Off Boundary')) {
    if ($readinessDoc -notlike "*$token*") {
        throw "docs/07_PRODUCTION_READINESS.md missing $token"
    }
}

Write-Host 'Deployment files verified.'
