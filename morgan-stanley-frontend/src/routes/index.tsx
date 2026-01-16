// Note that this file is just re-directing to /trades for now since no user sign-in process.
// If user management is implemented, this would re-direct to a login.tsx page instead if unauthenticated.

import {createFileRoute, redirect} from '@tanstack/react-router'

export const Route = createFileRoute('/')({
    beforeLoad: () => {
        throw redirect({to:  '/trades'})
    }
})
