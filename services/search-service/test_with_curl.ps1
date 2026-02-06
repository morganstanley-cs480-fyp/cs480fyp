# Search Service - Comprehensive cURL Testing Script
# This script tests all endpoints of the search-service using curl

$BASE_URL = "http://localhost:8001"
$USER_ID = "test_user_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SEARCH SERVICE - cURL TEST SUITE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test counter
$testNum = 1

# Function to print test header
function Test-Header {
    param($title)
    Write-Host "`n[$testNum] $title" -ForegroundColor Yellow
    $script:testNum++
    Write-Host "----------------------------------------" -ForegroundColor DarkGray
}

# Function to make curl request and format output
function Invoke-TestRequest {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Body = $null,
        [string]$Description
    )
    
    Write-Host "Request: $Method $Url" -ForegroundColor Gray
    if ($Body) {
        Write-Host "Body: $Body" -ForegroundColor Gray
    }
    
    $response = if ($Body) {
        curl.exe -X $Method $Url `
            -H "Content-Type: application/json" `
            -d $Body `
            -w "`n`nHTTP Status: %{http_code}`nTime: %{time_total}s" `
            -s
    } else {
        curl.exe -X $Method $Url `
            -w "`n`nHTTP Status: %{http_code}`nTime: %{time_total}s" `
            -s
    }
    
    Write-Host "`nResponse:" -ForegroundColor Green
    Write-Host $response
    Write-Host ""
}

# ========================================
# 1. Health Check Endpoints
# ========================================

Test-Header "GET / - Service Information"
Invoke-TestRequest -Method "GET" -Url "$BASE_URL/" -Description "Get service info"

Test-Header "GET /health - Full Health Check"
Invoke-TestRequest -Method "GET" -Url "$BASE_URL/health" -Description "Check service health with DB and Redis"

Test-Header "GET /health/ready - Readiness Probe"
Invoke-TestRequest -Method "GET" -Url "$BASE_URL/health/ready" -Description "ECS readiness probe"

Test-Header "GET /health/live - Liveness Probe"
Invoke-TestRequest -Method "GET" -Url "$BASE_URL/health/live" -Description "ECS liveness probe"

# ========================================
# 2. Manual Search Tests
# ========================================

Test-Header "POST /search - Manual Search (Single Asset Type)"
$body = @"
{
  "user_id": "$USER_ID",
  "search_type": "manual",
  "filters": {
    "asset_types": ["FX"]
  }
}
"@
Invoke-TestRequest -Method "POST" -Url "$BASE_URL/search" -Body $body -Description "Search for FX trades"

Test-Header "POST /search - Manual Search (Multiple Statuses)"
$body = @"
{
  "user_id": "$USER_ID",
  "search_type": "manual",
  "filters": {
    "statuses": ["AFFIRMED", "ALLEGED"]
  }
}
"@
Invoke-TestRequest -Method "POST" -Url "$BASE_URL/search" -Body $body -Description "Search for AFFIRMED or ALLEGED trades"

Test-Header "POST /search - Manual Search (Date Range)"
$body = @"
{
  "user_id": "$USER_ID",
  "search_type": "manual",
  "filters": {
    "date_from": "2025-01-01",
    "date_to": "2025-01-31"
  }
}
"@
Invoke-TestRequest -Method "POST" -Url "$BASE_URL/search" -Body $body -Description "Search trades from January 2025"

Test-Header "POST /search - Manual Search (Combined Filters)"
$body = @"
{
  "user_id": "$USER_ID",
  "search_type": "manual",
  "filters": {
    "asset_types": ["EQUITY", "FX"],
    "statuses": ["AFFIRMED"],
    "accounts": ["ACC001"],
    "date_from": "2025-01-01"
  }
}
"@
Invoke-TestRequest -Method "POST" -Url "$BASE_URL/search" -Body $body -Description "Complex filter search"

Test-Header "POST /search - Manual Search (Search Text)"
$body = @"
{
  "user_id": "$USER_ID",
  "search_type": "manual",
  "filters": {
    "search_text": "ACC"
  }
}
"@
Invoke-TestRequest -Method "POST" -Url "$BASE_URL/search" -Body $body -Description "Text search for accounts with 'ACC'"

# ========================================
# 3. Natural Language Search Tests
# ========================================

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "  NATURAL LANGUAGE SEARCH TESTS" -ForegroundColor Magenta
Write-Host "  (Requires AWS Bedrock Access)" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

