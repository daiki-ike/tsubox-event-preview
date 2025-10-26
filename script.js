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

  let confettiTriggered = false;

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

      // イベント終了後、紙吹雪を1度だけ実行
      if (!confettiTriggered && typeof confetti !== 'undefined') {
        confettiTriggered = true;

        // 連続して紙吹雪を降らせる
        const duration = 5 * 1000; // 5秒間
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min, max) {
          return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);

          // トップ3エリアから紙吹雪を発射
          confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
          }));
          confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
          }));
        }, 250);
      }
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

  // ランキング表示機能（1-10位、前日比較付き）
  (async function renderRankings() {
    const top3Wrap = document.getElementById('top3-list');
    const rankings410Wrap = document.getElementById('rankings-4-10-list');
    const note = document.getElementById('top3-note');
    if (!top3Wrap) return;

    const nowUtc = Date.now();
    const jst = new Date(nowUtc + 9 * 60 * 60 * 1000);
    const key = `${jst.getUTCFullYear()}-${String(jst.getUTCMonth()+1).padStart(2,'0')}-${String(jst.getUTCDate()).padStart(2,'0')}`;

    try {
      const res = await fetch('rankings.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('rankings.json not found');
      const data = await res.json();
      let rankings = [];

      // 今日のデータを取得、なければ最新のデータを使用
      if (Array.isArray(data[key])) {
        rankings = data[key];
      } else {
        const keys = Object.keys(data || {}).sort();
        const last = keys[keys.length - 1];
        if (last && Array.isArray(data[last])) {
          rankings = data[last];
          note && (note.textContent = `ランキング集計日: ${last.replaceAll('-', '/')}`);
        }
      }

      if (rankings.length === 0) {
        note && (note.textContent = 'ランキングデータがありません');
        return;
      } else if (!note.textContent) {
        note && (note.textContent = `ランキング集計日: ${key.replaceAll('-', '/')}`);
      }

      // 矢印と変動を計算する関数
      function getChangeIndicator(rank, prevRank) {
        if (prevRank === null || prevRank === undefined) {
          return '<span class="ranking-change new">NEW</span>';
        }
        const diff = prevRank - rank;
        if (diff > 0) {
          return `<span class="ranking-change up">↑</span>`;
        } else if (diff < 0) {
          return `<span class="ranking-change down">↓</span>`;
        } else {
          return '<span class="ranking-change same">←</span>';
        }
      }

      // トップ3の表示
      const medalSvg = '<svg class="medal__icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2h10l-2 6H9L7 2zm5 7a6 6 0 1 1 0 12a6 6 0 0 1 0-12zm0 2.3l1.38 2.8l3.1.45l-2.24 2.17l.53 3.08L12 18.2l-2.77 1.46l.53-3.08L7.5 12.55l3.1-.45L12 11.3z"/></svg>';
      const ranks = ['gold', 'silver', 'bronze'];
      top3Wrap.innerHTML = '';

      rankings.slice(0, 3).forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'prize';
        card.style.position = 'relative';

        const medal = document.createElement('div');
        medal.className = `medal ${ranks[idx] || 'gold'}`;
        medal.setAttribute('aria-label', `${idx+1}位`);
        medal.innerHTML = medalSvg;

        const body = document.createElement('div');
        body.className = 'prize__body';

        // 名前を区切り文字で分割（, や ・ に対応）
        const names = (item.name || '').split(/[,、・]/).map(n => n.trim()).filter(n => n);
        const nameHtml = names.length > 1
          ? `<div class="rank-name-multi">${names.map(n => `<span class="name-part">${n}</span>`).join('')}</div>`
          : `<span class="rank-name">${item.name || ''}</span>`;

        const p = document.createElement('p');
        p.innerHTML = `${nameHtml}${getChangeIndicator(item.rank, item.prevRank)}`;

        body.appendChild(p);
        card.appendChild(medal);
        card.appendChild(body);
        top3Wrap.appendChild(card);
      });

      // 4-10位の表示
      if (rankings410Wrap && rankings.length > 3) {
        rankings410Wrap.innerHTML = '';
        rankings.slice(3, 10).forEach((item) => {
          const rankItem = document.createElement('div');
          rankItem.className = 'ranking-item';

          // 名前を区切り文字で分割（, や ・ に対応）
          const names = (item.name || '').split(/[,、・]/).map(n => n.trim()).filter(n => n);
          const nameHtml = names.length > 1
            ? `<div class="ranking-name-multi">${names.map(n => `<span class="name-part">${n}</span>`).join('')}</div>`
            : `<div class="ranking-name">${item.name || ''}</div>`;

          rankItem.innerHTML = `
            <div class="ranking-number">${item.rank}</div>
            ${nameHtml}
            ${getChangeIndicator(item.rank, item.prevRank)}
          `;
          rankings410Wrap.appendChild(rankItem);
        });
      }
    } catch (e) {
      note && (note.textContent = 'ランキングの読み込みに失敗しました。');
      try { console.error(e); } catch {}
    }
  })();

  // 昨日のトップ3投稿
  (async function renderDailyTop3Posts() {
    const grid = document.getElementById('daily-posts-grid');
    const note = document.getElementById('daily-top3-note');
    if (!grid) return;

    const nowUtc = Date.now();
    const jst = new Date(nowUtc + 9 * 60 * 60 * 1000);
    const key = `${jst.getUTCFullYear()}-${String(jst.getUTCMonth()+1).padStart(2,'0')}-${String(jst.getUTCDate()).padStart(2,'0')}`;

    try {
      const res = await fetch('daily-top3.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('daily-top3.json not found');
      const data = await res.json();
      let posts = [];

      // 今日のデータを取得、なければ最新のデータを使用
      if (Array.isArray(data[key])) {
        posts = data[key];
      } else {
        const keys = Object.keys(data || {}).sort();
        const last = keys[keys.length - 1];
        if (last && Array.isArray(data[last])) {
          posts = data[last];
          note && (note.textContent = `集計日: ${last.replaceAll('-', '/')}`);
        }
      }

      if (posts.length === 0) {
        note && (note.textContent = '昨日のトップ3投稿データがありません');
        return;
      } else if (!note.textContent) {
        note && (note.textContent = `集計日: ${key.replaceAll('-', '/')}`);
      }

      // 投稿カードを生成（固定で3枚）
      grid.innerHTML = '';
      const groupUrl = 'https://www.facebook.com/groups/342734216486824';

      posts.slice(0, 3).forEach((post) => {
        const card = document.createElement('a');
        card.className = 'daily-post-card-simple';
        card.href = groupUrl;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';

        const name = document.createElement('p');
        name.className = 'daily-post-name';
        name.textContent = post.name;

        const likes = document.createElement('div');
        likes.className = 'daily-post-likes';
        likes.innerHTML = `<span>${post.likes || 0}</span> ♡`;

        card.appendChild(name);
        card.appendChild(likes);
        grid.appendChild(card);
      });
    } catch (e) {
      note && (note.textContent = '昨日のトップ3投稿の読み込みに失敗しました。');
      try { console.error('Daily top3 posts error:', e); } catch {}
    }
  })();
})();
