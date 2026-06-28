$apps = @("nhiquela", "nhiquelaseller", "Nhiquela_Driver_V1.0.0", "nhiquelaShopper")

foreach ($app in $apps) {
    Write-Host "Running setup for $app..."
    powershell.exe -ExecutionPolicy Bypass -File .\setup_qa.ps1 -AppFolder $app
}

Write-Host "Done setting up all apps!"
