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

    /* 浮动标语开关 */
    function getSloganOn() {
      return !(LS && LS.getItem('lenin-slogan') === 'off');
    }
    function applySlogan(on) {
      var el = document.getElementById('float-slogan');
      var btn = document.getElementById('slogan-toggle');
      if (el) el.hidden = !on;
      if (btn) btn.classList.toggle('off', !on);
      if (LS) LS.setItem('lenin-slogan', on ? 'on' : 'off');
    }
    var st = document.getElementById('slogan-toggle');
    if (st) {
      st.addEventListener('click', function () { applySlogan(!getSloganOn()); });
    }
    applySlogan(getSloganOn());

    /* 保持按钮图标与当前主题一致 */
    if (btn) {
      var cur = html.getAttribute('data-theme');
      btn.textContent = cur === 'dark' ? '☀' : '☾';
      btn.title = cur === 'dark' ? '切换到浅色' : '切换到深色';
    }
    wordCount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
