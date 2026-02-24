import { createFileRoute } from '@tanstack/react-router'
import '@xyflow/react/dist/style.css';
import ReactFlowWithElkAutoLayout from '@/components/visualisations-prototype/ReactFlowWithElkAutoLayout';
import { requireAuth } from '@/lib/utils';

// To use - just throw in a component from visualisations-prototype
export const Route = createFileRoute('/visualisation/')({
  beforeLoad: requireAuth,
  component: ReactFlowWithElkAutoLayout,
})
