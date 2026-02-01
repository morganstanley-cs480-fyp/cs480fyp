import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";
import { useState, useEffect } from "react";

function LoginComponent() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (auth) {
      if (auth.isAuthenticated) {
        navigate({ to: "/trades" });
      } else if (!auth.activeNavigator) {
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
    <div className="text-red-500 font-bold">
      Oops...Error encountered: {auth.error.message}
    </div>;
  }
}

export const Route = createFileRoute("/")({
  component: LoginComponent,
});
