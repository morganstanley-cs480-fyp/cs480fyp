// Solution creation form (Create New Solution)

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NewSolutionFormProps {
  solutionTitle: string;
  onSolutionTitleChange: (title: string) => void;
  solutionDescription: string;
  onSolutionDescriptionChange: (description: string) => void;
}

export function NewSolutionForm({
  solutionTitle,
  onSolutionTitleChange,
  solutionDescription,
  onSolutionDescriptionChange,
}: NewSolutionFormProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <Label htmlFor="solution-title" className="min-w-fit">Solution Title</Label>
        <Select 
          value={solutionTitle} 
          onValueChange={onSolutionTitleChange}
        >
          <SelectTrigger id="solution-title" className="flex-1">
            <SelectValue placeholder="Select solution type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RETRY MEMO">RETRY MEMO</SelectItem>
            <SelectItem value="EB MAPPING">EB MAPPING</SelectItem>
            <SelectItem value="BLACKSTONE MUSTREAD">
              BLACKSTONE MUSTREAD
            </SelectItem>
          </SelectContent>
        </Select>
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
