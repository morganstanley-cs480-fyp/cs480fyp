import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from "react-oidc-context";
import { useEffect } from 'react';

function CallbackComponent() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isLoading) return;

    if (auth.isAuthenticated) {
      navigate({ to: '/trades' });
    } else if (auth.error) {
      console.error('Auth error:', auth.error);
      navigate({ to: '/' });
    }
  }, [auth, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Completing sign in...</p>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/callback/')({
  component: CallbackComponent,
});