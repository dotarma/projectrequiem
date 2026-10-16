// Short, progressive motion: the document stays visible without any animation API.
export function createMotion() {
  const query = selector => document.querySelector(selector);
  const all = selector => [...document.querySelectorAll(selector)];
  const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const running = new Map();
  const revealed = new WeakSet();
  const ease = 'cubic-bezier(.22, 1, .36, 1)';
  let observer;
  let started = false;
  let panicActive = false;

  function stop(element) {
    const animation = running.get(element);
    running.delete(element);
    animation?.cancel();
  }

  function stopAll() {
    for (const element of [...running.keys()]) stop(element);
  }

  function enabled() {
    return !preference?.matches && !document.hidden;
  }

  function play(element, frames, options = {}) {
    if (!element || !enabled() || typeof element.animate !== 'function') return;
    stop(element);
    // A browser that rejects an effect must still show the underlying content.
    try {
      const animation = element.animate(frames, {
        duration: 420, easing: ease, fill: 'backwards', ...options,
      });
      running.set(element, animation);
      const release = () => {
        if (running.get(element) === animation) running.delete(element);
      };
      animation.addEventListener('finish', release, { once: true });
      animation.addEventListener('cancel', release, { once: true });
    } catch {
      running.delete(element);
    }
  }

  function rise(element, delay = 0, distance = 16, duration = 460) {
    if (element?.contains(document.activeElement)) return;
    play(element, [
      { opacity: 0, transform: `translateY(${distance}px)` },
      { opacity: 1, transform: 'translateY(0)' },
    ], { delay, duration });
  }

  function observeSections() {
    observer?.disconnect();
    if (!enabled() || typeof window.IntersectionObserver !== 'function') return;
    try {
      observer = new window.IntersectionObserver(entries => {
        let order = 0;
        for (const { target, isIntersecting } of entries) {
          if (!isIntersecting) continue;
          observer.unobserve(target);
          if (revealed.has(target)) continue;
          revealed.add(target);
          rise(target, Math.min(order++, 3) * 55);
        }
      }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
      all('.rules-strip, .section-heading, .feature-card, .mode-browser, '
        + '.install-copy, .install-side, .faq-heading, .faq-list, .final-cta')
        .filter(element => !revealed.has(element))
        .forEach(element => observer.observe(element));
    } catch {
      observer?.disconnect();
    }
  }

  function setMetric(key, ratio) {
    const element = query(`#bar-${key}`);
    if (!element) return;
    const target = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
    if (element.style.transform === target && element.style.width === '100%') return;
    const previous = window.getComputedStyle?.(element).transform
      || element.style.transform || target;
    stop(element);
    // Persist the final state first, so cancellation/reduced motion is instant.
    element.style.width = '100%';
    element.style.transform = target;
    if (started && previous !== target) {
      play(element, [{ transform: previous }, { transform: target }], { duration: 220 });
    }
  }

  function setPanic(active) {
    const entered = active && !panicActive;
    panicActive = active;
    if (started && entered) {
      play(query('.panic-state'), [{ opacity: 0.45 }, { opacity: 1 }], { duration: 280 });
    }
  }

  function modeChanged() {
    const panel = query('#mode-panel');
    // Do not obscure a panel a keyboard reader is already inside.
    if (panel?.contains(document.activeElement)) return;
    play(panel, [
      { opacity: 0.55, transform: 'translateY(6px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 220 });
  }

  function menuOpened() { rise(query('#mobile-menu'), 0, -6, 170); }
  function dialogOpened() {
    // showModal already moved focus inside: keep that focus fully visible.
    play(query('#checksum-dialog'), [
      { transform: 'translateY(8px)' }, { transform: 'translateY(0)' },
    ], { duration: 190 });
  }

  function start() {
    if (started) return;
    started = true;
    if (enabled()) {
      all('.hero-eyebrow, #hero-heading, .hero-body, .hero-actions, .hero-note')
        .forEach((element, index) => rise(element, index * 55, 14, 440));
      rise(query('.system-preview'), 230, 18, 600);
      all('.mini-bar i').forEach((element, index) => {
        play(element, [
          { transform: 'scaleX(0)' },
          { transform: element.style.transform || 'scaleX(1)' },
        ], { delay: 300 + index * 35, duration: 650 });
      });
      // One gentle drift, then rest. Retain the mesh's existing centering.
      play(query('.hero-mesh'), [
        { transform: 'translateX(-50%) translate3d(-14px, 10px, 0) scale(.98)' },
        { transform: 'translateX(-50%) translate3d(12px, -8px, 0) scale(1.02)' },
        { transform: 'translateX(-50%) translate3d(0, 0, 0) scale(1)' },
      ], { duration: 3800, easing: 'ease-in-out' });
    }
    observeSections();
    const preferenceChanged = () => {
      stopAll();
      observeSections();
    };
    if (preference?.addEventListener) preference.addEventListener('change', preferenceChanged);
    else preference?.addListener?.(preferenceChanged);
    document.addEventListener('focusin', event => {
      for (const element of [...running.keys()]) {
        if (element.contains(event.target)) stop(element);
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAll();
    });
    window.addEventListener?.('pagehide', () => {
      stopAll();
      observer?.disconnect();
    });
    window.addEventListener?.('pageshow', event => {
      if (event.persisted) observeSections();
    });
  }

  return { start, setMetric, setPanic, modeChanged, menuOpened, dialogOpened };
}
