// ============================================================
// App Runtime Polyfills
// Runs BEFORE anything else in the React Native / Hermes bundle.
// Fixes missing browser globals that some npm packages depend on.
// ============================================================

// 1. DOMException — required by socket.io-client / engine.io-client
if (typeof global.DOMException === 'undefined') {
  const DOMExceptionPolyfill = class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name || 'DOMException';
      this.code = 0;
    }
  };
  global.DOMException = DOMExceptionPolyfill;
  globalThis.DOMException = DOMExceptionPolyfill;
}

// 2. Event — required by some event emitters that check for browser Event
if (typeof global.Event === 'undefined') {
  global.Event = class Event {
    constructor(type, options) {
      this.type = type;
      this.bubbles = (options && options.bubbles) || false;
      this.cancelable = (options && options.cancelable) || false;
    }
  };
}

// 3. EventTarget — required by some DOM-based APIs
if (typeof global.EventTarget === 'undefined') {
  global.EventTarget = class EventTarget {
    constructor() {
      this._listeners = {};
    }
    addEventListener(type, listener) {
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push(listener);
    }
    removeEventListener(type, listener) {
      if (!this._listeners[type]) return;
      this._listeners[type] = this._listeners[type].filter(l => l !== listener);
    }
    dispatchEvent(event) {
      if (!this._listeners[event.type]) return true;
      this._listeners[event.type].forEach(l => l(event));
      return true;
    }
  };
}

// 4. TextEncoder / TextDecoder — required by some socket transports
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(string) {
      const arr = new Uint8Array(string.length);
      for (let i = 0; i < string.length; i++) {
        arr[i] = string.charCodeAt(i);
      }
      return arr;
    }
  };
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(uint8array) {
      if (!uint8array) return '';
      return String.fromCharCode.apply(null, uint8array);
    }
  };
}
