<#
.SYNOPSIS
  One-time setup of CloudFront standard logging (v2) for draft-jdygard-com.

.DESCRIPTION
  Creates a dedicated log bucket, grants the CloudWatch vended-logs delivery
  service permission to write to it, sets a 90-day expiry, and wires the
  CloudFront distribution to it via the CloudWatch Logs delivery API.

  Output is Apache Parquet with Hive-compatible date partitions, so Athena or
  DuckDB can read it later without a conversion step.

  This script is IDEMPOTENT - re-running it is safe. Existing resources are
  detected and left alone (except the bucket policy and lifecycle rule, which
  are re-applied every run).

.PARAMETER LogBucket
  Name of the bucket to create/use for logs. Must contain only letters,
  digits, underscores and hyphens - NO DOTS. The CloudWatch delivery API
  rejects bucket names outside the [\w-] character class.

.PARAMETER DistributionId
  The CloudFront distribution to log. Defaults to the draft site.

.PARAMETER RetentionDays
  Days before log objects are deleted. Set to 0 to skip the lifecycle rule.

.PARAMETER WhatIf
  Print every AWS call without executing it.

.EXAMPLE
  .\setup-logging.ps1
  .\setup-logging.ps1 -WhatIf
  .\setup-logging.ps1 -RetentionDays 30
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string] $LogBucket      = "draft-jdygard-com-logs",
    [string] $DistributionId = "E2KECFF6M7075A",
    [int]    $RetentionDays  = 90,
    [string] $BucketRegion   = "us-east-1"
)

$ErrorActionPreference = "Stop"

# The CloudWatch delivery API for CloudFront is GLOBAL and only lives in
# us-east-1. This is not the same as the bucket region and must not be changed.
$DELIVERY_REGION = "us-east-1"

$SOURCE_NAME      = "cf-$DistributionId-source"
$DESTINATION_NAME = "cf-$DistributionId-s3"

# Which columns land in the logs. "Who came" needs client identity, geography
# and referral; the rest is cheap enough to keep for context.
# Note: recordFields CAN be changed later via update-delivery-configuration.
#       outputFormat CANNOT - changing Parquet later means deleting the delivery.
$RECORD_FIELDS = @(
    "date"                  # UTC date of the request
    "time"                  # UTC time of the request
    "x-edge-location"       # POP that served it - coarse geography
    "c-ip"                  # viewer IP (personal data - see RetentionDays)
    "c-country"             # ISO 3166-1 alpha-2, resolved by CloudFront
    "asn"                   # viewer's network - separates mobile/ISP/datacentre
    "cs-method"
    "cs-uri-stem"           # which page/asset - tells you which teams get read
    "cs-uri-query"          # your ?view= and deep-link params
    "sc-status"
    "sc-bytes"
    "cs(Referer)"           # where they came from
    "cs(User-Agent)"        # device/browser, and bot identification
    "x-host-header"
    "x-edge-result-type"    # Hit/Miss/Error
    "time-taken"
)

# Hive-compatible partition layout. Lowercase {distributionid} is deliberate:
# AWS Glue requires lowercase partition keys, and you will want Glue if you
# ever point Athena at this.
$SUFFIX_PATH = "distributionid={distributionid}/year={yyyy}/month={MM}/day={dd}/hour={HH}"

# ---------------------------------------------------------------- helpers ---

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    $msg" -ForegroundColor Green }
function Write-Skip($msg) { Write-Host "    $msg" -ForegroundColor DarkGray }

# AWS CLI chokes on UTF-8 BOM, which is what PowerShell 5.1's Out-File writes.
# Always go through this.
function Write-JsonFile($path, $obj) {
    $json = $obj | ConvertTo-Json -Depth 20
    [System.IO.File]::WriteAllText($path, $json, (New-Object System.Text.UTF8Encoding($false)))
    return $path
}

# Runs an aws command, returns parsed JSON on success. On failure, returns
# $null and stashes stderr in $script:LastAwsError rather than throwing, so
# callers can treat "already exists" as success.
function Invoke-Aws {
    param([string[]] $CliArgs, [switch] $AllowFailure)

    if ($WhatIfPreference) {
        Write-Host "    [WhatIf] aws $($CliArgs -join ' ')" -ForegroundColor Yellow
        return $null
    }

    $stdout = & aws @CliArgs 2>&1
    $code   = $LASTEXITCODE
    $text   = ($stdout | Out-String)

    if ($code -ne 0) {
        $script:LastAwsError = $text
        if ($AllowFailure) { return $null }
        throw "aws $($CliArgs -join ' ')`n$text"
    }

    $script:LastAwsError = $null
    if ([string]::IsNullOrWhiteSpace($text)) { return $true }
    try { return $text | ConvertFrom-Json } catch { return $true }
}

