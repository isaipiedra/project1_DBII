#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script de configuración automática para MongoDB y Redis en Docker

.DESCRIPTION
    Este script automatiza la creación de la estructura de carpetas, archivos de configuración
    y ejecución de los contenedores Docker para el proyecto.

.PARAMETER Init
    Inicia todos los servicios

.PARAMETER Stop
    Detiene todos los servicios

.PARAMETER Clean
    Detiene los servicios y elimina todos los datos

.PARAMETER Status
    Muestra el estado de los contenedores

.EXAMPLE
    .\setup-databases.ps1 -Init
    .\setup-databases.ps1 -Stop
    .\setup-databases.ps1 -Status
#>

param(
    [switch]$Init,
    [switch]$Stop,
    [switch]$Clean,
    [switch]$Status,
    [switch]$Help
)

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Show-Help {
    Write-ColorOutput "`nUSO:" "Yellow"
    Write-ColorOutput "  .\setup-databases.ps1 [PARAMETRO]`n" "White"
    Write-ColorOutput "PARAMETROS:" "Yellow"
    Write-ColorOutput "  -Init     : Inicia todos los servicios de bases de datos" "White"
    Write-ColorOutput "  -Stop     : Detiene todos los servicios" "White"
    Write-ColorOutput "  -Clean    : Detiene servicios y elimina todos los datos" "White"
    Write-ColorOutput "  -Status   : Muestra el estado de los contenedores" "White"
    Write-ColorOutput "  -Help     : Muestra esta ayuda`n" "White"
    Write-ColorOutput "EJEMPLOS:" "Yellow"
    Write-ColorOutput "  .\setup-databases.ps1 -Init" "White"
    Write-ColorOutput "  .\setup-databases.ps1 -Status" "White"
    Write-ColorOutput "  .\setup-databases.ps1 -Clean`n" "White"
}

function Test-Docker {
    try {
        $null = docker --version
        return $true
    } catch {
        return $false
    }
}

function Test-DockerCompose {
    try {
        $null = docker-compose --version
        return $true
    } catch {
        return $false
    }
}

function Initialize-Environment {
    Write-ColorOutput "`n🔧 Inicializando entorno del proyecto..." "Cyan"
    
    # Crear estructura de carpetas
    $folders = @("data/mongo1", "data/mongo2", "data/redis")
    
    foreach ($folder in $folders) {
        if (-not (Test-Path $folder)) {
            New-Item -ItemType Directory -Force -Path $folder | Out-Null
            Write-ColorOutput "  📁 Carpeta creada: $folder" "Green"
        } else {
            Write-ColorOutput "  ✅ Carpeta existente: $folder" "Gray"
        }
    }
    
    # Crear archivo redis.conf
    $redisConf = @"
bind 0.0.0.0
port 6379
timeout 0
tcp-keepalive 300
daemonize no
supervised no
pidfile /var/run/redis_6379.pid
loglevel notice
logfile ""
databases 16
always-show-logo no
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /data
appendonly yes
appendfilename "appendonly.aof"
"@
    
    if (-not (Test-Path "redis.conf")) {
        $redisConf | Out-File -FilePath "redis.conf" -Encoding UTF8
        Write-ColorOutput "  📄 Archivo redis.conf creado" "Green"
    }
    
    # Crear archivo .env si no existe
    if (-not (Test-Path ".env")) {
        $envContent = @"
MONGO_URI=mongodb://localhost:27017/?replicaSet=rs0
REDIS_URL=redis://localhost:6379
"@
        $envContent | Out-File -FilePath ".env" -Encoding UTF8
        Write-ColorOutput "  📄 Archivo .env creado" "Green"
    }
    
    # Crear .env.example
    $envExample = @"
MONGO_URI=mongodb://localhost:27017/?replicaSet=rs0
REDIS_URL=redis://localhost:6379
"@
    $envExample | Out-File -FilePath ".env.example" -Encoding UTF8
    Write-ColorOutput "  📄 Archivo .env.example creado" "Green"
    
    # Crear .gitignore si no existe
    if (-not (Test-Path ".gitignore")) {
        $gitignore = @"
data/
.env
*.log
node_modules/
.DS_Store
Thumbs.db
"@
        $gitignore | Out-File -FilePath ".gitignore" -Encoding UTF8
        Write-ColorOutput "  📄 Archivo .gitignore creado" "Green"
    }
}

