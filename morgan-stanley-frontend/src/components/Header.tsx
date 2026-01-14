import {User, LayoutDashboard, Search, AlertTriangle, LogOut} from 'lucide-react';
import {Link, useRouterState} from '@tanstack/react-router';
import {Button} from './ui/button';
// import { Avatar, AvatarFallback } from './ui/avatar';
import {cn} from '../lib/utils';


const navItems = [
    {id: 'search', label: 'Trade Search', icon: Search, path: '/search'},
    {id: 'exceptions', label: "Exceptions", icon: AlertTriangle, path: '/exceptions'},
]

export const Header = () => {

    // const routerState = useRouterState();
    // const currentPath = routerState.location.pathname;

    return (
        <header className="bg-white border-b-4 border-slate-300 px-6 py-4">
            <div className="flex items-center justify-between">

                {/*Left side logo*/}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-lg"> MS </span>
                    </div>
                    <div>
                        <h2 className="text-md text-slate-700">Morgan Stanley</h2>
                        <p className="text-xs text-slate-600">OTC Clearing</p>

                    </div>

                </div>

                {/*Right side logo*/}
                <div className="flex items-center gap-3">
                    <nav className="flex items-center gap-5">
                        {navItems.map((item) => {
                            const Icon = item.icon;

                            return (
                               <div className="flex items-center gap-2">
                                   <Icon className="size-4"/>
                                   <span>{item.label}</span>
                               </div>
                            )
                        })}
                    </nav>

                </div>

            </div>

        </header>
    )
}

