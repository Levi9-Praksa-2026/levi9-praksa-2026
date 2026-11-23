import { Link, Outlet } from 'react-router'
import { externalDocuments } from '@/shared/config/routes'
import { LinkProvider, type AppLinkProps } from '@/shared/ui/Link'

/** Shared UI links (buttons, nav, footer) go through the router, except links to another document. */
function RouterLink({ href, ...rest }: AppLinkProps) {
  if (/^[a-z]+:/i.test(href) || externalDocuments.some(path => href.startsWith(path))) return <a href={href} {...rest} />
  return <Link to={href} {...rest} />
}

/** Wraps every route: shared links (buttons, nav) go through the router. */
export function RootLayout() {
  return (
    <LinkProvider component={RouterLink}>
      <Outlet />
    </LinkProvider>
  )
}
