import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/exceptions/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Exceptions page WIP</div>
}
