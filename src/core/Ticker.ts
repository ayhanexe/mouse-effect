import EventEmitter from "@core/EventEmitter";

export type TickerEvent = "tick";

export default class Ticker extends EventEmitter<TickerEvent> {
  private currentTime = Date.now();
  private deltaTime = Date.now() - this.currentTime;

  constructor() {
    super();

    this.tick();
  }

  private tick() {
    const now = Date.now();
    this.deltaTime = now - this.currentTime;
    this.currentTime = now;

    this.trigger("tick", this.deltaTime);

    window.requestAnimationFrame(this.tick.bind(this));
  }
}
