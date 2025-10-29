import { useMemo } from 'react';

import PageSection from '../../layout/page/PageSection';
import pageSectionStyles from '../../layout/page/PageSection.module.css';

export type CategoryRecord = {
  categoryId: string;
  name: string;
  kind: string;
  parentCategoryId: string | null;
  description?: string | null;
};

export type CategoryPageContentProps = {
  categories: CategoryRecord[];
  loading: boolean;
  error: string | null;
  onAddNew?: () => void;
  onEditCategory?: (category: CategoryRecord) => void;
  onDeleteCategory?: (category: CategoryRecord) => void;
};

export function CategoryPageContent({
  categories,
  loading,
  error,
  onAddNew,
  onEditCategory,
  onDeleteCategory,
}: CategoryPageContentProps) {
  const rows = useMemo(() => categories ?? [], [categories]);
  const hasData = rows.length > 0;
  const parentLookup = useMemo(() => {
    return new Map(rows.map((category) => [category.categoryId, category]));
  }, [rows]);

  return (
    <PageSection
      title="Categories"
      description="Curate categories used across transactions and analytics."
      actions={
        <div className={pageSectionStyles.buttonRow}>
          <button
            type="button"
            onClick={() => onAddNew?.()}
            className={pageSectionStyles.primaryButton}
          >
            Add New Category
          </button>
        </div>
      }
    >
      {loading ? <p className={pageSectionStyles.messageText}>Loading categories...</p> : null}
      {!loading && error ? (
        <p className={pageSectionStyles.errorText} role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && !hasData ? (
        <p className={pageSectionStyles.messageText}>No categories found yet.</p>
      ) : null}
      {!loading && !error && hasData ? (
        <div className={pageSectionStyles.tableWrapper}>
          <table className={pageSectionStyles.table}>
            <thead>
              <tr>
                <th scope="col" className={pageSectionStyles.tableCell}>
                  Name
                </th>
                <th scope="col" className={pageSectionStyles.tableCell}>
                  Kind
                </th>
                <th scope="col" className={pageSectionStyles.tableCell}>
                  Parent Category
                </th>
                <th scope="col" className={pageSectionStyles.tableCell}>
                  Description
                </th>
                <th scope="col" className={pageSectionStyles.tableCellRight}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((category) => {
                const parent =
                  category.parentCategoryId != null
                    ? parentLookup.get(category.parentCategoryId)
                    : null;

                return (
                  <tr key={category.categoryId}>
                    <td className={pageSectionStyles.tableCell}>{category.name}</td>
                    <td className={`${pageSectionStyles.tableCell} ${pageSectionStyles.capitalize}`}>
                      {category.kind}
                    </td>
                    <td className={pageSectionStyles.tableCell}>
                      {parent
                        ? `${parent.name} (${category.parentCategoryId})`
                        : category.parentCategoryId ?? 'None'}
                    </td>
                    <td className={pageSectionStyles.tableCell}>
                      {category.description ? category.description : 'None'}
                    </td>
                    <td className={pageSectionStyles.tableCellRight}>
                      <div className={pageSectionStyles.tableRowActions}>
                        <button
                          type="button"
                          className={pageSectionStyles.secondaryButton}
                          onClick={() => onEditCategory?.(category)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={pageSectionStyles.dangerButton}
                          onClick={() => onDeleteCategory?.(category)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </PageSection>
  );
}

export default CategoryPageContent;
