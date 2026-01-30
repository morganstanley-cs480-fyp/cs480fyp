import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // Always redirect to login, it will handle auth check
    throw redirect({ to: '/login' })
  }
})