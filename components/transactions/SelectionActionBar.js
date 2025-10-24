

export function SelectionActionBar({
  selectedCount = 0,
}) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <span data-testid="transactions-selection-count">
      {selectedCount} selected
    </span>
  );
}
