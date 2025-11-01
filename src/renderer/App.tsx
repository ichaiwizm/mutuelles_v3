import React from 'react'
import { Outlet } from 'react-router-dom'

export default function App() {
  return (
    <div className="h-screen w-screen bg-neutral-50 text-neutral-900">
      <Outlet />
    </div>
  )
}