# ------------------------------------------------------------ preflight ---

Write-Step "Checking AWS CLI and credentials"

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    throw "AWS CLI not found on PATH. Install AWS CLI v2 first."
}

$identity = & aws sts get-caller-identity --output json 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "Could not authenticate to AWS:`n$identity"
}
$AccountId = ($identity | Out-String | ConvertFrom-Json).Account
Write-Ok "Account $AccountId"

if ($LogBucket -notmatch '^[\w-]+$') {
    throw "LogBucket '$LogBucket' contains characters the CloudWatch delivery API rejects. Use only letters, digits, underscores and hyphens - no dots."
}

$DistributionArn = "arn:aws:cloudfront::${AccountId}:distribution/$DistributionId"
$BucketArn       = "arn:aws:s3:::$LogBucket"
$tmp             = [System.IO.Path]::GetTempPath()

# ------------------------------------------------------------ 1. bucket ---

Write-Step "Creating log bucket s3://$LogBucket"

$exists = Invoke-Aws @("s3api","head-bucket","--bucket",$LogBucket) -AllowFailure
if ($null -ne $exists) {
    Write-Skip "Bucket already exists - reusing it."
} else {
    $createArgs = @("s3api","create-bucket","--bucket",$LogBucket,"--region",$BucketRegion)
    # us-east-1 is the one region where LocationConstraint must be omitted.
    if ($BucketRegion -ne "us-east-1") {
        $createArgs += @("--create-bucket-configuration","LocationConstraint=$BucketRegion")
    }
    Invoke-Aws $createArgs | Out-Null
    Write-Ok "Created in $BucketRegion."
}

Write-Step "Blocking all public access on the log bucket"
Invoke-Aws @(
    "s3api","put-public-access-block","--bucket",$LogBucket,
    "--public-access-block-configuration",
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=true"
) | Out-Null
Write-Ok "Public access blocked."
# BlockPublicPolicy stays false because the delivery service principal policy
# below is evaluated as a non-public grant; setting it true is also fine, but
# false avoids a spurious rejection on some account configurations.

# ------------------------------------------------------ 2. bucket policy ---

Write-Step "Granting the log delivery service write access"

# The console adds this policy for you. The CLI does NOT - this is the single
# most common cause of "delivery created successfully but no logs ever appear".
$policy = [ordered]@{
    Version   = "2012-10-17"
    Statement = @(
        [ordered]@{
            Sid       = "AWSLogsDeliveryWrite"
            Effect    = "Allow"
            Principal = @{ Service = "delivery.logs.amazonaws.com" }
            Action    = "s3:PutObject"
            Resource  = "$BucketArn/*"
            Condition = [ordered]@{
                StringEquals = [ordered]@{
                    "s3:x-amz-acl"    = "bucket-owner-full-control"
                    "aws:SourceAccount" = $AccountId
                }
                ArnLike = @{
                    "aws:SourceArn" = "arn:aws:logs:${DELIVERY_REGION}:${AccountId}:delivery-source:*"
                }
            }
        },
        [ordered]@{
            Sid       = "AWSLogsDeliveryAclCheck"
            Effect    = "Allow"
            Principal = @{ Service = "delivery.logs.amazonaws.com" }
            Action    = @("s3:GetBucketAcl","s3:ListBucket")
            Resource  = $BucketArn
            Condition = [ordered]@{
                StringEquals = @{ "aws:SourceAccount" = $AccountId }
                ArnLike = @{
                    "aws:SourceArn" = "arn:aws:logs:${DELIVERY_REGION}:${AccountId}:delivery-source:*"
                }
            }
        }
    )
}

$policyFile = Write-JsonFile (Join-Path $tmp "cf-log-bucket-policy.json") $policy
Invoke-Aws @("s3api","put-bucket-policy","--bucket",$LogBucket,"--policy","file://$policyFile") | Out-Null
Write-Ok "Policy applied."

# --------------------------------------------------------- 3. retention ---

