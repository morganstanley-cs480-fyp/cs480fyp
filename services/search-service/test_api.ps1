# PowerShell-native HTTP testing for search-service
# Uses Invoke-WebRequest instead of curl for better Windows compatibility

$BASE = "http://localhost:8001"
$USER = "pwsh_test_$(Get-Date -Format 'HHmmss')"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SEARCH SERVICE - HTTP API TESTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

function Test-Endpoint {
    param(
        [string]$Title,
        [string]$Method = "GET",
        [string]$Url,
        [hashtable]$Body = $null
    )
    
    Write-Host "[$Title]" -ForegroundColor Yellow
    Write-Host "  $Method $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = "application/json"
            ErrorAction = "Stop"
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Compress
            $params.Body = $jsonBody
            Write-Host "  Body: $jsonBody" -ForegroundColor DarkGray
        }
        
        $response = Invoke-WebRequest @params
        $result = $response.Content | ConvertFrom-Json
        
        Write-Host "  Status: $($response.StatusCode) - " -NoNewline -ForegroundColor Green
        Write-Host "SUCCESS" -ForegroundColor Green
        
        # Show key fields
        if ($null -ne $result.total_results) {
            Write-Host "  Results: $($result.total_results) trades found" -ForegroundColor Cyan
            Write-Host "  Execution Time: $([math]::Round($result.execution_time_ms, 2))ms" -ForegroundColor Cyan
        }
        if ($result.status) {
            Write-Host "  Health: $($result.status)" -ForegroundColor Cyan
        }
        if ($result -is [Array]) {
            Write-Host "  History Count: $($result.Count) queries" -ForegroundColor Cyan
        }
        if ($result.success) {
            Write-Host "  Message: $($result.message)" -ForegroundColor Cyan
        }
        
        return $result
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  Status: $statusCode - " -NoNewline -ForegroundColor Red
        Write-Host "ERROR" -ForegroundColor Red
        
        if ($_.ErrorDetails.Message) {
            try {
                $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
                if ($errorBody.detail) {
                    Write-Host "  Error: $($errorBody.detail[0].msg)" -ForegroundColor Red
                } elseif ($errorBody.message) {
                    Write-Host "  Error: $($errorBody.message)" -ForegroundColor Red
                }
            } catch {
                Write-Host "  Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
            }
        }
        
        return $null
    }
    
    Write-Host ""
}

# Health Checks
Test-Endpoint -Title "1. Service Info" -Url "$BASE/"
Test-Endpoint -Title "2. Health Check" -Url "$BASE/health"

# Manual Searches
Test-Endpoint -Title "3. Manual Search: FX Trades" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "manual"
    filters = @{
        asset_types = @("FX")
    }
}

Test-Endpoint -Title "4. Manual Search: AFFIRMED Status" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "manual"
    filters = @{
        statuses = @("AFFIRMED")
    }
}

Test-Endpoint -Title "5. Manual Search: Multiple Filters" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "manual"
    filters = @{
        asset_types = @("FX", "EQUITY")
        statuses = @("AFFIRMED", "ALLEGED")
    }
}

Test-Endpoint -Title "6. Manual Search: Text Search" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "manual"
    filters = @{
        search_text = "ACC"
    }
}

# Query History
Write-Host "[7. Get Query History]" -ForegroundColor Yellow
Write-Host "  GET $BASE/history?user_id=$USER" -ForegroundColor Gray
try {
    $historyResponse = Invoke-WebRequest -Uri "$BASE/history?user_id=$USER" -Method GET -UseBasicParsing -ErrorAction Stop
    $historyResult = $historyResponse.Content | ConvertFrom-Json
    Write-Host "  Status: $($historyResponse.StatusCode) - " -NoNewline -ForegroundColor Green
    Write-Host "SUCCESS" -ForegroundColor Green
    Write-Host "  History Count: $($historyResult.Count) queries" -ForegroundColor Cyan
    Write-Host ""
    
    # Get first query ID for update test
    if ($historyResult -and $historyResult.Count -gt 0) {
        $queryId = $historyResult[0].query_id
        Write-Host "  Found Query ID: $queryId for testing" -ForegroundColor DarkGray
        Write-Host ""
        
        Test-Endpoint -Title "8. Save Query" -Method "PUT" -Url "$BASE/history/$queryId`?user_id=$USER" -Body @{
            is_saved = $true
            query_name = "My Test Query"
        } | Out-Null
        
        Test-Endpoint -Title "9. Get Saved Queries Only" -Url "$BASE/history?user_id=$USER&saved_only=true" | Out-Null
        
        Test-Endpoint -Title "10. Delete Query" -Method "DELETE" -Url "$BASE/history/$queryId`?user_id=$USER" | Out-Null
    } else {
        Write-Host "[8-10] Skipped - No queries found in history" -ForegroundColor Yellow
        Write-Host ""
    }
} catch {
    Write-Host "  Status: $($_.Exception.Response.StatusCode.value__) - ERROR" -ForegroundColor Red
    Write-Host ""
}

# Error Handling Tests
Write-Host "`n--- Error Handling Tests ---`n" -ForegroundColor Magenta

Test-Endpoint -Title "11. Invalid Search Type" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "invalid"
}

Test-Endpoint -Title "12. Missing user_id" -Method "POST" -Url "$BASE/search" -Body @{
    search_type = "manual"
}

Test-Endpoint -Title "13. Invalid Query ID" -Method "DELETE" -Url "$BASE/history/999999?user_id=$USER"

Write-Host "========================================" -ForegroundColor Green
Write-Host "  ALL TESTS COMPLETED" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
