/* ============================================================
   safdx 的个人网站 — 交互脚本
   1) 页脚年份   2) 移动端导航   3) 主题切换（单按钮，cookie 记录，未记录则跟随系统）
   4) 下载平台切换   5) 帮助气泡（仅移动版）
   6) 下载前的风险提示   7) 工具页：读 tools.json 渲染卡片
   ============================================================ */

(function () {
  'use strict';

  /* ---------- 页脚年份 ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- 移动端导航开关 ---------- */
  var navToggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  /* ---------- 主题切换：单按钮，按一下在深色 / 浅色间切换，选择存在 cookie ---------- */
  var themeBtn = document.getElementById('themeToggle');

  if (themeBtn) {
    function readThemeCookie() {
      var m = document.cookie.match(/(?:^|;\s*)theme=(dark|light)/);
      if (m) return m[1];
      /* cookie 不可用（如 file:// 打开）时退回 localStorage */
      try {
        var v = localStorage.getItem('theme');
        return (v === 'dark' || v === 'light') ? v : null;
      } catch (e) {
        return null;
      }
    }

    function writeThemeCookie(value) {
      document.cookie = 'theme=' + value + '; path=/; max-age=31536000; SameSite=Lax';
      try { localStorage.setItem('theme', value); } catch (e) {}
    }

    function syncThemeBtn() {
      var dark = document.documentElement.getAttribute('data-site-theme') === 'dark';
      var label = dark ? '切换到浅色' : '切换到深色';
      themeBtn.setAttribute('aria-pressed', String(dark));
      themeBtn.setAttribute('title', label);
      themeBtn.setAttribute('aria-label', label);
    }

    themeBtn.addEventListener('click', function () {
      var dark = document.documentElement.getAttribute('data-site-theme') === 'dark';
      var next = dark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-site-theme', next);
      writeThemeCookie(next);
      syncThemeBtn();
    });

    /* 页头内联脚本若因缓存 / 浏览器限制没生效，这里按存档再补一次 */
    var storedTheme = readThemeCookie();
    if (storedTheme) {
      document.documentElement.setAttribute('data-site-theme', storedTheme);
    }

    syncThemeBtn();
  }

  /* ---------- 页内小栏：悬停 / 点击在文字旁展开（首页下载、页脚 GitHub Pages 都走这里） ---------- */
  var hints = Array.prototype.slice.call(document.querySelectorAll('.dl-hint'));

  if (hints.length) {
    var hintTimer = null;

    function setHintOpen(hint, open) {
      var pop = hint.querySelector('.dl-hint-pop');
      var btn = hint.querySelector('.dl-hint-link');
      if (!pop || !btn) return;
      pop.classList.toggle('is-open', open);
      /* 页脚的 GitHub Pages 本身就是链接，直接跳转，不挂展开状态 */
      if (btn.tagName === 'BUTTON') btn.setAttribute('aria-expanded', String(open));
    }

    hints.forEach(function (hint) {
      var btn = hint.querySelector('.dl-hint-link');
      var pop = hint.querySelector('.dl-hint-pop');
      if (!btn || !pop) return;

      hint.hintByHover = false; /* 这次展开是不是鼠标悬停触发的 */

      /* 鼠标进出整块（按钮 + 小栏）都保持展开，方便点里面的条目 */
      hint.addEventListener('mouseenter', function () {
        window.clearTimeout(hintTimer);
        hint.hintByHover = true;
        setHintOpen(hint, true);
      });

      hint.addEventListener('mouseleave', function () {
        hint.hintByHover = false;
        window.clearTimeout(hintTimer);
        hintTimer = window.setTimeout(function () {
          setHintOpen(hint, false);
        }, 220);
      });

      /* 只有按钮版（首页下载）才用点击展开/收起；链接版（页脚）点击直接跳转 */
      if (btn.tagName !== 'BUTTON') return;

      btn.addEventListener('click', function (e) {
        e.stopPropagation();

        /* 悬停展开的，点击一律不再收起（只按鼠标移开 / Esc / 点别处关闭） */
        if (hint.hintByHover) {
          setHintOpen(hint, true);
          return;
        }

        setHintOpen(hint, !pop.classList.contains('is-open'));
      });
    });

    document.addEventListener('click', function (e) {
      hints.forEach(function (hint) {
        if (!hint.contains(e.target)) setHintOpen(hint, false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        hints.forEach(function (hint) { setHintOpen(hint, false); });
      }
    });
  }

  /* ---------- 下载平台切换：桌面版 / 移动版 ---------- */
  var segBtns = document.querySelectorAll('.seg-btn');
  var panels = document.querySelectorAll('.dl-panel');
  var helpWrap = document.querySelector('.help-wrap');
  var helpBtn = document.getElementById('helpBtn');
  var helpPop = document.getElementById('helpPop');

  Array.prototype.forEach.call(segBtns, function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-platform');

      Array.prototype.forEach.call(segBtns, function (other) {
        var isSelf = other === btn;
        other.classList.toggle('is-active', isSelf);
        other.setAttribute('aria-pressed', String(isSelf));
      });

      Array.prototype.forEach.call(panels, function (panel) {
        panel.classList.toggle('is-active', panel.getAttribute('data-platform') === target);
      });

      /* 问号只在移动版下出现；切回桌面版时顺手把气泡收起来 */
      if (helpWrap) {
        helpWrap.classList.toggle('is-hidden', target !== 'mobile');
        if (target !== 'mobile' && helpPop && helpBtn) {
          helpPop.classList.remove('is-open');
          helpBtn.setAttribute('aria-expanded', 'false');
        }
      }
    });
  });

  /* ---------- 帮助气泡：悬停展开、点击切换、Esc / 点外部关闭 ---------- */
  if (helpBtn && helpPop) {
    var hideTimer = null;

    function openPop() {
      window.clearTimeout(hideTimer);
      helpPop.classList.add('is-open');
      helpBtn.setAttribute('aria-expanded', 'true');
    }

    function closePop() {
      helpPop.classList.remove('is-open');
      helpBtn.setAttribute('aria-expanded', 'false');
    }

    function closePopSoon() {
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(closePop, 200);
    }

    /* 悬停：鼠标在按钮或气泡内都保持展开，方便点里面的链接 */
    helpBtn.addEventListener('mouseenter', openPop);
    helpBtn.addEventListener('mouseleave', closePopSoon);
    helpPop.addEventListener('mouseenter', openPop);
    helpPop.addEventListener('mouseleave', closePopSoon);

    /* 点击切换（兼容触屏与键盘操作） */
    helpBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (helpPop.classList.contains('is-open')) {
        closePop();
      } else {
        openPop();
      }
    });

    /* 点页面其它地方关闭 */
    document.addEventListener('click', function (e) {
      if (e.target !== helpBtn && !helpPop.contains(e.target)) {
        closePop();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePop();
    });
  }

  /* ---------- 弹窗通用开关：关闭按钮、遮罩、Esc 都能关掉 ---------- */
  function setupModal(el) {
    if (!el) return function () {};

    function close() {
      if (el.hidden) return;
      el.hidden = true;
    }

    Array.prototype.forEach.call(el.querySelectorAll('[data-modal-close]'), function (node) {
      node.addEventListener('click', close);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    return close;
  }

  /* ---------- 下载前的风险提示：点「下载」先弹提示，确认后才真正下载 ---------- */
  var modal = document.getElementById('riskModal');
  var dlLinks = document.querySelectorAll('.js-download');

  if (modal && dlLinks.length) {
    var confirmLink = document.getElementById('riskConfirm');
    var closeRisk = setupModal(modal);

    Array.prototype.forEach.call(dlLinks, function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        confirmLink.setAttribute('href', link.getAttribute('href'));
        modal.hidden = false;
        confirmLink.focus();
      });
    });

    /* 「继续下载」是带 download 属性的链接，原生点击即可触发下载，这里只负责收尾 */
    confirmLink.addEventListener('click', function () {
      window.setTimeout(closeRisk, 0);
    });
  }

  /* ---------- 工具页：读取 tools.json 渲染卡片，每行两个，挤不下就每行一个 ---------- */
  var toolGrid = document.getElementById('toolGrid');

  if (toolGrid) {
    var toolEmpty = document.getElementById('toolEmpty');
    var toolModal = document.getElementById('toolModal');
    var toolModalTitle = document.getElementById('toolModalTitle');
    var toolModalText = document.getElementById('toolModalText');
    var closeTool = setupModal(toolModal);

    function showEmpty(text) {
      if (!toolEmpty) return;
      toolEmpty.textContent = text;
      toolEmpty.classList.remove('is-hidden');
    }

    function buildCard(item) {
      var card = document.createElement('article');
      card.className = 'tool-card';

      /* 左边图片：占整块三分之一，外链或仓库内相对路径都行 */
      var thumb = document.createElement('div');
      thumb.className = 'tool-thumb';

      if (item.image) {
        var img = document.createElement('img');
        img.src = item.image;
        img.alt = item.title || '';
        img.loading = 'lazy';
        thumb.appendChild(img);
      }

      /* 右边：上面标题，中间简介，下面按钮 */
      var body = document.createElement('div');
      body.className = 'tool-body';

      var name = document.createElement('h3');
      name.className = 'tool-name';
      name.textContent = item.title || '';

      var wrap = document.createElement('div');
      wrap.className = 'tool-desc-wrap';

      var desc = document.createElement('p');
      desc.className = 'tool-desc';
      desc.textContent = item.desc || '';

      var more = document.createElement('button');
      more.type = 'button';
      more.className = 'tool-more is-hidden';
      more.textContent = '…展开';
      more.addEventListener('click', function () {
        if (toolModalTitle) toolModalTitle.textContent = item.title || '';
        if (toolModalText) toolModalText.textContent = item.desc || '';
        if (toolModal) {
          toolModal.hidden = false;
          var focusTarget = toolModal.querySelector('[data-modal-close]');
          if (focusTarget) focusTarget.focus();
        }
      });

      wrap.appendChild(desc);
      wrap.appendChild(more);
      body.appendChild(name);
      body.appendChild(wrap);

      if (item.url) {
        var go = document.createElement('a');
        go.className = 'btn btn-primary btn-sm tool-go';
        go.href = item.url;

        /* 以 http/https 开头的是网页，点开新标签；其它一律当成仓库里的文件，点击直接下载 */
        if (/^https?:\/\//i.test(item.url)) {
          go.target = '_blank';
          go.rel = 'noopener noreferrer';
          go.textContent = '打开';
        } else {
          go.setAttribute('download', '');
          go.textContent = '下载';
        }

        body.appendChild(go);
      }

      card.appendChild(thumb);
      card.appendChild(body);
      return card;
    }

    /* 渲染完再量一次：真的超过三行，才在末尾挂「…展开」 */
    function markOverflow() {
      Array.prototype.forEach.call(toolGrid.querySelectorAll('.tool-desc'), function (desc) {
        var more = desc.parentNode.querySelector('.tool-more');
        if (!more) return;
        more.classList.toggle('is-hidden', desc.scrollHeight - desc.clientHeight <= 2);
      });
    }

    fetch('tools.json', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (list) {
        if (!Array.isArray(list)) throw new Error('tools.json 不是数组');
        if (!list.length) {
          showEmpty('还没有添加工具。');
          return;
        }
        var frag = document.createDocumentFragment();
        list.forEach(function (item) {
          frag.appendChild(buildCard(item));
        });
        toolGrid.appendChild(frag);
        markOverflow();
      })
      .catch(function () {
        showEmpty('工具列表读取失败，稍后再试试。');
      });

    /* 窗口变化时列数会变，简介是否超三行也要重新算 */
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(markOverflow, 160);
    });
  }
})();
