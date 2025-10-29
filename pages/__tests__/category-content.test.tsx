import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { CategoryPageContent } from '../../components/pages/category/CategoryPageContent';

describe('CategoryPageContent', () => {
  const noop = () => {};

  it('renders the loading state consistently', () => {
    const html = renderToStaticMarkup(
      <CategoryPageContent
        categories={[]}
        loading
        error={null}
        onAddNew={noop}
        onEditCategory={noop}
        onDeleteCategory={noop}
      />,
    );

    expect(html).toMatchSnapshot();
  });

  it('renders category rows consistently', () => {
    const html = renderToStaticMarkup(
      <CategoryPageContent
        categories={[
          {
            categoryId: 'cat-1',
            name: 'Meals & Entertainment',
            kind: 'expense',
            parentCategoryId: null,
            description: 'Client dinners and team outings',
          },
          {
            categoryId: 'cat-2',
            name: 'Software',
            kind: 'expense',
            parentCategoryId: 'cat-3',
            description: '',
          },
          {
            categoryId: 'cat-3',
            name: 'Operations',
            kind: 'expense',
            parentCategoryId: null,
            description: 'Shared operational costs',
          },
        ]}
        loading={false}
        error={null}
        onAddNew={noop}
        onEditCategory={noop}
        onDeleteCategory={noop}
      />,
    );

    expect(html).toMatchSnapshot();
  });
});
