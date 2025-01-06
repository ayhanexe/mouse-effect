import styleObjectToCssString from "style-object-to-css-string";
import merge from "lodash/merge";
import throttle from "lodash/throttle";

import EventEmitter from "@core/EventEmitter";
import Ticker from "@core/Ticker";

type CursorEffectOptions = {
  toCollide: HTMLElement[];
  innerDot: {
    width: number;
    height: number;
    largeWidth: number;
    largeHeight: number;
    delay: number;
    resizeDuration: number;
    styles: Partial<CSSStyleDeclaration>;
    innerDotID: string;
  };
  outerDot: {
    enabled: boolean;
    width: number;
    height: number;
    largeWidth: number;
    largeHeight: number;
    delay: number;
    resizeDuration: number;
    styles: Partial<CSSStyleDeclaration>;
    outerDotID: string;
  };
  rootToAppend: HTMLElement;
  rootID: string;
};

type CursorEffectOptionsPatch = {
  [key in keyof Omit<CursorEffectOptions, "rootToAppend">]?: Partial<
    CursorEffectOptions[key]
  >;
};

type CursorEffectData = {
  targetX: number;
  targetY: number;
  generalOpacity: number;
  targetGeneralOpacity: number;
  generalDelay: number;
  innerDot: {
    isColliding: boolean;
    currentX: number;
    currentY: number;
    currentWidth: number;
    currentHeight: number;
  };
  outerDot: {
    isColliding: boolean;
    currentX: number;
    currentY: number;
    currentWidth: number;
    currentHeight: number;
  };
};

type CursorEffectEvent =
  | "dom/root-created"
  | "dom/inner-dot-created"
  | "dom/outer-dot-created"
  | "dom/inner-dot-position-changed"
  | "dom/inner-dot-colliding-state-changed"
  | "dom/outer-dot-position-changed"
  | "dom/outer-dot-colliding-state-changed"
  | "styles/generated";

export default class CursorEffect extends EventEmitter<CursorEffectEvent> {
  private isInitialized: boolean = false;

  private time = new Ticker();

  private effectRoot: HTMLDivElement;
  private innerDot: HTMLDivElement;
  private outerDot: HTMLDivElement;

  private oldInnerDotCollidingElement: HTMLElement;
  private oldOuterDotCollidingElement: HTMLElement;

  private initialMouseMove: boolean = false;
  private minCursorAnimationDelay: number = 1.85

  private styles: HTMLStyleElement;

  private options: CursorEffectOptions = {
    toCollide: [],
    innerDot: {
      width: 8,
      height: 8,
      largeWidth: 15,
      largeHeight: 15,
      delay: 5,
      resizeDuration: 10,
      styles: {
        borderRadius: "50%",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
      },
      innerDotID: "effect__inner-dot",
    },
    outerDot: {
      enabled: true,
      width: 40,
      height: 40,
      largeWidth: 60,
      largeHeight: 60,
      delay: 15,
      resizeDuration: 8,
      styles: {
        border: "1px dashed rgba(0, 0, 0, 0.6)",
        borderRadius: "50%",
      },
      outerDotID: "effect__outer-dot",
    },
    rootToAppend: window.document.body,
    rootID: "effect-root",
  };

  private data: CursorEffectData = {
    targetX: window.innerWidth / 2,
    targetY: window.innerHeight / 2,
    generalOpacity: 0,
    targetGeneralOpacity: 1,
    generalDelay: 50,
    innerDot: {
      isColliding: false,
      currentX: window.innerWidth / 2,
      currentY: window.innerHeight / 2,
      currentWidth: this.options.innerDot.width,
      currentHeight: this.options.innerDot.height,
    },
    outerDot: {
      isColliding: false,
      currentX: window.innerWidth / 2,
      currentY: window.innerHeight / 2,
      currentWidth: this.options.innerDot.width,
      currentHeight: this.options.innerDot.height,
    },
  };

  constructor() {
    super();

    this.on("dom/root-created", this.appendEffectRootToTarget.bind(this));
    this.on("dom/inner-dot-created", this.appendInnerDotToTarget.bind(this));
    this.on("dom/outer-dot-created", this.appendOuterDotToTarget.bind(this));

    this.on("styles/generated", this.appendStylesToHead.bind(this));

    this.on(
      "dom/outer-dot-position-changed",
      this.checkOuterCursorColliding.bind(this)
    );
    this.on(
      "dom/inner-dot-position-changed",
      this.checkInnerCursorColliding.bind(this)
    );

    this.time.on("tick", this.handleTick.bind(this));

    window.addEventListener("mousemove", this.handleMouseMove.bind(this));
  }

