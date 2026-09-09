// Refuses browser page zoom on iOS.
//
// Safari has ignored "user-scalable=no" in the viewport meta since iOS 10, so
// the meta tag alone does not stop a pinch. Two things still have to be turned
// down from script: Safari's own gesture* events, which is what actually scales
// the page, and the two-finger touchmove behind them.
//
// preventDefault does not stop propagation, so the games' own two-finger
// gestures (camera orbit, panel pinch, look pad) keep receiving these events.
// Single-finger touches are never touched, so menus still scroll and the
// controls still work. Double-tap zoom is handled in CSS via touch-action.
(function () {
  'use strict';

  const refuse = (event) => {
    event.preventDefault();
  };

  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, refuse, { passive: false });
  }

  document.addEventListener('touchmove', (event) => {
    if (event.touches.length > 1) event.preventDefault();
  }, { passive: false });
})();
