# Simple curl tests for search-service
# Run this script to test all major endpoints

$BASE = "http://localhost:8001"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SEARCH SERVICE - CURL TESTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "[1] Health Check" -ForegroundColor Yellow
curl.exe -s $BASE/health | ConvertFrom-Json | ConvertTo-Json -Compress
Write-Host ""

# Test 2: Manual Search - FX Trades
Write-Host "[2] Manual Search: FX Trades" -ForegroundColor Yellow
$body2 = '{"user_id":"curl_test","search_type":"manual","filters":{"asset_types":["FX"]}}'
curl.exe -s -X POST "$BASE/search" -H "Content-Type: application/json" -d $body2
Write-Host ""

# Test 3: Manual Search - AFFIRMED Status
Write-Host "[3] Manual Search: AFFIRMED Trades" -ForegroundColor Yellow
$body3 = '{"user_id":"curl_test","search_type":"manual","filters":{"statuses":["AFFIRMED"]}}'
curl.exe -s -X POST "$BASE/search" -H "Content-Type: application/json" -d $body3
Write-Host ""

# Test 4: Manual Search - Text Search
Write-Host "[4] Manual Search: Text Search for 'ACC'" -ForegroundColor Yellow
$body4 = '{"user_id":"curl_test","search_type":"manual","filters":{"search_text":"ACC"}}'
curl.exe -s -X POST "$BASE/search" -H "Content-Type: application/json" -d $body4
Write-Host ""

# Test 5: Get History
Write-Host "[5] Get Query History" -ForegroundColor Yellow
curl.exe -s "$BASE/history?user_id=curl_test"
Write-Host ""

# Test 6: Error - Invalid Search Type
Write-Host "[6] Error Test: Invalid Search Type" -ForegroundColor Red
$body6 = '{"user_id":"curl_test","search_type":"invalid"}'
curl.exe -s -X POST "$BASE/search" -H "Content-Type: application/json" -d $body6
Write-Host ""

# Test 7: Error - Missing user_id
Write-Host "[7] Error Test: Missing user_id" -ForegroundColor Red
curl.exe -s "$BASE/history"
Write-Host ""

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  TESTS COMPLETED" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
