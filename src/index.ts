import CursorEffect from "@core/CursorEffect";

declare global {
  interface Window {
    CursorEffect: typeof CursorEffect;
  }
}

window.CursorEffect = CursorEffect;

const effect = new CursorEffect();

effect.init({
  toCollide: [
    ...Array.from(document.querySelectorAll("h1")),
    ...Array.from(document.querySelectorAll("h2")),
  ],
  outerDot: {
    delay: 30,
  },
  innerDot: {
    delay: 0,
  },
});
