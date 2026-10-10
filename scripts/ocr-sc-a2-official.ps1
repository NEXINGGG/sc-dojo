# Windows' standard Japanese OCR is a transcription aid; source images remain authoritative.
param([string]$Directory = "$PSScriptRoot/../tmp/sc-a2-v1")
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] > $null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] > $null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] > $null
[Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime] > $null
$taskMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
function Await-Ocr($Operation, $Type) {
    $task = $taskMethod.MakeGenericMethod($Type).Invoke($null, @($Operation))
    try { $task.Wait() } catch { throw $_.Exception.ToString() }
    $task.Result
}
$language = [Windows.Globalization.Language]::new('ja-JP')
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
if (!$engine) { throw 'Japanese Windows OCR is unavailable' }
$files = Get-ChildItem -LiteralPath $Directory -Filter '*.png'
foreach ($file in $files) {
    $output = [System.IO.Path]::ChangeExtension($file.FullName, '.ocr.json')
    if (Test-Path -LiteralPath $output) { continue }
    Write-Output "Recognizing $($file.Name)"
    $storageFile = Await-Ocr ([Windows.Storage.StorageFile]::GetFileFromPathAsync($file.FullName)) ([Windows.Storage.StorageFile])
    $stream = Await-Ocr ($storageFile.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await-Ocr ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await-Ocr ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $result = Await-Ocr ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    $lines = @($result.Lines | ForEach-Object {
        $words = @($_.Words | ForEach-Object { @{ text=$_.Text; x=$_.BoundingRect.X; y=$_.BoundingRect.Y; width=$_.BoundingRect.Width; height=$_.BoundingRect.Height } })
        @{ text=$_.Text; words=$words }
    })
    @{ lines=$lines; width=$bitmap.PixelWidth; height=$bitmap.PixelHeight; text=$result.Text } |
        ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $output -Encoding UTF8
    $bitmap.Dispose(); $stream.Dispose()
    Write-Output $file.Name
}
