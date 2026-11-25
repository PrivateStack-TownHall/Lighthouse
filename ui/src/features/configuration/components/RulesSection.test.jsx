import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { defaultConfig } from '../model.js';
import { RulesSection } from './RulesSection.jsx';

const fixedRules = [{ id: 'FR-015', rule: 'Assigned ports' }, { id: 'FR-017', rule: 'Internal folder architecture' }];

test('port override shows fields for applicable roles and writes a canonical rule', () => {
  const dispatch = vi.fn();
  const config = { ...defaultConfig(), customRules: [{ text: 'API: 3200\nDB: 2200', overrides: ['FR-015'], reason: 'Local ports' }] };
  const { rerender } = render(<RulesSection config={config} dispatch={dispatch} options={{ fixedRules }} errors={{}} />);
  expect(screen.getByLabelText('CR-001 api port')).toHaveValue('3200');
  expect(screen.getByLabelText('CR-001 db port')).toHaveValue('2200');
  expect(screen.getByLabelText('CR-001 ui port')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('CR-001 ui port'), { target: { value: '5200' } });
  expect(dispatch).toHaveBeenCalledWith({ type: 'rule', index: 0, patch: { text: 'API: 3200\nUI: 5200\nDB: 2200' } });
  rerender(<RulesSection config={{ ...config, project: { ...config.project, type: 'api' } }} dispatch={dispatch} options={{ fixedRules }} errors={{}} />);
  expect(screen.queryByLabelText('CR-001 ui port')).not.toBeInTheDocument();
});

test('folder rule explains that root folder names retain frontend and backend roles', () => {
  const config = { ...defaultConfig(), project: { ...defaultConfig().project, folders: { api: 'core', ui: 'robot' } },
    customRules: [{ text: 'Use a different internal layout', overrides: ['FR-017'], reason: 'Project-specific layout' }] };
  render(<RulesSection config={config} dispatch={vi.fn()} options={{ fixedRules }} errors={{}} />);
  expect(screen.getByText(/backend \(API\) is core and frontend \(UI\) is robot/)).toBeInTheDocument();
});
