import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { Header } from '@/components/Header'
import { useAuth } from "react-oidc-context";
import type { AuthContextProps } from 'react-oidc-context';


// Created to protect pages.
export type RouterContext = {
  authentication: AuthContextProps;
}

function RootComponent() {
  const auth = useAuth();

  // Show loading state while auth is initializing
  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Only show Header if authenticated (or in dev without Cognito) */}
      {(auth.isAuthenticated || !import.meta.env.VITE_COGNITO_CLIENT_ID) && <Header />}
      <Outlet />
    </>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});