import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AIGeneratorPanel } from '../../../components/exceptions-individual/AIGeneratorPanel';

describe('AIGeneratorPanel', () => {
  const mockOnGenerate = vi.fn();
  const mockOnCopyToDescription = vi.fn();
  const mockOnCopyToClipboard = vi.fn();
  const mockOnAiSolutionTypeChange = vi.fn();

  const defaultProps = {
    aiGenerating: false,
    onGenerate: mockOnGenerate,
    aiGeneratedSolution: '',
    historicalCases: [],
    onCopyToDescription: mockOnCopyToDescription,
    onCopyToClipboard: mockOnCopyToClipboard,
    copiedToClipboard: false,
    aiSolutionType: 'RETRY MEMO',
    onAiSolutionTypeChange: mockOnAiSolutionTypeChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    render(<AIGeneratorPanel {...defaultProps} />);
    expect(screen.getByText('Generate Solution Text')).toBeInTheDocument();
  });

  it('shows generating state', () => {
    render(<AIGeneratorPanel {...defaultProps} aiGenerating={true} />);
    expect(screen.getByText('Generating...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
  });

  it('calls onGenerate when button is clicked', () => {
    render(<AIGeneratorPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Generate Solution Text'));
    expect(mockOnGenerate).toHaveBeenCalled();
  });

  it('renders aiGeneratedSolution when provided', () => {
    const solution = 'Test **bold** solution text';
    render(<AIGeneratorPanel {...defaultProps} aiGeneratedSolution={solution} />);
    
    expect(screen.getByText('AI-Generated Solution Description')).toBeInTheDocument();
    expect(screen.getByText('bold').tagName).toBe('STRONG'); 
  });

  it('renders solution with lists, headings, and arrows', () => {
    const complexSolution = `
**Heading:**
1. Section 1
- Point A
- Point B

→ Arrow Point
    `;
    render(<AIGeneratorPanel {...defaultProps} aiGeneratedSolution={complexSolution} />);
  });

  it('handles copy buttons', () => {
    render(<AIGeneratorPanel {...defaultProps} aiGeneratedSolution="Test solution" copiedToClipboard={true} />);
    
    fireEvent.click(screen.getByText('Copy to Description'));
    expect(mockOnCopyToDescription).toHaveBeenCalled();
    
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Copied!'));
    expect(mockOnCopyToClipboard).toHaveBeenCalled();
  });

  it('renders historical cases', async () => {
    const user = userEvent.setup();
    const historicalCases = [
      {
        exception_id: 'EXC-123',
        trade_id: 'TRD-123',
        similarity_score: 85.5,
        exception_narrative: 'A short narrative',
        solution: null,
      }
    ];
    
    render(<AIGeneratorPanel {...defaultProps} aiGeneratedSolution="Sol" historicalCases={historicalCases} />);
    
    // Switch to Historical tab
    await user.click(screen.getByRole('tab', { name: /Historical Cases/i }));
    
    await screen.findByText('Exception EXC-123');
    expect(screen.getByText('Trade ID: TRD-123')).toBeInTheDocument();
    expect(screen.getByText('85.5% match')).toBeInTheDocument();
    expect(screen.getByText('A short narrative')).toBeInTheDocument();
  });

  it('truncates long historical cases and toggles expansion', async () => {
    const user = userEvent.setup();
    const longNarrative = 'A'.repeat(250);
    const historicalCases = [
      {
        exception_id: 'EXC-999',
        trade_id: 'TRD-999',
        similarity_score: 99.9,
        exception_narrative: longNarrative,
        solution: 'Some solution',
      }
    ];
    
    render(<AIGeneratorPanel {...defaultProps} aiGeneratedSolution="Sol" historicalCases={historicalCases} />);
    
    await user.click(screen.getByRole('tab', { name: /Historical Cases/i }));
    
    const showMoreBtn = await screen.findByText(/Show More/i);
    expect(showMoreBtn).toBeInTheDocument();
    
    // Expand
    await user.click(showMoreBtn);
    expect(await screen.findByText(/Show Less/i)).toBeInTheDocument();
    
    // Collapse
    await user.click(screen.getByText(/Show Less/i));
    expect(await screen.findByText(/Show More/i)).toBeInTheDocument();
  });

  it('shows no historical cases message', async () => {
    const user = userEvent.setup();
    render(<AIGeneratorPanel {...defaultProps} aiGeneratedSolution="Sol" historicalCases={[]} />);
    
    await user.click(screen.getByRole('tab', { name: /Historical Cases/i }));
    expect(await screen.findByText('No historical cases available')).toBeInTheDocument();
  });
});