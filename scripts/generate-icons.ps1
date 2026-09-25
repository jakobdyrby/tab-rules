Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '../icons'
New-Item -ItemType Directory -Force -Path $iconDirectory | Out-Null

function Fill-RoundedRect($graphics, $hex, $x, $y, $width, $height, $radius) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = $radius * 2
    $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
    $path.AddArc(($x + $width - $diameter), $y, $diameter, $diameter, 270, 90)
    $path.AddArc(($x + $width - $diameter), ($y + $height - $diameter), $diameter, $diameter, 0, 90)
    $path.AddArc($x, ($y + $height - $diameter), $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($hex))
    $graphics.FillPath($brush, $path)
    $brush.Dispose()
    $path.Dispose()
}

$source = [System.Drawing.Bitmap]::new(512, 512)
$graphics = [System.Drawing.Graphics]::FromImage($source)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.ScaleTransform(4, 4)
Fill-RoundedRect $graphics '#236348' 4 4 120 120 27
# Three overlapping browser tabs, grouped into a single foreground window.
Fill-RoundedRect $graphics '#86B7DD' 51 24 49 56 8
Fill-RoundedRect $graphics '#B5D3A0' 36 35 57 57 8
Fill-RoundedRect $graphics '#F5F8ED' 23 47 70 57 9
Fill-RoundedRect $graphics '#F5F8ED' 23 40 32 24 7
Fill-RoundedRect $graphics '#236348' 34 64 47 7 3
Fill-RoundedRect $graphics '#7CA28B' 34 79 31 7 3
$graphics.Dispose()
foreach ($size in @(16, 32, 48, 128)) {
    $icon = [System.Drawing.Bitmap]::new($size, $size)
    $canvas = [System.Drawing.Graphics]::FromImage($icon)
    $canvas.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $canvas.DrawImage($source, 0, 0, $size, $size)
    $icon.Save((Join-Path $iconDirectory "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
    $icon.Dispose()
}
$source.Dispose()
