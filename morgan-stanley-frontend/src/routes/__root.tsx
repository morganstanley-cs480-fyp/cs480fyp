// src/routes/__root.tsx
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Header } from '@/components/Header'
import {TanStackRouterDevtools} from "@tanstack/react-router-devtools";

export const Route = createRootRoute({
    component: () => (
        <>
            <Header/>
            <Outlet />
            <TanStackRouterDevtools />
        </>
    ),
})
