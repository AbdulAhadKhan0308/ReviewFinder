<#
Stops the parts of the AWS deployment that are billed by the hour, keeping everything resume.ps1 needs to bring the
site back at the same CloudFront address, with the same data, accounts and sign-in keys.

  Deletes:  the load balancer, and the database (after taking a final snapshot)
  Scales:   the ECS service to 0 tasks
  Disables: the CloudFront distribution
  Keeps:    VPC, security groups, IAM roles, ECR images, task definitions, cluster, service, target group,
            Parameter Store entries, the CloudFront distribution and the database snapshot

Safe to run again: anything already stopped is skipped. Takes about 10 minutes, mostly waiting for the database.

  powershell -ExecutionPolicy Bypass -File deploy\stop.ps1
#>
param([string]$Region = 'ap-southeast-2')

$ErrorActionPreference = 'Stop'
$env:AWS_DEFAULT_REGION = $Region
. "$PSScriptRoot\aws-helpers.ps1"

Write-Step 'App: scaling the ECS service to 0 tasks'
$desired = Invoke-Aws ecs describe-services --cluster $Names.Cluster --services $Names.Service --output text `
    --query "services[?status=='ACTIVE'] | [0].desiredCount"
if ($desired -and $desired -ne '0') {
    Invoke-Aws ecs update-service --cluster $Names.Cluster --service $Names.Service --desired-count 0 `
        --query service.desiredCount --output text | Out-Null
    Invoke-Aws ecs wait services-stable --cluster $Names.Cluster --services $Names.Service
    Write-Host 'Stopped.'
}
else {
    Write-Host 'Already at 0 tasks.'
}

Write-Step 'CloudFront: disabling the distribution'
$distributionId = Get-DistributionId
if (-not $distributionId) {
    Write-Host 'No distribution found.'
}
elseif ((Invoke-Aws cloudfront get-distribution --id $distributionId --query Distribution.DistributionConfig.Enabled --output text) -eq 'True') {
    Update-Distribution $distributionId { param($config) $config.Enabled = $false }
    Write-Host "Disabling $distributionId (finishes in the background; waited for at the end)."
}
else {
    Write-Host 'Already disabled.'
}

Write-Step 'Load balancer: deleting'
$albArn = Invoke-Aws elbv2 describe-load-balancers --output text `
    --query "LoadBalancers[?LoadBalancerName=='$($Names.LoadBalancer)'].LoadBalancerArn | [0]"
if ($albArn) {
    Invoke-Aws elbv2 delete-load-balancer --load-balancer-arn $albArn
    Invoke-Aws elbv2 wait load-balancers-deleted --load-balancer-arns $albArn
    Write-Host 'Deleted. The target group is kept.'
}
else {
    Write-Host 'Already deleted.'
}

Write-Step 'Database: final snapshot, then delete'
$dbStatus = Invoke-Aws rds describe-db-instances --output text `
    --query "DBInstances[?DBInstanceIdentifier=='$($Names.Database)'].DBInstanceStatus | [0]"
if ($dbStatus) {
    $snapshot = $Names.SnapshotPrefix + (Get-Date -Format 'yyyyMMdd-HHmm')
    Invoke-Aws rds delete-db-instance --db-instance-identifier $Names.Database `
        --final-db-snapshot-identifier $snapshot --delete-automated-backups `
        --query DBInstance.DBInstanceStatus --output text | Out-Null
    Write-Host "Snapshot $snapshot is being taken; waiting for the database to be deleted (5-10 minutes)..."
    Invoke-Aws rds wait db-instance-deleted --db-instance-identifier $Names.Database
    Invoke-Aws rds wait db-snapshot-available --db-snapshot-identifier $snapshot
    Write-Host "Deleted. Snapshot $snapshot is kept."
}
else {
    Write-Host 'Already deleted.'
}

if ($distributionId) {
    Write-Step 'CloudFront: waiting for the change to finish'
    Invoke-Aws cloudfront wait distribution-deployed --id $distributionId
    Write-Host 'Disabled.'
}

Write-Step 'Stopped'
Write-Host 'Nothing billed by the hour is left running. Snapshots kept:'
Invoke-Aws rds describe-db-snapshots --snapshot-type manual --output text `
    --query "DBSnapshots[?starts_with(DBSnapshotIdentifier, '$($Names.SnapshotPrefix)')].[DBSnapshotIdentifier,SnapshotCreateTime]"
Write-Host "`nTo bring the site back: powershell -ExecutionPolicy Bypass -File deploy\resume.ps1"
