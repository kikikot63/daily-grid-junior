// Keep one native keyboard target while the highlighted crossword cell moves.
// Predictive keyboards can compose an entire English word before committing it.
const letters=value=>String(value??'').replace(/[^a-z]/gi,'').toUpperCase();
export function bindKeyboard(input,{onText,onCompositionStart,onComposition,onCompositionEnd,onDelete,onKey,canEdit=()=>true,schedule=setTimeout,cancel=clearTimeout}){
  let composing=false,settling=false,finalText='',pending=null;
  const clear=()=>{if(pending!==null)cancel(pending);pending=null;};
  const finish=()=>{clear();settling=false;input.value='';onCompositionEnd();};
  const update=value=>{finalText=letters(value);if(canEdit())onComposition(finalText);};
  input.addEventListener('compositionstart',()=>{if(settling)finish();composing=true;onCompositionStart();});
  input.addEventListener('compositionend',event=>{
    if(!composing)return;
    update(input.value||event.data);composing=false;settling=true;
    pending=schedule(finish,30);
  });
  input.addEventListener('beforeinput',event=>{
    if(!canEdit()){if(event.cancelable)event.preventDefault();return;}
    if(composing||event.isComposing)return;
    if(settling)return;
    if(event.inputType?.startsWith('delete')&&event.cancelable){event.preventDefault();onDelete();input.value='';return;}
    if(event.cancelable&&event.data!=null&&event.inputType?.startsWith('insert')){
      event.preventDefault();onText(letters(event.data));input.value='';
    }
  });
  input.addEventListener('input',event=>{
    if(!canEdit()){input.value='';return;}
    if(composing||event.isComposing){
      if(!composing){composing=true;onCompositionStart();}
      update(input.value);return;
    }
    if(settling){
      clear();
      // The final native insertion belongs to this same composition, even if
      // the browser labels it insertText rather than insertFromComposition.
      update(input.value||event.data||finalText);pending=schedule(finish,30);return;
    }
    if(event.inputType?.startsWith('delete'))onDelete();
    else onText(letters(event.data??input.value));
    input.value='';
  });
  input.addEventListener('keydown',event=>{
    if(composing||event.isComposing||event.keyCode===229)return;
    if(settling)finish();
    onKey(event);
  });
  input.addEventListener('blur',()=>{if(composing){update(input.value);composing=false;finish();}else if(settling)finish();});
  return ()=>{clear();composing=false;settling=false;input.value='';onCompositionEnd();};
}
