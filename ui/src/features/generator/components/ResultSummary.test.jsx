import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { ResultSummary } from './ResultSummary.jsx';

test('generation status changes from Not Generated to a result and then stale', () => {
  const { rerender } = render(<ResultSummary result={null} stale={false} />);
  expect(screen.getByRole('status')).toHaveTextContent('Not Generated');
  const result = { files: [{ path: 'PROJECT_CONTRACT.md', bytes: 20 }], level: 'warn', configHash: 'abc', generatedOn: '2026-11-23', problems: [{ level: 'warn', message: 'Review compatibility.' }] };
  rerender(<ResultSummary result={result} stale={false} />);
  expect(screen.getByRole('status')).toHaveTextContent('Generated 1 files (20 B)');
  expect(screen.queryByText('Not Generated')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '1 note' }));
  expect(screen.getByText('[warn] Review compatibility.')).toBeInTheDocument();
  rerender(<ResultSummary result={result} stale />);
  expect(screen.getByRole('status')).toHaveTextContent('Generate again to update files');
});
