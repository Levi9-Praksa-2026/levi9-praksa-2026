import { Link, Outlet } from 'react-router'
import { externalDocuments } from '@/shared/config/routes'
import { LinkProvider, type AppLinkProps } from '@/shared/ui/Link'

/** Shared UI links (buttons, nav, footer) go through the router, except links to another document. */
function RouterLink({ href, ...rest }: AppLinkProps) {
  // the link text arrives in rest.children, which the rule cannot see
  // oxlint-disable-next-line jsx-a11y/anchor-has-content
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
