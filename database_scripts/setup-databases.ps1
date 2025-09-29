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

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$DatabasesDir = Join-Path $ProjectRoot "Databases"

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

function Initialize-DirectoryStructure {
    Write-ColorOutput "Creando estructura de directorios..." "Cyan"
    
    # Crear directorio principal de Databases
    if (-not (Test-Path $DatabasesDir)) {
        New-Item -ItemType Directory -Force -Path $DatabasesDir | Out-Null
        Write-ColorOutput "Directorio creado: Databases" "Green"
    }
    
    # Estructura para MongoDB
    $mongoDir = Join-Path $DatabasesDir "mongo"
    $mongoDataDir = Join-Path $mongoDir "data"
    
    if (-not (Test-Path $mongoDir)) {
        New-Item -ItemType Directory -Force -Path $mongoDir | Out-Null
        New-Item -ItemType Directory -Force -Path $mongoDataDir | Out-Null
        New-Item -ItemType Directory -Force -Path (Join-Path $mongoDataDir "mongo1") | Out-Null
        New-Item -ItemType Directory -Force -Path (Join-Path $mongoDataDir "mongo2") | Out-Null
        Write-ColorOutput "Directorio creado: Databases/mongo" "Green"
    }
    
    # Estructura para Redis
    $redisDir = Join-Path $DatabasesDir "redis"
    $redisDataDir = Join-Path $redisDir "data"
    
    if (-not (Test-Path $redisDir)) {
        New-Item -ItemType Directory -Force -Path $redisDir | Out-Null
        New-Item -ItemType Directory -Force -Path $redisDataDir | Out-Null
        Write-ColorOutput "Directorio creado: Databases/redis" "Green"
    }
    
    # Crear directorio de scripts si no existe
    $scriptsDir = Join-Path $ProjectRoot "scripts"
    if (-not (Test-Path $scriptsDir)) {
        New-Item -ItemType Directory -Force -Path $scriptsDir | Out-Null
    }
}

function Create-MongoDBFiles {
    $mongoDir = Join-Path $DatabasesDir "mongo"
    
    # docker-compose.yml para MongoDB
    $mongoCompose = @'
services:
  mongo1:
    image: mongo:7.0
    container_name: mongo1
    hostname: mongo1
    command: ["mongod", "--bind_ip_all", "--replSet", "rs0"]
    ports:
      - "27017:27017"
    volumes:
      - ./data/mongo1:/data/db
    networks:
      - db-network
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--host", "localhost", "--eval", "db.runCommand({ ping: 1 }).ok"]
      interval: 5s
      timeout: 3s
      retries: 30

  mongo2:
    image: mongo:7.0
    container_name: mongo2
    hostname: mongo2
    command: ["mongod", "--bind_ip_all", "--replSet", "rs0"]
    ports:
      - "27018:27017"
    volumes:
      - ./data/mongo2:/data/db
    networks:
      - db-network
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--host", "localhost", "--eval", "db.runCommand({ ping: 1 }).ok"]
      interval: 5s
      timeout: 3s
      retries: 30

  rs-init:
    image: mongo:7.0
    container_name: rs-init
    depends_on:
      mongo1:
        condition: service_healthy
      mongo2:
        condition: service_healthy
    restart: "no"
    networks:
      - db-network
    entrypoint: [ "bash", "-lc" ]
    command: >
      mongosh --host mongo1 --quiet --eval 'try{rs.status()}catch(e){0}' | grep -q '"ok" : 1'
      || mongosh --host mongo1 --quiet --eval '
        const cfg={_id:"rs0",members:[
          {_id:0,host:"mongo1:27017",priority:2},
          {_id:1,host:"mongo2:27017",priority:1},
        ]};
        print("Initiating replica set…");
        rs.initiate(cfg);
        for (let i=0;i<30;i++){
          try{
            const s=rs.status();
            const p=s.members.find(m=>m.stateStr==="PRIMARY");
            if(p){print("PRIMARY:",p.name);quit(0);}
          }catch(_){}
          sleep(1000);
        }
        print("Timed out waiting PRIMARY"); quit(1);
      '

networks:
  db-network:
    driver: bridge
'@

    if (-not (Test-Path (Join-Path $mongoDir "docker-compose.yml"))) {
        $mongoCompose | Out-File -FilePath (Join-Path $mongoDir "docker-compose.yml") -Encoding UTF8
        Write-ColorOutput "Archivo creado: Databases/mongo/docker-compose.yml" "Green"
    }
}

