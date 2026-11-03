function isMotionLimited() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('motion-paused'); }
const menu = document.querySelector('.menu');
const navigation = document.querySelector('#navigation');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
function closeMenu() {
  navigation.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
}
menu.addEventListener('click', () => {
  const isOpen = menu.getAttribute('aria-expanded') === 'true';
  navigation.classList.toggle('open', !isOpen);
  menu.setAttribute('aria-expanded', String(!isOpen));
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menu.focus();
  }
});
if ('IntersectionObserver' in window) {
  const activeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navigation.querySelectorAll('a').forEach(link => {
        const active = link.hash === '#' + entry.target.id;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-10% 0px -65% 0px', threshold: 0 });
  document.querySelectorAll('main section[id]').forEach(section => activeObserver.observe(section));
}
document.querySelector('#year').textContent = new Date().getFullYear();

// Reveal only after the observer is ready; keyboard focus always reveals content.
const revealElements = Array.from(document.querySelectorAll(
  '.section-label, .about-layout > *, .heading-row, .skill-list article, .project, .contact .eyebrow, .contact h2, .contact-bottom, footer'
));
let revealObserver;
if ('IntersectionObserver' in window && !isMotionLimited()) {
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  revealElements.forEach((element, index) => {
    element.style.setProperty('--reveal-delay', (index % 3 * 85) + 'ms');
    revealObserver.observe(element);
    // Hash targets and content already on screen must be available immediately.
    if (element.getBoundingClientRect().top < window.innerHeight) {
      element.classList.add('is-visible');
    }
    element.classList.add('reveal-ready');
  });
}
document.addEventListener('focusin', event => {
  const element = event.target.closest('.reveal-ready');
  if (element) element.classList.add('is-visible');
});

// Native scrolling stays in control. One scheduled frame updates decorative layers.
const root = document.documentElement;
const header = document.querySelector('.header');
const heroArt = document.querySelector('.hero-art');
const projectVisual = document.querySelector('.project-visual');
let scrollFrame = null;
function updateScrollMotion() {
  scrollFrame = null;
  const y = Math.max(0, window.scrollY);
  const maxScroll = root.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? Math.min(1, y / maxScroll) : 0;
  const projectRect = projectVisual.getBoundingClientRect();
  root.style.setProperty('--scroll-progress', String(progress));
  header.classList.toggle('is-scrolled', y > 24);
  const canMove = !isMotionLimited();
  heroArt.style.setProperty('--hero-shift', canMove ? Math.min(y * 0.065, 34) + 'px' : '0px');
  const projectShift = Math.max(-18, Math.min(18, (window.innerHeight / 2 - projectRect.top) * 0.045));
  projectVisual.style.setProperty('--project-shift', canMove ? projectShift + 'px' : '0px');
}
function scheduleScrollMotion() {
  if (scrollFrame === null) scrollFrame = requestAnimationFrame(updateScrollMotion);
}
window.addEventListener('scroll', scheduleScrollMotion, { passive: true });
window.addEventListener('resize', scheduleScrollMotion, { passive: true });
window.addEventListener('pageshow', scheduleScrollMotion);
scheduleScrollMotion();

const motionButtons = Array.from(document.querySelectorAll('.button, .whatsapp-float, .nav-contact, .menu'));
function resetMagnet(element) {
  element.style.setProperty('--magnet-x', '0px');
  element.style.setProperty('--magnet-y', '0px');
}
motionButtons.forEach(button => {
  button.addEventListener('pointermove', event => {
    if (isMotionLimited() || !finePointer.matches || event.pointerType !== 'mouse') return;
    const bounds = button.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) * 0.1;
    const y = (event.clientY - bounds.top - bounds.height / 2) * 0.16;
    button.style.setProperty('--magnet-x', Math.max(-7, Math.min(7, x)) + 'px');
    button.style.setProperty('--magnet-y', Math.max(-5, Math.min(5, y)) + 'px');
  });
  button.addEventListener('pointerleave', () => resetMagnet(button));
  button.addEventListener('blur', () => resetMagnet(button));
  button.addEventListener('click', event => {
    if (isMotionLimited()) return;
    const bounds = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'click-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    const x = event.detail === 0 ? bounds.width / 2 : event.clientX - bounds.left;
    const y = event.detail === 0 ? bounds.height / 2 : event.clientY - bounds.top;
    ripple.style.setProperty('--ripple-x', x + 'px');
    ripple.style.setProperty('--ripple-y', y + 'px');
    ripple.style.setProperty('--ripple-size', Math.hypot(bounds.width, bounds.height) * 2 + 'px');
    button.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 700);
  });
});
function applyMotionPreference() {
  if (isMotionLimited()) {
    if (revealObserver) revealObserver.disconnect();
    revealElements.forEach(element => element.classList.add('is-visible'));
    document.querySelectorAll('.click-ripple').forEach(ripple => ripple.remove());
  }
  motionButtons.forEach(resetMagnet);
  scheduleScrollMotion();
}
if (typeof motionPreference.addEventListener === 'function') {
  motionPreference.addEventListener('change', applyMotionPreference);
  finePointer.addEventListener('change', applyMotionPreference);
}

// Reveal project cards in sequence; keep them visible when motion is limited.
if ('IntersectionObserver' in window && !isMotionLimited()) {
  const cards = document.querySelectorAll('.reference-card');
  const galleryObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('gallery-visible'); galleryObserver.unobserve(entry.target); }
    });
  }, {threshold: 0.12});
  cards.forEach((card, index) => { card.style.setProperty('--card-delay', (index % 3 * 100) + 'ms'); card.classList.add('gallery-ready'); galleryObserver.observe(card); });
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) { galleryObserver.disconnect(); cards.forEach(card => card.classList.add('gallery-visible')); }
  });
}
