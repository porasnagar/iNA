import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
  useRouterState,
} from "@tanstack/react-router";
import { MotionConfig, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { REPO } from "@/components/ina/brand";
import { InaLogo } from "@/components/ina/InaLogo";
import { SOFT_SPRING } from "@/components/ina/site/motion";
import { OpenSourceBadge } from "@/components/ina/site/OpenSourceBadge";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "google-site-verification", content: "lnPAi2PoayzbxFRjDYMxpimX6YLq1HK35posvdzIHL4" },
      { name: "theme-color", content: "#111114" },
      { title: "iNA — Universal Apple Hardware Interoperability Suite for Android" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "iNA" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@300..800&family=Geist+Mono:wght@400..600&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/simulator", label: "Simulator" },
  { to: "/architecture", label: "Architecture" },
  { to: "/hardware", label: "Hardware" },
  { to: "/source", label: "Developers" },
] as const;

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/75 backdrop-blur-xl">
      <div className="mx-auto grid h-14 max-w-7xl grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="iNA home">
          <InaLogo className="size-8 shrink-0" />
          <div className="hidden min-w-0 leading-tight sm:block">
            <div className="text-[15px] font-semibold tracking-tight">iNA</div>
            <div className="hidden truncate text-[11px] text-muted-foreground sm:block">Apple hardware, unlocked on Android</div>
          </div>
        </Link>
        <div className="flex min-w-0 items-center justify-end gap-2">
        <nav aria-label="Main" className="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="shrink-0 rounded-full px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-3.5 sm:text-sm"
              activeProps={{ className: "bg-primary/12 !text-primary", "aria-current": "page" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <OpenSourceBadge compact className="hidden lg:inline-flex" />
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex items-start gap-3">
          <InaLogo className="size-10 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold">iNA · dev.ibridge.android</div>
            <div className="text-xs text-muted-foreground">Universal Apple Hardware Interoperability Suite for Android</div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <OpenSourceBadge />
              <a href={`${REPO.url}`} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
                Released under the {REPO.license} License
              </a>
            </div>
            <p className="mt-4 max-w-md text-xs leading-relaxed text-muted-foreground">
              AirPods, Beats, Apple Watch, AirTag and HomePod are trademarks of Apple Inc. iNA is an independent project and is not affiliated with or
              endorsed by Apple.
            </p>
          </div>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <li>
              <Link to="/" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "!text-primary" }} activeOptions={{ exact: true }}>
                Home
              </Link>
            </li>
            {NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="text-muted-foreground hover:text-foreground" activeProps={{ className: "!text-primary" }}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}

/** Springs each new page in on client-side navigation (skipped on the first, server-rendered paint). */
function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  const first = useRef(true);
  useEffect(() => {
    first.current = false;
  }, []);
  return (
    <motion.div
      key={pathname}
      initial={first.current ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SOFT_SPRING}
    >
      {children}
    </motion.div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
      <div className="theme-brand min-h-screen pb-[env(safe-area-inset-bottom)]">
        <SiteHeader />
        <PageTransition>
          <Outlet />
        </PageTransition>
        <SiteFooter />
      </div>
      </MotionConfig>
      <Toaster theme="dark" position="bottom-center" />
    </QueryClientProvider>
  );
}
