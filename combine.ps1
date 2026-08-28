$files = Get-ChildItem -Path C:\Desarrollo\Farmacia -Include *.ts,*.tsx,*.prisma -Recurse | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "\.next" -and $_.FullName -notmatch "\.git" }
$outputFile = "C:\Desarrollo\Farmacia\codigo_completo.txt"
Clear-Content $outputFile -ErrorAction SilentlyContinue

foreach ($file in $files) {
    Add-Content -Path $outputFile -Value "`n--- Archivo: $($file.FullName) ---`n"
    Get-Content $file.FullName | Add-Content -Path $outputFile
}