function Create-RedisFiles {
    $redisDir = Join-Path $DatabasesDir "redis"
    
    # redis.conf - SIN BOM
    $redisConf = @'
bind 0.0.0.0
port 6379

# Persistencia RDB
save 900 1
save 300 10  
save 60 10000
stop-writes-on-bgsave-error no
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /data

# Persistencia AOF
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Memoria
maxmemory 512mb
maxmemory-policy allkeys-lru

# Logs
loglevel notice
logfile ""

# Conexiones
timeout 0
tcp-keepalive 300
'@

    if (-not (Test-Path (Join-Path $redisDir "redis.conf"))) {
        # Guardar sin BOM usando UTF-8 sin BOM
        $utf8NoBomEncoding = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText((Join-Path $redisDir "redis.conf"), $redisConf, $utf8NoBomEncoding)
        Write-ColorOutput "Archivo creado: Databases/redis/redis.conf (sin BOM)" "Green"
    } else {
        # Si el archivo existe, reemplazarlo sin BOM
        $utf8NoBomEncoding = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText((Join-Path $redisDir "redis.conf"), $redisConf, $utf8NoBomEncoding)
        Write-ColorOutput "Archivo actualizado: Databases/redis/redis.conf (sin BOM)" "Green"
    }
    
    # docker-compose.yml para Redis - CORREGIDO
    $redisCompose = @'
services:
  redis:
    image: redis:7.2-alpine
    container_name: redis
    hostname: redis
    ports:
      - "6379:6379"
    volumes:
      - ./data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    restart: unless-stopped
    networks:
      - db-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

networks:
  db-network:
    driver: bridge
'@

    if (-not (Test-Path (Join-Path $redisDir "docker-compose.yml"))) {
        $redisCompose | Out-File -FilePath (Join-Path $redisDir "docker-compose.yml") -Encoding UTF8
        Write-ColorOutput "Archivo creado: Databases/redis/docker-compose.yml" "Green"
    }
}

function Create-GlobalCompose {
    $globalCompose = @'
services:
  # MongoDB Services
  mongo1:
    image: mongo:7.0
    container_name: mongo1
    hostname: mongo1
    command: ["mongod", "--bind_ip_all", "--replSet", "rs0"]
    ports:
      - "27017:27017"
    volumes:
      - ./mongo/data/mongo1:/data/db
    networks:
      - db-network
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--host", "localhost", "--eval", "db.runCommand({ ping: 1 }).ok"]
      interval: 5s
      timeout: 3s
      retries: 30

  mongo2:
    image: mongo:7.0
    container_name: mongo2
    hostname: mongo2
    command: ["mongod", "--bind_ip_all", "--replSet", "rs0"]
    ports:
      - "27018:27017"
    volumes:
      - ./mongo/data/mongo2:/data/db
    networks:
      - db-network
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--host", "localhost", "--eval", "db.runCommand({ ping: 1 }).ok"]
      interval: 5s
      timeout: 3s
      retries: 30

  # Redis Service
  redis:
    image: redis:7.2-alpine
    container_name: redis
    hostname: redis
    ports:
      - "6379:6379"
    volumes:
      - ./redis/data:/data
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    networks:
      - db-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped

  # Replica Set Initialization
  rs-init:
    image: mongo:7.0
    container_name: rs-init
    depends_on:
      mongo1:
        condition: service_healthy
      mongo2:
        condition: service_healthy
    restart: "no"
    networks:
      - db-network
    entrypoint: [ "bash", "-lc" ]
    command: >
      mongosh --host mongo1 --quiet --eval 'try{rs.status()}catch(e){0}' | grep -q '"ok" : 1'
      || mongosh --host mongo1 --quiet --eval '
        const cfg={_id:"rs0",members:[
          {_id:0,host:"mongo1:27017",priority:2},
          {_id:1,host:"mongo2:27017",priority:1},
        ]};
        print("Initiating replica set…");
        rs.initiate(cfg);
        for (let i=0;i<30;i++){
          try{
            const s=rs.status();
            const p=s.members.find(m=>m.stateStr==="PRIMARY");
            if(p){print("PRIMARY:",p.name);quit(0);}
          }catch(_){}
          sleep(1000);
        }
        print("Timed out waiting PRIMARY"); quit(1);
      '

networks:
  db-network:
    driver: bridge
'@

    if (-not (Test-Path (Join-Path $DatabasesDir "global-compose.yml"))) {
        $globalCompose | Out-File -FilePath (Join-Path $DatabasesDir "global-compose.yml") -Encoding UTF8
        Write-ColorOutput "Archivo creado: Databases/global-compose.yml" "Green"
    }
}

function Create-EnvironmentFiles {
    # .env.example en la raíz del proyecto
    $envExample = @'
MONGO_URI=mongodb://localhost:27017/?replicaSet=rs0
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
API_PORT=3000
'@

    if (-not (Test-Path (Join-Path $ProjectRoot ".env.example"))) {
        $envExample | Out-File -FilePath (Join-Path $ProjectRoot ".env.example") -Encoding UTF8
        Write-ColorOutput "Archivo creado: .env.example" "Green"
    }
    
    # .env si no existe
    if (-not (Test-Path (Join-Path $ProjectRoot ".env"))) {
        $envExample | Out-File -FilePath (Join-Path $ProjectRoot ".env") -Encoding UTF8
        Write-ColorOutput "Archivo creado: .env" "Green"
    }
    
    # .gitignore si no existe
    if (-not (Test-Path (Join-Path $ProjectRoot ".gitignore"))) {
        $gitignore = @'
Databases/mongo/data/
Databases/redis/data/
.env
*.log
node_modules/
.DS_Store
Thumbs.db
'@
        $gitignore | Out-File -FilePath (Join-Path $ProjectRoot ".gitignore") -Encoding UTF8
        Write-ColorOutput "Archivo creado: .gitignore" "Green"
    }
}

