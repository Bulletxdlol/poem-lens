const btn = document.getElementById('translate-btn');
const poemInput = document.getElementById('poem-input');
const sourceLang = document.getElementById('source-lang');
const targetLang = document.getElementById('target-lang');

const translatedPoem = document.getElementById('translated-poem');
const explanation = document.getElementById('explanation');
const culturalNotes = document.getElementById('cultural-notes');
const langBadge = document.getElementById('lang-badge');
const errorBox = document.getElementById('error-box');

function setLoading(isLoading) {
  btn.disabled = isLoading;
  if (isLoading) {
    btn.classList.add('loading');
    btn.querySelector('.btn-text').textContent = 'Translat';
  } else {
    btn.classList.remove('loading');
    btn.querySelector('.btn-text').textContent = 'Translate Poem';
  }
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
}

function hideError() {
  errorBox.classList.add('hidden');
  errorBox.textContent = '';
}

function animateIn(el) {
  el.classList.remove('result-enter');
  void el.offsetWidth;
  el.classList.add('result-enter');
}

function renderResults(data) {
  translatedPoem.classList.remove('placeholder-text');
  translatedPoem.textContent = data.translated_poem || '—';
  animateIn(translatedPoem);

  langBadge.textContent = `${data.source_language} → ${data.target_language}`;
  langBadge.classList.remove('hidden');

  explanation.classList.remove('placeholder-text');
  explanation.textContent = data.explanation || '—';
  animateIn(explanation);

  const notes = Array.isArray(data.cultural_notes) ? data.cultural_notes : [];
  culturalNotes.innerHTML = '';
  culturalNotes.classList.remove('placeholder-text');

  if (notes.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No cultural notes provided.';
    culturalNotes.appendChild(li);
  } else {
    notes.forEach((note, i) => {
      const li = document.createElement('li');
      li.textContent = note;
      li.style.animationDelay = `${i * 60}ms`;
      culturalNotes.appendChild(li);
    });
  }

  animateIn(culturalNotes);
}

btn.addEventListener('click', async () => {
  const poem = poemInput.value.trim();
  const source = sourceLang.value;
  const target = targetLang.value;

  hideError();

  if (!poem) {
    showError('Please paste a poem before translating.');
    poemInput.focus();
    return;
  }

  if (source === target) {
    showError('Source and target languages must be different.');
    return;
  }

  setLoading(true);

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poem, source_lang: source, target_lang: target }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || `Server error (${res.status}). Please try again.`);
      return;
    }

    renderResults(data);
  } catch (err) {
    showError('Network error — could not reach the server. Please check your connection.');
    console.error(err);
  } finally {
    setLoading(false);
  }
});

poemInput.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    btn.click();
  }
});
