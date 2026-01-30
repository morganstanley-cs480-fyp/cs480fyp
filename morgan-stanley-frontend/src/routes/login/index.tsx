import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from "react-oidc-context";
import { useEffect, useRef } from 'react';

function LoginComponent() {
  const auth = useAuth();
  const navigate = useNavigate();
  const hasTriedRedirect = useRef(false);

  useEffect(() => {
    // Wait for auth to fully initialize
    if (auth.isLoading) {
      return;
    }

    // If already authenticated, go to trades
    if (auth.isAuthenticated) {
      navigate({ to: '/trades' });
      return;
    }

    // If there's an error, don't keep trying
    if (auth.error) {
      return;
    }

    // Only try redirect once after auth is ready
    if (!auth.isAuthenticated && !hasTriedRedirect.current) {
      hasTriedRedirect.current = true;
      
      // Small delay to ensure auth is fully ready
      setTimeout(() => {
        auth.signinRedirect().catch((error) => {
          console.error('Signin redirect failed:', error);
          hasTriedRedirect.current = false; // Allow retry on error
        });
      }, 100);
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.error, navigate]);

  if (auth.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 font-bold mb-4">Login Error</p>
          <p className="text-gray-600 mb-4">{auth.error.message}</p>
          <button 
            onClick={() => {
              hasTriedRedirect.current = false;
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Redirecting to login...</p>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/login/')({
  component: LoginComponent,
});