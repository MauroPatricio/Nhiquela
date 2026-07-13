// DOMException polyfill for socket.io-client in Hermes/React Native
if (typeof global.DOMException === 'undefined') {
  global.DOMException = class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name || 'DOMException';
    }
  };
}

if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function() {
    return this.slice().reverse();
  };
}
if (!Array.prototype.toSorted) {
  Array.prototype.toSorted = function(compareFn) {
    return this.slice().sort(compareFn);
  };
}
if (!Array.prototype.toSpliced) {
  Array.prototype.toSpliced = function(start, deleteCount, ...items) {
    const copy = this.slice();
    copy.splice(start, deleteCount, ...items);
    return copy;
  };
}
if (!Array.prototype.with) {
  Array.prototype.with = function(index, value) {
    const copy = this.slice();
    copy[index] = value;
    return copy;
  };
}

const nodeUrl = require('url');
if (typeof URL.canParse !== 'function') {
  URL.canParse = function(url, base) {
    try {
      new URL(url, base);
      return true;
    } catch (e) {
      return false;
    }
  };
}
if (typeof nodeUrl.URL.canParse !== 'function') {
  nodeUrl.URL.canParse = URL.canParse;
}
