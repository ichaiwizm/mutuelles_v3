import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import Dashboard from './pages/Dashboard'
import Platforms from './pages/Platforms'
import Profiles from './pages/Profiles'
import Credentials from './pages/Credentials'
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
      { path: 'platforms', element: <Platforms /> },
      { path: 'profiles', element: <Profiles /> },
      { path: 'credentials', element: <Credentials /> },
      { path: 'flows', element: <Flows /> },
      { path: 'leads', element: <Leads /> },
      { path: 'admin', element: <Admin /> },

    ]
  }
])

const root = createRoot(document.getElementById('root')!)
root.render(<RouterProvider router={router} />)
