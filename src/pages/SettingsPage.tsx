import { useState } from 'react'
import { Copy, Database, Download, Moon, Sun, Trash2, Upload } from 'lucide-react'
import { useSettings } from '../store/settings'
import { exportBackup, importBackup, wipeAll } from '../lib/backup'
import { useAllEntries, useAllHabits } from '../hooks/useShrimp'

export function SettingsPage() {
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)
  const habits = useAllHabits()
  const entries = useAllEntries()

  const [text, setText] = useState('')
  const [status, setStatus] = useState('')
  const [confirmWipe, setConfirmWipe] = useState(false)

  const generate = async (): Promise<void> => {
    const json = await exportBackup(settings)
    setText(json)
    setStatus('Backup generado. Cópialo o guárdalo.')
  }

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      setStatus('Copiado al portapapeles ✅')
    } catch {
      setStatus('No se pudo copiar automáticamente: selecciona el texto y cópialo a mano.')
    }
  }

  const download = async (): Promise<void> => {
    const json = text || (await exportBackup(settings))
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shrimp-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatus('Si tu navegador lo permite, se ha descargado el archivo.')
  }

  const runImport = async (): Promise<void> => {
    try {
      const res = await importBackup(text)
      setStatus(`Importado: ${res.habits} hábitos y ${res.entries} registros.`)
      setText('')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'No se pudo importar.')
    }
  }

  return (
    <div className="px-4 pt-3 pb-6">
      <header className="mb-4">
        <h1 className="text-xl font-bold">Ajustes</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {habits?.length ?? 0} hábitos · {entries.length} registros guardados en este móvil
        </p>
      </header>

      <section className="mb-4 flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aspecto</h2>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: 'light', label: 'Claro', icon: <Sun size={16} /> },
              { value: 'dark', label: 'Oscuro', icon: <Moon size={16} /> },
              { value: 'system', label: 'Auto', icon: <Sun size={16} /> },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => void update('theme', opt.value)}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                settings.theme === opt.value
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-sm">La semana empieza en</span>
          <div className="flex gap-2">
            {(
              [
                { value: 1 as const, label: 'Lunes' },
                { value: 0 as const, label: 'Domingo' },
              ]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => void update('weekStart', opt.value)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  settings.weekStart === opt.value
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">Mostrar los hábitos ya cumplidos en «Hoy»</span>
          <input
            type="checkbox"
            checked={settings.showCompleted}
            onChange={(e) => void update('showCompleted', e.target.checked)}
            className="h-6 w-11 shrink-0 appearance-none rounded-full bg-slate-300 transition-colors checked:bg-emerald-500 dark:bg-slate-700"
          />
        </label>
      </section>

      <section className="mb-4 flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Database size={14} /> Tus datos (backup / restaurar)
        </h2>
        <p className="text-xs text-slate-500">
          Todo vive en este móvil. Haz un backup de vez en cuando: es un texto JSON con tus hábitos y
          todo tu historial.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void generate()}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold dark:bg-slate-800"
          >
            <Download size={16} /> Generar backup
          </button>
          <button
            type="button"
            onClick={() => void copy()}
            disabled={!text}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold disabled:opacity-40 dark:bg-slate-800"
          >
            <Copy size={16} /> Copiar
          </button>
          <button
            type="button"
            onClick={() => void download()}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold dark:bg-slate-800"
          >
            <Download size={16} /> Guardar archivo
          </button>
          <button
            type="button"
            onClick={() => void runImport()}
            disabled={!text.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
          >
            <Upload size={16} /> Importar
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          spellCheck={false}
          placeholder="Pega aquí un backup para importarlo (reemplaza los datos actuales)…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
        />

        {status ? <p className="text-xs text-emerald-600 dark:text-emerald-400">{status}</p> : null}
      </section>

      <section className="mb-4 flex flex-col gap-3 rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:ring-rose-900">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
          Zona peligrosa
        </h2>
        <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
          Borra todos los hábitos y todo el historial de este móvil. No se puede deshacer.
        </p>
        {confirmWipe ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await wipeAll()
                setConfirmWipe(false)
                setStatus('Todos los datos han sido borrados.')
              }}
              className="flex-1 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white"
            >
              Sí, borrar todo
            </button>
            <button
              type="button"
              onClick={() => setConfirmWipe(false)}
              className="flex-1 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold dark:bg-slate-900"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmWipe(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white"
          >
            <Trash2 size={16} /> Borrar todos los datos
          </button>
        )}
      </section>

      <footer className="px-1 text-center text-xs text-slate-400">
        <p className="text-2xl">🦐</p>
        <p className="font-semibold">Shrimp 0.1.0</p>
        <p>App de hábitos offline · sin cuentas, sin nube, sin anuncios</p>
      </footer>
    </div>
  )
}
