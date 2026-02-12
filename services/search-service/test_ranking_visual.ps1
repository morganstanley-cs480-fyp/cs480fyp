# Visual Ranking Test - Shows how trades are sorted
# Run this to see ranking in action

$BASE = "http://localhost:8000"

Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RANKING SYSTEM VISUAL TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Status-based ranking
Write-Host "Test 1: Status Priority Ranking" -ForegroundColor Yellow
Write-Host "Expected: REJECTED > ALLEGED > AFFIRMED > CLEARED`n" -ForegroundColor Gray

$response1 = Invoke-RestMethod -Method POST -Uri "$BASE/search" `
  -ContentType "application/json" `
  -Body (@{
    user_id = "test_user"
    search_type = "manual"
    filters = @{
      statuses = @("REJECTED", "ALLEGED", "AFFIRMED", "CLEARED")
    }
  } | ConvertTo-Json)

Write-Host "Top 10 Results:" -ForegroundColor Cyan
$response1.results | Select-Object -First 10 | 
  Select-Object @{N='#';E={$response1.results.IndexOf($_)+1}}, trade_id, status, asset_type, 
    @{N='date';E={$_.create_time.Substring(0,10)}} | 
  Format-Table -AutoSize

Write-Host "Total Results: $($response1.total_results)" -ForegroundColor DarkGray
Write-Host "Execution Time: $($response1.execution_time_ms)ms`n" -ForegroundColor DarkGray

# Test 2: Asset complexity ranking
Write-Host "`n" -NoNewline
Write-Host "Test 2: Asset Complexity Ranking" -ForegroundColor Yellow
Write-Host "Expected: CDS/IRS (complex) appear before FX/EQUITY (simple)`n" -ForegroundColor Gray

$response2 = Invoke-RestMethod -Method POST -Uri "$BASE/search" `
  -ContentType "application/json" `
  -Body (@{
    user_id = "test_user"
    search_type = "manual"
    filters = @{
      asset_types = @("FX", "EQUITY", "CDS", "IRS")
    }
  } | ConvertTo-Json)

Write-Host "Top 10 Results:" -ForegroundColor Cyan
$response2.results | Select-Object -First 10 | 
  Select-Object @{N='#';E={$response2.results.IndexOf($_)+1}}, trade_id, asset_type, status,
    @{N='date';E={$_.create_time.Substring(0,10)}} | 
  Format-Table -AutoSize

Write-Host "Total Results: $($response2.total_results)" -ForegroundColor DarkGray
Write-Host "Execution Time: $($response2.execution_time_ms)ms`n" -ForegroundColor DarkGray

# Test 3: Combined ranking (status + asset + recency)
Write-Host "`n" -NoNewline
Write-Host "Test 3: Multi-Factor Ranking" -ForegroundColor Yellow
Write-Host "Expected: REJECTED+CDS (highest) > ALLEGED+IRS > AFFIRMED+FX`n" -ForegroundColor Gray

$response3 = Invoke-RestMethod -Method POST -Uri "$BASE/search" `
  -ContentType "application/json" `
  -Body (@{
    user_id = "test_user"
    search_type = "manual"
    filters = @{}
  } | ConvertTo-Json)

Write-Host "Top 15 Results:" -ForegroundColor Cyan
$response3.results | Select-Object -First 15 | 
  Select-Object @{N='#';E={$response3.results.IndexOf($_)+1}}, trade_id, status, asset_type,
    @{N='date';E={$_.create_time.Substring(0,10)}} | 
  Format-Table -AutoSize

# Count by status in top 15
$topStatuses = $response3.results | Select-Object -First 15 | Group-Object status
Write-Host "`nStatus Distribution (Top 15):" -ForegroundColor DarkGray
$topStatuses | ForEach-Object {
  Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor DarkGray
}

Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RANKING TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "[OK] Check if REJECTED/ALLEGED appear at top" -ForegroundColor Green
Write-Host "[OK] Check if CDS/IRS ranked before FX/EQUITY" -ForegroundColor Green
Write-Host "[OK] Check if recent dates appear first`n" -ForegroundColor Green
