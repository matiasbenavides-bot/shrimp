#!/bin/bash
# Rasteriza los SVG de design/ a los PNG que espera @capacitor/assets en assets/.
# Nombres y tamaños son los que exige la herramienta (no inventar).
set -eu
cd "$(dirname "$0")/.." || exit 1
mkdir -p assets

conv() { # svg  png  tamaño
  rsvg-convert -w "$3" -h "$3" "design/$1" -o "assets/$2"
  printf '%-28s -> assets/%-24s %sx%s\n' "design/$1" "$2" "$3" "$3"
}

conv icon.svg            icon.png            1024
conv icon-foreground.svg icon-foreground.png 1024
conv icon-background.svg icon-background.png 1024
conv splash.svg          splash.png          2732

echo
echo "--- resultado ---"
ls -la assets/
