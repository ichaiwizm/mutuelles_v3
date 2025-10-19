import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import Dashboard from './pages/Dashboard'
import Config from './pages/Config'
import Leads from './pages/Leads'
import Admin from './pages/Admin'
import AutomationV3 from './pages/AutomationV3'
import './styles.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'config', element: <Config /> },
      { path: 'leads', element: <Leads /> },
      { path: 'admin', element: <Admin /> },
      { path: 'automation', element: <AutomationV3 /> }
    ]
  }
])

const root = createRoot(document.getElementById('root')!)
root.render(<RouterProvider router={router} />)
