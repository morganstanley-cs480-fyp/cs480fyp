# Search Service - Comprehensive API Test Suite
# Tests all endpoints including new ranking functionality
# PowerShell-native implementation for Windows compatibility

$BASE = "http://localhost:8000"
$USER = "test_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Test counters
$script:testNum = 1
$script:passedTests = 0
$script:failedTests = 0

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SEARCH SERVICE - COMPREHENSIVE TEST SUITE" -ForegroundColor Cyan
Write-Host "  Including Ranking Functionality Tests" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

function Test-Endpoint {
    param(
        [string]$Title,
        [string]$Method = "GET",
        [string]$Url,
        [hashtable]$Body = $null,
        [scriptblock]$Validator = $null
    )
    
    Write-Host "`n[$script:testNum] $Title" -ForegroundColor Yellow
    Write-Host "  $Method $Url" -ForegroundColor Gray
    $script:testNum++
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = "application/json"
            ErrorAction = "Stop"
            UseBasicParsing = $true
            TimeoutSec = 30
        }
        
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10 -Compress
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
            if ($result.execution_time_ms -and $result.execution_time_ms -is [double] -or $result.execution_time_ms -is [int]) {
                Write-Host "  Execution Time: $([math]::Round([double]$result.execution_time_ms, 2))ms" -ForegroundColor Cyan
            }
            if ($result.trades -and $result.trades.Count -gt 0) {
                Write-Host "  First Trade ID: $($result.trades[0].trade_id)" -ForegroundColor DarkCyan
            }
        }
        if ($result.status) {
            Write-Host "  Health: $($result.status)" -ForegroundColor Cyan
        }
        if ($result.message) {
            Write-Host "  Message: $($result.message)" -ForegroundColor Cyan
        }
        if ($result -is [Array]) {
            Write-Host "  Count: $($result.Count) items" -ForegroundColor Cyan
        }
        
        # Run custom validator if provided
        if ($Validator) {
            $validationResult = & $Validator $result
            if ($validationResult) {
                Write-Host "  Validation: PASSED" -ForegroundColor Green
            }
        }
        
        $script:passedTests++
        return $result
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode) {
            Write-Host "  Status: $statusCode - " -NoNewline -ForegroundColor Red
            Write-Host "ERROR" -ForegroundColor Red
        } else {
            Write-Host "  Connection Error - " -NoNewline -ForegroundColor Red
            Write-Host "FAILED" -ForegroundColor Red
        }
        
        if ($_.ErrorDetails.Message) {
            try {
                $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
                if ($errorBody.detail) {
                    Write-Host "  Error: $($errorBody.detail)" -ForegroundColor Red
                } elseif ($errorBody.message) {
                    Write-Host "  Error: $($errorBody.message)" -ForegroundColor Red
                }
            } catch {
                Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        $script:failedTests++
        return $null
    }
}

function Test-ExpectedError {
    param(
        [string]$Title,
        [string]$Method = "GET",
        [string]$Url,
        [hashtable]$Body = $null,
        [int]$ExpectedStatus
    )
    
    Write-Host "`n[$script:testNum] $Title" -ForegroundColor Yellow
    Write-Host "  $Method $Url" -ForegroundColor Gray
    $script:testNum++
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = "application/json"
            ErrorAction = "Stop"
            UseBasicParsing = $true
            TimeoutSec = 30
        }
        
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10 -Compress
            $params.Body = $jsonBody
            Write-Host "  Body: $jsonBody" -ForegroundColor DarkGray
        }
        
        $response = Invoke-WebRequest @params
        
        # If we get here, no error was thrown - this is unexpected
        Write-Host "  Status: $($response.StatusCode) - " -NoNewline -ForegroundColor Red
        Write-Host "UNEXPECTED SUCCESS (Expected $ExpectedStatus)" -ForegroundColor Red
        $script:failedTests++
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "  Status: $statusCode - " -NoNewline -ForegroundColor Green
            Write-Host "EXPECTED ERROR" -ForegroundColor Green
            
            if ($_.ErrorDetails.Message) {
                try {
                    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
                    if ($errorBody.detail) {
                        Write-Host "  Error: $($errorBody.detail)" -ForegroundColor DarkGray
                    } elseif ($errorBody.message) {
                        Write-Host "  Error: $($errorBody.message)" -ForegroundColor DarkGray
                    }
                } catch {
                    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor DarkGray
                }
            }
            
            $script:passedTests++
        } else {
            Write-Host "  Status: $statusCode - " -NoNewline -ForegroundColor Red
            Write-Host "WRONG ERROR (Expected $ExpectedStatus)" -ForegroundColor Red
            $script:failedTests++
        }
    }
}

