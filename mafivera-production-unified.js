/* MAFIVERA production compatibility shim.
   The authoritative production UI lives in mafivera-market.js.
   This file intentionally does not install click handlers, preventing duplicate
   production controllers from blocking the normal Geschäfte -> Produktion flow. */
(()=>{'use strict';
window.mtrwOpenProduction=window.mtrwOpenProduction||window.production||null;
})();