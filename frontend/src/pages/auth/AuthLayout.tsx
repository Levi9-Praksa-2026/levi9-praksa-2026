import { Outlet } from 'react-router'
import { routes } from '@/shared/config/routes'
import { Brand } from '@/shared/ui/Brand'

/**
 * The frame of the sign-in and sign-up pages, outside the forum's frame: white, the brand and one narrow
 * column centred in the window, and two illustrations fixed to the bottom corners. The illustrations stay
 * on the window's bottom edge however long the form is; the column is white and sits above them, so where
 * the two meet the form stays readable. They are left out under 768px wide or 600px tall, where they would
 * sit behind the form.
 */
export function AuthLayout() {
  return (
    <div className="relative flex min-h-svh flex-col bg-white">
      <div className="pointer-events-none fixed inset-x-0 bottom-0 hidden md:block [@media(max-height:599px)]:hidden" aria-hidden="true">
        {/* both scale with the window: about a quarter of its width each, within fixed limits */}
        <img
          src="/auth/team-left.webp"
          alt=""
          width={699}
          height={465}
          decoding="async"
          className="absolute bottom-0 left-0 h-auto w-[clamp(220px,27vw,460px)]"
        />
        <img
          src="/auth/team-right.webp"
          alt=""
          width={671}
          height={459}
          decoding="async"
          className="absolute right-0 bottom-0 h-auto w-[clamp(220px,26vw,450px)]"
        />
      </div>

      <main className="relative m-auto w-full max-w-form px-gut py-10 md:box-content md:rounded-lg md:bg-white md:px-8">
        <div className="mb-8 flex justify-center">
          <Brand
            name="Levddit"
            href={routes.home}
            mark={<img className="size-8 rounded-sm" src="/brand/levi9-mark.png" alt="" width={32} height={32} />}
            className="text-ink"
          />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