  private generateStyles(): void {
    const styles = document.createElement("style");

    const outerStyle = this.options.outerDot.enabled
      ? `#${this.options.rootID} > #${this.options.outerDot.outerDotID} {
              ${styleObjectToCssString(this.options.outerDot.styles)}
              position: fixed;
              top: 0;
              left: 0;
          }`
      : "";

    styles.textContent = `
          *, ::before, ::after {
              cursor: none;
          }
      
          #${this.options.rootID} {
              width: 100vw;
              height: 100vh;
          
              position: fixed;
              top: 0;
              left: 0;
              
              z-index: 999999;
              
              pointer-events: none;
              mix-blend-mode: difference;
          }
  
          #${this.options.rootID} > #${this.options.innerDot.innerDotID} {
              ${styleObjectToCssString(this.options.innerDot.styles)}
              position: fixed;
              top: 0;
              left: 0;
          }
              
          ${outerStyle}
      `;

    this.styles = styles;
    this.trigger("styles/generated");
  }

  private appendInnerDotToTarget(): void {
    this.effectRoot.appendChild(this.innerDot);
  }

  private appendOuterDotToTarget(): void {
    this.effectRoot.appendChild(this.outerDot);
  }

  private appendStylesToHead(): void {
    window.document.head.appendChild(this.styles);
  }

  private appendEffectRootToTarget(): void {
    this.options.rootToAppend.appendChild(this.effectRoot);

    this.off("dom/root-created");
  }

  private createOuterDot(): void {
    const outerDot = window.document.createElement("div");

    outerDot.id = this.options.outerDot.outerDotID;

    this.outerDot = outerDot;
    this.trigger("dom/outer-dot-created");
  }

  private createInnerDot(): void {
    const innerDot = window.document.createElement("div");

    innerDot.id = this.options.innerDot.innerDotID;

    this.innerDot = innerDot;
    this.trigger("dom/inner-dot-created");
  }

  private createEffectRoot(): void {
    const effectRoot = window.document.createElement("div");

    effectRoot.id = this.options.rootID;

    this.effectRoot = effectRoot;
    this.trigger("dom/root-created");
  }

  private handleMouseMove(event: MouseEvent): void {
    this.data.targetX = event.clientX;
    this.data.targetY = event.clientY;
    this.initialMouseMove = true;
  }

  private checkOuterDotCollidingState(): void {
    if (this.data.innerDot.isColliding) {
      this.data.outerDot.currentWidth +=
        (this.options.outerDot.largeWidth - this.data.outerDot.currentWidth) /
        this.options.outerDot.resizeDuration;
      this.data.outerDot.currentHeight +=
        (this.options.outerDot.largeHeight - this.data.outerDot.currentHeight) /
        this.options.outerDot.resizeDuration;

      this.outerDot.style.width = `${this.data.outerDot.currentWidth}px`;
      this.outerDot.style.height = `${this.data.outerDot.currentHeight}px`;
    } else {
      this.data.outerDot.currentWidth +=
        (this.options.outerDot.width - this.data.outerDot.currentWidth) /
        this.options.outerDot.resizeDuration;
      this.data.outerDot.currentHeight +=
        (this.options.outerDot.height - this.data.outerDot.currentHeight) /
        this.options.outerDot.resizeDuration;

      this.outerDot.style.width = `${this.data.outerDot.currentWidth}px`;
      this.outerDot.style.height = `${this.data.outerDot.currentHeight}px`;
    }
  }

  private checkInnerDotCollidingState(): void {
    if (this.data.innerDot.isColliding) {
      this.data.innerDot.currentWidth +=
        (this.options.innerDot.largeWidth - this.data.innerDot.currentWidth) /
        this.options.innerDot.resizeDuration;
      this.data.innerDot.currentHeight +=
        (this.options.innerDot.largeHeight - this.data.innerDot.currentHeight) /
        this.options.innerDot.resizeDuration;

      this.innerDot.style.width = `${this.data.innerDot.currentWidth}px`;
      this.innerDot.style.height = `${this.data.innerDot.currentHeight}px`;
    } else {
      this.data.innerDot.currentWidth +=
        (this.options.innerDot.width - this.data.innerDot.currentWidth) /
        this.options.innerDot.resizeDuration;
      this.data.innerDot.currentHeight +=
        (this.options.innerDot.height - this.data.innerDot.currentHeight) /
        this.options.innerDot.resizeDuration;

      this.innerDot.style.width = `${this.data.innerDot.currentWidth}px`;
      this.innerDot.style.height = `${this.data.innerDot.currentHeight}px`;
    }
  }

  private checkCollideStatesForDotSizes(): void {
    this.checkInnerDotCollidingState();
    if (this.options.outerDot.enabled) this.checkOuterDotCollidingState();
  }

