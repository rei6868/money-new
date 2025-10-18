// Re-export the canonical transaction column helpers so that the component
// layer never re-declares them (avoids duplicate export errors during merges).
export * from '../../lib/transactions/columns';
