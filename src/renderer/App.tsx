import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Home, KeyRound } from 'lucide-react'
// Minimal shell for Broker v2

const nav = [
  { to: '/broker', label: 'Broker v2', icon: Home },
  { to: '/credentials', label: 'Identifiants', icon: KeyRound },
]

export default function App() {
  const [version, setVersion] = useState('')
  const { pathname } = useLocation()

  useEffect(() => {
    window.api.getVersion().then(setVersion)
  }, [])

  return (
    <div className="h-screen w-screen grid grid-cols-[220px_1fr] grid-rows-[44px_1fr] bg-neutral-50 text-neutral-900">
      <header className="col-span-2 row-[1] flex items-center justify-between px-4 border-b border-neutral-200">
        <div className="font-semibold">Broker-Automation v2</div>
        <div className="text-sm text-neutral-500">v{version} · {pathname}</div>
      </header>
      <aside className="row-[2] border-r border-neutral-200 p-2">
        <nav className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-neutral-200 ${
                    isActive ? 'bg-neutral-200' : ''
                  }`
                }
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>
      <main className="row-[2] p-4 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
