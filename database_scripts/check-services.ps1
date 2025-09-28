#!/usr/bin/env pwsh

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

function Test-DatabaseConnections {
    Write-Host "🔍 Verificando conexiones a bases de datos..." -ForegroundColor Cyan
    
    # Verificar MongoDB
    try {
        $mongoResult = docker exec mongo1 mongosh --eval "db.adminCommand('ping')" --quiet
        if ($mongoResult -like "*ok*") {
            Write-Host "✅ MongoDB conectado correctamente" -ForegroundColor Green
        } else {
            Write-Host "❌ MongoDB no responde" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error conectando a MongoDB: $_" -ForegroundColor Red
    }
    
    # Verificar Redis
    try {
        $redisResult = docker exec redis redis-cli ping
        if ($redisResult -eq "PONG") {
            Write-Host "✅ Redis conectado correctamente" -ForegroundColor Green
        } else {
            Write-Host "❌ Redis no responde" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error conectando a Redis: $_" -ForegroundColor Red
    }
}

Test-DatabaseConnections