import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { RetrievedSolution } from '@/lib/api/exceptionService';

interface ResolvedSolutionDetailsProps {
  solution: RetrievedSolution;
}

export function ResolvedSolutionDetails({ solution }: ResolvedSolutionDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Applied Solution Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-black/75 mb-1">Solution ID</p>
          <p className="font-medium text-black">{solution.id}</p>
        </div>

        <Separator />

        <div>
          <p className="text-sm text-black/75 mb-1">Exception ID</p>
          <p className="font-medium text-black">{solution.exception_id}</p>
        </div>

        <div>
          <p className="text-sm text-black/75 mb-1">Title</p>
          <p className="font-medium text-black">{solution.title}</p>
        </div>

        <Separator />

        <div>
          <p className="text-sm text-black/75 mb-1">Exception Description</p>
          <p className="text-sm text-black whitespace-pre-wrap">{solution.exception_description || 'N/A'}</p>
        </div>

        <div>
          <p className="text-sm text-black/75 mb-1">Reference Event</p>
          <p className="text-sm text-black whitespace-pre-wrap">{solution.reference_event || 'N/A'}</p>
        </div>

        <div>
          <p className="text-sm text-black/75 mb-1">Solution Description</p>
          <p className="text-sm text-black whitespace-pre-wrap">{solution.solution_description || 'N/A'}</p>
        </div>

        <Separator />

        <div>
          <p className="text-sm text-black/75 mb-1">Created Time</p>
          <p className="text-sm text-black">{solution.create_time}</p>
        </div>
      </CardContent>
    </Card>
  );
}
