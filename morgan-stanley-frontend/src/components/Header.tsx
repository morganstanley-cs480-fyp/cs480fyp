import { User, Search, AlertTriangle, Bug } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '../lib/utils';

const navItems = [
  { id: 'search', label: 'Trade Search', icon: Search, path: '/trades' },
  { id: 'exceptions', label: 'Exceptions', icon: AlertTriangle, path: '/exceptions' },
  { id: 'testing', label: 'Visualisation Testing Page', icon: Bug, path: '/visualisation'}
];

export const Header = () => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <header className="bg-white border-b-4 border-slate-300 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#002B51] rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">MS</span>
          </div>
          <div>
            <h2 className="text-md text-black/75">Morgan Stanley</h2>
            <p className="text-xs text-black/75">OTC Clearing</p>
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
                      ? 'bg-[#002B51] text-white'
                      : 'text-black/75 hover:bg-slate-100 hover:text-black'
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
              <AvatarFallback className="bg-[#002B51] text-white text-sm">
                <User className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-sm text-black">John Trader</p>
              <p className="text-xs text-black/50">Operations</p>
            </div>
          </div>

          {/* Logout Button - Uncomment after implementing user management */}
          {/* <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="size-4" />
            Logout
          </Button> */}
        </div>
      </div>
    </header>
  );
};
