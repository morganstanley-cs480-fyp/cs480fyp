// import './App.css'
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { useAuth } from "react-oidc-context";
import { useEffect } from "react";
import { Toaster } from "sonner";

// import ReactFlowScreen from './components/prototype/ReactFlowScreenBasic';
// import ReactFlowScreenWithEg from "@/components/prototype/ReactFlowScreenSimpleEg";
// import ReactFlowScreenWithDagre from "./components/prototype/ReactFlowScreenWithDagre";
// import ReactFlowManual from "./components/prototype/ReactFlowManual";

// const router = createRouter({ routeTree });
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
      console.log('🔄 Auth finished loading. Re-validating route guards...');
      router.invalidate();
    }
  }, [authentication.isLoading]);  

  return (
    <div>
      <RouterProvider router={router} context = {{authentication}}/>
      <Toaster />
    </div>
  );
}
