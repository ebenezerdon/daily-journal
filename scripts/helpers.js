/* scripts/helpers.js
   Responsibilities: storage abstraction, id/date utilities, export/import helpers.
   Exposes: window.App.Storage and window.App.Utils
*/
(function(){
  'use strict';
  window.App = window.App || {};

  const STORAGE_KEY = 'daily-journal-v1';

  // Utility helpers
  window.App.Utils = {
    nowISO: function(){ return new Date().toISOString(); },
    shortDate: function(iso){
      try{
        const d = new Date(iso);
        return d.toLocaleString(undefined, { month: 'short', day: 'numeric' });
      }catch(e){return iso}
    },
    genId: function(){
      return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
    },
    normalizeTags: function(str){
      if(!str) return [];
      return str.split(',').map(t=>t.trim()).filter(Boolean).slice(0,10).map(t=>t.toLowerCase());
    },
    safeParse: function(json){
      try{return JSON.parse(json);}catch(e){return null}
    }
  };

  // Storage API: uses localStorage and keeps data versioned
  window.App.Storage = {
    loadAll: function(){
      try{
        const raw = localStorage.getItem(STORAGE_KEY);
        if(!raw) return [];
        const parsed = window.App.Utils.safeParse(raw);
        if(!Array.isArray(parsed)) return [];
        // Sort newest first
        return parsed.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
      }catch(e){
        console.error('Storage.loadAll failed', e);
        return [];
      }
    },
    saveAll: function(entries){
      try{
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        return true;
      }catch(e){
        console.error('Storage.saveAll failed', e);
        return false;
      }
    },
    addEntry: function(entry){
      try{
        const entries = this.loadAll();
        entries.unshift(entry);
        return this.saveAll(entries);
      }catch(e){
        console.error('Storage.addEntry failed', e);
        return false;
      }
    },
    updateEntry: function(id, updated){
      try{
        const entries = this.loadAll().map(e=> e.id===id ? Object.assign({}, e, updated) : e);
        return this.saveAll(entries);
      }catch(e){ console.error('Storage.updateEntry failed', e); return false; }
    },
    deleteEntry: function(id){
      try{
        const entries = this.loadAll().filter(e=> e.id!==id);
        return this.saveAll(entries);
      }catch(e){ console.error('Storage.deleteEntry failed', e); return false; }
    },
    exportJSON: function(){
      const all = this.loadAll();
      return JSON.stringify({ exportedAt: this.UtilsNow ? this.UtilsNow : new Date().toISOString(), entries: all }, null, 2);
    }
  };

  // small wrapper to avoid circular reference for export timestamp
  window.App.Storage.UtilsNow = window.App.Utils.nowISO;

  // Provide import/export helpers at App level
  window.App.File = {
    exportEntries: function(){
      const payload = { entries: window.App.Storage.loadAll(), exportedAt: window.App.Utils.nowISO() };
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
      const el = document.createElement('a');
      el.setAttribute('href', dataStr);
      el.setAttribute('download', 'daily-journal-export-' + (new Date().toISOString().slice(0,10)) + '.json');
      document.body.appendChild(el);
      el.click();
      el.remove();
    },
    importEntries: function(json){
      try{
        const parsed = typeof json === 'string' ? JSON.parse(json) : json;
        if(!parsed || !Array.isArray(parsed.entries)) throw new Error('Invalid import file');
        // Merge but avoid duplicates by id
        const existing = window.App.Storage.loadAll();
        const map = {};
        existing.forEach(e=>map[e.id]=e);
        parsed.entries.forEach(e=>{ if(!map[e.id]) map[e.id]=e; });
        const merged = Object.values(map).sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
        window.App.Storage.saveAll(merged);
        return true;
      }catch(e){
        console.error('Import failed', e);
        return false;
      }
    }
  };

})();
