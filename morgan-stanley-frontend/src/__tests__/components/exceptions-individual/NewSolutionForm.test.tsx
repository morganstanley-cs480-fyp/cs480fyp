import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewSolutionForm } from '@/components/exceptions-individual/NewSolutionForm';

describe('NewSolutionForm', () => {
  it('renders fields and uppercases solution title on change', () => {
    const onSolutionTitleChange = vi.fn();

    render(
      <NewSolutionForm
        solutionTitle=""
        onSolutionTitleChange={onSolutionTitleChange}
        exceptionDescription=""
        onExceptionDescriptionChange={vi.fn()}
        solutionDescription=""
        onSolutionDescriptionChange={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Solution Title'), { target: { value: 'retry memo' } });

    expect(onSolutionTitleChange).toHaveBeenCalledWith('RETRY MEMO');
  });

  it('calls description handlers for both textareas', () => {
    const onExceptionDescriptionChange = vi.fn();
    const onSolutionDescriptionChange = vi.fn();

    render(
      <NewSolutionForm
        solutionTitle="ABC"
        onSolutionTitleChange={vi.fn()}
        exceptionDescription=""
        onExceptionDescriptionChange={onExceptionDescriptionChange}
        solutionDescription=""
        onSolutionDescriptionChange={onSolutionDescriptionChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Exception Description'), { target: { value: 'exception details' } });
    fireEvent.change(screen.getByLabelText('Solution Description'), { target: { value: 'solution details' } });

    expect(onExceptionDescriptionChange).toHaveBeenCalledWith('exception details');
    expect(onSolutionDescriptionChange).toHaveBeenCalledWith('solution details');
  });
});
