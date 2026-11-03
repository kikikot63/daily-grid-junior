// Keep an IME transaction on its original cell until its final input event settles.
let compositionTail=null;
const letter=value=>String(value??'').replace(/[^a-z]/gi,'').slice(-1).toUpperCase();

export function bindLetterInput(input,{onValue,onAdvance,canEdit=()=>true,schedule=setTimeout,cancel=clearTimeout}) {
  let composing=false, pending=null, finalValue='', committed=letter(input.value);
  input.maxLength=1;
  input.setAttribute('autocorrect','off');
  input.setAttribute('autocomplete','off');
  input.setAttribute('autocapitalize','characters');
  input.spellcheck=false;
  input.lang='en';
  const focused=()=>input.ownerDocument.activeElement===input;
  const clear=()=>{if(pending!==null){cancel(pending);pending=null;}};
  const commit=(value,advance=true)=>{
    if(!input.isConnected||!canEdit()){input.value=committed;return;}
    committed=letter(value);
    input.value=committed;
    onValue(committed);
    if(committed&&advance&&focused())onAdvance();
  };
  const finish=(advance=true)=>{
    clear();
    const value=finalValue;
    finalValue='';
    compositionTail={input,value:letter(value)};
    commit(value,advance);
  };
  const queueFinal=value=>{
    clear();
    finalValue=value;
    // Mobile engines may send their final input after compositionend.
    pending=schedule(()=>finish(),30);
  };
  const staleComposition=event=>
    compositionTail&&compositionTail.input!==input&&
    /Composition/i.test(event.inputType||'')&&
    letter(event.data??input.value)===compositionTail.value;

  input.addEventListener('focus',()=>{committed=letter(input.value);input.select();});
  input.addEventListener('compositionstart',()=>{
    clear();composing=true;compositionTail=null;
  });
  input.addEventListener('compositionend',event=>{
    composing=false;
    const value=letter(event.data||input.value);
    if(!value||(!event.data&&value===committed)){clear();input.value=committed;return;}
    queueFinal(value);
  });
  input.addEventListener('beforeinput',event=>{
    if(!canEdit()){
      if(event.cancelable)event.preventDefault();
      return;
    }
    if(staleComposition(event)){
      if(event.cancelable)event.preventDefault();
      input.value=committed;return;
    }
    if(composing||event.isComposing)return;
    if(pending!==null){
      if(event.data!==null&&event.data!==undefined){
        if(event.cancelable)event.preventDefault();
        queueFinal(event.data);
      }
      return;
    }
    if(event.cancelable&&event.data!==null&&event.data!==undefined&&
       ['insertText','insertReplacementText','insertFromPaste'].includes(event.inputType)){
      // Own the insertion once; the browser must not insert again after focus moves.
      event.preventDefault();
      compositionTail=null;
      if(letter(event.data))commit(event.data);
      else input.value=committed;
    }
  });
  input.addEventListener('input',event=>{
    if(!canEdit()){input.value=committed;return;}
    if(staleComposition(event)){input.value=committed;return;}
    if(composing||event.isComposing)return;
    if(pending!==null){queueFinal(event.data??input.value);return;}
    // A trailing event for the previous cell must never advance the current cell.
    if(!focused()){input.value=committed;return;}
    commit(event.inputType?.startsWith('delete')?'':event.data??input.value);
  });
  input.addEventListener('blur',()=>{if(pending!==null)finish(false);});
  input.addEventListener('keydown',event=>{
    // Changing direction/backspace while composing belongs to the keyboard.
    if(composing||event.isComposing||event.keyCode===229){event.stopImmediatePropagation();return;}
    if(canEdit()&&['Backspace','Delete'].includes(event.key))committed='';
  });
}
