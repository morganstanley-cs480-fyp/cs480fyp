// Note that this file is just re-directing to /trades for now since no user sign-in process.
// If user management is implemented, this would direct to login page instead.

import {createFileRoute, redirect} from '@tanstack/react-router'

export const Route = createFileRoute('/')({
    beforeLoad: () => {
        throw redirect({to:  '/trades'})
    }
})
