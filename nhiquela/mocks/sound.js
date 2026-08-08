/**
 * Mock para react-native-sound
 *
 * O módulo nativo RNSound não está compilado no dev client.
 * Esta implementação é um no-op puro que implementa toda a API
 * da classe Sound sem nenhuma dependência nativa.
 */

class Sound {
  static MAIN_BUNDLE = '';
  static DOCUMENT = '';
  static LIBRARY = '';
  static CACHES = '';

  static setActive() {}
  static setCategory() {}
  static setMode() {}
  static enable() {}

  _loaded = false;
  _playing = false;
  _duration = 0;
  _numberOfChannels = 0;
  _volume = 1;
  _pan = 0;
  _numberOfLoops = 0;
  _speed = 1;
  _pitch = 1;

  constructor(filename, basePath, callback) {
    if (typeof basePath === 'function') {
      setTimeout(() => basePath(null, { duration: 0, numberOfChannels: 0 }), 0);
    } else if (typeof callback === 'function') {
      setTimeout(() => callback(null, { duration: 0, numberOfChannels: 0 }), 0);
    }
  }

  isLoaded() { return false; }
  play(onEnd) { if (onEnd) setTimeout(() => onEnd(true), 0); return this; }
  pause(cb) { if (cb) setTimeout(cb, 0); return this; }
  stop(cb) { if (cb) setTimeout(cb, 0); return this; }
  reset() { return this; }
  release() { return this; }
  getNumberOfChannels() { return this._numberOfChannels; }
  getDuration() { return this._duration; }
  getVolume() { return this._volume; }
  setVolume(v) { this._volume = v; return this; }
  getPan() { return this._pan; }
  setPan(v) { this._pan = v; return this; }
  getNumberOfLoops() { return this._numberOfLoops; }
  setNumberOfLoops(v) { this._numberOfLoops = v; return this; }
  getCurrentTime(cb) { if (cb) cb(0, false); }
  setCurrentTime(v) { return this; }
  getSpeed() { return this._speed; }
  setSpeed(v) { this._speed = v; return this; }
  getPitch() { return this._pitch; }
  setPitch(v) { this._pitch = v; }
  enableInSilenceMode() {}
  setCategory() {}
  setSpeakerphoneOn() {}
  isPlaying() { return false; }
}

module.exports = Sound;
