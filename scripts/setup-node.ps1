$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$version = (Get-Content (Join-Path $root '.node-version') -Raw).Trim()
if ($version -notmatch '^24\.\d+\.\d+$') {
    throw 'Expected a Node 24 version in .node-version.'
}
$arch = switch ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()) {
    'X64' { 'x64' }
    'Arm64' { 'arm64' }
    default { throw 'This setup supports Windows x64 and ARM64.' }
}
$tools = Join-Path $root '.tools'
$runtime = Join-Path $tools "node-v$version-win-$arch"
$node = Join-Path $runtime 'node.exe'
if (Test-Path $node) {
    $installedVersion = & $node --version
    if ($LASTEXITCODE -eq 0 -and $installedVersion -eq "v$version") {
        Write-Host "Project Node $installedVersion is ready. Use .\npm.cmd install or .\npm.cmd run dev."
        exit 0
    }
}
New-Item -ItemType Directory -Force -Path $tools | Out-Null
$filename = "node-v$version-win-$arch.zip"
$archive = Join-Path $tools $filename
$baseUrl = "https://nodejs.org/dist/v$version"
Write-Host "Downloading project-local Node $version ($arch)..."
Invoke-WebRequest "$baseUrl/$filename" -OutFile $archive
$checksums = (Invoke-WebRequest "$baseUrl/SHASUMS256.txt").Content
$checksumLine = $checksums -split "`n" | Where-Object { $_.Trim().EndsWith("  $filename") }
if (-not $checksumLine) { throw "No official checksum found for $filename." }
$expected = ($checksumLine.Trim() -split '\s+')[0]
if ((Get-FileHash $archive -Algorithm SHA256).Hash -ne $expected) {
    Remove-Item $archive
    throw 'Node download checksum mismatch.'
}
Expand-Archive -Path $archive -DestinationPath $tools -Force
Remove-Item $archive
& $node --version
if ($LASTEXITCODE -ne 0) { throw 'Project Node verification failed.' }
Write-Host 'Ready. Use .\npm.cmd install or .\npm.cmd run dev.'
