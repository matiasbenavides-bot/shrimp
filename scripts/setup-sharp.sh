#!/bin/bash
# ---------------------------------------------------------------------------
# Deja listo el binario nativo de sharp (dependencia de @capacitor/assets, que
# genera los iconos y el splash de Android).
#
# Por qué hace falta esto: el instalador de sharp descarga su libvips desde
# GitHub releases y en este entorno da "Installation error: Request timed out"
# (aunque curl baja el mismo fichero a 7,5 MB/s). Además, su plan B (compilar
# desde código fuente) falla por un '..' de más en su binding.gyp.
#
# Uso:  bash scripts/setup-sharp.sh
# ---------------------------------------------------------------------------
set -u
cd "$(dirname "$0")/.." || exit 1
export PATH="/root/.local/bin:$PATH"

V=8.14.5                 # versión de libvips que espera sharp 0.32.6
PLAT=linux-arm64v8
TAR="libvips-$V-$PLAT.tar.br"
PREBUILDS=/root/.cache/sharp-prebuilds
DIR="$PREBUILDS/v$V"
SHARP=node_modules/.pnpm/sharp@0.32.6/node_modules/sharp

echo "### [1/3] bajar libvips con curl (el descargador de sharp se rinde) ###"
mkdir -p "$DIR"
if [ -f "$DIR/$TAR" ] && [ "$(stat -c%s "$DIR/$TAR")" -gt 1000000 ]; then
  echo "ya está descargado: $DIR/$TAR"
else
  curl -fL --retry 3 --max-time 300 -o "$DIR/$TAR" \
    "https://github.com/lovell/sharp-libvips/releases/download/v$V/$TAR"
  echo "curl_exit=$?"
fi

echo
echo "### [2/3] corregir el binding.gyp de sharp (le sobra un '..') ###"
if [ -f "$SHARP/binding.gyp" ]; then
  python3 - "$SHARP/binding.gyp" <<'PY'
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
bad = "'library_dirs': ['../<(sharp_vendor_dir)/lib']"
if bad in s:
    s = s.replace(bad, "'library_dirs': ['<(sharp_vendor_dir)/lib']")
    open(p, 'w', encoding='utf-8').write(s)
    print("binding.gyp corregido (el '..' apuntaba a node_modules/vendor, que no existe)")
else:
    print("binding.gyp ya estaba corregido")
PY
else
  echo "AVISO: no existe $SHARP (¿sharp sin instalar o en otra versión?)"
fi

echo
echo "### [3/3] compilar el binding usando el prebuild local ###"
npm_config_sharp_libvips_local_prebuilds="$PREBUILDS" pnpm rebuild sharp
echo "rebuild_exit=$?"

echo
echo "### verificación funcional ###"
node -e "
const sharp = require('./$SHARP');
sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 9, g: 180, b: 120, alpha: 1 } } })
  .png().toBuffer()
  .then(async (b) => {
    const m = await sharp(b).metadata();
    console.log('sharp ' + require('./$SHARP/package.json').version + ' · libvips ' + sharp.versions.vips + ' · ' + m.width + 'x' + m.height + ' ' + m.format + ' ✅');
  })
  .catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
"