function Initialize-Environment {
    Write-ColorOutput "Inicializando entorno del proyecto..." "Cyan"
    
    Initialize-DirectoryStructure
    Create-MongoDBFiles
    Create-RedisFiles
    Create-GlobalCompose
    Create-EnvironmentFiles
}

function Start-Services {
    Write-ColorOutput "Iniciando servicios de bases de datos..." "Cyan"
    
    # Verificar Docker
    if (-not (Test-Docker)) {
        Write-ColorOutput "Docker no está instalado o no está en el PATH" "Red"
        exit 1
    }
    
    # Inicializar entorno
    Initialize-Environment
    
    # Verificar que Redis esté configurado correctamente
    $redisConfPath = Join-Path $DatabasesDir "redis/redis.conf"
    if (Test-Path $redisConfPath) {
        $redisConfContent = Get-Content $redisConfPath -Raw
        if ($redisConfContent -notmatch "appendonly yes") {
            Write-ColorOutput "ADVERTENCIA: Redis no tiene persistencia habilitada" "Yellow"
        }
    }
    
    # Ejecutar docker-compose desde el directorio Databases
    Write-ColorOutput "Iniciando contenedores Docker..." "Yellow"
    
    Push-Location $DatabasesDir
    try {

        docker-compose -f global-compose.yml up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Servicios iniciados correctamente" "Green"
            
            # Esperar a que los servicios estén saludables
            Write-ColorOutput "Esperando a que los servicios estén listos..." "Yellow"
            Start-Sleep -Seconds 15
            
            # Verificar estado de Redis específicamente
            Write-ColorOutput "Verificando estado de Redis..." "Cyan"
            $redisStatus = docker exec redis redis-cli ping
            if ($redisStatus -eq "PONG") {
                Write-ColorOutput "Redis está funcionando correctamente" "Green"
                
                # Verificar persistencia
                $persistence = docker exec redis redis-cli info persistence
                if ($persistence -match "aof_enabled:1") {
                    Write-ColorOutput "Persistencia AOF está habilitada" "Green"
                } else {
                    Write-ColorOutput "ADVERTENCIA: Persistencia AOF no está habilitada" "Yellow"
                }
            } else {
                Write-ColorOutput "ERROR: Redis no responde" "Red"
            }
            
            Show-ServicesStatus

        } else {
            Write-ColorOutput "Error al iniciar los servicios" "Red"
        }
    } finally {
        Pop-Location
    }
}

function Stop-Services {
    Write-ColorOutput "Deteniendo servicios..." "Yellow"
    
    Push-Location $DatabasesDir
    try {
        docker-compose -f global-compose.yml down
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Servicios detenidos correctamente" "Green"
        } else {
            Write-ColorOutput "Error al detener los servicios" "Red"
        }
    } finally {
        Pop-Location
    }
}

function Clean-Services {
    Write-ColorOutput "Limpiando servicios y datos..." "Yellow"
    Write-ColorOutput "Esta acción eliminará TODOS los datos de las bases de datos" "Red"
    
    $confirmation = Read-Host "¿Estás seguro? (s/N)"
    if ($confirmation -eq 's' -or $confirmation -eq 'S') {
        Push-Location $DatabasesDir
        try {
            docker-compose -f global-compose.yml down -v
        } finally {
            Pop-Location
        }
        
        # Eliminar datos pero mantener la estructura
        $dataDirs = @(
            (Join-Path $DatabasesDir "mongo/data/mongo1"),
            (Join-Path $DatabasesDir "mongo/data/mongo2"), 
            (Join-Path $DatabasesDir "redis/data")
        )
        
        foreach ($dir in $dataDirs) {
            if (Test-Path $dir) {
                Remove-Item -Recurse -Force $dir
                New-Item -ItemType Directory -Force -Path $dir | Out-Null
                Write-ColorOutput "Datos limpiados: $dir" "Green"
            }
        }
        Write-ColorOutput "Limpieza completada" "Green"
    } else {
        Write-ColorOutput "Limpieza cancelada" "Yellow"
    }
}

function Show-ServicesStatus {
    Write-ColorOutput "Estado de los contenedores:" "Cyan"
    
    Push-Location $DatabasesDir
    try {
        docker-compose -f global-compose.yml ps
        
        Write-ColorOutput "Logs recientes:" "Cyan"
        docker-compose -f global-compose.yml logs --tail=3
    } finally {
        Pop-Location
    }
}

# Main execution
if ($Help -or ($PSBoundParameters.Count -eq 0)) {
    Show-Help
    exit 0
}

if (-not (Test-Docker)) {
    Write-ColorOutput "Docker no está disponible. Por favor instala Docker Desktop." "Red"
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