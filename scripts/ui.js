/* scripts/ui.js
   Responsibilities: render UI, wire UI events, expose App.init and App.render on window.App
   Uses jQuery for DOM manipulation. Encapsulated in an IIFE to keep scope clean.
*/
(function($){
  'use strict';
  window.App = window.App || {};

  // Small helper to create entry DOM
  function createEntryCard(entry){
    const tagsHtml = (entry.tags||[]).slice(0,6).map(t=>`<span class=\"tag\">${escapeHtml(t)}</span>`).join('');
    const truncated = escapeHtml((entry.content||'')).slice(0,240);
    const moodEmoji = moodToEmoji(entry.mood || 'neutral');

    // randomize size for bento effect deterministically from id
    let sizeClass = '';
    try{
      const n = entry.id.split('-').pop().split('').reduce((s,c)=> s + c.charCodeAt(0),0);
      if(n%7===0) sizeClass='large'; else if(n%11===0) sizeClass='tall';
    }catch(e){/*ignore*/}

    const html = `
      <article class=\"entry-card ${sizeClass}\" data-id=\"${entry.id}\" tabindex=\"0\" role=\"article\">
        <div class=\"entry-title\">${escapeHtml(entry.title || window.App.Utils.shortDate(entry.createdAt))}</div>
        <div class=\"entry-content\">${truncated}</div>
        <div class=\"entry-meta\">
          <div class=\"mood\">${moodEmoji}</div>
          <div class=\"tags\">${tagsHtml}</div>
          <div class=\"date ml-auto text-xs text-gray-400\">${escapeHtml(window.App.Utils.shortDate(entry.createdAt))}</div>
        </div>
      </article>
    `;
    return $(html);
  }

  function moodToEmoji(mood){
    const map = { 'very-happy':'😄','happy':'🙂','neutral':'😐','sad':'😔','angry':'😠' };
    return map[mood] || '😐';
  }

  function escapeHtml(str){
    if(!str) return '';
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/\"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  // UI controller object
  (function bindApp(){
    // attach functions to window.App
    window.App.init = function(){
      // Wire quick UI interactions
      // Mood selection
      $(document).on('click', '.mood-btn', function(){
        $('.mood-btn').attr('aria-pressed','false').removeClass('ring-2 ring-indigo-300');
        $(this).attr('aria-pressed','true').addClass('ring-2 ring-indigo-300');
        $('#entry-form').data('selectedMood', $(this).data('mood'));
      });

      $('#today-timestamp').on('click', function(){
        $('#entry-content').val(function(i,v){
          return (v? v + '\n' : '') + 'Captured at ' + new Date().toLocaleTimeString();
        }).focus();
      });

      $('#entry-form').on('submit', function(e){
        e.preventDefault();
        try{
          const title = $('#entry-title').val().trim();
          const content = $('#entry-content').val().trim();
          if(!content && !title){
            alert('Please add a title or some content for your entry.');
            return;
          }
          const tags = window.App.Utils.normalizeTags($('#entry-tags').val());
          const mood = $(this).data('selectedMood') || '';
          const entry = {
            id: window.App.Utils.genId(),
            title: title || '',
            content: content || '',
            tags: tags,
            mood: mood,
            createdAt: window.App.Utils.nowISO()
          };
          window.App.Storage.addEntry(entry);
          // reset form gracefully
          $('#entry-title').val(''); $('#entry-content').val(''); $('#entry-tags').val(''); $('.mood-btn').attr('aria-pressed','false').removeClass('ring-2 ring-indigo-300'); $('#entry-form').removeData('selectedMood');
          // animate add
          App.render();
          // provide micro-feedback
          $('<div class=\"fixed bottom-6 right-6 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg\">Saved</div>')
            .appendTo('body').hide().fadeIn(200).delay(900).fadeOut(400, function(){ $(this).remove(); });
        }catch(err){ console.error(err); alert('Failed to save entry.'); }
      });

      // search/filter
      $('#search').on('input', function(){ App.render(); });
      $('#filter-mood').on('change', function(){ App.render(); });
      $('#clear-search').on('click', function(){ $('#search').val(''); $('#filter-mood').val(''); App.render(); });

      // export/import
      $('#export-data').on('click', function(){ window.App.File.exportEntries(); });
      $('#import-data').on('click', function(){
        // create invisible file input
        const fi = $('<input type=\"file\" accept=\"application/json\" />');
        fi.on('change', function(ev){
          const file = this.files && this.files[0];
          if(!file) return;
          const reader = new FileReader();
          reader.onload = function(){
            try{
              const ok = window.App.File.importEntries(reader.result);
              if(ok){ App.render(); alert('Import succeeded'); } else alert('Import failed');
            }catch(e){ console.error(e); alert('Import failed'); }
          };
          reader.readAsText(file);
        });
        fi.trigger('click');
      });

      // entry interactions: open edit modal on click or Enter
      $('#entries-grid').on('click', '.entry-card', function(){
        const id = $(this).data('id');
        openEditModal(id);
      }).on('keydown', '.entry-card', function(e){
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          $(this).trigger('click');
        }
      });

      // edit modal actions
      $('#cancel-edit').on('click', function(){ closeEditModal(); });
      $('#edit-form').on('submit', function(e){
        e.preventDefault();
        const id = $('#edit-id').val();
        const updated = {
          title: $('#edit-title').val().trim(),
          content: $('#edit-content').val().trim(),
          tags: window.App.Utils.normalizeTags($('#edit-tags').val())
        };
        window.App.Storage.updateEntry(id, updated);
        closeEditModal();
        App.render();
      });

      // keyboard accessibility: Escape to close modal
      $(document).on('keydown', function(e){ if(e.key==='Escape'){ closeEditModal(); } });

      // delete entry via long press context: double-click in card opens tiny menu
      $('#entries-grid').on('dblclick', '.entry-card', function(e){
        const id = $(this).data('id');
        if(confirm('Delete this entry?')){
          window.App.Storage.deleteEntry(id);
          App.render();
        }
      });

      // initial render
      App.render();
    };

    window.App.render = function(){
      try{
        const all = window.App.Storage.loadAll();
        const query = ($('#search').val()||'').toLowerCase().trim();
        const moodFilter = $('#filter-mood').val();
        let filtered = all.filter(function(e){
          if(moodFilter && e.mood !== moodFilter) return false;
          if(!query) return true;
          // search in title, content, tags
          if((e.title||'').toLowerCase().includes(query)) return true;
          if((e.content||'').toLowerCase().includes(query)) return true;
          if((e.tags||[]).some(t=> t.toLowerCase().includes(query))) return true;
          return false;
        });

        const $grid = $('#entries-grid');
        $grid.empty();

        if(filtered.length===0){ $('#empty-state').attr('hidden', false); }
        else{ $('#empty-state').attr('hidden', true); }

        // Render entries
        filtered.forEach(function(entry){
          const $card = createEntryCard(entry);
          $grid.append($card);
        });

      }catch(e){ console.error('Render failed', e); }
    };

    // Modal helpers
    function openEditModal(id){
      try{
        const entries = window.App.Storage.loadAll();
        const entry = entries.find(e=>e.id===id);
        if(!entry) return alert('Entry not found');
        $('#edit-id').val(entry.id);
        $('#edit-title').val(entry.title);
        $('#edit-content').val(entry.content);
        $('#edit-tags').val((entry.tags||[]).join(', '));
        $('#edit-modal').fadeIn(180).css('display','flex');
      }catch(e){ console.error(e); }
    }
    function closeEditModal(){ $('#edit-modal').fadeOut(120); }

  })();

})(jQuery);
