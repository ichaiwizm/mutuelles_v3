import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Home, Building2, UserCog, KeyRound, Users } from 'lucide-react'
import ThemeToggle from './components/ThemeToggle'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './contexts/ToastContext'

const nav = [
  { to: '/dashboard', label: 'Tableau de bord', icon: Home },
  { to: '/platforms', label: 'Plateformes', icon: Building2 },
  { to: '/profiles', label: 'Profils Chrome', icon: UserCog },
  { to: '/credentials', label: 'Identifiants', icon: KeyRound },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/flows', label: 'Flux (Dev)', icon: KeyRound },
  { to: '/admin', label: 'Admin (JSON Flows)', icon: KeyRound },
]

export default function App() {
  const [version, setVersion] = useState('')
  const { pathname } = useLocation()

  useEffect(() => {
    window.api.getVersion().then(setVersion)
  }, [])

  return (
    <ToastProvider>
      <div className="h-screen w-screen grid grid-cols-[240px_1fr] grid-rows-[48px_1fr] bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
        <header className="col-span-2 row-[1] flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="font-semibold">Mutuelles</div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="text-sm text-neutral-500">v{version} · {pathname}</div>
          </div>
        </header>
        <aside className="row-[2] border-r border-neutral-200 dark:border-neutral-800 p-2">
          <nav className="space-y-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-neutral-200/70 dark:hover:bg-neutral-800/70 ${
                    isActive ? 'bg-neutral-200 dark:bg-neutral-800' : ''
                  }`
                }
              >
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="row-[2] p-4 overflow-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </ToastProvider>
  )
}
