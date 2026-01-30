// import './App.css'
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// import ReactFlowScreen from './components/prototype/ReactFlowScreenBasic';
// import ReactFlowScreenWithEg from "@/components/prototype/ReactFlowScreenSimpleEg";
// import ReactFlowScreenWithDagre from "./components/prototype/ReactFlowScreenWithDagre";
// import ReactFlowManual from "./components/prototype/ReactFlowManual";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}


export default function App() {
  return (
      <RouterProvider router={router} />
  );
}
