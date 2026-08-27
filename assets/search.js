/* 列宁文库 · 全文搜索（本地离线）
   索引分片由 JS 动态注入：window.SEARCH_SHARDS 立即加载的小分片，
   window.SEARCH_SHARDS_LAZY 首次检索才加载的大分片（《列宁全集》）。
   规避 file:// CORS，不阻塞页面渲染。 */
(function () {
  'use strict';

  var q = document.getElementById('q');
  var results = document.getElementById('results');
  var meta = document.getElementById('meta');
  var loading = document.getElementById('loading');

  var SHARDS = window.SEARCH_SHARDS || [];
  var SHARDS_LAZY = window.SEARCH_SHARDS_LAZY || [];
  var EXPECT = window.SEARCH_COUNT || 0;

  var idx = [];
  var lazyStarted = false;
  var pendingTimer = null;

  function countIndex() {
    var n = 0;
    (window.SEARCH_INDEX || []).forEach(function (chunk) { n += chunk.length; });
    return n;
  }
  function buildIdx() {
    idx = [];
    (window.SEARCH_INDEX || []).forEach(function (c) { idx = idx.concat(c); });
  }
  function allLoaded() {
    return EXPECT > 0 && countIndex() >= EXPECT;
  }
  function updateStatus() {
    if (!loading) return;
    if (allLoaded()) {
      loading.style.display = 'none';
      if (meta && !meta.textContent) meta.textContent = '索引就绪：' + countIndex() + ' 篇';
      return;
    }
    loading.style.display = '';
    if (!lazyStarted) {
      loading.textContent = '核心索引已就绪（' + countIndex() + ' 篇）；输入关键词时自动载入《列宁全集》索引';
    } else {
      var n = countIndex(), pct = Math.round(n / EXPECT * 100);
      loading.textContent = '正在载入《列宁全集》索引 ' + n + '/' + EXPECT + '（' + pct + '%）…';
    }
  }
  function afterShard() {
    buildIdx();
    updateStatus();
    /* 新分片到达：若正在检索，则自动重跑纳入新数据 */
    if (q && q.value.trim()) {
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(function () { search(q.value); }, 80);
    }
  }
  function loadScript(src) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = afterShard;
    s.onerror = afterShard;
    document.body.appendChild(s);
  }
  function startLazy() {
    if (lazyStarted) return;
    lazyStarted = true;
    SHARDS_LAZY.forEach(loadScript);
  }

  /* ---------------- 检索 ---------------- */
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(text, terms) {
    if (!terms) return escapeHtml(text);
    var re = new RegExp('(' + terms.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'g');
    return escapeHtml(text).replace(re, '<mark>$1</mark>');
  }

  function snippet(text, terms, len) {
    len = len || 70;
    var hits = [];
    terms.forEach(function (t) {
      var i = -1;
      while ((i = text.indexOf(t, i + 1)) >= 0) hits.push(i);
    });
    if (!hits.length) {
      return text.slice(0, len) + (text.length > len ? '…' : '');
    }
    var c = hits[0];
    var start = Math.max(0, c - len / 2);
    var end = Math.min(text.length, c + len);
    var s = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    return highlight(s, terms);
  }

  function search(query) {
    var terms = query.trim().split(/\s+/).filter(Boolean);
    if (!terms.length) {
      results.innerHTML = '';
      meta.textContent = '输入关键词开始检索';
      return;
    }
    buildIdx();
    var out = [];
    var t0 = Date.now();
    idx.forEach(function (rec) {
      var title = rec[0], author = rec[1] || '', date = rec[2] || '',
          category = rec[3], slug = rec[4], text = rec[5];
      var head = (title + ' ' + author + ' ' + date + ' ' + category);
      var score = 0;
      var allHead = true, allText = true;
      terms.forEach(function (t) {
        var inHead = head.indexOf(t) >= 0;
        var inText = text.indexOf(t) >= 0;
        if (!inHead && !inText) allHead = false;
        if (!inText) allText = false;
        if (inHead) score += 3;
        if (inText) score += 1;
      });
      if (allHead && allText) score += 2;
      else if (!allHead && !allText) return;
      else if (allHead) score += 4;
      var headHits = terms.filter(function (t) { return head.indexOf(t) >= 0; }).length;
      out.push({ score: score, title: title, author: author, date: date,
                 category: category, slug: slug, text: text, headHits: headHits });
    });
    out.sort(function (a, b) {
      if (b.headHits !== a.headHits) return b.headHits - a.headHits;
      if (b.score !== a.score) return b.score - a.score;
      return a.title.localeCompare(b.title, 'zh');
    });
    var elapsed = Date.now() - t0;
    render(out, terms, elapsed);
  }

  function render(list, terms, ms) {
    if (!list.length) {
      if (!allLoaded()) {
        results.innerHTML = '<div class="no-result">正在载入索引，尚未命中<br><span style="font-size:.8rem">《列宁全集》索引加载完成后自动重试…</span></div>';
      } else {
        results.innerHTML = '<div class="no-result">未找到相关篇目<br><span style="font-size:.8rem">可尝试更短的关键词</span></div>';
      }
      meta.textContent = '无结果';
      return;
    }
    var extra = allLoaded() ? '' : ' · 《列宁全集》索引加载中（' + countIndex() + '/' + EXPECT + '），结果可能不全';
    meta.textContent = '命中 ' + list.length + ' 篇（' + ms + ' ms）' + extra;
    results.innerHTML = list.map(function (r) {
      return '<div class="search-result">' +
        '<div class="sr-title"><a href="article/' + r.slug + '">' + highlight(r.title, terms) + '</a></div>' +
        '<div class="sr-meta">' + r.category + (r.author ? ' · ' + escapeHtml(r.author) : '') + (r.date ? ' · ' + escapeHtml(r.date) : '') + '</div>' +
        '<div class="sr-snippet">' + snippet(r.text, terms) + '</div>' +
        '</div>';
    }).join('');
  }

  /* 输入事件：首次输入时启动《列宁全集》懒加载 */
  var debounce = null;
  function onInput() {
    startLazy();
    clearTimeout(debounce);
    debounce = setTimeout(function () { search(q.value); }, 150);
  }
  q.addEventListener('input', onInput);
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { startLazy(); clearTimeout(debounce); search(q.value); }
  });

  /* 立即加载小分片 */
  SHARDS.forEach(loadScript);
  buildIdx();
  updateStatus();
})();
