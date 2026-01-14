// src/routes/index.tsx
import {createFileRoute, redirect} from '@tanstack/react-router'
import {Header} from "@/components/Header.tsx";


export const Route = createFileRoute('/')({
    beforeLoad: () => {
        throw redirect({to:  '/trades'})
    }
})
