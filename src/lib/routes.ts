export const APP_ROUTES = {
  user: '/user/ef99d130-afc1-475d-9fd3-0120f69f6bdd',
  adminLogin: '/admin/login/4fd4f326-2efa-489e-96f5-ba824cb6ed0f',
  adminDashboard: '/admin/dashboard/8984f7d0-62ed-47a4-b501-51bdb17cf452',
  adminData: '/admin/data/69626d18-f31e-46bf-9520-f28ab8a3fe23',
  adminProcess: '/admin/proses/08997c15-cd26-41bc-8d96-aa18bad3b5a0',
  adminChatbot: '/admin/chatbot/d38228c1-843a-4f1c-b7d0-df9e70009315',
} as const

const ROUTE_GUARDS = Object.values(APP_ROUTES).map((route) => ({
  prefix: route.slice(0, route.lastIndexOf('/')),
  canonicalRoute: route,
}))

export function getCanonicalAppRoute(pathname: string): string | undefined {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  const matchingGuard = ROUTE_GUARDS.find(
    ({ prefix }) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
  )

  return matchingGuard?.canonicalRoute
}
