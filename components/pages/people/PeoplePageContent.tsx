import { useMemo } from 'react';

import PageSection from '../../layout/page/PageSection';
import pageSectionStyles from '../../layout/page/PageSection.module.css';

export type PeopleRecord = {
  personId: string;
  fullName: string;
  status: string;
};

export type PeoplePageContentProps = {
  people: PeopleRecord[];
  isLoading: boolean;
  error: string | null;
  onAddNew?: () => void;
  onEditPerson?: (person: PeopleRecord) => void;
  onDeletePerson?: (person: PeopleRecord) => void;
};

export function PeoplePageContent({
  people,
  isLoading,
  error,
  onAddNew,
  onEditPerson,
  onDeletePerson,
}: PeoplePageContentProps) {
  const rows = useMemo(() => people ?? [], [people]);
  const hasData = rows.length > 0;

  return (
    <PageSection
      title="People"
      description="Manage individuals linked to accounts, transactions, and reimbursements."
      actions={
        <div className={pageSectionStyles.buttonRow}>
          <button
            type="button"
            onClick={() => onAddNew?.()}
            className={pageSectionStyles.primaryButton}
          >
            Add New Person
          </button>
        </div>
      }
    >
      {isLoading ? <p className={pageSectionStyles.messageText}>Loading people…</p> : null}
      {!isLoading && error ? (
        <p className={pageSectionStyles.errorText} role="alert">
          {error}
        </p>
      ) : null}
      {!isLoading && !error ? (
        <div className={pageSectionStyles.tableWrapper}>
          <table className={pageSectionStyles.table}>
            <thead>
              <tr>
                <th scope="col" className={pageSectionStyles.tableCell}>
                  Full Name
                </th>
                <th scope="col" className={pageSectionStyles.tableCell}>
                  Status
                </th>
                <th scope="col" className={pageSectionStyles.tableCell}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {hasData ? (
                rows.map((person) => (
                  <tr key={person.personId}>
                    <td className={pageSectionStyles.tableCell}>{person.fullName}</td>
                    <td className={`${pageSectionStyles.tableCell} ${pageSectionStyles.capitalize}`}>
                      {person.status}
                    </td>
                    <td className={pageSectionStyles.tableCellActions}>
                      <div className={pageSectionStyles.tableRowActions}>
                        <button
                          type="button"
                          onClick={() => onEditPerson?.(person)}
                          className={pageSectionStyles.secondaryButton}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePerson?.(person)}
                          className={pageSectionStyles.dangerButton}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className={pageSectionStyles.tableCell}>
                    <div className={pageSectionStyles.emptyState}>No people found yet.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </PageSection>
  );
}

export default PeoplePageContent;
