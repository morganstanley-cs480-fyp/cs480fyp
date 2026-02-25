import {User, Search, AlertTriangle, Bug, LogOut} from 'lucide-react';
import {Link, useRouterState} from '@tanstack/react-router';
import {useAuth} from 'react-oidc-context';
import {Button} from './ui/button';
import {Avatar, AvatarFallback} from './ui/avatar';
import {cn} from '../lib/utils';

const navItems = [
    {id: 'search', label: 'Trade Search', icon: Search, path: '/trades'},
    {id: 'exceptions', label: 'Exceptions', icon: AlertTriangle, path: '/exceptions'},
    {id: 'testing', label: 'Visualisation Testing Page', icon: Bug, path: '/visualisation'},
];

export const Header = () => {
    const routerState = useRouterState();
    const currentPath = routerState.location.pathname;
    const auth = useAuth();

    const handleLogout = async () => {
        try {
            await auth.removeUser();
        } catch (error) {
            console.log('Logout failed:', error);
        } finally {
            const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
            const logoutUri = import.meta.env.VITE_COGNITO_LOGOUT_URI;
            const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
            window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
        }
    };

    return (
        <header className="bg-[#002B51] px-6 h-14 flex items-center sticky top-0 z-50 shadow-sm">
            <div className="flex items-center justify-between w-full">
                {/* Brand */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/15 rounded-md flex items-center justify-center">
                        <span className="text-white text-xs font-bold tracking-tight">MS</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white text-sm font-semibold leading-tight">Morgan Stanley</span>
                        <span className="text-white/70 text-xs leading-tight">OTC Clearing</span>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex items-center gap-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPath === item.path || currentPath.startsWith(item.path);
                        return (
                            <Link
                                key={item.id}
                                to={item.path}
                                className={cn(
                                    'flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-white/15 text-white border border-white/20'
                                        : 'text-white/70 hover:text-white hover:bg-white/10'
                                )}
                            >
                                <Icon className="size-3.5"/>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User + Logout */}
                <div className="flex items-center gap-2.5">
                    <Avatar className="size-7">
                        <AvatarFallback className="bg-white/15 text-white text-xs">
                            <User className="size-3.5"/>
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-white text-xs font-medium leading-tight">
                            {auth.user?.profile.given_name} {auth.user?.profile.family_name}
                        </p>
                        <p className="text-white/50 text-xs leading-tight">{auth.user?.profile?.email}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="gap-1.5 text-white/70 hover:text-white hover:bg-white/10 ml-1"
                    >
                        <LogOut className="size-3.5"/>
                        Logout
                    </Button>
                </div>
            </div>
        </header>
    );
};
