// Main scripts (UTF-8)
(function () {
  // タイトルの任意改行（見た目調整）
  try {
    const titleEl = document.querySelector('.title');
    if (titleEl && !titleEl.innerHTML.includes('<wbr')) {
      titleEl.innerHTML = (titleEl.textContent || '').trim().replace('チャレンジ', '<wbr>チャレンジ');
    }
  } catch {}

  // 年度とカウントダウン設定
  const now = new Date();
  const currentYear = now.getFullYear();
  const passedOctEnd = (now.getMonth() + 1 > 10) || ((now.getMonth() + 1 === 10) && now.getDate() > 31);
  const eventYear = passedOctEnd ? currentYear + 1 : currentYear;
  const start = new Date(`${eventYear}-10-15T00:00:00+09:00`);
  const end = new Date(`${eventYear}-10-31T23:59:59+09:00`);

  const $ = (id) => document.getElementById(id);
  const dd = $("dd"), hh = $("hh"), mm = $("mm"), ss = $("ss");
  const label = $("countdown-label");
  const ended = $("ended-message");
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(now.getFullYear());
  const ey = document.getElementById("event-year");
  if (ey) ey.textContent = `（${eventYear}年）`;

  function pad(n) { return n.toString().padStart(2, "0"); }
  function diffParts(target) {
    const ms = Math.max(0, target.getTime() - Date.now());
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds, done: ms <= 0 };
  }
  function updateMode() {
    const now = Date.now();
    if (now < start.getTime()) return 'pre';
    if (now <= end.getTime()) return 'live';
    return 'post';
  }
  function tick() {
    const mode = updateMode();
    if (mode === 'pre') {
      label.textContent = '開始まで';
      const d = diffParts(start);
      dd.textContent = pad(d.days); hh.textContent = pad(d.hours); mm.textContent = pad(d.minutes); ss.textContent = pad(d.seconds);
      ended.hidden = true;
    } else if (mode === 'live') {
      label.textContent = '終了まで';
      const d = diffParts(end);
      dd.textContent = pad(d.days); hh.textContent = pad(d.hours); mm.textContent = pad(d.minutes); ss.textContent = pad(d.seconds);
      ended.hidden = true;
    } else {
      dd.textContent = hh.textContent = mm.textContent = ss.textContent = '00';
      label.textContent = '';
      ended.hidden = false;
    }
  }
  tick();
  (function schedule(){ const next = 1000 - (Date.now() % 1000); setTimeout(() => { tick(); schedule(); }, next); })();

  // ロゴのフォールバック（失敗時にテキスト表示）
  const logoImg = document.getElementById('logo');
  const logoFallback = document.getElementById('logo-fallback');
  if (logoImg && logoFallback) {
    logoImg.addEventListener('error', () => { logoImg.hidden = true; logoFallback.hidden = false; });
  }

  // CM: 6本の動画を3本ずつ表示し、自動でページ送り
  (function cmCarousel() {
    const grid = document.getElementById('cm-grid');
    if (!grid) return;
    const perPage = Number(grid.getAttribute('data-per-page') || 3);
    const intervalMs = Number(grid.getAttribute('data-interval') || 6000);
    const auto = String(grid.getAttribute('data-auto') || 'true') !== 'false';
    const items = Array.from(grid.querySelectorAll('.video-shell'));
    const dotsWrap = document.getElementById('cm-dots');
    let page = 1; let totalPages = Math.max(1, Math.ceil(items.length / perPage));
    let timer = null;

    function render() {
      const start = (page - 1) * perPage;
      const end = start + perPage;
      items.forEach((el, i) => { el.style.display = (i >= start && i < end) ? '' : 'none'; });
      if (dotsWrap) {
        const dots = Array.from(dotsWrap.querySelectorAll('.cm-dot'));
        dots.forEach((d, i) => d.classList.toggle('is-active', i === page - 1));
      }
    }

    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'cm-dot';
        btn.setAttribute('aria-label', `${i}ページ目へ`);
        btn.addEventListener('click', () => { stopAuto(); page = i; render(); startAuto(); });
        dotsWrap.appendChild(btn);
      }
    }

    function nextPage() { page = page >= totalPages ? 1 : page + 1; render(); }
    function startAuto() { if (!auto || timer || totalPages <= 1) return; timer = setInterval(() => { // 再生中の動画があればスキップ
        const playing = items.some((el) => { const v = el.querySelector('video'); return v && !v.paused && el.style.display !== 'none'; });
        if (!playing) nextPage();
      }, intervalMs); }
    function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }

    // 再生マークの表示/非表示
    items.forEach((el) => {
      const v = el.querySelector('video'); const overlay = el.querySelector('.video-overlay');
      if (!v || !overlay) return;
      const show = () => overlay.style.visibility = 'visible';
      const hide = () => overlay.style.visibility = 'hidden';
      show();
      // 初期表示で2秒地点のフレームを表示（黒画面防止）
      const SEEK_SEC = 2;
      const prime = () => {
        try {
          // duration が取れていれば終端を超えないようクランプ
          let t = SEEK_SEC;
          if (isFinite(v.duration) && v.duration > 0) {
            t = Math.min(SEEK_SEC, Math.max(0, v.duration - 0.2));
          }
          v.currentTime = t;
          v.pause();
        } catch (e) {}
      };
      v.addEventListener('loadedmetadata', prime, { once: true });
      // Safari 対策: canplay でも実行して念押し
      v.addEventListener('canplay', () => { if (v.currentTime < 0.5) prime(); }, { once: true });

      v.addEventListener('play', hide);
      v.addEventListener('pause', show);
      v.addEventListener('ended', show);
    });

    // ホバーで一時停止
    [grid, dotsWrap].filter(Boolean).forEach((el) => {
      el.addEventListener('mouseenter', stopAuto);
      el.addEventListener('mouseleave', startAuto);
      el.addEventListener('focusin', stopAuto);
      el.addEventListener('focusout', startAuto);
    });

    buildDots();
    render();
    startAuto();
  })();

  // 昨日のトップ3（名前のみ、順位表示あり）
  (async function renderTop3() {
    const wrap = document.getElementById('top3-list');
    const note = document.getElementById('top3-note');
    if (!wrap) return;

    const nowUtc = Date.now();
    const jst = new Date(nowUtc + 9 * 60 * 60 * 1000);
    const yst = new Date(jst.getTime() - 24 * 60 * 60 * 1000);
    const key = `${yst.getUTCFullYear()}-${String(yst.getUTCMonth()+1).padStart(2,'0')}-${String(yst.getUTCDate()).padStart(2,'0')}`;

    try {
      const res = await fetch('top3.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('top3.json not found');
      const data = await res.json();
      let names = [];
      if (Array.isArray(data[key])) names = data[key];
      else if (data[key] && typeof data[key] === 'object') names = [data[key]['1'], data[key]['2'], data[key]['3']].filter(Boolean);
      if (!names.length) {
        const keys = Object.keys(data || {}).sort();
        const last = keys[keys.length - 1];
        if (last) names = Array.isArray(data[last]) ? data[last] : [data[last]['1'], data[last]['2'], data[last]['3']].filter(Boolean);
        note && (note.textContent = `ランキング集計日: ${(last || key).replaceAll('-', '/')}`);
      } else {
        note && (note.textContent = `ランキング集計日: ${key.replaceAll('-', '/')}`);
      }
      wrap.innerHTML = '';
      const medalSvg = '<svg class="medal__icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2h10l-2 6H9L7 2zm5 7a6 6 0 1 1 0 12a6 6 0 0 1 0-12zm0 2.3l1.38 2.8l3.1.45l-2.24 2.17l.53 3.08L12 18.2l-2.77 1.46l.53-3.08L7.5 12.55l3.1-.45L12 11.3z"/></svg>';
      const ranks = ['gold', 'silver', 'bronze'];
      names.slice(0,3).forEach((name, idx) => {
        const card = document.createElement('div'); card.className = 'prize';
        card.style.position = 'relative';
        const medal = document.createElement('div'); medal.className = `medal ${ranks[idx] || 'gold'}`; medal.setAttribute('aria-label', `${idx+1}位`); medal.innerHTML = medalSvg;
        const body = document.createElement('div'); body.className = 'prize__body';
        const p = document.createElement('p'); p.innerHTML = `<span class="rank-label">${idx+1}</span><span class="rank-name">${name||''}</span>`;
        body.appendChild(p);
        card.appendChild(medal); card.appendChild(body); wrap.appendChild(card);
      });
    } catch (e) {
      note && (note.textContent = 'トップ3の読み込みに失敗しました。');
      try { console.error(e); } catch {}
    }
  })();
})();
