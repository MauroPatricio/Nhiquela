$apps = @("nhiquela", "nhiquelaseller", "Nhiquela_Driver_V1.0.0", "nhiquelaShopper")

foreach ($app in $apps) {
    Write-Host "========================================="
    Write-Host "Running tests for $app..."
    Write-Host "========================================="
    
    Set-Location "d:\Projectos\Nhiquela\$app"
    
    # Run tests and capture output
    try {
        npm run test -- --passWithNoTests
    } catch {
        Write-Host "Tests failed for $app."
    }
    
    Write-Host "`n"
}
Write-Host "ALL TESTS FINISHED!"
