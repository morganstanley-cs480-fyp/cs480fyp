import { User, Search, AlertTriangle, LogOut, Bug } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useAuth } from 'react-oidc-context';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '../lib/utils';

const navItems = [
  { id: 'search', label: 'Trade Search', icon: Search, path: '/trades' },
  { id: 'exceptions', label: 'Exceptions', icon: AlertTriangle, path: '/exceptions' },
  { id: 'testing', label: 'Visualisation Testing Page', icon: Bug, path: '/visualisation'},
];

export const Header = () => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const auth = useAuth();

  const handleLogout = () => {
    // Clear local auth state
    auth.removeUser();
    
    // Redirect to Cognito logout
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
    const logoutUri = import.meta.env.VITE_COGNITO_LOGOUT_URI;
    const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
    
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  return (
    <header className="bg-white border-b-4 border-slate-300 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">MS</span>
          </div>
          <div>
            <h2 className="text-md text-slate-700">Morgan Stanley</h2>
            <p className="text-xs text-slate-600">OTC Clearing</p>
          </div>
        </div>

        {/* Right side - Navigation, User and Logout */}
        <div className="flex items-center gap-3">
          {/* Navigation */}
          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || currentPath.startsWith(item.path);
              
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <Avatar className="size-8">
              <AvatarFallback className="bg-blue-600 text-white text-sm">
                <User className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-sm text-slate-900">
                {auth.user?.profile?.email || 'John Trader'}
              </p>
              <p className="text-xs text-slate-500">{auth.user?.profile.family_name} {auth.user?.profile.given_name}</p>
            </div>
          </div>

          {/* Logout Button */}
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};