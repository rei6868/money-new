import type { SelectionToolbarProps } from '../table/SelectionToolbar';
import { SelectionToolbar } from '../table/SelectionToolbar';

export type MiniToolbarProps = Omit<SelectionToolbarProps, 'variant' | 'className'>;

export function MiniToolbar(props: MiniToolbarProps) {
  return <SelectionToolbar {...props} />;
}

export default MiniToolbar;
