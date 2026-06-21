param([switch]$Data)

$BUCKET  = "draft-jdygard-com"
$DIST_ID = "E2KECFF6M7075A"

npm run build
if ($LASTEXITCODE -ne 0) { throw "build failed" }

aws s3 sync dist/assets/ "s3://$BUCKET/assets/" `
  --cache-control "public,max-age=31536000,immutable" `
  --delete

aws s3 cp dist/index.html "s3://$BUCKET/index.html" `
  --cache-control "no-cache"

if (Test-Path "dist/vite.svg") {
  aws s3 cp dist/vite.svg "s3://$BUCKET/vite.svg" `
    --cache-control "public,max-age=86400"
}

$paths = @("/index.html", "/assets/*")

if ($Data) {
  aws s3 sync public/data/ "s3://$BUCKET/data/" `
    --cache-control "public,max-age=86400" `
    --delete

  $paths += "/data/*"
}

aws cloudfront create-invalidation `
  --distribution-id $DIST_ID `
  --paths $paths

Write-Host "Deployed: https://draft-jdygard-com.s3.amazonaws.com"