/* MTRW auth compatibility shim.
   The main index.html owns the single login handler.
   This file intentionally does not register a second submit handler.
*/
(function(){
  // Authentication is handled once by index.html after Supabase is initialized.
})();
// deployment trigger 2026-09-15-fix-login-double-handler