Test-Header "POST /search - NL Search (Simple Query)"
$body = @"
{
  "user_id": "$USER_ID",
  "search_type": "natural_language",
  "query_text": "show me all FX trades"
}
"@
Invoke-TestRequest -Method "POST" -Url "$BASE_URL/search" -Body $body -Description "Simple NL query"

Test-Header "POST /search - NL Search (Date-Based Query)"
$body = @"
{
  "user_id": "$USER_ID",
  "search_type": "natural_language",
  "query_text": "show pending trades from last week"
}
"@
Invoke-TestRequest -Method "POST" -Url "$BASE_URL/search" -Body $body -Description "NL query with relative dates"

Test-Header "POST /search - NL Search (Complex Query)"
$body = @"
{
  "user_id": "$USER_ID",
  "search_type": "natural_language",
  "query_text": "find affirmed equity trades in JP Morgan accounts from yesterday"
}
"@
Invoke-TestRequest -Method "POST" -Url "$BASE_URL/search" -Body $body -Description "Complex multi-parameter NL query"

# ========================================
# 4. Query History Tests
# ========================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  QUERY HISTORY TESTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Test-Header "GET /history - Retrieve User's Query History"
Invoke-TestRequest -Method "GET" -Url "$BASE_URL/history?user_id=$USER_ID" -Description "Get all queries for user"

Test-Header "GET /history - Filter Saved Queries Only"
Invoke-TestRequest -Method "GET" -Url "$BASE_URL/history?user_id=$USER_ID&is_saved=true" -Description "Get only saved queries"

Test-Header "GET /history - Search History by Text"
Invoke-TestRequest -Method "GET" -Url "$BASE_URL/history?user_id=$USER_ID&search_text=FX" -Description "Search history for 'FX'"

# Note: We'll need to get a query_id from the history to test update/delete
Write-Host "`nFetching a query_id for update/delete tests..." -ForegroundColor Gray
$historyResponse = curl.exe -s "$BASE_URL/history?user_id=$USER_ID"
$history = $historyResponse | ConvertFrom-Json

if ($history.queries -and $history.queries.Count -gt 0) {
    $queryId = $history.queries[0].query_id
    Write-Host "Using query_id: $queryId" -ForegroundColor Green
    
    Test-Header "PUT /history/{query_id} - Save and Rename Query"
    $body = @"
{
  "is_saved": true,
  "query_name": "My Test Query - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}
"@
    Invoke-TestRequest -Method "PUT" -Url "$BASE_URL/history/$queryId" -Body $body -Description "Save and rename query"
    
    Test-Header "DELETE /history/{query_id} - Delete Query"
    Invoke-TestRequest -Method "DELETE" -Url "$BASE_URL/history/$queryId" -Description "Delete query from history"
} else {
    Write-Host "No queries found for this user to test update/delete" -ForegroundColor Yellow
}

# ========================================
# 5. Error Handling Tests
# ========================================

Write-Host "`n========================================" -ForegroundColor Red
Write-Host "  ERROR HANDLING TESTS" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red

Test-Header "POST /search - Invalid Search Type"
$body = @"
{
  "user_id": "$USER_ID",
  "search_type": "invalid_type",
  "query_text": "test"
}
"@
Invoke-TestRequest -Method "POST" -Url "$BASE_URL/search" -Body $body -Description "Should return 422 validation error"

Test-Header "POST /search - Missing Required Field"
$body = @"
{
  "search_type": "manual"
}
"@
Invoke-TestRequest -Method "POST" -Url "$BASE_URL/search" -Body $body -Description "Should return 422 (missing user_id)"

Test-Header "GET /history - Missing user_id"
Invoke-TestRequest -Method "GET" -Url "$BASE_URL/history" -Description "Should return 422 validation error"

Test-Header "PUT /history/{query_id} - Invalid query_id"
$body = @"
{
  "is_saved": true,
  "query_name": "Test"
}
"@
Invoke-TestRequest -Method "PUT" -Url "$BASE_URL/history/999999" -Body $body -Description "Should return 404 not found"

Test-Header "DELETE /history/{query_id} - Non-existent query"
Invoke-TestRequest -Method "DELETE" -Url "$BASE_URL/history/999999" -Description "Should return 404 not found"

# ========================================
# Summary
# ========================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  TEST SUITE COMPLETED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nNote: Natural Language tests may fail if AWS Bedrock is not accessible." -ForegroundColor Yellow
Write-Host "Check the service logs for detailed error information.`n" -ForegroundColor Yellow
