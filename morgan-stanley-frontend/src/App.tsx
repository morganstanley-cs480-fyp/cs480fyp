// import './App.css'
import Header from "@/components/Header.tsx";
import ReactFlowScreen from './components/ReactFlowScreenBasic';
import ReactFlowScreenWithEg from "@/components/ReactFlowScreenSimpleEg";
import ReactFlowScreenWithDagre from "./components/ReactFlowScreenWithDagre";
import ReactFlowManual from "./components/ReactFlowManual";

const App = () => {

  return (
    <>
        {/* <Header/> */}
        <ReactFlowManual />
    </>
  );

}

export default App
