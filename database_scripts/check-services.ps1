#!/usr/bin/env pwsh

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

function Test-DatabaseConnections {
    Write-Host "🔍 Verificando conexiones a bases de datos..." -ForegroundColor Cyan
    
    # Verificar Redis
    try {
        $redisResult = docker exec redis-master redis-cli ping
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