param(
    [Parameter(Mandatory = $true)]
    [string] $FrontendUrl,

    [Parameter(Mandatory = $true)]
    [string] $ApiUrl,

    [int] $TimeoutSec = 15
)

$ErrorActionPreference = 'Stop'

function Test-HttpEndpoint {
    param(
        [string] $Name,
        [string] $Url,
        [int] $TimeoutSec
    )

    $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec $TimeoutSec -MaximumRedirection 5

    if ($response.StatusCode -ge 400) {
        throw "$Name returned HTTP $($response.StatusCode): $Url"
    }

    Write-Host "$Name OK: HTTP $($response.StatusCode) $Url"
}

$frontend = $FrontendUrl.TrimEnd('/')
$api = $ApiUrl.TrimEnd('/')

Test-HttpEndpoint -Name 'Frontend' -Url $frontend -TimeoutSec $TimeoutSec
Test-HttpEndpoint -Name 'API health' -Url "$api/up" -TimeoutSec $TimeoutSec

Write-Host 'Production smoke endpoints passed.'
