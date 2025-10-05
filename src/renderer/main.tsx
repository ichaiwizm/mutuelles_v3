import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import Dashboard from './pages/Dashboard'
import Config from './pages/Config'
import Flows from './pages/Flows'
import Leads from './pages/Leads'
import Admin from './pages/Admin'
import './styles.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'config', element: <Config /> },
      { path: 'flows', element: <Flows /> },
      { path: 'leads', element: <Leads /> },
      { path: 'admin', element: <Admin /> }
    ]
  }
])

const root = createRoot(document.getElementById('root')!)
root.render(<RouterProvider router={router} />)