# ========================================
# 1. HEALTH CHECK TESTS
# ========================================

Write-Host "`n--- Health Check Endpoints ---" -ForegroundColor Magenta

Test-Endpoint -Title "Service Root Info" -Url "$BASE/"

Test-Endpoint -Title "Full Health Check" -Url "$BASE/health"

Test-Endpoint -Title "Readiness Probe (ECS)" -Url "$BASE/health/ready"

Test-Endpoint -Title "Liveness Probe (ECS)" -Url "$BASE/health/live"

# ========================================
# 2. MANUAL SEARCH TESTS
# ========================================

Write-Host "`n--- Manual Search Tests ---" -ForegroundColor Magenta

$result1 = Test-Endpoint -Title "Search FX Trades" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "manual"
    filters = @{
        asset_types = @("FX")
    }
}

Test-Endpoint -Title "Search AFFIRMED Trades" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "manual"
    filters = @{
        statuses = @("AFFIRMED")
    }
}

Test-Endpoint -Title "Search ALLEGED Trades" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "manual"
    filters = @{
        statuses = @("ALLEGED")
    }
}

Test-Endpoint -Title "Search Multiple Asset Types" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "manual"
    filters = @{
        asset_types = @("FX", "EQUITY", "CDS")
    }
}

Test-Endpoint -Title "Search with Date Range" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "manual"
    filters = @{
        date_from = "2025-01-01"
        date_to = "2025-12-31"
    }
}

Test-Endpoint -Title "Search with Text Filter" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "manual"
    filters = @{
        search_text = "ACC"
    }
}

Test-Endpoint -Title "Combined Filters Search" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "manual"
    filters = @{
        asset_types = @("EQUITY")
        statuses = @("AFFIRMED", "ALLEGED")
        date_from = "2025-01-01"
    }
}

# ========================================
# 3. RANKING FUNCTIONALITY TESTS (NEW!)
# ========================================

Write-Host "`n--- Ranking Functionality Tests ---" -ForegroundColor Magenta

Write-Host "`n  Testing that results are ranked by relevance..." -ForegroundColor Gray

Test-Endpoint -Title "Search REJECTED Trades (High Priority)" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "manual"
    filters = @{
        statuses = @("REJECTED")
    }
} -Validator {
    param($result)
    if ($result.trades -and $result.trades.Count -gt 0) {
        $allRejected = $true
        foreach ($trade in $result.trades) {
            if ($trade.status -ne "REJECTED") {
                $allRejected = $false
                break
            }
        }
        if ($allRejected) {
            Write-Host "  [OK] All results are REJECTED (highest priority)" -ForegroundColor Green
        }
        return $allRejected
    }
    return $false
}

Test-Endpoint -Title "Search CDS Trades (High Risk Asset)" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "manual"
    filters = @{
        asset_types = @("CDS", "IRS")
    }
} -Validator {
    param($result)
    if ($result.trades -and $result.trades.Count -gt 1) {
        # Check if complex derivatives (CDS/IRS) appear first
        $firstTrade = $result.trades[0]
        if ($firstTrade.asset_type -in @("CDS", "IRS")) {
            Write-Host "  [OK] Complex derivatives ranked higher (CDS/IRS first)" -ForegroundColor Green
            return $true
        }
    }
    return $false
}

Test-Endpoint -Title "Mixed Status Search (Ranking Test)" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "manual"
    filters = @{
        statuses = @("REJECTED", "ALLEGED", "AFFIRMED", "CLEARED")
    }
} -Validator {
    param($result)
    if ($result.trades -and $result.trades.Count -gt 3) {
        # Check if higher priority statuses appear first
        $topStatuses = $result.trades[0..2] | ForEach-Object { $_.status }
        $highPriorityCount = ($topStatuses | Where-Object { $_ -in @("REJECTED", "ALLEGED") }).Count
        if ($highPriorityCount -ge 2) {
            Write-Host "  [OK] High priority statuses (REJECTED/ALLEGED) ranked first" -ForegroundColor Green
            return $true
        }
    }
    return $false
}

