# Terraform wrapper using Docker
# Usage: .\terraform.ps1 init
#        .\terraform.ps1 apply
#        .\terraform.ps1 plan
#        .\terraform.ps1 destroy

param(
    [Parameter(Position=0, Mandatory=$true)]
    [string]$Command,
    
    [Parameter(Position=1, ValueFromRemainingArguments=$true)]
    [string[]]$RemainingArgs
)

$infraPath = $PSScriptRoot

Write-Host "Running Terraform $Command..." -ForegroundColor Cyan

docker run --rm `
    -v "${infraPath}:/workspace" `
    -w /workspace `
    hashicorp/terraform:latest `
    $Command @RemainingArgs
