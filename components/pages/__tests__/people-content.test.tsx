import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { PeoplePageContent } from '../people/PeoplePageContent';

describe('PeoplePageContent', () => {
  const noop = () => {};

  it('renders the empty state consistently', () => {
    const html = renderToStaticMarkup(
      <PeoplePageContent
        people={[]}
        isLoading={false}
        error={null}
        onAddNew={noop}
        onEditPerson={noop}
        onDeletePerson={noop}
      />,
    );

    expect(html).toMatchSnapshot();
  });

  it('renders a table of people consistently', () => {
    const html = renderToStaticMarkup(
      <PeoplePageContent
        people={[
          { personId: '1', fullName: 'Alex Murphy', status: 'active' },
          { personId: '2', fullName: 'Sam Carter', status: 'inactive' },
        ]}
        isLoading={false}
        error={null}
        onAddNew={noop}
        onEditPerson={noop}
        onDeletePerson={noop}
      />,
    );

    expect(html).toMatchSnapshot();
  });
});
