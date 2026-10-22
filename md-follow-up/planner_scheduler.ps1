param([ValidateSet('Install','Run','Remove')][string]$Action='Install',[int]$EveryMinutes=240)
$ErrorActionPreference='Stop'
$Root=Split-Path -Parent $MyInvocation.MyCommand.Path
$Task='MD-FollowUp-Planner-Refresh'
if($Action -eq 'Remove'){
 Unregister-ScheduledTask -TaskName $Task -Confirm:$false -ErrorAction SilentlyContinue
 Write-Output 'PLANNER_REFRESH_SCHEDULE_REMOVED'
 exit 0
}
$Python=(Get-Command py).Source
$Script=Join-Path $Root 'scan_planner_graph.py'
if(!(Test-Path $Script)){throw 'PLANNER_SCANNER_NOT_INSTALLED'}
$Arguments="-3 `"$Script`""
if($Action -eq 'Run'){
 & $Python -3 $Script
 exit $LASTEXITCODE
}
if($EveryMinutes -lt 120){throw 'Minimum source-scan interval is 30 minutes'}
$Start=(Get-Date).AddMinutes(20)
$Trigger=New-ScheduledTaskTrigger -Once -At $Start -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) -RepetitionDuration (New-TimeSpan -Days 365)
$TaskAction=New-ScheduledTaskAction -Execute $Python -Argument $Arguments -WorkingDirectory $Root
$Settings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5)
$Principal=New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $Task -Action $TaskAction -Trigger $Trigger -Settings $Settings -Principal $Principal -Description 'Read-only Microsoft Planner Graph sync to authorized NB private MD Pivot; publish aggregate health only.' -Force |Out-Null
$info=Get-ScheduledTaskInfo -TaskName $Task
Write-Output ('PLANNER_SCHEDULE_READY '+$Task+' next='+$info.NextRunTime)