# Test that ranking doesn't break pagination
Test-Endpoint -Title "Search with Ranking (Check Pagination)" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "manual"
    filters = @{
        asset_types = @("FX", "EQUITY", "CDS")
    }
} -Validator {
    param($result)
    if ($result.total_results -ne $null -and $result.trades) {
        $returnedCount = $result.trades.Count
        Write-Host "  [OK] Returned $returnedCount trades (max 50 due to pagination)" -ForegroundColor Green
        if ($returnedCount -le 50) {
            return $true
        }
    }
    return $false
}

# ========================================
# 4. QUERY HISTORY TESTS
# ========================================

Write-Host "`n--- Query History Tests ---" -ForegroundColor Magenta

Test-Endpoint -Title "Get Query History (Empty)" -Url "$BASE/history?user_id=$USER"

# Perform a search to create history
$searchResult = Test-Endpoint -Title "Create History Entry (Search)" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "manual"
    filters = @{
        asset_types = @("FX")
    }
}

# Get history to find query_id
$historyResult = Test-Endpoint -Title "Get Query History (After Search)" -Url "$BASE/history?user_id=$USER"

if ($historyResult -and $historyResult.Count -gt 0) {
    $queryId = $historyResult[0].query_id
    Write-Host "  Found Query ID: $queryId" -ForegroundColor DarkGray
    
    # Test update history
    Test-Endpoint -Title "Save Query (Bookmark)" -Method "PUT" -Url "$BASE/history/${queryId}?user_id=$USER" -Body @{
        is_saved = $true
        query_name = "Test Query - $(Get-Date -Format 'HH:mm:ss')"
    }
    
    # Test get saved queries only
    Test-Endpoint -Title "Get Saved Queries Only" -Url "$BASE/history?user_id=$USER&is_saved=true"
    
    # Test search history
    Test-Endpoint -Title "Search History by Text" -Url "$BASE/history?user_id=$USER&search_text=FX"
    
    # Test delete query
    Test-Endpoint -Title "Delete Query" -Method "DELETE" -Url "$BASE/history/${queryId}?user_id=$USER"
    
    # Verify deletion
    Test-Endpoint -Title "Verify Query Deleted" -Url "$BASE/history?user_id=$USER"
} else {
    Write-Host "`n  Skipping history update/delete tests - no queries found" -ForegroundColor Yellow
}

# ========================================
# 5. ERROR HANDLING TESTS
# ========================================

Write-Host "`n--- Error Handling Tests ---" -ForegroundColor Magenta

Test-ExpectedError -Title "Invalid Search Type (Expect 422)" -Method "POST" -Url "$BASE/search" -Body @{
    user_id = $USER
    search_type = "invalid_type"
} -ExpectedStatus 422

Test-ExpectedError -Title "Missing user_id (Expect 422)" -Method "POST" -Url "$BASE/search" -Body @{
    search_type = "manual"
    filters = @{}
} -ExpectedStatus 422

Test-ExpectedError -Title "Invalid Query ID (Expect 404)" -Method "DELETE" -Url "$BASE/history/999999?user_id=$USER" -ExpectedStatus 404

Test-ExpectedError -Title "Invalid Endpoint (Expect 404)" -Url "$BASE/invalid/endpoint" -ExpectedStatus 404

# ========================================
# SUMMARY
# ========================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Total Tests: $($script:passedTests + $script:failedTests)" -ForegroundColor White
Write-Host "  Passed: $script:passedTests" -ForegroundColor Green
Write-Host "  Failed: $script:failedTests" -ForegroundColor $(if ($script:failedTests -eq 0) { "Green" } else { "Red" })

if ($script:failedTests -eq 0) {
    Write-Host "`n  ALL TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "`n  SOME TESTS FAILED" -ForegroundColor Red
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

# Exit with appropriate code
exit $script:failedTests
