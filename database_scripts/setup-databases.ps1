#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script de configuración automática para MongoDB, Redis, Cassandra y Neo4j Cluster en Docker

.DESCRIPTION
    Este script automatiza la creación de la estructura de carpetas, archivos de configuración
    y ejecución de los contenedores Docker para el proyecto con Redis Cluster de 2 nodos,
    Cassandra con 2 nodos y Neo4j con 2 nodos.

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
    
    # Estructura para Redis Replication
    $redisDir = Join-Path $DatabasesDir "redis"
    $redisDataDir = Join-Path $redisDir "data"
    
    if (-not (Test-Path $redisDir)) {
        New-Item -ItemType Directory -Force -Path $redisDir | Out-Null
        New-Item -ItemType Directory -Force -Path $redisDataDir | Out-Null
        New-Item -ItemType Directory -Force -Path (Join-Path $redisDataDir "master") | Out-Null
        New-Item -ItemType Directory -Force -Path (Join-Path $redisDataDir "replica") | Out-Null
        Write-ColorOutput "Directorio creado: Databases/redis" "Green"
    }
    
    # Estructura para Cassandra
    $cassandraDir = Join-Path $DatabasesDir "cassandra"
    
    if (-not (Test-Path $cassandraDir)) {
        New-Item -ItemType Directory -Force -Path $cassandraDir | Out-Null
        Write-ColorOutput "Directorio creado: Databases/cassandra" "Green"
    }
    
    # Estructura para Neo4j
    $neo4jDir = Join-Path $DatabasesDir "neo4j"
    
    if (-not (Test-Path $neo4jDir)) {
        New-Item -ItemType Directory -Force -Path $neo4jDir | Out-Null
        Write-ColorOutput "Directorio creado: Databases/neo4j" "Green"
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

function Create-RedisClusterFiles {
    $redisDir = Join-Path $DatabasesDir "redis"
    
    # Configuración para Redis Master
    $redisMasterConf = @'
bind 0.0.0.0
port 6379
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
dir /data
requirepass ""
masterauth ""
'@

    # Configuración para Redis Replica
    $redisReplicaConf = @'
bind 0.0.0.0
port 6379
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
dir /data
requirepass ""
masterauth ""
replica-read-only yes
'@

    # Crear configuración para master
    $redisMasterConfPath = Join-Path $redisDir "redis-master.conf"
    $utf8NoBomEncoding = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($redisMasterConfPath, $redisMasterConf, $utf8NoBomEncoding)
    Write-ColorOutput "Archivo creado: Databases/redis/redis-master.conf" "Green"

    # Crear configuración para replica
    $redisReplicaConfPath = Join-Path $redisDir "redis-replica.conf"
    [System.IO.File]::WriteAllText($redisReplicaConfPath, $redisReplicaConf, $utf8NoBomEncoding)
    Write-ColorOutput "Archivo creado: Databases/redis/redis-replica.conf" "Green"
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

  # Redis Master Node
  redis-master:
    image: redis:7.2-alpine
    container_name: redis-master
    hostname: redis-master
    ports:
      - "6379:6379"
    volumes:
      - ./redis/data/master:/data
      - ./redis/redis-master.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    networks:
      - db-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Redis Replica Node
  redis-replica:
    image: redis:7.2-alpine
    container_name: redis-replica
    hostname: redis-replica
    ports:
      - "6380:6379"
    volumes:
      - ./redis/data/replica:/data
      - ./redis/redis-replica.conf:/usr/local/etc/redis/redis.conf
    command: >
      sh -c "
      sleep 10 &&
      redis-server /usr/local/etc/redis/redis.conf --replicaof redis-master 6379
      "
    depends_on:
      - redis-master
    networks:
      - db-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Cassandra Services
  cass1:
    image: cassandra:4.1
    container_name: cass1
    hostname: cass1
    networks:
      - db-network
    ports:
      - "9042:9042"
      - "7000:7000"
      - "7001:7001"
      - "7199:7199"
    environment:
      CASSANDRA_CLUSTER_NAME: "LocalClusterCass"
      CASSANDRA_NUM_TOKENS: 16
      CASSANDRA_SEEDS: "cass1"
      CASSANDRA_BROADCAST_ADDRESS: "cass1"
      CASSANDRA_LISTEN_ADDRESS: "auto"
      CASSANDRA_RPC_ADDRESS: "0.0.0.0"
      CASSANDRA_ENDPOINT_SNITCH: "GossipingPropertyFileSnitch"
    volumes:
      - cass1_data:/var/lib/cassandra
    healthcheck:
      test: ["CMD", "nodetool", "status"]
      interval: 30s
      timeout: 10s
      retries: 20

  cass2:
    image: cassandra:4.1
    container_name: cass2
    hostname: cass2
    networks:
      - db-network
    environment:
      CASSANDRA_CLUSTER_NAME: "LocalClusterCass"
      CASSANDRA_NUM_TOKENS: 16
      CASSANDRA_SEEDS: "cass1"
      CASSANDRA_BROADCAST_ADDRESS: "cass2"
      CASSANDRA_LISTEN_ADDRESS: "auto"
      CASSANDRA_RPC_ADDRESS: "0.0.0.0"
      CASSANDRA_ENDPOINT_SNITCH: "GossipingPropertyFileSnitch"
    volumes:
      - cass2_data:/var/lib/cassandra
    depends_on:
      cass1:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "nodetool", "status"]
      interval: 30s
      timeout: 10s
      retries: 20

  # Neo4j Services
  neo4j1:
    image: neo4j:5.22.0-enterprise
    container_name: neo4j1
    hostname: neo4j1
    networks:
      - db-network
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_ACCEPT_LICENSE_AGREEMENT=yes
      - NEO4J_AUTH=neo4j/password123
      - NEO4JLABS_PLUGINS=["apoc"]
      - NEO4J_dbms_security_procedures_unrestricted=apoc.*
      - NEO4J_dbms_security_procedures_allowlist=apoc.*
      - NEO4J_apoc_export_file_enabled=true
      - NEO4J_apoc_import_file_enabled=true
      - NEO4J_dbms_memory_pagecache_size=1G
      - NEO4J_dbms_memory_heap_initial__size=1G
      - NEO4J_dbms_memory_heap_max__size=1G
      - NEO4J_server_default__listen__address=0.0.0.0
      - NEO4J_server_http_listen__address=:7474
      - NEO4J_server_bolt_listen__address=:7687
      - NEO4J_server_discovery_listen__address=:5000
      - NEO4J_server_cluster_listen__address=:6000
      - NEO4J_server_cluster_raft_listen__address=:7000
      - NEO4J_initial_server_mode__constraint=PRIMARY
      - NEO4J_dbms_cluster_discovery_endpoints=neo4j1:5000,neo4j2:5000
      - NEO4J_dbms_cluster_minimum__initial__system__primaries__count=2
      - NEO4J_server_discovery_advertised__address=neo4j1:5000
      - NEO4J_server_cluster_advertised__address=neo4j1:6000
      - NEO4J_server_cluster_raft_advertised__address=neo4j1:7000
      - NEO4J_server_bolt_advertised__address=localhost:7687
      - NEO4J_server_http_advertised__address=localhost:7474
    volumes:
      - neo4j1_data:/data
      - neo4j1_logs:/logs
      - neo4j1_import:/var/lib/neo4j/import
      - neo4j1_plugins:/plugins

  neo4j2:
    image: neo4j:5.22.0-enterprise
    container_name: neo4j2
    hostname: neo4j2
    networks:
      - db-network
    ports:
      - "7475:7474"
      - "7688:7687"
    environment:
      - NEO4J_ACCEPT_LICENSE_AGREEMENT=yes
      - NEO4J_AUTH=neo4j/password123
      - NEO4JLABS_PLUGINS=["apoc"]
      - NEO4J_dbms_security_procedures_unrestricted=apoc.*
      - NEO4J_dbms_security_procedures_allowlist=apoc.*
      - NEO4J_apoc_export_file_enabled=true
      - NEO4J_apoc_import_file_enabled=true
      - NEO4J_dbms_memory_pagecache_size=1G
      - NEO4J_dbms_memory_heap_initial__size=1G
      - NEO4J_dbms_memory_heap_max__size=1G
      - NEO4J_server_default__listen__address=0.0.0.0
      - NEO4J_server_http_listen__address=:7474
      - NEO4J_server_bolt_listen__address=:7687
      - NEO4J_server_discovery_listen__address=:5000
      - NEO4J_server_cluster_listen__address=:6000
      - NEO4J_server_cluster_raft_listen__address=:7000
      - NEO4J_initial_server_mode__constraint=PRIMARY
      - NEO4J_dbms_cluster_discovery_endpoints=neo4j1:5000,neo4j2:5000
      - NEO4J_dbms_cluster_minimum__initial__system__primaries__count=2
      - NEO4J_server_discovery_advertised__address=neo4j2:5000
      - NEO4J_server_cluster_advertised__address=neo4j2:6000
      - NEO4J_server_cluster_raft_advertised__address=neo4j2:7000
      - NEO4J_server_bolt_advertised__address=localhost:7688
      - NEO4J_server_http_advertised__address=localhost:7475
    volumes:
      - neo4j2_data:/data
      - neo4j2_logs:/logs
      - neo4j2_import:/var/lib/neo4j/import
      - neo4j2_plugins:/plugins

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

volumes:
  cass1_data:
  cass2_data:
  neo4j1_data:
  neo4j1_logs:
  neo4j1_import:
  neo4j1_plugins:
  neo4j2_data:
  neo4j2_logs:
  neo4j2_import:
  neo4j2_plugins:
'@

    $globalComposePath = Join-Path $DatabasesDir "global-compose.yml"
    $globalCompose | Out-File -FilePath $globalComposePath -Encoding UTF8 -Force
    Write-ColorOutput "Archivo actualizado: Databases/global-compose.yml (con Cassandra y Neo4j)" "Green"
}

