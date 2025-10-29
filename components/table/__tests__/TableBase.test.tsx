/** @jest-environment jsdom */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { TableBase } from '../TableBase';

type AnyProps = Record<string, unknown>;

jest.mock('../TableBaseHeader', () => ({
  TableBaseHeader: () => (
    <thead data-testid="mock-table-header">
      <tr>
        <th>Mock header</th>
      </tr>
    </thead>
  ),
}));

jest.mock('../TableBaseBody', () => ({
  TableBaseBody: () => (
    <tbody data-testid="mock-table-body">
      <tr>
        <td>Mock row</td>
      </tr>
    </tbody>
  ),
}));

describe('TableBase selection toolbar', () => {
  beforeEach(() => {
    class ResizeObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }

    (window as AnyProps).ResizeObserver = ResizeObserverStub;
    (globalThis as AnyProps).ResizeObserver = ResizeObserverStub;
  });

  afterEach(() => {
    cleanup();
  });

  function renderTableBase(extraProps: Partial<AnyProps> = {}) {
    const columnDefinitions = [
      { id: 'name', defaultWidth: 160, minWidth: 160, align: 'left' },
    ];
    const visibleColumns = [
      { id: 'name', width: 160, visible: true, order: 0 },
    ];

    const props: AnyProps = {
      tableScrollRef: undefined,
      transactions: [{ id: 'txn-1', name: 'Test transaction' }],
      selectedIds: ['txn-1'],
      onSelectRow: jest.fn(),
      onSelectAll: jest.fn(),
      selectionSummary: { count: 1, amount: 123.45 },
      onOpenAdvanced: jest.fn(),
      onBulkDelete: jest.fn(),
      columnDefinitions,
      visibleColumns,
      pagination: null,
      tableTitle: 'Test table',
      allColumns: visibleColumns,
      isColumnReorderMode: false,
      onColumnVisibilityChange: jest.fn(),
      onColumnOrderChange: jest.fn(),
      fontScale: 1,
      sortState: { columnId: null, direction: null },
      onSortChange: jest.fn(),
      onToggleShowSelected: jest.fn(),
      isShowingSelectedOnly: false,
      isFetching: false,
      rowIdKey: 'id',
      renderRowActionsCell: undefined,
      onEditRow: undefined,
      toolbarSlot: null,
      ...extraProps,
    };

    render(<TableBase {...props} />);

    return props;
  }

  it('renders toolbar actions and forwards callbacks', () => {
    const onSelectAll = jest.fn();
    const onToggleShowSelected = jest.fn();

    renderTableBase({ onSelectAll, onToggleShowSelected });

    const toggleButton = screen.getByRole('button', { name: 'Show selected rows' });
    fireEvent.click(toggleButton);
    expect(onToggleShowSelected).toHaveBeenCalledWith(true);

    const deselectButton = screen.getByRole('button', { name: 'Deselect all' });
    fireEvent.click(deselectButton);
    expect(onSelectAll).toHaveBeenCalledWith(false);
  });
});
