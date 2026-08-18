import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Photo grid, up to 10, drag order. Photos are grids or stacks — never a horizontal carousel.
    Pass src strings; omitted sources render as neutral placeholders. */
export function PhotoGrid({ photos = [], columns = 4, max = 10, editable, onAdd, onRemove, size, style, ...rest }) {
  const items = photos.slice(0, max);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: size ? 'repeat(auto-fill, ' + size + 'px)' : 'repeat(' + columns + ', 1fr)',
        gap: 'var(--photo-grid-gap)', ...style,
      }}
      {...rest}
    >
      {items.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'relative', aspectRatio: '1 / 1', borderRadius: 'var(--radius-photo)', overflow: 'hidden',
            background: 'var(--surface-fill-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {p && p.src ? (
            <img src={p.src} alt={p.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <Icon name="image" size={18} color="var(--text-quaternary)" />
          )}
          {editable && onRemove ? (
            <button
              type="button"
              aria-label="移除照片"
              onClick={() => onRemove(i)}
              style={{
                position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 'var(--radius-pill)',
                background: 'rgba(0,0,0,0.55)', border: 'none', display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', padding: 0,
              }}
            >
              <Icon name="x" size={12} color="var(--white)" strokeWidth={2.25} />
            </button>
          ) : null}
        </div>
      ))}
      {editable && items.length < max ? (
        <button
          type="button"
          onClick={onAdd}
          aria-label="新增照片"
          style={{
            aspectRatio: '1 / 1', borderRadius: 'var(--radius-photo)', background: 'var(--surface-fill)',
            border: '1px dashed var(--line-separator-strong)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 'var(--space-1)', cursor: 'pointer', color: 'var(--icon-muted)',
          }}
        >
          <Icon name="camera" size={18} color="var(--icon-muted)" />
          <span style={{ font: 'var(--weight-regular) var(--size-caption-2) / 1 var(--font-text)', color: 'var(--text-tertiary)' }}>{items.length}/{max}</span>
        </button>
      ) : null}
    </div>
  );
}
