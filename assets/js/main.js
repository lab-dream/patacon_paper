(() => {
  // External project links are configured in assets/js/site-config.js.
  const cfg = window.PATACON_SITE || {};
  const paperLinks = [document.getElementById('paperBtn'), document.getElementById('paperFooterLink')].filter(Boolean);
  if (cfg.paperUrl) {
    paperLinks.forEach(link => {
      link.href = cfg.paperUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.removeAttribute('aria-disabled');
      link.classList.remove('disabled', 'disabled-link');
      link.textContent = 'Paper';
    });
  } else {
    paperLinks.forEach(link => link.addEventListener('click', event => event.preventDefault()));
  }

  const codeLinks = [document.getElementById('codeBtn'), document.getElementById('codeFooterLink')].filter(Boolean);
  if (cfg.codeUrl) {
    codeLinks.forEach(link => {
      link.href = cfg.codeUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.removeAttribute('aria-disabled');
      link.classList.remove('disabled', 'disabled-link');
      link.textContent = 'Code';
    });
  } else {
    codeLinks.forEach(link => link.addEventListener('click', event => event.preventDefault()));
  }

  const tabs = [...document.querySelectorAll('.step-tab')];
  const panels = [...document.querySelectorAll('.step-panel')];

  function activateStep(step) {
    tabs.forEach(btn => {
      const active = btn.dataset.step === String(step);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach(panel => {
      const active = panel.dataset.panel === String(step);
      panel.classList.toggle('active', active);
      panel.hidden = !active;

      const video = panel.querySelector('video.method-video');
      if (video) {
        if (active) {
          try { video.currentTime = 0; } catch (_) {}
          const play = video.play();
          if (play && play.catch) play.catch(() => {});
        } else {
          video.pause();
          try { video.currentTime = 0; } catch (_) {}
        }
      }
    });
  }

  tabs.forEach(btn => btn.addEventListener('click', () => activateStep(btn.dataset.step)));
  activateStep(1);

  // Pause looping videos when they are far off screen to reduce CPU/GPU use.
  const loops = [...document.querySelectorAll('video.loop-video')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
          const play = video.play();
          if (play && play.catch) play.catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { rootMargin: '160px 0px', threshold: 0.02 });
    loops.forEach(video => io.observe(video));
  }

  // Detail-heavy explainer videos can be clicked to inspect small labels fullscreen.
  const zoomableVideos = [...document.querySelectorAll('video.zoomable-detail-video')];
  zoomableVideos.forEach(video => {
    video.addEventListener('click', async () => {
      try {
        if (video.requestFullscreen) {
          await video.requestFullscreen();
        } else if (video.webkitRequestFullscreen) {
          video.webkitRequestFullscreen();
        } else if (video.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
        }
      } catch (_) {}
    });
  });

  const copy = document.getElementById('copyBib');
  const bib = document.querySelector('#bibtex code');
  if (copy && bib) {
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(bib.textContent);
        const old = copy.textContent;
        copy.textContent = 'Copied';
        setTimeout(() => copy.textContent = old, 1400);
      } catch (_) {
        copy.textContent = 'Select & copy';
      }
    });
  }
})();
