import CursorEffect from "@core/CursorEffect";

declare global {
  interface Window {
    CursorEffect: typeof CursorEffect;
  }
}

window.CursorEffect = CursorEffect;
