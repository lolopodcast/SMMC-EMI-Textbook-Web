// SMMC-EMI Textbook — TTS Player v2
// Fixes: real pause/resume, speed change without restart, sticky positioning hint

(function() {
  if (!('speechSynthesis' in window)) {
    console.warn('TTS not supported in this browser');
    return;
  }

  const synth = window.speechSynthesis;
  let currentRate = 1.0;
  let preferredVoices = { en: null, zh: null };
  let utteranceQueue = [];      // remaining sentences to speak
  let currentLang = null;
  let isManuallyPaused = false; // distinguish user-pause from natural end

  const VOICE_PREFS = {
    en: [
      'Microsoft George - English (United Kingdom)',
      'Daniel',
      'Google UK English Male',
      'Microsoft Ryan Online (Natural) - English (United Kingdom)',
      'en-GB'
    ],
    zh: [
      'Microsoft HsiaoChen Online (Natural) - Chinese (Taiwan)',
      'Mei-Jia',
      'Sinji',
      'Google 國語（臺灣）',
      'zh-TW'
    ]
  };

  function pickVoice(lang) {
    const voices = synth.getVoices();
    const prefs = VOICE_PREFS[lang];
    for (const pref of prefs) {
      const exact = voices.find(v => v.name === pref);
      if (exact) return exact;
    }
    for (const pref of prefs) {
      const partial = voices.find(v => v.name.includes(pref.split(' - ')[0]));
      if (partial) return partial;
    }
    const langCode = lang === 'en' ? 'en-GB' : 'zh-TW';
    const byLang = voices.find(v => v.lang === langCode);
    if (byLang) return byLang;
    const family = voices.find(v => v.lang.startsWith(lang === 'en' ? 'en' : 'zh'));
    return family || voices[0];
  }

  function initVoices() {
    preferredVoices.en = pickVoice('en');
    preferredVoices.zh = pickVoice('zh');
  }

  if (synth.getVoices().length > 0) {
    initVoices();
  } else {
    synth.addEventListener('voiceschanged', initVoices);
  }

  function extractText(lang) {
    const article = document.querySelector('main#quarto-document-content')
                  || document.querySelector('main')
                  || document.body;
    if (!article) return '';

    const clone = article.cloneNode(true);
    const skip = clone.querySelectorAll(
      '.tts-controls, code, pre, .sourceCode, nav, .page-navigation, ' +
      '#TOC, .toc-active, script, style, .mermaid, .bmc-canvas'
    );
    skip.forEach(el => el.remove());

    let text = clone.innerText || clone.textContent || '';
    if (lang === 'en') {
      text = text.replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/g, ' ');
    }
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }

  function buildQueue(text) {
    return text.match(/[^.!?。！？]+[.!?。！？]+/g) || [text];
  }

  function speakNext() {
    if (utteranceQueue.length === 0) {
      updateStatus('');
      currentLang = null;
      return;
    }
    if (isManuallyPaused) {
      return; // wait for resume
    }
    const chunk = utteranceQueue.shift();
    const u = new SpeechSynthesisUtterance(chunk.trim());
    u.voice = preferredVoices[currentLang];
    u.lang = currentLang === 'en' ? 'en-GB' : 'zh-TW';
    u.rate = currentRate;
    u.pitch = 1.0;

    u.onstart = () => updateStatus('▶ Reading... (' + currentRate.toFixed(1) + '×)');
    u.onend = () => {
      if (!isManuallyPaused) speakNext();
    };
    u.onerror = () => {
      if (!isManuallyPaused) speakNext();
    };
    synth.speak(u);
  }

  function speak(lang) {
    synth.cancel();
    isManuallyPaused = false;
    currentLang = lang;
    const text = extractText(lang);
    if (!text) return;
    utteranceQueue = buildQueue(text);
    speakNext();
  }

  function pauseOrResume() {
    if (isManuallyPaused) {
      isManuallyPaused = false;
      speakNext();
      updateStatus('▶ Resumed');
    } else if (synth.speaking || utteranceQueue.length > 0) {
      isManuallyPaused = true;
      synth.cancel(); // stop the current sentence; queue is preserved
      updateStatus('⏸ Paused — click ⏸ again to resume');
    }
  }

  function stop() {
    synth.cancel();
    utteranceQueue = [];
    isManuallyPaused = false;
    currentLang = null;
    updateStatus('');
  }

  function setRate(delta) {
    currentRate = Math.max(0.5, Math.min(2.0, +(currentRate + delta).toFixed(2)));
    updateStatus('Speed: ' + currentRate.toFixed(1) + '×');
    // If speaking, restart current sentence at new rate
    if (synth.speaking || synth.pending) {
      const lang = currentLang;
      const remaining = [...utteranceQueue]; // preserve queue
      synth.cancel();
      // Restart: the cancelled sentence is lost but the rest plays at new rate
      utteranceQueue = remaining;
      isManuallyPaused = false;
      setTimeout(() => speakNext(), 100);
    }
  }

  function updateStatus(msg) {
    const elements = document.querySelectorAll('.tts-status');
    elements.forEach(el => { el.textContent = msg; });
  }

  window.TTS = { speak, pause: pauseOrResume, stop, setRate };

  window.addEventListener('beforeunload', () => synth.cancel());
})();
