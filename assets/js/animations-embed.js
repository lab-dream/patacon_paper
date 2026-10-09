(() => {
  'use strict';

  // Each iframe keeps its own SVG animation and playback clock. Enlarging never
  // moves/reloads the iframe; only its existing shell changes presentation.
  const entries = [...document.querySelectorAll('.patacon-animation-shell')]
    .map(shell => ({
      shell, frame: shell.querySelector('iframe.patacon-animation-frame'),
      id: shell.dataset.animation, channel: shell.dataset.channel,
      expanded: false, placeholder: null, previousFocus: null,
      inertElements: [], returnPosition: null, backButton: null
    }))
    .filter(entry => entry.frame);
  if (!entries.length) return;

  const localOrigin = location.protocol === 'file:' || location.origin === 'null';
  const targetOrigin = localOrigin ? '*' : location.origin;
  const HISTORY_KEY = '__pataconExpandedAnimation';
  const HISTORY_KIND = 'patacon-animation-view-v1';
  let modal = null;
  let closePending = false;
  let pagePresentation = null;
  let restoreJob = 0;

  function send(entry, type, extra = {}) {
    entry.frame.contentWindow?.postMessage({channel: entry.channel, type, ...extra}, targetOrigin);
  }

  function update(entry) {
    const bounds = entry.frame.getBoundingClientRect();
    const near = bounds.width > 0 && bounds.height > 0 &&
      bounds.bottom > -160 && bounds.top < innerHeight + 160;
    const panel = entry.shell.closest('.step-panel');
    const visible = !document.hidden && (modal
      ? modal === entry
      : near && (!panel || !panel.hidden));
    send(entry, 'visibility', {visible});
  }
  function fitExpandedToViewport() {
    if (!modal) return;
    const view = window.visualViewport;
    const bounds = view
      ? {left: view.offsetLeft, top: view.offsetTop, width: view.width, height: view.height}
      : {left: 0, top: 0, width: innerWidth, height: innerHeight};
    for (const [name, value] of Object.entries(bounds)) {
      modal.shell.style.setProperty(`--expanded-${name}`, `${value}px`);
    }
  }
  const updateAll = () => { fitExpandedToViewport(); entries.forEach(update); };

  function setBackgroundInert(entry, disabled) {
    if (disabled) {
      entry.inertElements = [];
      let current = entry.shell;
      while (current && current !== document.body) {
        const parent = current.parentElement;
        if (!parent) break;
        for (const sibling of parent.children) {
          if (sibling !== current) {
            entry.inertElements.push([sibling, sibling.inert]);
            sibling.inert = true;
          }
        }
        current = parent;
      }
    } else {
      for (const [element, wasInert] of entry.inertElements) element.inert = wasInert;
      entry.inertElements = [];
    }
  }

  function historyView(state = history.state) {
    const view = state && typeof state === 'object' ? state[HISTORY_KEY] : null;
    return view && view.kind === HISTORY_KIND && entries.some(e => e.id === view.id)
      ? view : null;
  }

  function position(value) {
    return value && Number.isFinite(value.x) && Number.isFinite(value.y)
      ? {x: value.x, y: value.y} : {x: window.scrollX, y: window.scrollY};
  }

  function ensurePanelVisible(entry) {
    const panel = entry.shell.closest('.step-panel');
    if (panel?.hidden) {
      const tab = [...document.querySelectorAll('.step-tab')]
        .find(button => button.dataset.step === panel.dataset.panel);
      tab?.click();
    }
  }

  function showExpanded(entry, savedPosition) {
    if (entry.expanded) return;
    if (modal && modal !== entry) hideExpanded(modal);
    if (restoreJob) { cancelAnimationFrame(restoreJob); restoreJob = 0; }
    ensurePanelVisible(entry);

    entry.returnPosition = position(savedPosition);
    entry.previousFocus = document.activeElement;
    if (!pagePresentation) {
      pagePresentation = {
        overflow: document.body.style.overflow,
        scrollBehavior: document.documentElement.style.scrollBehavior,
        scrollRestoration: 'scrollRestoration' in history ? history.scrollRestoration : null
      };
    }
    document.documentElement.style.scrollBehavior = 'auto';
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    entry.placeholder = document.createElement('div');
    entry.placeholder.className = 'patacon-animation-placeholder';
    entry.placeholder.setAttribute('aria-hidden', 'true');
    entry.placeholder.style.height = `${entry.shell.getBoundingClientRect().height}px`;
    entry.shell.before(entry.placeholder);

    entry.expanded = true;
    modal = entry;
    fitExpandedToViewport();
    entry.shell.classList.add('is-expanded');
    entry.shell.setAttribute('role', 'dialog');
    entry.shell.setAttribute('aria-modal', 'true');
    entry.shell.setAttribute('aria-label', entry.frame.title);
    entry.backButton.tabIndex = 0;
    document.body.style.overflow = 'hidden';
    setBackgroundInert(entry, true);
    send(entry, 'expanded', {expanded: true});
    entry.backButton.focus({preventScroll: true});
    updateAll();
  }

  function hideExpanded(entry) {
    if (!entry?.expanded) return;
    const returnPosition = entry.returnPosition;
    const previousFocus = entry.previousFocus;
    setBackgroundInert(entry, false);
    entry.expanded = false;
    entry.shell.classList.remove('is-expanded');
    entry.shell.removeAttribute('role');
    entry.shell.removeAttribute('aria-modal');
    entry.shell.removeAttribute('aria-label');
    entry.backButton.tabIndex = -1;
    entry.placeholder?.remove();
    entry.placeholder = null;
    if (modal === entry) modal = null;
    if (pagePresentation) document.body.style.overflow = pagePresentation.overflow;
    send(entry, 'expanded', {expanded: false});

    // Restore the exact pre-enlarge location, not the top of the page. Keep
    // restoration manual until after popstate's native scroll restoration step.
    const restorePosition = () => {
      if (!modal && returnPosition) window.scrollTo(returnPosition.x, returnPosition.y);
    };
    if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') {
      previousFocus.focus({preventScroll: true});
    }
    restorePosition();
    if (restoreJob) cancelAnimationFrame(restoreJob);
    restoreJob = requestAnimationFrame(() => {
      restorePosition();
      restoreJob = requestAnimationFrame(() => {
        restoreJob = 0;
        restorePosition();
        if (!modal && pagePresentation) {
          document.documentElement.style.scrollBehavior = pagePresentation.scrollBehavior;
          if (pagePresentation.scrollRestoration !== null) {
            history.scrollRestoration = pagePresentation.scrollRestoration;
          }
          pagePresentation = null;
        }
        updateAll();
      });
    });
    updateAll();
  }

  function open(entry) {
    if (closePending || entry.expanded) return;
    const savedPosition = modal?.returnPosition || {x: window.scrollX, y: window.scrollY};
    const replacingView = !!historyView();
    const state = history.state && typeof history.state === 'object' ? {...history.state} : {};
    state[HISTORY_KEY] = {kind: HISTORY_KIND, id: entry.id, ...savedPosition};
    try {
      // Same URL and one extra entry: Browser Back closes the view, while
      // Forward can reopen it. Closing via a button/ESC also consumes this entry.
      if (replacingView) history.replaceState(state, '', location.href);
      else history.pushState(state, '', location.href);
    } catch (error) {
      // Enlarge/close still works when a host explicitly disables History API.
      console.warn('Animation navigation history is unavailable.', error);
    }
    showExpanded(entry, savedPosition);
  }

  function close() {
    if (!modal || closePending) return;
    const view = historyView();
    if (view?.id === modal.id) {
      closePending = true;
      try { history.back(); }
      catch (_) { closePending = false; hideExpanded(modal); }
    } else hideExpanded(modal);
  }

  function followHistory(state) {
    closePending = false;
    const view = historyView(state);
    if (view) {
      const entry = entries.find(e => e.id === view.id);
      showExpanded(entry, view);
    } else if (modal) hideExpanded(modal);
  }
  window.addEventListener('popstate', event => followHistory(event.state));

  for (const entry of entries) {
    const toolbar = document.createElement('div');
    toolbar.className = 'patacon-animation-toolbar';
    const back = document.createElement('button');
    back.className = 'patacon-animation-back';
    back.type = 'button';
    back.tabIndex = -1;
    back.setAttribute('aria-label', 'Back to the page');
    back.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m9 4-6 6 6 6M3 10h14"/></svg><span>Back to page</span>';
    back.addEventListener('click', close);
    const title = document.createElement('span');
    title.className = 'patacon-animation-toolbar-title';
    title.textContent = entry.frame.title;
    toolbar.append(back, title);
    entry.shell.prepend(toolbar);
    entry.backButton = back;
    entry.frame.addEventListener('load', () => {
      send(entry, 'expanded', {expanded: entry.expanded});
      update(entry);
    });
  }

  window.addEventListener('message', event => {
    if (!localOrigin && event.origin !== location.origin) return;
    const entry = entries.find(e => event.source === e.frame.contentWindow);
    if (!entry || !event.data || event.data.channel !== entry.channel) return;
    const message = event.data;
    if (message.type === 'ready') {
      send(entry, 'expanded', {expanded: entry.expanded});
      update(entry);
    } else if (message.type === 'toggle-expand') {
      if (entry.expanded) close(); else open(entry);
    } else if (message.type === 'close-expand' && modal === entry) close();
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(records => {
      for (const record of records) {
        const entry = entries.find(e => e.frame === record.target);
        if (entry) update(entry);
      }
    }, {rootMargin: '160px 0px', threshold: .02});
    entries.forEach(e => observer.observe(e.frame));
  } else window.addEventListener('scroll', updateAll, {passive: true});
  if ('MutationObserver' in window) {
    const observer = new MutationObserver(updateAll);
    document.querySelectorAll('.step-panel').forEach(panel =>
      observer.observe(panel, {attributes: true, attributeFilter: ['hidden', 'class']}));
  }
  document.querySelectorAll('.step-tab').forEach(tab => tab.addEventListener('click', () => {
    requestAnimationFrame(() => {
      const entry = entries.find(e => e.shell.closest('.step-panel')?.dataset.panel === tab.dataset.step);
      if (entry) send(entry, 'restart');
      updateAll();
    });
  }));
  window.addEventListener('resize', updateAll, {passive: true});
  // Keep the enlarged shell inside the *visible* viewport on mobile, including
  // toolbar changes and a zoomed/panned page, rather than offscreen at layout y=0.
  window.visualViewport?.addEventListener('resize', updateAll, {passive: true});
  window.visualViewport?.addEventListener('scroll', fitExpandedToViewport, {passive: true});
  document.addEventListener('visibilitychange', updateAll);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal) { event.preventDefault(); close(); }
  });
  // Restore an expanded view after Reload or a browser-history restoration.
  window.addEventListener('pageshow', () => { followHistory(history.state); updateAll(); });
  followHistory(history.state);
  updateAll();
})();
