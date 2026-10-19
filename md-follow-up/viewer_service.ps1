param([ValidateSet('Install','Start','Remove','Status')][string]$Mode='Status')
$ErrorActionPreference='Stop'
$TaskName='MD-FollowUp-Private-Viewer'
$Root=Split-Path -Parent $MyInvocation.MyCommand.Path
$Script=Join-Path $Root 'serve_private.py'
if($Mode -eq 'Remove'){Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue;Write-Output 'VIEWER_TASK_REMOVED';exit 0}
if($Mode -eq 'Install'){
 $py=(Get-Command py).Source
 $user=[Security.Principal.WindowsIdentity]::GetCurrent().Name
 $trigger=New-ScheduledTaskTrigger -AtLogOn -User $user
 $taskAction=New-ScheduledTaskAction -Execute $py -Argument ('-3 "'+$Script+'"') -WorkingDirectory $Root
 $principal=New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
 $settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero)
 Register-ScheduledTask -TaskName $TaskName -Action $taskAction -Trigger $trigger -Settings $settings -Principal $principal -Force|Out-Null
 Write-Output 'VIEWER_TASK_INSTALLED'
}
if($Mode -in @('Start','Install')){
 Start-ScheduledTask -TaskName $TaskName
 Start-Sleep -Seconds 2
}
$task=Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if($task){Write-Output ('VIEWER_TASK_STATE='+$task.State)}
try{$r=Invoke-WebRequest -Uri 'http://127.0.0.1:8766/?source=cb' -UseBasicParsing -TimeoutSec 5;Write-Output ('VIEWER_HTTP='+$r.StatusCode)}catch{Write-Output ('VIEWER_ERROR='+$_.Exception.Message)}
