import React from 'react';
import { Icon } from '../core/Icon.jsx';

export const PRESET_COLORS = ['clay', 'orange', 'ochre', 'green', 'eucalyptus', 'blue', 'indigo', 'violet', 'pink', 'brown'];

/** The ten presets plus a custom swatch. Selection is a ring, never a hue change. */
export function ColorPresetPicker({ value, onChange, custom, onCustom, style, ...rest }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--space-5)', ...style }} {...rest}>
      {PRESET_COLORS.map((name) => {
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            aria-label={name}
            onClick={() => onChange && onChange(name)}
            style={{
              width: 34, height: 34, borderRadius: 'var(--radius-pill)', padding: 0, cursor: 'pointer',
              background: 'var(--cat-' + name + ')', justifySelf: 'center',
              border: selected ? '2px solid var(--surface)' : '2px solid transparent',
              boxShadow: selected ? '0 0 0 2px var(--text-primary)' : 'none',
              transition: 'box-shadow var(--duration-fast) var(--ease-standard)',
            }}
          />
        );
      })}
      <button
        type="button"
        aria-label="Custom color"
        onClick={onCustom}
        style={{
          width: 34, height: 34, borderRadius: 'var(--radius-pill)', padding: 0, cursor: 'pointer', justifySelf: 'center',
          background: custom || 'var(--surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: custom ? '2px solid var(--surface)' : '1px dashed var(--line-separator-strong)',
          boxShadow: value === 'custom' ? '0 0 0 2px var(--text-primary)' : 'none',
        }}
      >
        {custom ? null : <Icon name="palette" size={16} color="var(--icon-muted)" />}
      </button>
    </div>
  );
}
