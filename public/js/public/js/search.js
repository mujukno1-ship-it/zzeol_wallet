// public/js/search.js
// 검색 모듈 (UMD 스타일) — window.Search 로 노출
(function (global) {
  const KEY = {
    UP: 38, DOWN: 40, ENTER: 13, ESC: 27
  };

  function debounce(fn, ms) {
    let t; 
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  function norm(s='') {
    return (s + '').trim().toLowerCase();
  }

  function highlight(text, q) {
    if (!q) return text;
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
    return text.replace(re, '<mark>$1</mark>');
  }

  async function fetchUpbitMarkets() {
    // 심볼/이름 기본 소스가 없을 때 자동으로 업비트 마켓 목록을 불러옵니다.
    // [{symbol:'BTC', name:'Bitcoin'}, ...] 형태로 변환
    const res = await fetch('https://api.upbit.com/v1/market/all?isDetails=false');
    const data = await res.json();
    // KRW-XXX 만 필터링하고 영문심볼 뽑기
    return data
      .filter(m => m.market && m.market.startsWith('KRW-'))
      .map(m => ({
        symbol: m.market.replace('KRW-', '').toUpperCase(),
        name: m.english_name || m.korean_name || m.market
      }));
  }

  const Search = {
    _els: {}, _list: [], _cursor: -1, _onPick: null, _onQuery: null,
    _max: 10, _saveKey: 'search:lastQuery',

    async init(opts = {}) {
      const {
        input = '#search-input',
        clear = '#search-clear',
        results = '#search-results',
        source = null,        // [{symbol, name}] 배열. 없으면 업비트에서 자동 로드
        onPick = null,        // 항목 선택(엔터/클릭) 콜백
        onQuery = null,       // 질의 변경 콜백 (디바운스 적용 이전의 원문)
        maxResults = 10,
        placeholder = '코인명/심볼 검색…'
      } = opts;

      this._els.input   = document.querySelector(input);
      this._els.clear   = document.querySelector(clear);
      this._els.results = document.querySelector(results);
      if (!this._els.input || !this._els.results) return console.warn('[Search] elements not found');

      this._max = maxResults;
      this._onPick = onPick;
      this._onQuery = onQuery;

      // 데이터 소스 준비
      try {
        this._list = Array.isArray(source) && source.length ? source : (await fetchUpbitMarkets());
      } catch (e) {
        console.warn('[Search] market load failed', e);
        this._list = [];
      }

      // UI 세팅
      this._els.input.setAttribute('autocomplete', 'off');
      this._els.input.placeholder = placeholder;

      const last = localStorage.getItem(this._saveKey);
      if (last) this._els.input.value = last;

      // 이벤트
      const debounced = debounce((q) => this._search(q), 150);

      this._els.input.addEventListener('input', (e) => {
        const q = e.target.value;
        if (this._onQuery) this._onQuery(q);
        localStorage.setItem(this._saveKey, q);
        debounced(q);
      });

      this._els.input.addEventListener('keydown', (e) => {
        const items = Array.from(this._els.results.querySelectorAll('li'));
        if (!items.length) return;

        if (e.keyCode === KEY.DOWN) { // ↓
          e.preventDefault();
          this._cursor = (this._cursor + 1) % items.length;
          this._moveCursor(items);
        } else if (e.keyCode === KEY.UP) { // ↑
          e.preventDefault();
          this._cursor = (this._cursor - 1 + items.length) % items.length;
          this._moveCursor(items);
        } else if (e.keyCode === KEY.ENTER) {
          e.preventDefault();
          if (this._cursor >= 0) items[this._cursor].click();
        } else if (e.keyCode === KEY.ESC) {
          this.clear();
        }
      });

      if (this._els.clear) {
        this._els.clear.addEventListener('click', () => this.clear());
      }

      // 초기 검색
      this._search(this._els.input.value);
    },

    clear() {
      this._els.input.value = '';
      localStorage.removeItem(this._saveKey);
      this._render([]);
      this._cursor = -1;
      if (this._onQuery) this._onQuery('');
    },

    _moveCursor(items) {
      items.forEach(el => el.classList.remove('active'));
      if (this._cursor >= 0) items[this._cursor].classList.add('active');
    },

    _search(q = '') {
      const nq = norm(q);
      if (!nq) { this._render([]); return; }

      const found = this._list
        .filter(x => norm(x.symbol).includes(nq) || norm(x.name).includes(nq))
        .slice(0, this._max);

      this._render(found, nq);
      this._cursor = -1;
    },

    _render(list, q='') {
      const ul = document.createElement('ul');
      ul.className = 'search-list';

      list.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span class="sym">${highlight(item.symbol, q)}</span>
          <span class="nm">${highlight(item.name, q)}</span>
        `;
        li.addEventListener('click', () => {
          if (this._onPick) this._onPick(item);
          this._els.input.value = item.symbol;
          localStorage.setItem(this._saveKey, item.symbol);
          this._render([]);
        });
        ul.appendChild(li);
      });

      this._els.results.innerHTML = '';
      this._els.results.appendChild(ul);
      if (!list.length) this._els.results.innerHTML = '';
    }
  };

  // 스타일(아주 간단)
  const css = `
  .search-wrap{position:relative;max-width:420px}
  .search-wrap input{width:100%;padding:10px 36px 10px 12px;border-radius:10px;border:1px solid #2a2f3a;background:#0f1523;color:#eee}
  .search-wrap button{position:absolute;right:6px;top:6px;padding:6px 8px;border:0;border-radius:8px;background:#1e2533;color:#bcd;cursor:pointer}
  .search-list{position:absolute;z-index:20;left:0;right:0;margin:6px 0 0;padding:6px;background:#0f1523;border:1px solid #2a2f3a;border-radius:10px;max-height:260px;overflow:auto}
  .search-list li{display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer}
  .search-list li:hover,.search-list li.active{background:#182132}
  .search-list .sym{font-weight:700}
  .search-list .nm{opacity:.7}
  mark{background:#2a5fff33;padding:0 2px;border-radius:3px}
  `;
  const style = document.createElement('style');
  style.innerHTML = css;
  document.head.appendChild(style);

  global.Search = Search;
})(window);
