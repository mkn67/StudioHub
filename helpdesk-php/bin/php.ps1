$ErrorActionPreference = 'Stop'
$moduleRoot = Split-Path -Parent $PSScriptRoot
$phpCommand = Get-Command php -ErrorAction SilentlyContinue
if ($phpCommand) {
    & $phpCommand.Source @args
} else {
    $portablePhp = Join-Path $moduleRoot '.runtime/php/php.exe'
    $portableIni = Join-Path $moduleRoot '.runtime/php.ini'
    if (-not (Test-Path -LiteralPath $portablePhp)) {
        throw 'PHP >=8.2 is required. Install/select PHP with curl, mbstring and PDO SQLite or MySQL; see README.md.'
    }
    & $portablePhp -c $portableIni @args
}
exit $LASTEXITCODE
