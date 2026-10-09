/* PATACON — actual LaTeX, pre-rendered with MathJax for offline SVG animation. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const entries = window.PataconLatexEquations?.entries || {};
  const templates = new Map();
  const missing = new Set();

  // Descriptive subscripts are upright. Single-letter mathematical indices
  // (k, n, etc.) retain the standard italic math style.
  function variable(base = 'q', sub = '', bar = false) {
    const head = bar ? `\\bar{${base}}` : base;
    const index = /^[A-Za-z]{2,}$/.test(String(sub)) ? `\\mathrm{${sub}}` : String(sub);
    return head + (index ? `_{${index}}` : '');
  }

  function draw(node, x, y, tex, size = 16, fill = '#111', anchor = 'start') {
    node.classList.add('patacon-latex');
    node.dataset.tex = tex;
    node.dataset.latexRendered = 'true';
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', tex);
    node.style.color = fill;
    node.style.pointerEvents = 'none';
    const title = document.createElementNS(NS, 'title');
    title.textContent = tex;
    node.replaceChildren(title);
    const equation = entries[tex];
    if (!equation) {
      // A new formula must be added to equations.json and rebuilt. Keep the
      // animation alive, and visibly expose its source instead of disappearing.
      const text = document.createElementNS(NS, 'text');
      for (const [key, value] of Object.entries({x, y, fill, 'font-size': size, 'text-anchor': anchor}))
        text.setAttribute(key, value);
      text.textContent = tex;
      node.appendChild(text);
      node.dataset.latexError = 'uncached-formula';
      if (!missing.has(tex)) { missing.add(tex); console.warn('Unbuilt LaTeX formula:', tex); }
      return node;
    }
    const scale = Number(size) / 1000;
    const [left, , width] = equation.viewBox;
    const shift = anchor === 'middle' ? width / 2 : anchor === 'end' ? width : 0;
    node.setAttribute('transform', `translate(${Number(x) - (left + shift) * scale} ${Number(y)})`);
    let template = templates.get(tex);
    if (!template) {
      template = document.createElementNS(NS, 'g');
      template.innerHTML = equation.body;
      templates.set(tex, template);
    }
    const art = template.cloneNode(true);
    art.setAttribute('transform', `scale(${scale})`);
    art.setAttribute('aria-hidden', 'true');
    node.appendChild(art);
    return node;
  }

  function render(parent, x, y, tex, size = 16, fill = '#111', anchor = 'start') {
    const node = document.createElementNS(NS, 'g');
    draw(node, x, y, tex, size, fill, anchor);
    parent.appendChild(node);
    return node;
  }

  function typeset(root = document) {
    root.querySelectorAll('[data-tex]:not([data-latex-rendered])').forEach(node => {
      const style = getComputedStyle(node);
      draw(node, Number(node.dataset.x || 0), Number(node.dataset.y || 0),
        node.dataset.tex, Number(node.dataset.size || parseFloat(style.fontSize) || 16),
        node.dataset.fill || style.fill || '#111', node.dataset.anchor || 'start');
    });
  }
  window.PataconLatex = Object.freeze({render, variable, typeset});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => typeset(), {once: true});
  else typeset();
})();
