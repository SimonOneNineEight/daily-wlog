import React from 'react';

const cache = new Map();

function iconBase() {
  if (typeof window !== 'undefined' && window.__WLOG_ICON_BASE__) return window.__WLOG_ICON_BASE__;
  const hrefs = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((l) => l.getAttribute('href') || '');
  const found = hrefs.find((h) => /styles\.css(\?|#|$)/.test(h));
  if (found) return found.replace(/styles\.css.*$/, 'assets/icons/');
  return 'assets/icons/';
}

function load(name) {
  if (cache.has(name)) return cache.get(name);
  const p = fetch(iconBase() + name + '.svg')
    .then((r) => (r.ok ? r.text() : ''))
    .then((t) => {
      const m = t.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
      return m ? m[1] : '';
    })
    .catch(() => '');
  cache.set(name, p);
  return p;
}

/** Inline SVG glyph from the bundled Lucide set (assets/icons). */
export function Icon({ name, size = 20, strokeWidth = 1.75, color = 'currentColor', style, title, ...rest }) {
  const [inner, setInner] = React.useState('');
  React.useEffect(() => {
    let live = true;
    load(name).then((html) => { if (live) setInner(html); });
    return () => { live = false; };
  }, [name]);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      style={{ display: 'block', flex: '0 0 auto', ...style }}
      dangerouslySetInnerHTML={{ __html: (title ? '<title>' + title + '</title>' : '') + inner }}
      {...rest}
    />
  );
}
