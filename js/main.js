/* EQ Business Nexus LP
   ・トップの動画を順番に切り替える
   ・スクロールで巨大な3Dの「EQ」が奥から現れ、その後もページの後ろで回り続ける（Three.js）
   ・地の色の切り替え、見出しの立ち上がり、横に流れる理由、1行ずつ灯る悩み など
   CDN（GSAP / Lenis / Three.js）が読めなくても、内容はすべて表示される。
   ?capture=1 … ヘッドレス撮影用（動きを止めて全部表示） */
(function () {
  'use strict';

  // ---- 問い合わせ先。申込フォームができたら、ここを URL に差し替えるだけでよい ----
  var MAIL = 'info@brifu.co.jp';
  var BODY = encodeURIComponent('会社名・団体名：\nお名前：\nご連絡先：\nご相談内容（分かる範囲で）：\n');
  var CTA = {
    no2:       'mailto:' + MAIL + '?subject=' + encodeURIComponent('【No.2育成】EQ Business Nexus') + '&body=' + BODY,
    consult:   'mailto:' + MAIL + '?subject=' + encodeURIComponent('【個別相談】EQ Business Nexus') + '&body=' + BODY,
    corporate: 'mailto:' + MAIL + '?subject=' + encodeURIComponent('【企業・組織】EQ Business Nexus の活用相談') + '&body=' + BODY,
    inquiry:   'mailto:' + MAIL + '?subject=' + encodeURIComponent('【お問い合わせ】EQ Business Nexus') + '&body=' + BODY
  };
  document.querySelectorAll('[data-cta]').forEach(function (a) {
    var url = CTA[a.getAttribute('data-cta')];
    if (url) a.setAttribute('href', url);
  });

  var root = document.documentElement;
  var body = document.body;
  var CAPTURE = new URLSearchParams(location.search).has('capture');
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  var hasLenis = typeof Lenis !== 'undefined';
  var hasThree = typeof THREE !== 'undefined';
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  if (CAPTURE) root.classList.add('capture');

  /* ---------- トップの動画：3本を順番に、重ねながら切り替える ---------- */
  var videos = Array.prototype.slice.call(document.querySelectorAll('.hero-video'));
  var countNow = document.querySelector('.hc-now');
  var cur = 0, switching = false;
  function playSafe(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  function nextVideo() {
    if (switching || videos.length < 2) return;
    switching = true;
    var from = videos[cur];
    cur = (cur + 1) % videos.length;
    var to = videos[cur];
    to.preload = 'auto';
    try { to.currentTime = 0; } catch (e) {}
    playSafe(to);
    to.classList.add('is-on');
    from.classList.remove('is-on');
    if (countNow) countNow.textContent = ('0' + (cur + 1)).slice(-2);
    setTimeout(function () { from.pause(); switching = false; }, 1700);
  }
  if (videos.length && !CAPTURE) {
    videos.forEach(function (v) {
      v.addEventListener('timeupdate', function () {
        if (v === videos[cur] && v.duration && v.duration - v.currentTime < 1.5) nextVideo();
      });
      v.addEventListener('ended', function () { if (v === videos[cur]) nextVideo(); });
    });
    playSafe(videos[0]);
    // 動画が再生できない環境では、ポスター画像を5秒ごとに切り替える
    setTimeout(function () { if (videos[0].paused && videos[0].currentTime === 0) setInterval(nextVideo, 5000); }, 2500);
  }

  /* ---------- 地の色：画面の中央にあるセクションの色に合わせる ---------- */
  var themed = document.querySelectorAll('[data-theme]');
  var eqSections = document.querySelectorAll('[data-eq]');
  var eqMode = 'hide';
  if ('IntersectionObserver' in window) {
    root.classList.add('theme-on');
    var themeIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        body.classList.toggle('theme-light', e.target.getAttribute('data-theme') === 'light');
        var m = e.target.getAttribute('data-eq');
        if (m) eqMode = m;
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    themed.forEach(function (el) { themeIO.observe(el); });
  }

  /* ---------- 見出しを1文字ずつに分ける（<br> や <em> はそのまま残す） ---------- */
  function splitChars(el) {
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          Array.from(n.textContent).forEach(function (c) {
            if (c === '\n' || c === ' ' && !n.textContent.trim()) return;
            var s = document.createElement('span');
            s.className = 'ch'; s.textContent = c === ' ' ? ' ' : c;
            frag.appendChild(s); out.push(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    })(el);
    return out;
  }

  /* ---------- スクロールで灯る文（.words）と、悩みの行 ---------- */
  var wordBlocks = [];
  if (!CAPTURE && !REDUCE) {
    document.querySelectorAll('.words').forEach(function (el) {
      wordBlocks.push({ el: el, chars: splitChars(el) });
    });
  }
  var issueLines = Array.prototype.slice.call(document.querySelectorAll('.issue-lines li'));
  var parallaxImgs = Array.prototype.slice.call(document.querySelectorAll('.parallax img'));
  var statement = document.querySelector('.statement');
  var statementText = document.querySelector('.statement-text');
  var statementP = 0;

  function scrollEffects() {
    var vh = window.innerHeight;
    // STATEMENT の進み具合（0〜1）
    if (statement) {
      var r = statement.getBoundingClientRect();
      statementP = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      if (statementText && !CAPTURE && !REDUCE) {
        var t = clamp((statementP - 0.4) / 0.2, 0, 1);
        statementText.style.opacity = t;
        statementText.style.transform = 'translateY(' + ((1 - t) * 40) + 'px)';
      }
    }
    if (CAPTURE || REDUCE) return;
    // 悩みの行：画面の中央に近いほど明るく
    issueLines.forEach(function (li) {
      var b = li.getBoundingClientRect();
      var c = b.top + b.height / 2;
      var d = Math.abs(c - vh * 0.5) / (vh * 0.5);
      li.style.opacity = (0.16 + 0.84 * clamp(1.25 - d * 1.4, 0, 1)).toFixed(3);
    });
    // 文字が順に灯る
    wordBlocks.forEach(function (w) {
      var b = w.el.getBoundingClientRect();
      var p = clamp((vh * 0.88 - b.top) / (vh * 0.5), 0, 1);
      var n = Math.round(p * w.chars.length);
      for (var i = 0; i < w.chars.length; i++) w.chars[i].style.opacity = i < n ? 1 : 0.16;
    });
    // 写真のゆっくりした動き
    parallaxImgs.forEach(function (img) {
      var b = img.parentNode.getBoundingClientRect();
      if (b.bottom < 0 || b.top > vh) return;
      var p = (b.top + b.height / 2 - vh / 2) / vh;
      img.style.transform = 'translateY(' + (-8 - p * 12).toFixed(2) + '%)';
    });
  }

  /* ---------- ヘッダー：トップを過ぎたら地をつけ、下へ進む間は隠す ---------- */
  var header = document.querySelector('.site-header');
  var lastY = 0;
  function headerState(y) {
    header.classList.toggle('is-solid', y > 40);
    header.classList.toggle('is-hidden', y > lastY + 4 && y > window.innerHeight);
    if (y < lastY - 4 || y < window.innerHeight) header.classList.remove('is-hidden');
    lastY = y;
  }

  /* ---------- スマホの固定ボタン ---------- */
  var sticky = document.querySelector('.sticky-cta');
  var hero = document.querySelector('.hero');
  var finalCta = document.getElementById('contact');
  function updateSticky() {
    if (!sticky) return;
    var pastHero = hero.getBoundingClientRect().bottom < 0;
    var atFinal = finalCta.getBoundingClientRect().top < window.innerHeight;
    sticky.classList.toggle('is-shown', pastHero && !atFinal);
  }

  /* ---------- 画面にある間だけ動画を再生 ---------- */
  if ('IntersectionObserver' in window && !CAPTURE) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.target === hero) {
          if (e.isIntersecting) playSafe(videos[cur]); else videos[cur].pause();
        } else {
          var v = e.target.querySelector('video');
          if (!v) return;
          if (e.isIntersecting) { v.preload = 'auto'; playSafe(v); } else v.pause();
        }
      });
    }, { threshold: 0.01 });
    vio.observe(hero);
    document.querySelectorAll('.view-bg').forEach(function (el) { vio.observe(el); });
  }

  /* ---------- ふわっと表示（既存のセクション） ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !CAPTURE) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); rio.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    reveals.forEach(function (el) { rio.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- なめらかスクロール + GSAP ---------- */
  var lenis = null;
  // 確認用：?at=1200 で、その位置までスクロールした状態を表示する
  var AT = parseInt(new URLSearchParams(location.search).get('at') || '', 10);
  if (!isNaN(AT)) {
    window.addEventListener('load', function () {
      window.scrollTo(0, AT);
      if (hasGSAP) ScrollTrigger.update();
    });
  }
  if (hasLenis && !CAPTURE && !REDUCE && isNaN(AT)) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    root.classList.add('has-lenis');
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        var id = a.getAttribute('href');
        var target = id === '#top' ? 0 : document.querySelector(id);
        if (target === null) return;
        ev.preventDefault();
        lenis.scrollTo(target, { offset: id === '#top' ? 0 : -60, duration: 1.4 });
      });
    });
  }

  if (hasGSAP && !CAPTURE && !REDUCE) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    // トップ：大きな英字が左右から滑り込み、コピーが立ち上がる
    var h1Chars = splitChars(document.querySelector('.hero h1'));
    var intro = gsap.timeline({ delay: 0.2 });
    intro.fromTo('.hd-1', { xPercent: -30, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 1.6, ease: 'expo.out' }, 0)
         .fromTo('.hd-2', { xPercent: 30, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 1.6, ease: 'expo.out' }, 0.12)
         .fromTo('.hd-3', { xPercent: -24, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 1.6, ease: 'expo.out' }, 0.24)
         .fromTo(h1Chars, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.025 }, 0.5)
         .fromTo('.hero-sub, .hero .cta-row, .hero-count, .hero-kicker', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.08 }, 1.1);
    // スクロールすると英字が左右に離れ、映像が沈む
    var heroST = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.fromTo('.hd-1', { x: 0 }, { x: -260, ease: 'none', scrollTrigger: heroST });
    gsap.fromTo('.hd-2', { x: 0 }, { x: 220, ease: 'none', scrollTrigger: heroST });
    gsap.fromTo('.hd-3', { x: 0 }, { x: -160, ease: 'none', scrollTrigger: heroST });
    gsap.fromTo('.hero-media', { scale: 1, opacity: 1 }, { scale: 1.12, opacity: 0.35, ease: 'none', scrollTrigger: heroST });
    gsap.fromTo('.hero-copy', { y: 0, opacity: 1 }, { y: -80, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '70% top', scrub: true } });

    // 見出し：1文字ずつ立ち上がる
    document.querySelectorAll('main .kin').forEach(function (el) {
      if (el.closest('.hero')) return;
      var chars = splitChars(el);
      gsap.fromTo(chars, { yPercent: 70, opacity: 0, rotateX: -50 }, {
        yPercent: 0, opacity: 1, rotateX: 0, duration: 1, ease: 'expo.out', stagger: 0.018,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true }
      });
    });

    // 巨大な英字見出し：横から滑り込む
    document.querySelectorAll('.mega').forEach(function (el) {
      gsap.fromTo(el, { xPercent: 12, opacity: 0 }, { xPercent: 0, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 45%', scrub: true } });
    });

    // 写真：下から幕が上がるように現れる
    document.querySelectorAll('.clip, .svc figure, .option-media, .why-card figure, .feature figure, .about-media').forEach(function (el) {
      gsap.fromTo(el, { clipPath: 'inset(18% 0% 18% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    // 本文のまとまり：ぼかしから立ち上がる
    gsap.utils.toArray('.statement-lead, .view-head > p, .view-quote, .trio-item, .view-points li, .stages li, .program-body .sec-lead, .about-body > p, .questions, .feature-body, .svc-body, .option-body, .bridge-body p').forEach(function (el) {
      gsap.fromTo(el, { y: 36, opacity: 0, filter: 'blur(8px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });

    // 理由の4枚：PCでは縦スクロールに合わせて横へ流れる
    var mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', function () {
      var pin = document.querySelector('.why-pin');
      var track = document.querySelector('.why-track');
      pin.classList.add('is-pinned');
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var tween = gsap.fromTo(track, { x: 0 }, { x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: pin, start: 'center center', end: function () { return '+=' + dist(); }, pin: true, scrub: true, invalidateOnRefresh: true, anticipatePin: 1 } });
      return function () { pin.classList.remove('is-pinned'); tween.scrollTrigger && tween.scrollTrigger.kill(); };
    });

    // 画像を読み込んだら位置を測り直す
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  } else {
    root.classList.add('no-motion');
  }

  /* ---------- 毎フレームの処理 ---------- */
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    headerState(y);
    updateSticky();
    scrollEffects();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* =====================================================================
     3Dの「EQ」：クロームのような質感の立体文字
     ・STATEMENT では奥から回りながら手前へ迫り、画面いっぱいになる
     ・その後は各セクションの data-eq（right / left / far / center / hide）の位置へ移り、
       スクロールに合わせて回り続ける。明るい地ではぼやける（CSS）
     ===================================================================== */
  var canvas = document.querySelector('.eq3d');
  if (!hasThree || !canvas || CAPTURE) return;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 1, 1200);
  camera.position.set(0, 0, 100);
  var group = new THREE.Group();
  scene.add(group);

  // クロームの質感：光の映り込みをキャンバスに描いた matcap
  function makeMatcap() {
    var S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    var g = c.getContext('2d');
    var bg = g.createRadialGradient(S * .5, S * .5, 0, S * .5, S * .5, S * .5);
    bg.addColorStop(0, '#2a2f3a'); bg.addColorStop(.62, '#0d1016'); bg.addColorStop(.86, '#3c4555'); bg.addColorStop(.95, '#c9d6ea'); bg.addColorStop(1, '#0a0c10');
    g.fillStyle = bg; g.fillRect(0, 0, S, S);
    // 地平線のような帯の映り込み
    g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.clip();
    var band = g.createLinearGradient(0, S * .3, 0, S * .7);
    band.addColorStop(0, 'rgba(255,255,255,0)'); band.addColorStop(.42, 'rgba(210,225,245,.35)'); band.addColorStop(.5, 'rgba(255,255,255,.75)'); band.addColorStop(.6, 'rgba(120,150,190,.2)'); band.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = band; g.fillRect(0, S * .3, S, S * .4);
    // 左上の強いハイライト
    var hl = g.createRadialGradient(S * .32, S * .26, 0, S * .32, S * .26, S * .26);
    hl.addColorStop(0, 'rgba(255,255,255,1)'); hl.addColorStop(.25, 'rgba(255,255,255,.65)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl; g.fillRect(0, 0, S, S);
    // 右下の青い反射
    var bl = g.createRadialGradient(S * .72, S * .78, 0, S * .72, S * .78, S * .3);
    bl.addColorStop(0, 'rgba(143,179,224,.55)'); bl.addColorStop(1, 'rgba(143,179,224,0)');
    g.fillStyle = bl; g.fillRect(0, 0, S, S);
    g.restore();
    var tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  var mesh = null, textW = 1;
  var loader = new THREE.FontLoader();
  loader.load('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json', function (font) {
    var geo = new THREE.TextGeometry('EQ', {
      font: font, size: 20, height: 7, curveSegments: 14,
      bevelEnabled: true, bevelThickness: 1.6, bevelSize: 0.9, bevelOffset: 0, bevelSegments: 10
    });
    geo.computeBoundingBox();
    geo.center();
    geo.computeVertexNormals();
    textW = geo.boundingBox.max.x - geo.boundingBox.min.x;
    mesh = new THREE.Mesh(geo, new THREE.MeshMatcapMaterial({ matcap: makeMatcap() }));
    group.add(mesh);
    resize();
  }, undefined, function () { /* 文字データが読めなければ何もしない */ });

  var W = 1, H = 1, base = 1;
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    H = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    W = H * camera.aspect;
    // STATEMENT で画面幅いっぱい（スマホは少しはみ出す）
    base = (W * (w < 900 ? 1.05 : 0.86)) / textW;
  }
  window.addEventListener('resize', resize);
  resize();

  function pose(mode) {
    var narrow = window.innerWidth < 900;
    switch (mode) {
      // 本文の後ろに来るので、明るさを落として読みやすさを保つ
      case 'right':  return { x: W * (narrow ? .22 : .32),  y: H * .04,  z: -40,  s: narrow ? .62 : .5, o: .5 };
      case 'left':   return { x: -W * (narrow ? .22 : .32), y: -H * .04, z: -40,  s: narrow ? .62 : .5, o: .5 };
      case 'far':    return { x: W * .16,  y: -H * .1, z: -220, s: .9, o: .4 };
      case 'center': return { x: 0, y: 0, z: -60, s: .85, o: .55 };
      default:       return { x: 0, y: 0, z: -420, s: .6, o: 0 };
    }
  }

  var st = { x: 0, y: 0, z: -420, s: .6, o: 0, rx: .5, ry: -2.6 };
  var spin = 0, lastScroll = window.scrollY, mouseX = 0, mouseY = 0;
  window.addEventListener('pointermove', function (e) {
    mouseX = e.clientX / window.innerWidth - .5;
    mouseY = e.clientY / window.innerHeight - .5;
  }, { passive: true });

  var clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    if (!mesh || document.hidden) return;
    var t = clock.getElapsedTime();
    var y = window.scrollY;
    var dy = y - lastScroll; lastScroll = y;
    spin += dy * 0.0016;                       // スクロールした分だけ回る

    var target, rx, ry;
    if (eqMode === 'intro' || (eqMode === 'hide' && statementP > 0 && statementP < 1)) {
      // 奥から回りながら手前へ迫る
      var a = ease(clamp(statementP / 0.5, 0, 1));
      var back = clamp((statementP - 0.42) / 0.16, 0, 1);   // 文字が出るころ、少し奥へ下がって暗くなる
      target = { x: 0, y: 0, z: lerp(-480, 0, a) - back * 70, s: 1, o: clamp(statementP * 4, 0, 1) * (1 - back * 0.55) };
      rx = lerp(0.9, 0.06, a);
      ry = lerp(-3.4, 0, a) + (statementP > .5 ? (statementP - .5) * .5 : 0);
      st.ry = lerp(st.ry, ry, 0.2); st.rx = lerp(st.rx, rx, 0.2);
      spin = 0;
    } else {
      target = pose(eqMode);
      st.ry = lerp(st.ry, Math.sin(spin) * .85 + Math.sin(t * .35) * .2, 0.06);   // 真横を向いて板に見えないよう、振れ幅をおさえる
      st.rx = lerp(st.rx, .12 + Math.sin(t * .27) * .08, 0.06);
    }
    var k = eqMode === 'intro' ? 0.25 : 0.05;
    st.x = lerp(st.x, target.x, k); st.y = lerp(st.y, target.y, k); st.z = lerp(st.z, target.z, k);
    st.s = lerp(st.s, target.s, k); st.o = lerp(st.o, target.o, k);

    group.position.set(st.x, st.y + Math.sin(t * .8) * .6, st.z);
    group.scale.setScalar(base * st.s);
    group.rotation.set(st.rx + mouseY * .18, st.ry + mouseX * .3, 0);
    canvas.style.setProperty('--eq-o', st.o.toFixed(3));
    if (st.o > 0.005) renderer.render(scene, camera);
  }
  frame();
})();
