#!/usr/bin/env pwsh

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
    
    # Verificar replica set
    try {
        $rsStatus = docker exec mongo1 mongosh --eval "rs.status().ok" --quiet
        if ($rsStatus -eq "1") {
            Write-Host "✅ Replica Set configurado correctamente" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Replica Set no está configurado" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  No se pudo verificar el Replica Set" -ForegroundColor Yellow
    }
}

Test-DatabaseConnections