const {
  buildTransactionPredicate,
  buildTransferLinkInfo,
} = require('../../lib/transactions/transferFilters');
const { TRANSACTION_TYPE_VALUES } = require('../../lib/transactions/transactionTypes');

describe('buildTransactionPredicate - transfer handling', () => {
  it('includes both rows of a linked transfer pair', () => {
    const sampleTxns = [
      { id: 't-1', type: 'Expense', typeRaw: 'Expense', linkedTxn: 't-2', notes: 'Transfer out' },
      { id: 't-2', type: 'Income', typeRaw: 'Income', linkedTxn: 't-1', notes: 'Transfer in' },
      { id: 't-3', type: 'Expense', typeRaw: 'Expense', notes: 'Regular expense' },
    ];

    const linkInfo = buildTransferLinkInfo(sampleTxns);
    const predicate = buildTransactionPredicate(
      '',
      TRANSACTION_TYPE_VALUES.TRANSFER,
      linkInfo.linkedIds,
    );

    const filtered = sampleTxns.filter(predicate).map((txn) => txn.id);

    expect(filtered).toContain('t-1');
    expect(filtered).toContain('t-2');
    expect(filtered).not.toContain('t-3');
    expect(filtered).toHaveLength(2);
  });

  it('includes target rows that are only linked via their partner', () => {
    const sampleTxns = [
      { id: 't-10', type: 'Expense', typeRaw: 'Expense', linkedTxn: 't-11', notes: 'Transfer out' },
      { id: 't-11', type: 'Income', typeRaw: 'Income', notes: 'Transfer in' },
      { id: 't-12', type: 'Income', typeRaw: 'Income', linkedTxn: null, notes: 'Random income' },
    ];

    const linkInfo = buildTransferLinkInfo(sampleTxns);
    const predicate = buildTransactionPredicate(
      '',
      TRANSACTION_TYPE_VALUES.TRANSFER,
      linkInfo.linkedIds,
    );

    const filtered = sampleTxns.filter(predicate).map((txn) => txn.id);

    expect(filtered).toEqual(expect.arrayContaining(['t-10', 't-11']));
    expect(filtered).not.toContain('t-12');
  });
});
