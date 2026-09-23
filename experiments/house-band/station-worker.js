// Computes a set's timeline off the main thread and hands it back one game at a
// time, so a listener tuning in partway through a chess set isn't stuck waiting on
// the page while earlier games in the set are replayed from the seed.
importScripts('engines.js', 'station.js');

self.onmessage = function(e){
  const slot = e.data.slot;
  STATION.buildSlot(slot, events => self.postMessage({ slot, events }));
  self.postMessage({ slot, done: true });
};
