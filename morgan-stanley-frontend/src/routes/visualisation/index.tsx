import { createFileRoute } from '@tanstack/react-router'
import{ useMemo } from 'react';
import  { 
  ReactFlow,
  Background, 
  Controls, 
  Handle, 
  Position, 
  getSmoothStepPath,
  MarkerType 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Landmark, ShieldCheck, ArrowRightLeft, Cpu, Activity } from 'lucide-react';
import ReactFlowManualAlgorithm from '@/components/visualisations-prototype/ReactFlowManualAlgorithm1';

// To use - just throw in a component from visualisations-prototype

export const Route = createFileRoute('/visualisation/')({
  component: ReactFlowManualAlgorithm,
})
