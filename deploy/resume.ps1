<#
Brings back the deployment stopped by stop.ps1, at the same CloudFront address and with the data from the latest
database snapshot.

  1. Restores the database from the newest snapshot, under the same name, so its address and the connection string
     in Parameter Store still match
  2. Recreates the load balancer and its listener, using the kept target group
  3. Points CloudFront at the new load balancer and enables it
  4. Scales the ECS service back to 1 task once the database is ready

Takes about 15-20 minutes, mostly waiting for the database and CloudFront. Safe to run again.
Use -DryRun to only look everything up and print the plan.

  powershell -ExecutionPolicy Bypass -File deploy\resume.ps1 [-DryRun]
#>
param([string]$Region = 'ap-southeast-2', [switch]$DryRun)

$ErrorActionPreference = 'Stop'
$env:AWS_DEFAULT_REGION = $Region
. "$PSScriptRoot\aws-helpers.ps1"

Write-Step 'Looking up the kept resources'
$vpcId = Invoke-Aws ec2 describe-vpcs --filters "Name=tag:Name,Values=$($Names.Vpc)" --query 'Vpcs[0].VpcId' --output text
if (-not $vpcId) { throw "VPC $($Names.Vpc) not found." }
$publicSubnets = @((Invoke-Aws ec2 describe-subnets --output text --query 'Subnets[].SubnetId' `
            --filters "Name=vpc-id,Values=$vpcId" 'Name=tag:Name,Values=*public*') -split '\s+' | Where-Object { $_ })
$albSg = Invoke-Aws ec2 describe-security-groups --output text --query 'SecurityGroups[0].GroupId' `
    --filters "Name=vpc-id,Values=$vpcId" 'Name=group-name,Values=alb-sg'
$dbSg = Invoke-Aws ec2 describe-security-groups --output text --query 'SecurityGroups[0].GroupId' `
    --filters "Name=vpc-id,Values=$vpcId" 'Name=group-name,Values=db-sg'
$targetGroup = Invoke-Aws elbv2 describe-target-groups --output text `
    --query "TargetGroups[?TargetGroupName=='$($Names.TargetGroup)'].TargetGroupArn | [0]"
$distributionId = Get-DistributionId
$dbStatus = Invoke-Aws rds describe-db-instances --output text `
    --query "DBInstances[?DBInstanceIdentifier=='$($Names.Database)'].DBInstanceStatus | [0]"
$snapshot = Invoke-Aws rds describe-db-snapshots --snapshot-type manual --output text `
    --query "reverse(sort_by(DBSnapshots[?starts_with(DBSnapshotIdentifier, '$($Names.SnapshotPrefix)') && Status=='available'], &SnapshotCreateTime))[0].DBSnapshotIdentifier"
$albDns = Invoke-Aws elbv2 describe-load-balancers --output text `
    --query "LoadBalancers[?LoadBalancerName=='$($Names.LoadBalancer)'].DNSName | [0]"

[pscustomobject]@{
    VPC            = $vpcId
    PublicSubnets  = $publicSubnets -join ', '
    'alb-sg'       = $albSg
    'db-sg'        = $dbSg
    TargetGroup    = $targetGroup
    CloudFront     = $distributionId
    Database       = if ($dbStatus) { "exists ($dbStatus)" } else { 'missing' }
    LatestSnapshot = $snapshot
    LoadBalancer   = if ($albDns) { $albDns } else { 'missing' }
} | Format-List

foreach ($required in 'albSg', 'dbSg', 'targetGroup', 'distributionId') {
    if (-not (Get-Variable $required -ValueOnly)) { throw "Couldn't find $required; see the lookup results above." }
}
if ($publicSubnets.Count -lt 2) { throw 'Expected two public subnets.' }
if (-not $dbStatus -and -not $snapshot) { throw 'No database and no snapshot to restore it from.' }
if ($DryRun) {
    Write-Host 'Dry run: nothing was changed.'
    return
}

Write-Step 'Database'
if ($dbStatus) {
    Write-Host "Already exists ($dbStatus)."
}
else {
    Invoke-Aws rds restore-db-instance-from-db-snapshot --db-instance-identifier $Names.Database `
        --db-snapshot-identifier $snapshot --db-instance-class db.t4g.micro --storage-type gp3 `
        --db-subnet-group-name $Names.SubnetGroup --vpc-security-group-ids $dbSg `
        --no-publicly-accessible --no-multi-az --no-auto-minor-version-upgrade --copy-tags-to-snapshot `
        --tags "Key=Name,Value=$($Names.Database)" --query DBInstance.DBInstanceStatus --output text | Out-Null
    Write-Host "Restoring from $snapshot (finishes in the background; waited for below)."
}

Write-Step 'Load balancer'
if ($albDns) {
    Write-Host "Already exists: $albDns"
}
else {
    $albArn = Invoke-Aws elbv2 create-load-balancer --name $Names.LoadBalancer --type application --scheme internet-facing `
        --subnets $publicSubnets --security-groups $albSg --tags "Key=Name,Value=$($Names.LoadBalancer)" `
        --query 'LoadBalancers[0].LoadBalancerArn' --output text
    Invoke-Aws elbv2 create-listener --load-balancer-arn $albArn --protocol HTTP --port 80 `
        --default-actions "Type=forward,TargetGroupArn=$targetGroup" --query 'Listeners[0].Port' --output text | Out-Null
    $albDns = Invoke-Aws elbv2 describe-load-balancers --load-balancer-arns $albArn --query 'LoadBalancers[0].DNSName' --output text
    Write-Host "Created: $albDns"
}

Write-Step 'CloudFront'
$origin = Invoke-Aws cloudfront get-distribution --id $distributionId --output text `
    --query 'Distribution.DistributionConfig.[Origins.Items[0].DomainName, Enabled]'
if ($origin -match [regex]::Escape($albDns) -and $origin -match 'True') {
    Write-Host 'Already enabled and pointing at the load balancer.'
}
else {
    Update-Distribution $distributionId {
        param($config)
        $config.Origins.Items[0].DomainName = $albDns
        $config.Enabled = $true
    }
    Write-Host 'Pointing it at the new load balancer and enabling it (finishes in the background).'
}

Write-Step 'Waiting for the database (up to 15 minutes)'
Invoke-Aws rds wait db-instance-available --db-instance-identifier $Names.Database
Write-Host 'Available.'

Write-Step 'App: scaling the ECS service to 1 task'
Invoke-Aws ecs update-service --cluster $Names.Cluster --service $Names.Service --desired-count 1 `
    --query service.desiredCount --output text | Out-Null
Invoke-Aws ecs wait services-stable --cluster $Names.Cluster --services $Names.Service
Invoke-Aws elbv2 describe-target-health --target-group-arn $targetGroup --output text `
    --query 'TargetHealthDescriptions[].[Target.Id, TargetHealth.State]'

Write-Step 'Waiting for CloudFront'
Invoke-Aws cloudfront wait distribution-deployed --id $distributionId
$domain = Invoke-Aws cloudfront get-distribution --id $distributionId --query Distribution.DomainName --output text
Write-Step "Running at https://$domain"
