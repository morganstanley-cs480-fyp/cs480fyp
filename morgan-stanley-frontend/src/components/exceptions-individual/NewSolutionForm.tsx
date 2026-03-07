// Solution creation form (Create New Solution)

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface NewSolutionFormProps {
  solutionTitle: string;
  onSolutionTitleChange: (title: string) => void;
  exceptionDescription: string;
  onExceptionDescriptionChange: (title: string) => void;  
  solutionDescription: string;
  onSolutionDescriptionChange: (description: string) => void;
}

export function NewSolutionForm({
  solutionTitle,
  onSolutionTitleChange,
  exceptionDescription,
  onExceptionDescriptionChange,
  solutionDescription,
  onSolutionDescriptionChange,
}: NewSolutionFormProps) {


  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <Label htmlFor="solution-title" className="min-w-fit">Solution Title</Label>
        <Input
          id="solution-title"
          className="flex-1"
          autoCapitalize="characters"
          placeholder="Enter solution title..."
          value={solutionTitle}
          onChange={(e) => onSolutionTitleChange(e.target.value.toUpperCase())}
        />
      </div>


      <div>
        <Label htmlFor="exception-description">
          Exception Description
        </Label>
        <Textarea
          id="exception-description"
          placeholder="Describe the exception..."
          value={exceptionDescription}
          onChange={(e) => onExceptionDescriptionChange(e.target.value)}
          className="h-16 text-sm mt-2"
        />
      </div>

      <div>
        <Label htmlFor="solution-description">
          Solution Description
        </Label>
        <Textarea
          id="solution-description"
          placeholder="Describe the solution in detail..."
          value={solutionDescription}
          onChange={(e) => onSolutionDescriptionChange(e.target.value)}
          className="h-64 text-sm mt-2"
        />
      </div>
    </div>
  );
}