  private checkOuterCursorColliding(): void {
    let collidingElement: HTMLElement;

    const isColliding = this.options.toCollide.some((element) => {
      const elementRect: DOMRect = element.getBoundingClientRect();

      if (
        this.data.outerDot.currentX + this.options.outerDot.width >
          elementRect.x &&
        this.data.outerDot.currentX < elementRect.x + elementRect.width &&
        this.data.outerDot.currentY + this.options.outerDot.height >
          elementRect.y &&
        this.data.outerDot.currentY < elementRect.y + elementRect.height
      ) {
        collidingElement = element;
        this.data.outerDot.isColliding = true;
        return true;
      } else {
        collidingElement = null;
        this.data.outerDot.isColliding = false;
        return false;
      }
    });
    if (isColliding && this.oldOuterDotCollidingElement != collidingElement) {
      this.oldOuterDotCollidingElement = collidingElement;
      this.trigger(
        "dom/outer-dot-colliding-state-changed",
        isColliding,
        collidingElement
      );
    } else if (
      !isColliding &&
      this.oldOuterDotCollidingElement != collidingElement
    ) {
      this.oldOuterDotCollidingElement = null;
      this.trigger("dom/outer-dot-colliding-state-changed", false, null);
    }
  }

  private checkInnerCursorColliding(): void {
    let collidingElement: HTMLElement;

    const isColliding = this.options.toCollide.some((element) => {
      const elementRect: DOMRect = element.getBoundingClientRect();

      if (
        this.data.innerDot.currentX + this.data.innerDot.currentWidth / 2 >
          elementRect.x &&
        this.data.innerDot.currentX + this.data.innerDot.currentWidth / 2 <
          elementRect.x + elementRect.width &&
        this.data.innerDot.currentY + this.data.innerDot.currentHeight / 2 >
          elementRect.y &&
        this.data.innerDot.currentY + this.data.innerDot.currentHeight / 2 <
          elementRect.y + elementRect.height
      ) {
        collidingElement = element;
        this.data.innerDot.isColliding = true;
        return true;
      } else {
        collidingElement = null;
        this.data.innerDot.isColliding = false;
        return false;
      }
    });
    if (isColliding && this.oldInnerDotCollidingElement != collidingElement) {
      this.oldInnerDotCollidingElement = collidingElement;
      this.trigger(
        "dom/inner-dot-colliding-state-changed",
        isColliding,
        collidingElement
      );
    } else if (
      !isColliding &&
      this.oldInnerDotCollidingElement != collidingElement
    ) {
      this.oldInnerDotCollidingElement = null;
      this.trigger("dom/inner-dot-colliding-state-changed", false, null);
    }
  }

  private updateOuterCursorPosition(): void {
    let calculatedX =
      this.data.targetX -
      this.data.outerDot.currentX -
      this.data.outerDot.currentWidth / 2;
    let calculatedY =
      this.data.targetY -
      this.data.outerDot.currentHeight / 2 -
      this.data.outerDot.currentY;

    this.data.outerDot.currentX += calculatedX / Math.max(this.options.outerDot.delay, this.minCursorAnimationDelay);
    this.data.outerDot.currentY += calculatedY / Math.max(this.options.outerDot.delay, this.minCursorAnimationDelay);

    this.outerDot.style.transform = `translate3d(${this.data.outerDot.currentX}px, ${this.data.outerDot.currentY}px, 0)`;

    this.trigger("dom/outer-dot-position-changed");
  }

  private updateInnerCursorPosition(): void {
    let calculatedX =
      this.data.targetX -
      this.data.innerDot.currentWidth / 2 -
      this.data.innerDot.currentX;
    let calculatedY =
      this.data.targetY -
      this.data.innerDot.currentHeight / 2 -
      this.data.innerDot.currentY;

    this.data.innerDot.currentX += calculatedX / Math.max(this.options.innerDot.delay, this.minCursorAnimationDelay);
    this.data.innerDot.currentY += calculatedY / Math.max(this.options.innerDot.delay, this.minCursorAnimationDelay);

    this.innerDot.style.transform = `translate3d(${this.data.innerDot.currentX}px, ${this.data.innerDot.currentY}px, 0)`;

    this.trigger("dom/inner-dot-position-changed");
  }

  private checkInitialPositionChange(): void {
    if (this.initialMouseMove) {
      this.data.generalOpacity +=
        (this.data.targetGeneralOpacity - this.data.generalOpacity) /
        this.data.generalDelay;

      this.effectRoot.style.opacity = `${this.data.generalOpacity}`;
    } else {
      this.effectRoot.style.opacity = `${this.data.generalOpacity}`;
    }
  }

  private handleTick(): void {
    if (this.isInitialized) {
      this.updateInnerCursorPosition();
      this.checkCollideStatesForDotSizes();
      this.checkInitialPositionChange();
      if (this.options.outerDot.enabled) this.updateOuterCursorPosition();
    }
  }

  private patchOptions(options: CursorEffectOptionsPatch): Promise<void> {
    return new Promise((resolve) => {
      merge(this.options, options);
      resolve();
    });
  }

  public async init(options?: CursorEffectOptionsPatch): Promise<void> {
    if (options) await this.patchOptions(options);

    this.createEffectRoot();
    if (this.options.outerDot.enabled) this.createOuterDot();
    this.createInnerDot();
    this.generateStyles();

    this.isInitialized = true;
  }

  public destroy(): void {
    window.removeEventListener("mousemove", this.handleMouseMove);
    this.time.off("tick");

    this.effectRoot.remove();
    this.styles.remove();
  }
}
