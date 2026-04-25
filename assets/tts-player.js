// SMMC-EMI Textbook — TTS Player
// Uses browser's SpeechSynthesis API (no server, no API key, no MP3 files)

(function() {
  if (!('speechSynthesis' in window)) {
    console.warn('TTS not supported in this browser');
    return;
  }

  const synth = window.speechSynthesis;
  let currentUtterance = null;
  let currentRate = 1.0;
  let preferredVoices = { en: null, zh: null };

  // Preferred voice names by OS (priority order)
  const VOICE_PREFS = {
    en: [
      'Microsoft George - English (United Kingdom)', // Windows
      'Daniel',                                        // macOS/iOS (British)
      'Google UK English Male',                        // Chrome/Android
      'Microsoft Ryan Online (Natural) - English (United Kingdom)',
      'en-GB'                                          // fallback: any British
    ],
    zh: [
      'Microsoft HsiaoChen Online (Natural) - Chinese (Taiwan)', // Windows
      'Mei-Jia',                                                  // macOS/iOS
      'Sinji',                                                    // macOS (HK/TW)
      'Google 國語（臺灣）',                                       // Chrome
      'zh-TW'                                                     // fallback
    ]
  };

  function pickVoice(lang) {
    const voices = synth.getVoices();
    const prefs = VOICE_PREFS[lang];
    
    // Exact match first
    for (const pref of prefs) {
      const exact = voices.find(v => v.name === pref);
      if (exact) return exact;
    }
    // Partial match (name contains pref substring)
    for (const pref of prefs) {
      const partial = voices.find(v => v.name.includes(pref.split(' - ')[0]));
      if (partial) return partial;
    }
    // Language code fallback
    const langCode = lang === 'en' ? 'en-GB' : 'zh-TW';
    const byLang = voices.find(v => v.lang === langCode);
    if (byLang) return byLang;
    // Any language-family match
    const family = voices.find(v => v.lang.startsWith(lang === 'en' ? 'en' : 'zh'));
    return family || voices[0];
  }

  function initVoices() {
    preferredVoices.en = pickVoice('en');
    preferredVoices.zh = pickVoice('zh');
  }

  // Voices load asynchronously in Chrome
  if (synth.getVoices().length > 0) {
    initVoices();
  } else {
    synth.addEventListener('voiceschanged', initVoices);
  }

  function extractText(lang) {
    // Read the main article content, skip navigation/footer
    const article = document.querySelector('main#quarto-document-content') 
                  || document.querySelector('main') 
                  || document.body;
    if (!article) return '';

    // Clone to avoid modifying the DOM
    const clone = article.cloneNode(true);
    
    // Remove elements we don't want read aloud
    const skip = clone.querySelectorAll(
      '.tts-controls, code, pre, .sourceCode, nav, .page-navigation, ' +
      '#TOC, .toc-active, script, style, .mermaid, .bmc-canvas'
    );
    skip.forEach(el => el.remove());

    let text = clone.innerText || clone.textContent || '';
    
    // Language filter: strip the other language's content
    if (lang === 'en') {
      // Remove Chinese characters + Chinese punctuation
      text = text.replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/g, ' ');
    } else {
      // Keep CJK + minimal English (numbers, acronyms stay)
      // This is imperfect but good enough for mixed content
    }

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }

  function speak(lang) {
    if (synth.speaking || synth.pending) {
      synth.cancel();
    }
    
    const text = extractText(lang);
    if (!text) return;

    // Split into chunks — some browsers cut off long utterances
    const chunks = text.match(/[^.!?。！？]+[.!?。！？]+/g) || [text];
    
    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk.trim());
      u.voice = preferredVoices[lang];
      u.lang = lang === 'en' ? 'en-GB' : 'zh-TW';
      u.rate = currentRate;
      u.pitch = 1.0;
      
      if (i === 0) {
        u.onstart = () => updateStatus('▶ Reading...');
      }
      if (i === chunks.length - 1) {
        u.onend = () => updateStatus('');
      }
      
      synth.speak(u);
    });
  }

  function pause() {
    if (synth.speaking && !synth.paused) {
      synth.pause();
      updateStatus('⏸ Paused');
    } else if (synth.paused) {
      synth.resume();
      updateStatus('▶ Reading...');
    }
  }

  function stop() {
    synth.cancel();
    updateStatus('');
  }

  function setRate(delta) {
    currentRate = Math.max(0.5, Math.min(2.0, currentRate + delta));
    // If currently speaking, restart at new rate from current position
    // (Browser limitation: can't change rate mid-utterance)
    const status = document.querySelector('.tts-status');
    if (status) status.textContent = `Speed: ${currentRate.toFixed(1)}×`;
    setTimeout(() => updateStatus(synth.speaking ? '▶ Reading...' : ''), 1500);
  }

  function updateStatus(msg) {
    const el = document.querySelector('.tts-status');
    if (el) el.textContent = msg;
  }

  // Expose to global for button onclick
  window.TTS = { speak, pause, stop, setRate };

  // Stop speaking when user navigates away
  window.addEventListener('beforeunload', () => synth.cancel());
})();
