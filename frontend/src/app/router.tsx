import { createBrowserRouter } from 'react-router'
import { routes } from '@/shared/config/routes'
import { HomePage } from '@/pages/home/HomePage'
import { AuthPage } from '@/pages/auth/AuthPage'
import { NotFoundPage } from '@/pages/not-found/NotFoundPage'
import { RootLayout } from './RootLayout'

/** The forum's route table. New screens (l/:community, post/:id, …) are added here. */
export const router = createBrowserRouter([
  {
    path: routes.home,
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: routes.login, element: <AuthPage mode="login" /> },
      { path: routes.register, element: <AuthPage mode="register" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
