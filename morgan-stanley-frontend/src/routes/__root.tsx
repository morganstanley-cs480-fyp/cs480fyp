import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Header } from '@/components/Header'
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useAuth } from "react-oidc-context";


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
      {/* Only show Header if authenticated */}
      {auth.isAuthenticated && <Header />}
      <Outlet />
      <TanStackRouterDevtools />
    </>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});