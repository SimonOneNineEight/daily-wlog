import React from 'react';
import { CategoryIcon } from '../categories/CategoryIcon.jsx';
import { Icon } from '../core/Icon.jsx';
import { PhotoGrid } from './PhotoGrid.jsx';

/** Day-view entry card: category icon, title, note preview, photo thumbnails, drag handle. */
export function EntryCard({ title, category, subcategory, note, photos = [], draggable, dragging, onClick, style, ...rest }) {
  return (
    <article
      onClick={onClick}
      style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--card-padding)',
        boxShadow: dragging ? 'var(--shadow-dragging)' : 'var(--shadow-card)',
        transform: dragging ? 'scale(1.01)' : 'none',
        transition: 'box-shadow var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)',
        cursor: onClick ? 'pointer' : 'default', ...style,
      }}
      {...rest}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-5)' }}>
        <CategoryIcon icon={category && category.icon} color={category && category.color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, font: 'var(--type-entry-title)', letterSpacing: 'var(--track-body)', color: 'var(--text-primary)' }}>{title}</h3>
          <p style={{ margin: 'var(--space-1) 0 0', font: 'var(--type-meta)', color: 'var(--text-tertiary)' }}>
            {category ? category.name : ''}{subcategory ? ' · ' + subcategory : ''}
          </p>
        </div>
        {draggable ? <Icon name="grip-horizontal" size={18} color="var(--text-quaternary)" /> : null}
      </div>
      {note ? (
        <p style={{ margin: 'var(--space-5) 0 0', font: 'var(--type-note)', letterSpacing: 'var(--track-subhead)', color: 'var(--text-secondary)', textWrap: 'pretty' }}>{note}</p>
      ) : null}
      {photos.length ? <PhotoGrid photos={photos} columns={4} style={{ marginTop: 'var(--space-5)' }} /> : null}
    </article>
  );
}
