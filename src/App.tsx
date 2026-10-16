import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { TodayPage } from './pages/TodayPage'
import { HabitsPage } from './pages/HabitsPage'
import { HabitDetailPage } from './pages/HabitDetailPage'
import { ProgressPage } from './pages/ProgressPage'
import { SettingsPage } from './pages/SettingsPage'
import { useSettings } from './store/settings'
import { useThemeEffect } from './store/theme'
import { seedIfEmpty } from './db/repo'

export default function App() {
  const ready = useSettings((s) => s.ready)
  const hydrate = useSettings((s) => s.hydrate)
  useThemeEffect()

  useEffect(() => {
    void (async () => {
      await seedIfEmpty()
      await hydrate()
    })()
  }, [hydrate])

  if (!ready) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <span className="animate-pulse text-4xl">🦐</span>
        <p className="text-sm text-slate-500">Cargando tus hábitos…</p>
      </div>
    )
  }

  return (
    <HashRouter>
      <div className="mx-auto flex min-h-full max-w-md flex-col">
        <main className="safe-top flex-1 pb-24">
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/habitos" element={<HabitsPage />} />
            <Route path="/habitos/:id" element={<HabitDetailPage />} />
            <Route path="/progreso" element={<ProgressPage />} />
            <Route path="/ajustes" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </HashRouter>
  )
}
