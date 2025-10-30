# Filter components

The filter line provides a composable wrapper that pages can use to drive their own search logic while keeping the UI consistent. The main entry point is `FilterLine` which renders a responsive row of filter cards on desktop and collapsible chips on smaller screens.

```tsx
import { useState } from 'react';
import type { FilterDefinition } from '@/components/filter';
import { FilterLine } from '@/components/filter';

const columns = [
  {
    id: 'status',
    label: 'Status',
    helperText: 'Match by workflow status',
    operators: [
      { id: 'is', label: 'is', valueInput: 'select', options: [
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
      ] },
      { id: 'is_not', label: 'is not', valueInput: 'select', options: [
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
      ] },
    ],
  },
  {
    id: 'amount',
    label: 'Amount',
    operators: [
      { id: 'gt', label: 'is greater than', valueInput: 'number', placeholder: '0.00' },
      { id: 'lt', label: 'is less than', valueInput: 'number', placeholder: '0.00' },
    ],
  },
];

export default function TransactionsFilterExample() {
  const [filters, setFilters] = useState<FilterDefinition[]>([]);

  const handleFiltersChange = (nextFilters: FilterDefinition[]) => {
    setFilters(nextFilters);
    // Optionally trigger a refetch or update URL query params
  };

  return (
    <FilterLine
      columns={columns}
      defaultFilters={filters}
      onFiltersChange={handleFiltersChange}
      loadValueOptions={({ columnId, operatorId, search }) => {
        if (columnId !== 'counterparty') {
          return Promise.resolve([]);
        }

        return fetch(`/api/counterparties?search=${encodeURIComponent(search)}&operator=${operatorId}`)
          .then((response) => response.json())
          .then((payload) => payload.items);
      }}
      onColumnChange={({ filter }) => {
        console.log('column changed', filter);
      }}
      onOperatorChange={({ filter }) => {
        console.log('operator changed', filter);
      }}
      onValueChange={({ filter }) => {
        console.log('value changed', filter);
      }}
    />
  );
}
```

The `FilterLine` component is designed so that only one filter card is open at a time. On narrow viewports the cards become horizontally scrollable chips that can be expanded with a tap.

## Props reference

- `columns`: list of columns and their supported operators. Each operator defines how its value should be captured (`text`, `number`, `select`, `multi-select`, `toggle`, `date`, `datetime-local`, or `none`).
- `defaultFilters`: seed filters for initial render or controlled usage.
- `onFiltersChange`: callback fired whenever the filters array changes.
- `loadValueOptions`: optional async loader used when operators require `select` or `multi-select` inputs. The component will manage a loading state and cancel in-flight requests as the user types.
- Cascade hooks (`onColumnChange`, `onOperatorChange`, `onValueChange`, `onRemoveFilter`) receive metadata describing the current filter, resolved column/operator, and previous selections.
- `addFilterLabel` and `emptyState` allow the hosting page to adjust copy and empty placeholders.

Subcomponents such as `FilterField`, `FilterBadge`, `FilterInput`, and `AddFilterMenu` are exported individually so advanced screens can compose their own layouts while still benefiting from the shared logic.
