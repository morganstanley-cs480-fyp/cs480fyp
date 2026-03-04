import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";
import { useState, useEffect } from "react";

const isCognitoConfigured = !!import.meta.env.VITE_COGNITO_CLIENT_ID;

function LoginComponent() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [showError, setShowError] = useState(false);


  useEffect(() => {
    // Only handle redirects when actually on the root path
    if (location.pathname !== '/') return;
    
    if (!isCognitoConfigured) {
      // Only redirect to trades in true development mode
        navigate({ to: "/trades" });
      
      return;
    }

    // If Cognito is configured, handle authentication properly
    if (auth.isLoading) {
      console.log('⏳ Auth loading...');
      return; // Wait for auth to load
    }

    if (auth.isAuthenticated) {
      console.log('✅ User authenticated, redirecting to trades');
      navigate({ to: "/trades" });
    } else {
      console.log('🔐 User not authenticated, starting signin');
      if (!auth.activeNavigator) {
        void auth.signinRedirect();
      }
    }
  }, [auth, navigate]);

  // Deal with transient NetworkRequest error.
  useEffect(() => {
    if (auth.error) {
      const timeout = setTimeout(() => {
        setShowError(true);
      }, 1000); // Show error only if redirect does not happen in 1 second (i.e it is a peristent error)

      return () => {
        clearTimeout(timeout);
        setShowError(false);
      };
    }
  }, [auth.error]);

  if (auth.isLoading) {
    return (
      <div>
        <div className="animate-spin rounded-full"></div>;<p>Loading...</p>
      </div>
    );
  }

  if (showError && auth.error) {
    return (<div className="text-red-500 font-bold">
      Oops...Error encountered: {auth.error.message}
    </div>
    );
  }
}


export const Route = createFileRoute("/")({
  component: LoginComponent,
});