if ($RetentionDays -gt 0) {
    Write-Step "Setting $RetentionDays-day expiry on log objects"

    $lifecycle = [ordered]@{
        Rules = @(
            [ordered]@{
                ID     = "expire-cloudfront-logs"
                Filter = @{ Prefix = "" }
                Status = "Enabled"
                Expiration = @{ Days = $RetentionDays }
                AbortIncompleteMultipartUpload = @{ DaysAfterInitiation = 7 }
            }
        )
    }

    $lcFile = Write-JsonFile (Join-Path $tmp "cf-log-lifecycle.json") $lifecycle
    Invoke-Aws @(
        "s3api","put-bucket-lifecycle-configuration",
        "--bucket",$LogBucket,
        "--lifecycle-configuration","file://$lcFile"
    ) | Out-Null
    Write-Ok "Objects older than $RetentionDays days will be deleted automatically."
} else {
    Write-Skip "RetentionDays=0 - no lifecycle rule. Logs are kept forever."
}

# ---------------------------------------------------- 4. delivery source ---

Write-Step "Registering the distribution as a log delivery source"

$src = Invoke-Aws @(
    "logs","put-delivery-source",
    "--region",$DELIVERY_REGION,
    "--name",$SOURCE_NAME,
    "--resource-arn",$DistributionArn,
    "--log-type","ACCESS_LOGS"
) -AllowFailure

if ($null -eq $src -and -not $WhatIfPreference) {
    if ($script:LastAwsError -match "already been used") {
        # One delivery source per distribution, hard limit. Reuse it.
        Write-Skip "A delivery source already exists for this distribution - reusing it."
    } else {
        throw "put-delivery-source failed:`n$script:LastAwsError"
    }
} else {
    Write-Ok "Source '$SOURCE_NAME' registered."
}

# ----------------------------------------------- 5. delivery destination ---

Write-Step "Creating the S3 delivery destination (Parquet)"

# outputFormat is immutable after creation. If you ever want a different
# format you must delete the delivery AND this destination first.
$destConfig = @{ destinationResourceArn = $BucketArn }
$destFile   = Write-JsonFile (Join-Path $tmp "cf-log-destination.json") $destConfig

$dest = Invoke-Aws @(
    "logs","put-delivery-destination",
    "--region",$DELIVERY_REGION,
    "--name",$DESTINATION_NAME,
    "--output-format","parquet",
    "--delivery-destination-configuration","file://$destFile"
) -AllowFailure

if ($null -eq $dest -and -not $WhatIfPreference) {
    throw "put-delivery-destination failed:`n$script:LastAwsError"
}

if ($WhatIfPreference) {
    $DestinationArn = "arn:aws:logs:${DELIVERY_REGION}:${AccountId}:delivery-destination:$DESTINATION_NAME"
} else {
    $DestinationArn = $dest.deliveryDestination.arn
    Write-Ok "Destination ARN $DestinationArn"
}

# ---------------------------------------------------------- 6. delivery ---

Write-Step "Linking source to destination"

$s3Config = [ordered]@{
    suffixPath              = $SUFFIX_PATH
    enableHiveCompatiblePath = $true
}
$s3File = Write-JsonFile (Join-Path $tmp "cf-log-s3config.json") $s3Config

$delivery = Invoke-Aws (@(
    "logs","create-delivery",
    "--region",$DELIVERY_REGION,
    "--delivery-source-name",$SOURCE_NAME,
    "--delivery-destination-arn",$DestinationArn,
    "--s3-delivery-configuration","file://$s3File",
    "--record-fields"
) + $RECORD_FIELDS) -AllowFailure

if ($null -eq $delivery -and -not $WhatIfPreference) {
    if ($script:LastAwsError -match "ConflictException|already exists") {
        Write-Skip "Delivery already exists - nothing to do."
    } else {
        throw "create-delivery failed:`n$script:LastAwsError"
    }
} else {
    Write-Ok "Delivery created."
}

# ------------------------------------------------------------- summary ---

$hivePrefix = "AWSLogs/aws-account-id=$AccountId/CloudFront/$SUFFIX_PATH"

Write-Host ""
Write-Host "-------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " CloudFront access logging is configured." -ForegroundColor Green
Write-Host "-------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Distribution : $DistributionId"
Write-Host "  Log bucket   : s3://$LogBucket"
Write-Host "  Path         : $hivePrefix"
Write-Host "  Format       : Apache Parquet, Hive-partitioned"
Write-Host "  Retention    : $(if ($RetentionDays -gt 0) { "$RetentionDays days" } else { 'indefinite' })"
Write-Host ""
Write-Host "  Logs begin appearing within about an hour, and settings changes"
Write-Host "  can take up to 12 hours to fully propagate. Check with:"
Write-Host ""
Write-Host "    aws s3 ls s3://$LogBucket/AWSLogs/ --recursive --human-readable | Select-Object -Last 20" -ForegroundColor Yellow
Write-Host ""
