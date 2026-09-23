// Computes one game's timeline for a set off the main thread and hands it back one
// match at a time, so a listener tuning in partway through a chess set isn't stuck waiting on
// the page while earlier games in the set are replayed from the seed.
importScripts('engines.js', 'station.js');

self.onmessage = function(e){
  const { slot, game } = e.data;
  STATION.buildSlot(slot, game, events => self.postMessage({ slot, game, events }));
  self.postMessage({ slot, game, done: true });
};
