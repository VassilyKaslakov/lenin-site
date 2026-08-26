/* 列宁文库 · 全文搜索（本地离线，window.SEARCH_INDEX 由分片 <script> 填充） */
(function () {
  'use strict';

  var q = document.getElementById('q');
  var results = document.getElementById('results');
  var meta = document.getElementById('meta');
  var loading = document.getElementById('loading');

  var idx = [];
  var loaded = 0;
  var EXPECT = 513;   // 除主页外全部篇目

  function countIndex() {
    var n = 0;
    (window.SEARCH_INDEX || []).forEach(function (chunk) { n += chunk.length; });
    return n;
  }

  function checkLoaded() {
    var n = countIndex();
    if (n >= EXPECT) {
      if (loading) loading.style.display = 'none';
      if (meta) meta.textContent = '索引就绪：' + n + ' 篇';
      return true;
    }
    return false;
  }

  /* 分片 script 加载回调：每片加载后重试检查 */
  window.__searchChunkLoaded = function () {
    if (!checkLoaded()) {
      if (loading) loading.textContent = '正在载入索引 ' + countIndex() + '/' + EXPECT + ' …';
    }
  };

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
    var out = [];
    idx = [];
    (window.SEARCH_INDEX || []).forEach(function (chunk) { idx = idx.concat(chunk); });
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
        if (inHead) score += inHead ? 3 : 0;
        if (inText) score += 1;
      });
      if (allHead && allText) score += 2;   // 标题+正文都命中
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
      results.innerHTML = '<div class="no-result">未找到相关篇目<br><span style="font-size:.8rem">可尝试更短的关键词</span></div>';
      meta.textContent = '无结果';
      return;
    }
    meta.textContent = '命中 ' + list.length + ' 篇（' + ms + ' ms）';
    results.innerHTML = list.map(function (r) {
      return '<div class="search-result">' +
        '<div class="sr-title"><a href="article/' + r.slug + '">' + highlight(r.title, terms) + '</a></div>' +
        '<div class="sr-meta">' + r.category + (r.author ? ' · ' + escapeHtml(r.author) : '') + (r.date ? ' · ' + escapeHtml(r.date) : '') + '</div>' +
        '<div class="sr-snippet">' + snippet(r.text, terms) + '</div>' +
        '</div>';
    }).join('');
  }

  var debounce = null;
  function onInput() {
    clearTimeout(debounce);
    debounce = setTimeout(function () { search(q.value); }, 150);
  }
  q.addEventListener('input', onInput);
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { clearTimeout(debounce); search(q.value); }
  });

  /* 等所有分片加载完再允许搜索（加载中也可搜索，search() 会合并当前已加载） */
  checkLoaded();
})();
