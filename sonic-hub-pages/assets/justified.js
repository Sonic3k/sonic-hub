/* Justified gallery (Flickr / Google Photos style).
   Fills rows so every photo keeps its aspect ratio and every row spans the full width.
   Usage: SH.justify(container, photos, { rowHeight: 260, gap: 6, render: (p) => HTMLElement }) */
window.SH = window.SH || {};
SH.justify = function (container, photos, opts = {}) {
  const rowHeight = opts.rowHeight || 260;
  const gap = opts.gap ?? 6;
  const tolerance = opts.tolerance || 0.25;
  const render = opts.render || ((p) => {
    const fig = document.createElement('figure');
    fig.className = 'jg-item';
    fig.innerHTML = `<img src="${p.src}" alt="${p.caption || ''}" loading="lazy" decoding="async">`;
    return fig;
  });

  function layout() {
    const width = container.clientWidth;
    if (!width) return;
    container.innerHTML = '';
    let row = [], rowRatio = 0;
    const rows = [];
    photos.forEach((p, i) => {
      row.push(p); rowRatio += p.ratio;
      const h = (width - gap * (row.length - 1)) / rowRatio;
      if (h <= rowHeight * (1 - tolerance) || i === photos.length - 1) {
        rows.push({ items: row, height: Math.min(h, i === photos.length - 1 ? rowHeight : rowHeight * (1 + tolerance)) });
        row = []; rowRatio = 0;
      } else if (h <= rowHeight) {
        rows.push({ items: row, height: h });
        row = []; rowRatio = 0;
      }
    });
    rows.forEach((r, ri) => {
      const el = document.createElement('div');
      el.className = 'jg-row';
      el.style.display = 'flex';
      el.style.gap = gap + 'px';
      el.style.marginBottom = ri === rows.length - 1 ? '0' : gap + 'px';
      r.items.forEach((p) => {
        const item = render(p);
        item.style.height = r.height + 'px';
        item.style.width = (r.height * p.ratio) + 'px';
        item.style.flex = '0 0 auto';
        el.appendChild(item);
      });
      container.appendChild(el);
    });
  }
  layout();
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(layout, 120); });
  return { relayout: layout };
};
