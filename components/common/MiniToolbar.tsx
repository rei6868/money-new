import { SelectionToolbar, type SelectionToolbarProps } from '../table/SelectionToolbar';

export type MiniToolbarProps = SelectionToolbarProps;

export function MiniToolbar(props: MiniToolbarProps) {
  return <SelectionToolbar {...props} />;
}

export default MiniToolbar;
