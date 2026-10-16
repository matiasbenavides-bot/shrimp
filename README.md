# 🦐 Shrimp

App de hábitos **offline, sin cuentas, sin nube, sin anuncios**. Todo tu historial vive en el propio móvil (IndexedDB).

Empaquetada como **APK Android** con Capacitor, compilada íntegramente **en el propio móvil** (arm64 + PRoot, sin root).

---

## Estado actual

| | |
|---|---|
| **APK debug** | `/root/shrimp-debug.apk` · `~/shrimp-debug.apk` (visible desde Termux nativo) |
| **Paquete** | `com.shrimp.habitos` · etiqueta **Shrimp** |
| **Compatibilidad** | Android 7.0+ (minSdk 24), targetSdk 36 (Android 16) |
| **Tamaño** | ~4,4 MB |
| **Firma** | APK Signature Scheme v2 (certificado *Android Debug*) |
| **Suite** | 48 tests pasando · typecheck limpio · lint 0/0 |

## Instalar en el móvil

```bash
# en el Termux NATIVO (fuera de PRoot):
termux-setup-storage                  # solo la primera vez: concede permiso
cp ~/shrimp-debug.apk /sdcard/Download/
```
Luego: app **Archivos → Descargas → shrimp-debug.apk → Instalar** (te pedirá permitir "instalar apps de orígenes desconocidos").

**Alternativa sin permisos de almacenamiento:** sirve la carpeta por HTTP y ábrelo en el navegador del propio móvil:
```bash
cd /root/projects/shrimp/android/app/build/outputs/apk/debug
python3 -m http.server 8080
# y en Chrome: http://localhost:8080/app-debug.apk
```

## Desarrollo

```bash
pnpm install
pnpm dev --host            # ábrelo desde el navegador del móvil: http://localhost:5173
pnpm test                  # lógica de rachas y fechas (48 tests)
pnpm run lint              # oxlint
pnpm run typecheck         # tsc -b
pnpm run setup:sharp       # deja listo el binario nativo de sharp (iconos/splash)
pnpm run icons             # genera iconos y splash de Android desde assets/
```

## Compilar el APK

```bash
pnpm run apk
# equivale a: vite build && cap sync android && cd android && ./gradlew assembleDebug
```
Salida: `android/app/build/outputs/apk/debug/app-debug.apk` (~1,5-4 min en este móvil).

### Requisitos del entorno (ya instalados)
- JDK 21, Android SDK en `/opt/android-sdk` (platform 36 + build-tools 36)
- `ANDROID_HOME` / `ANDROID_SDK_ROOT` / `JAVA_HOME` los exporta `/root/phone-perf-profile.sh`
- **aapt2 de Google (x86_64) bajo `qemu-user`**: Google no publica aapt2 para Linux arm64 y el de Debian (Android 14) no lee la tabla de recursos compacta de API 35/36. El override vive en `android/gradle.properties` → `android.aapt2FromMavenOverride=/root/.local/bin/aapt2` (wrapper que llama a `qemu-x86_64`). **El nombre del fichero debe terminar en `aapt2`**: AGP lo comprueba con `endsWith`.

## Arquitectura

```
src/
  lib/            lógica pura y testeable
    types.ts        modelo de dominio (Habit, HabitEntry, frecuencias, paleta)
    dates.ts        fechas locales (YYYY-MM-DD), semanas, rangos  … 12 tests
    streaks.ts      rachas, tasas, series, computeProgress        … 36 tests
    frequency.ts    textos humanos de cada frecuencia
    backup.ts       exportar / importar JSON, borrado total
  db/
    database.ts     esquema Dexie (índice único [habitId+date])
    repo.ts         operaciones: entries, hábitos, ajustes, seed de ejemplo
  store/
    settings.ts     Zustand (tema, inicio de semana, mostrar completados)
    theme.ts        aplica claro/oscuro/sistema al <html>
  hooks/useShrimp.ts  consultas reactivas (dexie-react-hooks)
  components/     Sheet, HabitCard, CheckButton, CounterStepper, Heatmap, HabitForm…
  pages/          TodayPage · HabitsPage · HabitDetailPage · ProgressPage · SettingsPage
```

