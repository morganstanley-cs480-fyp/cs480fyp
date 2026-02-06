import { createFileRoute, redirect } from '@tanstack/react-router'
import '@xyflow/react/dist/style.css';
import ReactFlowWithElkAutoLayout from '@/components/visualisations-prototype/ReactFlowWithElkAutoLayout';

// To use - just throw in a component from visualisations-prototype

export const Route = createFileRoute('/visualisation/')({
  component: ReactFlowWithElkAutoLayout,
})
