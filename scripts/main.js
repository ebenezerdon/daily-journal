/* scripts/main.js - entry point. Calls window.App.init() and window.App.render() after ensuring contract.
   Must run after helpers.js and ui.js. Uses jQuery ready wrapper as contract requires.
*/
$(function(){
  try {
    const hasApp = !!window.App;
    const hasInit = hasApp && typeof window.App.init === 'function';
    const hasRender = hasApp && typeof window.App.render === 'function';
    if (!hasApp || !hasInit || !hasRender) {
      const details = {
        hasApp,
        hasInit,
        hasRender,
        availableKeys: hasApp ? Object.keys(window.App || {}) : [],
        hint: 'Define in scripts/ui.js: window.App = window.App || {}; App.init = function(){}; App.render = function(){};'
      };
      console.error('[Contract] Missing App.init/App.render', details);
      return;
    }
    // Initialize the application UI
    try{ window.App.init(); } catch(e){ console.error('App.init threw', e); }
    try{ window.App.render(); } catch(e){ console.error('App.render threw', e); }
  } catch (e) {
    console.error('Initialization failed', e);
  }
});