function Create-EnvironmentFiles {
    # .env.example en la raíz del proyecto
    $envExample = @'
# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/?replicaSet=rs0

# Redis Cluster Configuration
REDIS_CLUSTER_HOSTS=localhost:6379,localhost:6380
REDIS_URL=redis://localhost:6379,localhost:6380

# Individual Redis nodes (for development)
REDIS1_HOST=localhost
REDIS1_PORT=6379
REDIS2_HOST=localhost
REDIS2_PORT=6380

# Cassandra Configuration
CASSANDRA_CONTACT_POINTS=localhost:9042
CASSANDRA_KEYSPACE=mykeyspace
CASSANDRA_DATACENTER=datacenter1

# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123

# Application Configuration
API_PORT=3000

# Redis Cluster aware client configuration
REDIS_CLUSTER=true
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
    Create-RedisClusterFiles
    Create-GlobalCompose
    Create-EnvironmentFiles
}

function Create-AdminUserScript {
    $scriptsDir = Join-Path $ProjectRoot "scripts"
    
    # Create the admin user creation script
    $adminScript = @'
import { createClient } from 'redis';
import bcrypt from 'bcryptjs';

async function createAdminUser() {
    const client = createClient({
        socket: {
            host: 'localhost',
            port: 6379
        }
    });

    try {
        await client.connect();
        console.log('Creating admin user...');

        const username = 'Admin';
        const password = 'Admin12345';
        const firstName = 'Admin';
        const lastName = 'istrator';
        const currentDate = new Date().toISOString();

        // Check if admin user already exists
        const existingUser = await client.get(username);
        if (existingUser) {
            console.log('Admin user already exists');
            await client.disconnect();
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create admin user object
        const adminUser = {
            firstName,
            lastName,
            birthDate: currentDate.split('T')[0],
            password: hashedPassword,
            profilePicture: null,
            admin: true,
            createdAt: currentDate,
            updatedAt: currentDate
        };

        // Save to Redis
        await client.set(username, JSON.stringify(adminUser));
        console.log('Admin user created successfully!');
        console.log('Username: Admin');
        console.log('Password: Admin12345');

        await client.disconnect();
        
    } catch (error) {
        console.error('Error creating admin user:', error.message);
        // Don't exit, just log the error
    }
}

createAdminUser();
'@

    $adminScriptPath = Join-Path $scriptsDir "create-admin.js"
    $adminScript | Out-File -FilePath $adminScriptPath -Encoding UTF8
    Write-ColorOutput "Archivo creado: scripts/create-admin.js" "Green"
}

function Initialize-AdminUser {
    Write-ColorOutput "Inicializando usuario administrador..." "Cyan"
    
    # Wait for Redis to be ready
    Write-ColorOutput "Esperando a que Redis esté listo..." "Yellow"
    Start-Sleep -Seconds 10
    
    # Check if Node.js is available
    try {
        $null = Get-Command node -ErrorAction Stop
        $null = Get-Command npm -ErrorAction Stop
        
        # Install required dependencies
        Write-ColorOutput "Instalando dependencias..." "Yellow"
        Push-Location $ProjectRoot
        try {
            npm install redis bcryptjs
        } finally {
            Pop-Location
        }
        
        # Run the admin creation script
        Write-ColorOutput "Creando usuario administrador..." "Yellow"
        $adminScriptPath = Join-Path $ProjectRoot "scripts/create-admin.js"
        node $adminScriptPath
        
    } catch {
        Write-ColorOutput "Node.js no está disponible. Creando usuario manualmente..." "Yellow"
        Initialize-AdminUserManual
    }
}

function Initialize-AdminUserManual {
    Write-ColorOutput "Creando usuario administrador manualmente..." "Yellow"
    
    # Wait for Redis to be ready
    Start-Sleep -Seconds 15
    
    try {
        # Create admin user using redis-cli
        $currentDate = Get-Date -Format "yyyy-MM-dd"
        $adminUserJson = @{
            firstName = "Admin"
            lastName = "istrator"
            birthDate = $currentDate
            password = "TEMPORARY_PASSWORD_NEEDS_UPDATE"
            profilePicture = $null
            admin = $true
            createdAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            updatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        } | ConvertTo-Json
        
        # Escape the JSON for command line
        $adminUserJsonEscaped = $adminUserJson -replace '"', '\"'
        
        # Set the admin user in Redis
        docker exec redis-master redis-cli SET Admin $adminUserJsonEscaped
        
        Write-ColorOutput "Usuario administrador creado manualmente" "Green"
        Write-ColorOutput "NOTA: La contraseña necesita ser actualizada en el primer login" "Yellow"
        
    } catch {
        Write-ColorOutput "Error creando usuario administrador manualmente: $_" "Red"
    }
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
    
    # Create admin user script
    Create-AdminUserScript
    
    # Ejecutar docker-compose desde el directorio Databases
    Write-ColorOutput "Iniciando contenedores Docker..." "Yellow"
    
    Push-Location $DatabasesDir
    try {
        docker-compose -f global-compose.yml up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Servicios iniciados correctamente" "Green"
            
            # Esperar a que los servicios estén saludables
            Write-ColorOutput "Esperando a que los servicios estén listos..." "Yellow"
            Start-Sleep -Seconds 30
            
            # Create admin user
            Initialize-AdminUser
            
            # Verificar estado del Redis
            Write-ColorOutput "Verificando estado de Redis..." "Cyan"
            try {
                $redisInfo = docker exec redis-master redis-cli ping
                if ($redisInfo -eq "PONG") {
                    Write-ColorOutput "Redis está funcionando correctamente" "Green"
                    
                    # Verify admin user was created
                    try {
                        $adminUser = docker exec redis-master redis-cli GET Admin
                        if ($adminUser) {
                            Write-ColorOutput "Usuario administrador creado exitosamente" "Green"
                        } else {
                            Write-ColorOutput "ADVERTENCIA: No se pudo crear el usuario administrador" "Yellow"
                        }
                    } catch {
                        Write-ColorOutput "ADVERTENCIA: No se pudo verificar el usuario administrador" "Yellow"
                    }
                } else {
                    Write-ColorOutput "ADVERTENCIA: Redis no responde correctamente" "Yellow"
                }
            } catch {
                Write-ColorOutput "ERROR: No se pudo verificar el estado de Redis" "Red"
            }
            
            # Verificar estado de Cassandra
            Write-ColorOutput "`nVerificando estado de Cassandra..." "Cyan"
            Start-Sleep -Seconds 30
            try {
                $cassStatus = docker exec cass1 nodetool status 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-ColorOutput "Cassandra está funcionando correctamente" "Green"
                } else {
                    Write-ColorOutput "ADVERTENCIA: Cassandra aún se está iniciando..." "Yellow"
                }
            } catch {
                Write-ColorOutput "ADVERTENCIA: No se pudo verificar el estado de Cassandra" "Yellow"
            }
            
            # Verificar estado de Neo4j
            Write-ColorOutput "`nVerificando estado de Neo4j..." "Cyan"
            try {
                $neo4jStatus = docker exec neo4j1 cypher-shell -u neo4j -p password123 "RETURN 1" 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-ColorOutput "Neo4j está funcionando correctamente" "Green"
                } else {
                    Write-ColorOutput "ADVERTENCIA: Neo4j aún se está iniciando..." "Yellow"
                }
            } catch {
                Write-ColorOutput "ADVERTENCIA: No se pudo verificar el estado de Neo4j" "Yellow"
            }
            
            Show-ServicesStatus

        } else {
            Write-ColorOutput "Error al iniciar los servicios" "Red"
        }
    } finally {
        Pop-Location
    }
    
    Write-ColorOutput "`nTodos los servicios han sido iniciados" "Green"
    Write-ColorOutput "URLs de acceso:" "Cyan"
    Write-ColorOutput "  - MongoDB Primary: localhost:27017" "White"
    Write-ColorOutput "  - MongoDB Secondary: localhost:27018" "White"
    Write-ColorOutput "  - Redis Master: localhost:6379" "White"
    Write-ColorOutput "  - Redis Replica: localhost:6380" "White"
    Write-ColorOutput "  - Cassandra: localhost:9042" "White"
    Write-ColorOutput "  - Neo4j Browser 1: http://localhost:7474" "White"
    Write-ColorOutput "  - Neo4j Browser 2: http://localhost:7475" "White"
    Write-ColorOutput "`nCredenciales Neo4j:" "Cyan"
    Write-ColorOutput "  Usuario: neo4j" "White"
    Write-ColorOutput "  Contraseña: password123" "White"
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
            (Join-Path $DatabasesDir "redis/data/master"),
            (Join-Path $DatabasesDir "redis/data/replica")
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
        
        Write-ColorOutput "`nRedis Info:" "Cyan"
        try {
            docker exec redis-master redis-cli info replication
        } catch {
            Write-ColorOutput "No se pudo obtener información de Redis" "Yellow"
        }
        
        Write-ColorOutput "`nCassandra Cluster Status:" "Cyan"
        try {
            docker exec cass1 nodetool status
        } catch {
            Write-ColorOutput "No se pudo obtener información de Cassandra" "Yellow"
        }
        
        Write-ColorOutput "`nNeo4j Cluster Status:" "Cyan"
        try {
            docker exec neo4j1 cypher-shell -u neo4j -p password123 "CALL dbms.cluster.overview()" 2>$null
        } catch {
            Write-ColorOutput "No se pudo obtener información del cluster Neo4j" "Yellow"
        }
        
        Write-ColorOutput "`nLogs recientes:" "Cyan"
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