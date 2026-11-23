import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { SlidersHorizontal, WandSparkles, Eye } from 'lucide-react';
import { OutputList } from './OutputList.jsx';
import { Stepper } from './Stepper.jsx';

const outputs = [
  { id: 'PROJECT_CONTRACT.md', title: 'Project Contract', description: 'd', format: 'MD', available: true },
  { id: 'SYSTEM_DESIGN.md', title: 'System Design', description: 'd', format: 'MD', available: false },
  { id: 'PROMPTS/', title: 'Development Prompts', description: 'd', format: 'ZIP', available: true },
];

test('files show Not Generated and actions are disabled until generated', () => {
  render(<OutputList outputs={outputs} selected={['PROJECT_CONTRACT.md', 'PROMPTS/']} onToggle={vi.fn()} result={null} onPreview={vi.fn()} onCopy={vi.fn()} onDownload={vi.fn()} />);
  expect(screen.getByText('2 Documents')).toBeInTheDocument();
  expect(screen.getByLabelText('Preview Project Contract')).toBeDisabled();
  expect(screen.getByLabelText('Include System Design')).toBeDisabled();
  expect(screen.getAllByText('Not Generated')).toHaveLength(3);
  expect(screen.queryByText('Next version')).not.toBeInTheDocument();
});

test('generated outputs can be previewed', () => {
  const result = { id: 'g1', files: [{ path: 'PROJECT_CONTRACT.md', content: '# x', bytes: 3 }, { path: 'PROMPTS/00-INDEX.md', content: '# y', bytes: 3 }] };
  render(<OutputList outputs={outputs} selected={['PROJECT_CONTRACT.md', 'PROMPTS/']} onToggle={vi.fn()} result={result} onPreview={vi.fn()} onCopy={vi.fn()} onDownload={vi.fn()} />);
  expect(screen.getByLabelText('Preview Project Contract')).toBeEnabled();
  expect(screen.getByLabelText('Preview Development Prompts')).toBeEnabled();
  expect(screen.getAllByText('Generated')).toHaveLength(2);
  expect(screen.getByText('Not Generated')).toBeInTheDocument();
});

test('stepper is an informational list with no checkboxes or completion indicators', () => {
  render(<Stepper steps={[{ title: 'Configure', icon: SlidersHorizontal }, { title: 'Generate', icon: WandSparkles }, { title: 'Review & Export', icon: Eye }]} />);
  const guide = screen.getByRole('list', { name: 'Contract generation steps' });
  expect(within(guide).getAllByRole('listitem')).toHaveLength(3);
  expect(within(guide).queryByRole('checkbox')).not.toBeInTheDocument();
  expect(within(guide).queryByRole('button')).not.toBeInTheDocument();
  expect(guide.querySelectorAll('svg')).toHaveLength(3);
  expect(guide.querySelector('.lucide-check')).toBeNull();
  expect(within(guide).getByText('Review & Export')).toBeInTheDocument();
});

test('newly available documents are selected and can be toggled', () => {
  const onToggle = vi.fn();
  const available = [
    { ...outputs[1], available: true },
    { id: 'DEVELOPMENT_STANDARDS.md', title: 'Development Standards', description: 'd', format: 'MD', available: true },
  ];
  render(<OutputList outputs={available} selected={available.map((o) => o.id)} onToggle={onToggle} result={null} onPreview={vi.fn()} onCopy={vi.fn()} onDownload={vi.fn()} />);
  for (const output of available) {
    const checkbox = screen.getByRole('checkbox', { name: `Include ${output.title}` });
    expect(checkbox).toBeEnabled();
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith(output.id);
  }
});
