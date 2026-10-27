# Shared names and helpers for stop.ps1 and resume.ps1. Resources are found by name, so no IDs live in the repo.

$Names = @{
    Cluster        = 'restaurant-reviews'
    Service        = 'restaurant-reviews'
    Database       = 'restaurant-reviews-db'
    SubnetGroup    = 'restaurant-reviews-private'
    SnapshotPrefix = 'restaurant-reviews-db-'
    LoadBalancer   = 'restaurant-reviews-alb'
    TargetGroup    = 'restaurant-reviews-tg'
    Vpc            = 'restaurant-reviews-vpc'
}

# Windows PowerShell 5.1 can otherwise write arrays as {"value": [...], "Count": n} in ConvertTo-Json.
Remove-TypeData System.Array -ErrorAction SilentlyContinue

# Runs the AWS CLI and stops the script if it fails. Prints "None" queries as $null.
function Invoke-Aws {
    $output = & aws @args
    if ($LASTEXITCODE -ne 0) { throw "AWS CLI call failed: aws $($args -join ' ')" }
    if ($output -eq 'None') { return $null }
    $output
}

function Write-Step([string]$Text) { Write-Host "`n== $Text" -ForegroundColor Cyan }

# The CloudFront distribution whose origin is our load balancer.
function Get-DistributionId {
    Invoke-Aws cloudfront list-distributions --output text `
        --query "DistributionList.Items[?starts_with(Origins.Items[0].DomainName, '$($Names.LoadBalancer)')].Id | [0]"
}

# Changes a distribution's settings: $Change receives the current DistributionConfig and edits it in place.
function Update-Distribution([string]$Id, [scriptblock]$Change) {
    $response = Invoke-Aws cloudfront get-distribution-config --id $Id | Out-String | ConvertFrom-Json
    $config = $response.DistributionConfig
    & $Change $config
    $file = Join-Path $env:TEMP "restaurant-reviews-cloudfront-$Id.json"
    [IO.File]::WriteAllText($file, (ConvertTo-Json $config -Depth 50), (New-Object Text.UTF8Encoding $false))
    try {
        Invoke-Aws cloudfront update-distribution --id $Id --if-match $response.ETag `
            --distribution-config "file://$($file -replace '\\', '/')" --query Distribution.Status --output text | Out-Null
    }
    finally {
        Remove-Item $file -ErrorAction SilentlyContinue
    }
}
