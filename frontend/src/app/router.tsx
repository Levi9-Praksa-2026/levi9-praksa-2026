import { createBrowserRouter } from 'react-router'
import { COMMUNITY_PATTERN, routes } from '@/shared/config/routes'
import { HomePage } from '@/pages/home/HomePage'
import { CommunityPage } from '@/pages/community/CommunityPage'
import { AuthPage } from '@/pages/auth/AuthPage'
import { NotFoundPage } from '@/pages/not-found/NotFoundPage'
import { ForumLayout } from './shell/ForumLayout'
import { RootLayout } from './RootLayout'

/** The forum's route table. Forum screens render inside ForumLayout; login and register have their own frame. */
export const router = createBrowserRouter([
  {
    path: routes.home,
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        element: <ForumLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: COMMUNITY_PATTERN, element: <CommunityPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      { path: routes.login, element: <AuthPage mode="login" /> },
      { path: routes.register, element: <AuthPage mode="register" /> },
    ],
  },
])
