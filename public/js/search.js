// public/js/search.js
import { toSymbol } from './api.js';

export function mountSearch(onSubmit) {
  const input = document.getElementById('search-input');
  const clear = document.getElementById('search-clear');
  const results = document.getElementById('search-results');

  const helper = (sym) => {
    results.innerHTML = sym ? `선택된 심볼: <b class="accent">${sym}</b>` : '';
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const sym = toSymbol(input.value);
      helper(sym);
      if (sym) onSubmit(sym);
    }
  });

  clear.addEventListener('click', () => {
    input.value = '';
    results.textContent = '';
    input.focus();
  });
}
