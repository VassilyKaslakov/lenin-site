/* 列宁文库 · 阅读模式：主题切换 / 字号调节 / 字数统计 */
(function () {
  'use strict';

  var LS = (function () {
    try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return localStorage; }
    catch (e) { return null; }          // file:// 下偶发不可用 → 静默降级
  })();

  var THEMES = ['sepia', 'dark'];
  var html = document.documentElement;

  function getTheme() {
    return LS && LS.getItem('lenin-theme') || 'sepia';
  }
  function applyTheme(t) {
    if (THEMES.indexOf(t) < 0) t = 'sepia';
    html.setAttribute('data-theme', t);
    if (LS) LS.setItem('lenin-theme', t);
  }

  /* 字号：root font-size，±2px，14–22px */
  function getFont() {
    var v = LS && parseInt(LS.getItem('lenin-font'), 10);
    return v >= 14 && v <= 22 ? v : 16;
  }
  function applyFont(v) {
    v = Math.max(14, Math.min(22, v));
    html.style.fontSize = v + 'px';
    if (LS) LS.setItem('lenin-font', v);
  }

  /* 字数统计 */
  function wordCount() {
    var el = document.querySelector('.article-body');
    var out = document.querySelector('[data-wc]');
    if (!el || !out) return;
    var n = el.textContent.replace(/\s+/g, '').length;
    var m = Math.max(1, Math.round(n / 400));
    out.textContent = '本页约 ' + n.toLocaleString('en-US') + ' 字 · 约 ' + m + ' 分钟';
  }

  /* ================= 移动端增强 ================= */

  /* 长页目录抽屉：正文带 id 的标题 ≥30 个时才在工具条注入「目」按钮 */
  function initToc() {
    var body = document.querySelector('.article-body');
    var bar = document.querySelector('.reader-controls');
    if (!body || !bar) return;
    var hs = body.querySelectorAll('h2[id], h3[id], h4[id]');
    if (hs.length < 30) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'toc-toggle';
    btn.title = '目录';
    btn.textContent = '目';
    var wc = bar.querySelector('.wc');
    if (wc) bar.insertBefore(btn, wc); else bar.appendChild(btn);

    var backdrop = document.createElement('div');
    backdrop.className = 'toc-backdrop';
    backdrop.hidden = true;

    var drawer = document.createElement('div');
    drawer.className = 'toc-drawer';
    drawer.hidden = true;

    var head = document.createElement('div');
    head.className = 'toc-drawer__head';
    var title = document.createElement('p');
    title.className = 'toc-drawer__title';
    title.textContent = '目　录';
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'toc-drawer__close';
    closeBtn.textContent = '关　闭';
    head.appendChild(title);
    head.appendChild(closeBtn);

    var list = document.createElement('ol');
    list.className = 'toc-drawer__list';
    var items = [];
    for (var i = 0; i < hs.length; i++) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + hs[i].id;
      a.textContent = (hs[i].textContent || '').replace(/\s+/g, ' ').trim();
      li.appendChild(a);
      list.appendChild(li);
      items.push({ el: hs[i], li: li });
    }
    drawer.appendChild(head);
    drawer.appendChild(list);
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    var offsets = null;
    var current = -1;

    function measure() {
      offsets = [];
      for (var i = 0; i < items.length; i++) offsets.push(items[i].el.offsetTop);
    }

    /* 二分找出当前所在篇目，高亮之 */
    function markCurrent(y) {
      if (!offsets) measure();
      var lo = 0, hi = offsets.length - 1, idx = -1, probe = y + 140;
      while (lo <= hi) {
        var mid = (lo + hi) >> 1;
        if (offsets[mid] <= probe) { idx = mid; lo = mid + 1; } else { hi = mid - 1; }
      }
      if (idx === current) return;
      if (current >= 0) items[current].li.classList.remove('is-current');
      if (idx >= 0) items[idx].li.classList.add('is-current');
      current = idx;
    }

    function open() {
      if (!offsets) measure();
      drawer.hidden = false;
      backdrop.hidden = false;
      document.body.classList.add('toc-open');
      markCurrent(window.pageYOffset || 0);
      if (current >= 0) {
        var li = items[current].li;
        var top = li.offsetTop - list.offsetTop;      /* 换算到列表内坐标 */
        if (top < list.scrollTop || top + li.offsetHeight > list.scrollTop + list.clientHeight) {
          list.scrollTop = Math.max(0, top - list.clientHeight / 2);
        }
      }
    }
    function close() {
      drawer.hidden = true;
      backdrop.hidden = true;
      document.body.classList.remove('toc-open');
    }

    btn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (!drawer.hidden && (e.key === 'Escape' || e.keyCode === 27)) close();
    });
    /* 点篇目：先解锁背景滚动，再让浏览器走默认的锚点跳转 */
    list.addEventListener('click', function (e) {
      var a = e.target;
      while (a && a !== list && a.tagName !== 'A') a = a.parentNode;
      if (a && a !== list) close();
    });
    window.addEventListener('resize', function () { offsets = null; });
  }

  /* 返回顶部：滚动 600px 后出现（CSS 只在手机显示） */
  function initBackTop() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'back-top';
    btn.title = '返回顶部';
    btn.textContent = '↑';
    btn.addEventListener('click', function () { window.scrollTo(0, 0); });
    document.body.appendChild(btn);

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        var y = window.pageYOffset || document.documentElement.scrollTop || 0;
        btn.classList.toggle('is-on', y > 600);
      });
    }, { passive: true });
  }

  /* 分类卡折叠：手机上限 700px 生效，点标题收起/展开（默认全展开） */
  function initCatalogFold() {
    var grid = document.querySelector('.catalog-grid');
    if (!grid) return;
    var mq = window.matchMedia ? window.matchMedia('(max-width: 700px)') : null;
    grid.addEventListener('click', function (e) {
      if (mq && !mq.matches) return;
      var t = e.target;
      if (t && t.tagName === 'A') return;
      var h = t;
      while (h && h !== grid && h.tagName !== 'H3') h = h.parentNode;
      if (!h || h === grid) return;
      h.parentNode.classList.toggle('collapsed');
    });
  }

  function init() {
    applyTheme(getTheme());
    applyFont(getFont());

    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var cur = html.getAttribute('data-theme');
        var next = cur === 'dark' ? 'sepia' : 'dark';
        applyTheme(next);
        btn.textContent = next === 'dark' ? '☀' : '☾';
        btn.title = next === 'dark' ? '切换到浅色' : '切换到深色';
      });
    }
    var fd = document.getElementById('font-down');
    var fu = document.getElementById('font-up');
    if (fd) fd.addEventListener('click', function () { applyFont(getFont() - 2); });
    if (fu) fu.addEventListener('click', function () { applyFont(getFont() + 2); });

    /* 浮动标语 + 名言卡 开关 */
    function getSloganOn() {
      return !(LS && LS.getItem('lenin-slogan') === 'off');
    }
    function applySlogan(on) {
      var els = document.querySelectorAll('.float-slogan, .float-quote');
      for (var i = 0; i < els.length; i++) els[i].hidden = !on;
      var btn = document.getElementById('slogan-toggle');
      if (btn) btn.classList.toggle('off', !on);
      if (LS) LS.setItem('lenin-slogan', on ? 'on' : 'off');
    }
    var st = document.getElementById('slogan-toggle');
    if (st) {
      st.addEventListener('click', function () { applySlogan(!getSloganOn()); });
    }
    applySlogan(getSloganOn());

    /* 侧栏图片 + 锤镰水印 开关 */
    function getImagesOn() {
      return !(LS && LS.getItem('lenin-images') === 'off');
    }
    function applyImages(on) {
      var els = document.querySelectorAll('.era-frame, .hs-watermark');
      for (var i = 0; i < els.length; i++) els[i].hidden = !on;
      var btn = document.getElementById('images-toggle');
      if (btn) btn.classList.toggle('off', !on);
      if (LS) LS.setItem('lenin-images', on ? 'on' : 'off');
    }
    var it = document.getElementById('images-toggle');
    if (it) {
      it.addEventListener('click', function () { applyImages(!getImagesOn()); });
    }
    applyImages(getImagesOn());

    /* 列宁名言：随机一句，点击换下一句 */
    var QUOTES = [
      ['学习，学习，再学习！', '—— 列宁 · 《宁肯少些，但要好些》· 1923'],
      ['共产主义就是苏维埃政权加全国电气化。', '—— 列宁 · 全俄苏维埃第八次代表大会报告 · 1920'],
      ['爱国主义就是千百年来巩固起来的对自己的祖国的一种最深厚的感情。', '—— 列宁 · 《皮季里姆·索罗金的宝贵自供》· 1918'],
      ['我们一定要给自己提出这样的任务：第一是学习，第二是学习，第三还是学习。', '—— 列宁 · 《宁肯少些，但要好些》· 1923']
    ];
    var q = document.getElementById('float-quote');
    if (q) {
      var qt = document.getElementById('float-quote-text');
      var qs = document.getElementById('float-quote-src');
      var qi = Math.floor(Math.random() * QUOTES.length);
      function showQuote(i) {
        qi = (i + QUOTES.length) % QUOTES.length;
        qt.textContent = QUOTES[qi][0];
        qs.textContent = QUOTES[qi][1];
      }
      showQuote(qi);
      q.addEventListener('click', function () { showQuote(qi + 1); });
    }

    /* 侧栏轮换画廊：每 7 秒切下一张 */
    function initRotator(id) {
      var box = document.getElementById(id);
      if (!box) return;
      var slides = box.querySelectorAll('.era-slide');
      if (slides.length < 2) return;
      var i = 0;
      setInterval(function () {
        slides[i].classList.remove('is-active');
        i = (i + 1) % slides.length;
        slides[i].classList.add('is-active');
      }, 7000);
    }
    initRotator('era-left');
    initRotator('era-right');

    /* 保持按钮图标与当前主题一致 */
    if (btn) {
      var cur = html.getAttribute('data-theme');
      btn.textContent = cur === 'dark' ? '☀' : '☾';
      btn.title = cur === 'dark' ? '切换到浅色' : '切换到深色';
    }
    wordCount();

    /* 移动端增强 */
    initToc();
    initBackTop();
    initCatalogFold();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
