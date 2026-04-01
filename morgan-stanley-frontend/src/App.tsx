// import './App.css'
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { useAuth } from "react-oidc-context";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true,
    },
  },
});

const router = createRouter({routeTree, context: {authentication: undefined!}})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}


export default function App() {
  const authentication = useAuth();

  useEffect(() => {
    if (!authentication.isLoading) {
      router.invalidate();
    }
  }, [authentication.isLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context = {{authentication}}/>
      <Toaster />
    </QueryClientProvider>
  );
}
