# Test Claude API
# Run: .\test-claude.ps1

$apiKey = $env:ANTHROPIC_API_KEY  # Lees uit environment variable

if (-not $apiKey) {
    Write-Host "❌ ANTHROPIC_API_KEY not set!" -ForegroundColor Red
    Write-Host "Set it first: `$env:ANTHROPIC_API_KEY = 'sk-ant-...'" -ForegroundColor Yellow
    exit
}

$headers = @{
    "x-api-key" = $apiKey
    "anthropic-version" = "2023-06-01"
    "content-type" = "application/json"
}

$body = @{
    model = "claude-sonnet-4-20250514"
    max_tokens = 1024
    messages = @(
        @{
            role = "user"
            content = "Hello, world"
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "🚀 Testing Claude API..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "https://api.anthropic.com/v1/messages" `
                                  -Method POST `
                                  -Headers $headers `
                                  -Body $body
    
    Write-Host "✅ Success!" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
