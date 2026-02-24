// import './App.css'
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { useAuth } from "react-oidc-context";

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

  return (
      <RouterProvider router={router} context = {{authentication}}/>
  );
}