function Start-Services {
    Write-ColorOutput "`n🚀 Iniciando servicios de bases de datos..." "Cyan"
    
    # Verificar Docker
    if (-not (Test-Docker)) {
        Write-ColorOutput "❌ Docker no está instalado o no está en el PATH" "Red"
        exit 1
    }
    
    if (-not (Test-DockerCompose)) {
        Write-ColorOutput "❌ Docker Compose no está instalado o no está en el PATH" "Red"
        exit 1
    }
    
    # Inicializar entorno
    Initialize-Environment
    
    # Ejecutar docker-compose
    Write-ColorOutput "`n🐳 Iniciando contenedores Docker..." "Yellow"
    docker-compose up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "`n✅ Servicios iniciados correctamente" "Green"
        Write-ColorOutput "📊 Monitoreando estado de los servicios..." "Yellow"
        
        # Esperar y mostrar estado
        Start-Sleep -Seconds 10
        Show-ServicesStatus
        
        Write-ColorOutput "`n🌐 URLs de conexión:" "Cyan"
        Write-ColorOutput "  MongoDB: mongodb://localhost:27017/?replicaSet=rs0" "White"
        Write-ColorOutput "  Redis: redis://localhost:6379" "White"
        
        Write-ColorOutput "`n📝 Comandos útiles:" "Cyan"
        Write-ColorOutput "  Ver logs: docker-compose logs" "White"
        Write-ColorOutput "  Ver estado: .\setup-databases.ps1 -Status" "White"
        Write-ColorOutput "  Detener: .\setup-databases.ps1 -Stop" "White"
    } else {
        Write-ColorOutput "❌ Error al iniciar los servicios" "Red"
    }
}

function Stop-Services {
    Write-ColorOutput "`n🛑 Deteniendo servicios..." "Yellow"
    docker-compose down
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✅ Servicios detenidos correctamente" "Green"
    } else {
        Write-ColorOutput "❌ Error al detener los servicios" "Red"
    }
}

function Clean-Services {
    Write-ColorOutput "`n🧹 Limpiando servicios y datos..." "Yellow"
    Write-ColorOutput "⚠️  Esta acción eliminará TODOS los datos de las bases de datos" "Red"
    
    $confirmation = Read-Host "¿Estás seguro? (s/N)"
    if ($confirmation -eq 's' -or $confirmation -eq 'S') {
        docker-compose down -v
        if (Test-Path "data") {
            Remove-Item -Recurse -Force "data"
            Write-ColorOutput "📁 Carpeta 'data' eliminada" "Green"
        }
        Write-ColorOutput "✅ Limpieza completada" "Green"
    } else {
        Write-ColorOutput "❌ Limpieza cancelada" "Yellow"
    }
}

function Show-ServicesStatus {
    Write-ColorOutput "`n📊 Estado de los contenedores:" "Cyan"
    docker-compose ps
    
    Write-ColorOutput "`n🔍 Logs recientes de MongoDB:" "Cyan"
    docker-compose logs mongo1 --tail=5
    docker-compose logs mongo2 --tail=5
    
    Write-ColorOutput "`n🔍 Logs recientes de Redis:" "Cyan"
    docker-compose logs redis --tail=5
}

# Main execution
if ($Help -or ($PSBoundParameters.Count -eq 0)) {
    Show-Help
    exit 0
}

if (-not (Test-Docker)) {
    Write-ColorOutput "❌ Docker no está disponible. Por favor instala Docker Desktop." "Red"
    exit 1
}

if ($Init) {
    Start-Services
} elseif ($Stop) {
    Stop-Services
} elseif ($Clean) {
    Clean-Services
} elseif ($Status) {
    Show-ServicesStatus
}