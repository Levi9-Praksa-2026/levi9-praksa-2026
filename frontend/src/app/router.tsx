import { createBrowserRouter } from 'react-router'
import { COMMUNITY_PATTERN, routes } from '@/shared/config/routes'
import { HomePage } from '@/pages/home/HomePage'
import { AdminLayout } from '@/pages/admin/AdminLayout'
import { AdminCommunitiesPage } from '@/pages/admin/AdminCommunitiesPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminPostsPage } from '@/pages/admin/AdminPostsPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { CommunitiesPage } from '@/pages/communities/CommunitiesPage'
import { CommunityPage } from '@/pages/community/CommunityPage'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { SignInPage } from '@/pages/auth/SignInPage'
import { SignUpPage } from '@/pages/auth/SignUpPage'
import { NotFoundPage } from '@/pages/not-found/NotFoundPage'
import { ForumLayout } from './shell/ForumLayout'
import { RootLayout } from './RootLayout'

/** The forum's route table. Forum screens render inside ForumLayout; sign-in and sign-up have their own frame. */
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
          {
            path: routes.admin,
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: routes.adminCommunities, element: <AdminCommunitiesPage /> },
              { path: routes.adminUsers, element: <AdminUsersPage /> },
              { path: routes.adminPosts, element: <AdminPostsPage /> },
            ],
          },
          { path: routes.communities, element: <CommunitiesPage /> },
          { path: COMMUNITY_PATTERN, element: <CommunityPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        element: <AuthLayout />,
        children: [
          { path: routes.signIn, element: <SignInPage /> },
          { path: routes.signUp, element: <SignUpPage /> },
        ],
      },
    ],
  },
])
