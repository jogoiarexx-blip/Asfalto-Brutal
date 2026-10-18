# Pequeno servidor HTTP com TcpListener (sem Python, Node.js ou privilegios de administrador).
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$listener = $null
$port = 8765
while ($port -le 8790 -and $null -eq $listener) {
  try {
    $candidate = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
    $candidate.Start()
    $listener = $candidate
  } catch { $port++ }
}
if ($null -eq $listener) { throw 'Nenhuma porta disponivel entre 8765 e 8790.' }
$url = "http://127.0.0.1:$port/"
Write-Host "ASFALTO BRUTAL - servidor ativo: $url" -ForegroundColor Green
Write-Host 'Mantenha esta janela aberta. Ctrl+C encerra.'
Start-Process $url
$mime = @{'.html'='text/html; charset=utf-8';'.js'='text/javascript; charset=utf-8';'.css'='text/css; charset=utf-8';'.svg'='image/svg+xml';'.json'='application/json; charset=utf-8';'.png'='image/png';'.jpg'='image/jpeg';'.ico'='image/x-icon'}
$enc = [System.Text.Encoding]::ASCII
try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 5000
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, $enc, $false, 1024, $true)
      $request = $reader.ReadLine()
      while ($true) { $line = $reader.ReadLine(); if ($null -eq $line -or $line.Length -eq 0) { break } }
      $status = '200 OK'
      $body = [byte[]]@()
      $type = 'text/plain; charset=utf-8'
      if ($request -match '^(GET|HEAD)\s+(/\S*)\s+HTTP/') {
        $path = ($Matches[2] -split '\?')[0]
        $relative = [System.Uri]::UnescapeDataString($path.TrimStart('/'))
        if (-not $relative) { $relative = 'index.html' }
        $target = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $relative.Replace('/', '\')))
        if ($target.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -and [System.IO.File]::Exists($target)) {
          $body = [System.IO.File]::ReadAllBytes($target)
          $extension = [System.IO.Path]::GetExtension($target).ToLowerInvariant()
          if ($mime.ContainsKey($extension)) { $type = $mime[$extension] } else { $type = 'application/octet-stream' }
        } else { $status = '404 Not Found'; $body = $enc.GetBytes('Not found') }
      } else { $status = '400 Bad Request'; $body = $enc.GetBytes('Bad request') }
      $header = "HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`n`r`n"
      $bytes = $enc.GetBytes($header)
      $stream.Write($bytes, 0, $bytes.Length)
      if ($request -notmatch '^HEAD' -and $body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
      $stream.Flush()
    } catch {
      Write-Host "Aviso na conexao: $($_.Exception.Message)"
    } finally { $client.Close() }
  }
} finally { $listener.Stop() }