### Decisiones que importan
- **Fechas como `YYYY-MM-DD` locales**, nunca UTC: un hábito es cosa del día del usuario. La suite fuerza `TZ=Europe/Madrid` para cazar bugs de horario de verano.
- **La lógica de rachas está aislada y testeada** (es donde fallan todas las apps de hábitos): respeta frecuencias (los días que no tocan no rompen nada), da gracia al día de hoy en curso, y en hábitos semanales cuenta semanas cumplidas, no días.
- **`HashRouter`** en vez de `BrowserRouter`: rutas que sobreviven dentro del WebView de Capacitor.
- **`base: './'`** en Vite: assets relativos, requisito para que el WebView los encuentre.
- **`@import 'tailwindcss' source(none)`** + `@source` explícitos: sin esto Tailwind escanea el bundle copiado en `android/app/src/main/assets/public/**` (416 KB de falsos candidatos) y ensucia el CSS.
- **Un registro por hábito y día** garantizado por índice único en la base de datos, no solo por código.

## Funcionalidad

- **Hábitos** con 4 frecuencias: diario · N veces por semana · días fijos · cada N días
- **Tipos**: sí/no o contador con meta y unidad (vasos, minutos, páginas…)
- **Hoy**: pendientes/hechos con anillo de progreso, emoji, color, racha
- **Detalle**: mapa de calor de 16 semanas, racha actual y mejor racha, % a 30 días, días cumplidos y **corrección del historial de los últimos 14 días**
- **Progreso**: cumplimiento por hábito a 30 días y mini-mapa de la última semana
- **Ajustes**: tema claro/oscuro/auto, inicio de semana lunes/domingo, backup/restaurar JSON, borrado total
- **Arquivar hábitos** (conserva historial) y reordenarlos

## Iconos y splash (sharp)

`@capacitor/assets` genera los iconos y el splash de Android, y depende de **sharp**, cuyo lado nativo no se instala solo en este entorno. El problema y su solución están automatizados:

```bash
pnpm run setup:sharp     # idempotente: baja libvips con curl, corrige binding.gyp,
                         # recompila (~22 s) y verifica funcionalmente
pnpm run icons           # ya se pueden generar iconos (requiere assets/icon.png etc.)
```

Dos causas independientes (ambas verificadas, no supuestas):
1. El instalador de sharp descarga libvips de GitHub releases y da `Request timed out`, aunque `curl` baja el mismo fichero a 7,5 MB/s. Se le da como *prebuild local* (`npm_config_sharp_libvips_local_prebuilds`).
2. Su plan B (`node-gyp rebuild`) falla al enlazar porque su `binding.gyp` lleva un `../` de más en la rama Linux: la ruta acaba en `node_modules/vendor/...` (inexistente) en vez de `.../sharp/vendor/...`. `pnpm rebuild` restaura el fichero original, así que el script lo corrige en cada pasada.

## Dependencias de Capacitor instaladas (inertes hasta que se usen)

| Plugin | Para qué |
|---|---|
| `@capacitor/local-notifications` | recordatorios nativos de cada hábito |
| `@capacitor/app` | botón atrás de Android y estado de la app |
| `@capacitor/status-bar` | barra de estado a juego con el tema |
| `@capacitor/haptics` | vibración al marcar un hábito |
| `@capacitor/filesystem` + `@capacitor/share` | backup a fichero real y compartirlo |
| `@capacitor/assets` (dev) | icono y splash |

## Pendiente (siguiente iteración)

- [ ] Icono y splash propios (dependencias ya listas: `pnpm run icons`)
- [ ] Notificaciones de recordatorio nativas (dep instalada, sin cablear)
- [ ] Botón atrás de Android y barra de estado a juego
- [ ] Backup a fichero real / compartir
- [ ] APK de release firmado con keystore propio
- [ ] Widget de pantalla de inicio
