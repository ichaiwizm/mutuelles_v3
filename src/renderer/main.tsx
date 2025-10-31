import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import BrokerDashboard from './pages/BrokerDashboard'
import Credentials from './pages/Credentials'
import './styles.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <BrokerDashboard /> },
      { path: 'broker', element: <BrokerDashboard /> },
      { path: 'credentials', element: <Credentials /> }
    ]
  }
])

const root = createRoot(document.getElementById('root')!)
root.render(<RouterProvider router={router} />)
