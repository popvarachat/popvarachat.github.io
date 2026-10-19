param([ValidateSet('Install','Run','Remove')][string]$Action='Run',[int]$EveryMinutes=60,[switch]$Publish)
$ErrorActionPreference='Stop'
$Root=Split-Path -Parent $MyInvocation.MyCommand.Path
$Config=Join-Path $Root 'refresh.config.json'
$TaskName='MD-FollowUp-Safe-Refresh'
if($Action -eq 'Remove'){Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue; Write-Output 'TASK_REMOVED';exit 0}
if(!(Test-Path $Config)){throw 'LOCAL_CONFIG_MISSING: copy refresh.config.example.json to refresh.config.json and set authorized accessible paths'}
$data=Get-Content $Config -Raw -Encoding UTF8|ConvertFrom-Json
$found=0; foreach($prop in $data.sources.PSObject.Properties){$src=[Environment]::ExpandEnvironmentVariables($prop.Value.path);if(Test-Path -LiteralPath $src -PathType Leaf){$found++}}
if($found -eq 0){throw 'NO_SOURCES_ACCESSIBLE: do not enable auto sync until authorized network/cloud sources can be read on this machine'}
$Python=(Get-Command py).Source
$arguments="-3 `"$(Join-Path $Root 'refresh_sources.py')`" --config `"$Config`" --mode auto"
if($Publish){$arguments+=' --publish'}
if($Action -eq 'Run'){$arguments=$arguments.Replace('--mode auto','--mode manual');$proc=Start-Process -FilePath $Python -ArgumentList $arguments -Wait -PassThru -NoNewWindow;exit $proc.ExitCode}
if($EveryMinutes -lt 15){throw 'Minimum interval 15 minutes for shared file load'}
$Start=(Get-Date).AddMinutes(5)
$trigger=New-ScheduledTaskTrigger -Once -At $Start -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) -RepetitionDuration (New-TimeSpan -Days 365)
$action=New-ScheduledTaskAction -Execute $Python -Argument $arguments -WorkingDirectory $Root
$settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 20) -MultipleInstances IgnoreNew
$principal=New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Read-only MD Dashboard aggregate refresh; does not include private row-level data.' -Force|Out-Null
Write-Output ('TASK_INSTALLED '+$TaskName+' every '+$EveryMinutes+' minutes sources='+$found)
