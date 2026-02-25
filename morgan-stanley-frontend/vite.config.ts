import path from "path"
import tailwindcss from "@tailwindcss/vite"
import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {tanstackRouter} from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
        routeFileIgnorePattern: '(test|spec)\\.(ts|tsx)$',
    }), react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        headers: {
            'Cache-Control': 'no-store',
        },
    },
})