import type { GroupView } from '../../react';
import { GroupIcon } from './GroupIcon';

export function GroupCard({ view }: { view: GroupView }) {
  const { group, foundByPlayer } = view;
  const className = [
    'mg-group',
    `mg-group--d${group.difficulty}`,
    foundByPlayer ? 'mg-group--found' : 'mg-group--revealed',
  ].join(' ');

  return (
    <li className={className}>
      <span className="mg-group__icon">
        <GroupIcon difficulty={group.difficulty} />
      </span>
      <div className="mg-group__body">
        <p className="mg-group__label">
          {group.label}
          {!foundByPlayer && <span className="mg-group__tag"> (revealed)</span>}
        </p>
        <p className="mg-group__items">{group.items.join(', ')}</p>
      </div>
    </li>
  );
}
