type CallbackObject = {
  [constructorName: string]: {
    [eventName: string]: {
      callback: (...args: any) => void;
    };
  };
};

export default class EventEmitter<E extends string> {
  #callbacks: CallbackObject = {};
  #constructorName: string = this.constructor.name;

  public on(eventName: E, callback: (...args: any) => void): void {
    this.#callbacks[this.#constructorName] = {
      ...this.#callbacks[this.#constructorName],
      [eventName]: {
        callback,
      },
    };
  }

  public off(eventName: E): void {
    delete this.#callbacks[this.#constructorName][eventName];
  }

  protected trigger(eventNameOrNames: E | E[], ...args: any): void {
    if (Array.isArray(eventNameOrNames)) {
      eventNameOrNames.forEach((eventName: E) => {
        if (this.isCallbackRegistered(eventName))
          this.getCallback(eventName).call(this, ...args);
      });
    } else {
      if (this.isCallbackRegistered(eventNameOrNames))
        this.getCallback(eventNameOrNames).call(this, ...args);
    }
  }

  private isCallbackRegistered(eventName: E): boolean {
    if (
      this.#callbacks[this.#constructorName] &&
      this.#callbacks[this.#constructorName][eventName]
    ) {
      return true;
    } else {
      return false;
    }
  }

  private getCallback(eventName: string): Function {
    return this.#callbacks[this.#constructorName][eventName].callback;
  }
}
