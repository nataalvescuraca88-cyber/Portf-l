// Enhancements use native animation APIs; text and navigation work without them.
(() => {
  const page = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const limited = () => reduced.matches || page.classList.contains('motion-paused');
  const animations = new Map();
  const resetters = [];
  const sectionVisibility = new Map();
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'motion-toggle';
  toggle.setAttribute('aria-label', 'Pausar animações');
  document.querySelector('footer').append(toggle);

  const logo = document.querySelector('.mark svg');
  const logoPath = logo.querySelector('path');
  const outline = logoPath.cloneNode(false);
  outline.classList.add('logo-outline');
  outline.setAttribute('aria-hidden', 'true');
  outline.setAttribute('pathLength', '1');
  outline.removeAttribute('fill');
  logo.append(outline);

  const hero = document.querySelector('#inicio');
  const art = document.querySelector('.hero-art');
  const light = document.createElement('div');
  light.className = 'hero-light';
  light.setAttribute('aria-hidden', 'true');
  const spotlight = document.createElement('div');
  spotlight.className = 'hero-spotlight';
  light.append(spotlight);
  [14, 31, 53, 72, 88].forEach((top, index) => {
    const streak = document.createElement('span');
    streak.className = 'hero-streak';
    streak.style.setProperty('--streak-top', top + '%');
    streak.style.setProperty('--streak-delay', (-index * 2.8) + 's');
    streak.style.setProperty('--streak-duration', (13 + index * 1.5) + 's');
    light.append(streak);
  });
  hero.prepend(light);
  const visual = document.querySelector('.project-visual');
  const scan = document.createElement('div');
  scan.className = 'project-scan';
  scan.setAttribute('aria-hidden', 'true');
  visual.append(scan);

  function wireDepth(surface, target, kind) {
    let bounds = null;
    let pending = 0;
    let position = null;
    function reset() {
      cancelAnimationFrame(pending);
      pending = 0;
      bounds = null;
      position = null;
      target.style.removeProperty('--depth-x');
      target.style.removeProperty('--depth-y');
      target.style.removeProperty('--code-angle');
      target.style.removeProperty('--spot-x');
      target.style.removeProperty('--spot-y');
      surface.style.removeProperty('--light-x');
      surface.style.removeProperty('--light-y');
    }
    function measure() { bounds = surface.getBoundingClientRect(); }
    surface.addEventListener('pointerenter', measure);
    surface.addEventListener('pointermove', event => {
      if (limited() || !pointer.matches || event.pointerType !== 'mouse') return;
      if (!bounds) measure();
      position = { x: event.clientX, y: event.clientY };
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        if (!bounds || !position || limited()) return;
        const x = Math.max(-1, Math.min(1, (position.x - bounds.left) / bounds.width * 2 - 1));
        const y = Math.max(-1, Math.min(1, (position.y - bounds.top) / bounds.height * 2 - 1));
        if (kind === 'logo') {
          target.style.setProperty('--depth-x', (-y * 7) + 'deg');
          target.style.setProperty('--depth-y', (x * 10) + 'deg');
        } else if (kind === 'code') {
          target.style.setProperty('--code-angle', (x * 8) + 'deg');
          surface.style.setProperty('--light-x', ((x + 1) * 50) + '%');
          surface.style.setProperty('--light-y', ((y + 1) * 50) + '%');
        } else if (kind === 'light') {
          target.style.setProperty('--spot-x', (x * bounds.width / 2) + 'px');
          target.style.setProperty('--spot-y', (y * bounds.height / 2) + 'px');
        }
      });
    });
    surface.addEventListener('pointerleave', reset);
    surface.addEventListener('pointercancel', reset);
    window.addEventListener('scroll', reset, { passive: true });
    window.addEventListener('resize', reset, { passive: true });
    window.addEventListener('blur', reset);
    resetters.push(reset);
  }
  wireDepth(hero, light, 'light');
  wireDepth(art, logo, 'logo');
  const codeVisual = visual.querySelector('.project-code');
  if (codeVisual) wireDepth(visual, codeVisual, 'code');

  function animateHeading(heading) {
    if (limited() || typeof heading.animate !== 'function') return;
    // Clip reveals the existing copy; no text splitting or duplicate accessible text.
    const animation = heading.animate([
      { clipPath: 'inset(0 0 70% 0)', opacity: .5, translate: '0 14px' },
      { clipPath: 'inset(0)', opacity: 1, translate: '0 0' }
    ], { duration: 850, easing: 'cubic-bezier(.16,1,.3,1)' });
    animations.set(heading, animation);
    const clear = () => animations.delete(heading);
    animation.finished.then(clear, clear);
  }

  if ('IntersectionObserver' in window) {
    const regions = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        sectionVisibility.set(entry.target, entry.isIntersecting);
        entry.target.classList.toggle('motion-outside', !entry.isIntersecting);
        entry.target.querySelectorAll('h2').forEach(heading => {
          const animation = animations.get(heading);
          if (!animation) return;
          if (entry.isIntersecting && !document.hidden) animation.play();
          else animation.pause();
        });
      });
    });
    document.querySelectorAll('main > section, footer').forEach(section => regions.observe(section));
    const headings = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || document.hidden) return;
        // An ancestor reveal must be open before a nested title starts its own entrance.
        const reveal = entry.target.closest('.reveal-ready');
        if (reveal) reveal.classList.add('is-visible');
        animateHeading(entry.target);
        headings.unobserve(entry.target);
      });
    }, { threshold: .2 });
    document.querySelectorAll('main h2').forEach(heading => headings.observe(heading));
  }

  function updateControls() {
    if (limited()) {
      animations.forEach(animation => animation.cancel());
      animations.clear();
      document.querySelectorAll('.reveal-ready').forEach(element => element.classList.add('is-visible'));
    }
    resetters.forEach(reset => reset());
    const paused = limited();
    toggle.textContent = reduced.matches ? 'Movimento reduzido' : paused ? 'Ativar animações' : 'Pausar animações';
    toggle.setAttribute('aria-label', toggle.textContent);
    toggle.disabled = reduced.matches;
    // Synchronize the original magnetic controls and parallax when toggled.
    if (typeof applyMotionPreference === 'function') applyMotionPreference();
  }
  toggle.addEventListener('click', () => {
    page.classList.toggle('motion-paused');
    updateControls();
  });
  function updateVisibility() {
    page.classList.toggle('page-hidden', document.hidden);
    animations.forEach((animation, heading) => {
      const region = heading.closest('main > section');
      if (document.hidden || sectionVisibility.get(region) === false) animation.pause();
      else if (!limited()) animation.play();
    });
    if (document.hidden) resetters.forEach(reset => reset());
  }
  reduced.addEventListener('change', updateControls);
  pointer.addEventListener('change', updateControls);
  document.addEventListener('visibilitychange', updateVisibility);
  updateVisibility();
  updateControls();
})();
