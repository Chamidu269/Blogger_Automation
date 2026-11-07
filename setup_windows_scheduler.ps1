# Run this script in PowerShell to register a daily task in Windows Task Scheduler
$TaskName = "BloggerDailyRecipePublisher"
$ScriptPath = "$PSScriptRoot\run_daily_10.bat"
$Time = "09:00AM"

Write-Host "Registering Windows Task: $TaskName to run every day at $Time..." -ForegroundColor Cyan

# Remove previous if exists
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$Action = New-ScheduledTaskAction -Execute $ScriptPath
$Trigger = New-ScheduledTaskTrigger -Daily -At $Time
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Automatically publishes 10 recipe drafts to Blogger daily"

Write-Host "`nTask '$TaskName' registered successfully!" -ForegroundColor Green
Write-Host "It will automatically run every day at $Time and publish 10 recipe drafts to Blogger."
Write-Host "To view or change the schedule, open 'Task Scheduler' from your Windows Start Menu."
