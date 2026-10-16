import { NavLink } from 'react-router-dom'
import { ChartNoAxesColumn, ListTodo, Settings, Sparkles } from 'lucide-react'

const TABS = [
  { to: '/', label: 'Hoy', icon: ListTodo, end: true },
  { to: '/habitos', label: 'Hábitos', icon: Sparkles, end: false },
  { to: '/progreso', label: 'Progreso', icon: ChartNoAxesColumn, end: false },
  { to: '/ajustes', label: 'Ajustes', icon: Settings, end: false },
]

export function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-400 dark:text-slate-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.6 : 2} />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
