/* EQ Business Nexus LP
   ・トップの動画を順番に切り替える
   ・スクロールで巨大な3Dの「EQ」が奥から現れ、その後もページの後ろで回り続ける（Three.js）
     質感：青を主にしたガラス＋黄色の混じるネオンの光。光にじみ（Bloom）と、動いたときの光の残像（Afterimage）
   ・見出しの立ち上がり、横に流れる理由、1行ずつ灯る悩み、線で描かれるアイコン など
   スクロールはブラウザ標準のまま（なめらかスクロールのライブラリは、ホイールが効かない・位置が飛ぶ原因になったので使わない）
   CDN（GSAP / Three.js）が読めなくても、内容はすべて表示される。
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
  var params = new URLSearchParams(location.search);
  var CAPTURE = params.has('capture');
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  var hasThree = typeof THREE !== 'undefined';
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  if (CAPTURE) root.classList.add('capture');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

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

  /* ---------- 画面の中央にあるセクション：ヘッダーの色と、3DのEQの位置を決める ---------- */
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
    document.querySelectorAll('[data-theme]').forEach(function (el) { themeIO.observe(el); });
  }

  /* ---------- 見出しを1文字ずつに分ける（<br> や <em> はそのまま残す） ---------- */
  function splitChars(el) {
    var out = [];
    if (!el) return out;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          Array.from(n.textContent).forEach(function (c) {
            if (c === '\n' || (c === ' ' && !n.textContent.trim())) return;
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

  /* ---------- スクロールに合わせて動くもの（GSAPなしでも動く） ---------- */
  var wordBlocks = [];
  if (!CAPTURE && !REDUCE) {
    document.querySelectorAll('.words').forEach(function (el) {
      wordBlocks.push({ el: el, chars: splitChars(el) });
    });
  }
  var issuesSec = document.querySelector('.issues');
  var issueCards = Array.prototype.slice.call(document.querySelectorAll('.issue-card'));
  var parallaxImgs = Array.prototype.slice.call(document.querySelectorAll('.parallax img'));
  var drawIcons = Array.prototype.slice.call(document.querySelectorAll('.ring svg, .stage-icon svg'));
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
    // 悩みのカード：PCは画面に留まったまま、スクロールのたびに左から1枚ずつ。スマホは画面に入ったものから順に
    if (issueCards.length) {
      var wide = window.innerWidth > 900;
      var ir = issuesSec.getBoundingClientRect();
      var ip = clamp(-ir.top / Math.max(1, ir.height - vh), 0, 1);
      var active = -1;
      issueCards.forEach(function (card, i) {
        var lp;
        if (wide) {
          lp = clamp((ip - (0.04 + i * 0.16)) / 0.12, 0, 1);    // 1枚ごとに間をあけ、読める時間をつくる
        } else {
          lp = clamp((vh * 0.95 - card.getBoundingClientRect().top) / (vh * 0.35), 0, 1);
        }
        lp = ease(lp);
        card.style.setProperty('--p', lp.toFixed(3));
        if (lp > 0.9) active = i;
      });
      issueCards.forEach(function (card, i) { card.classList.toggle('is-active', wide && i === active); });
    }
    // 文字が順に灯る
    wordBlocks.forEach(function (w) {
      var b = w.el.getBoundingClientRect();
      var p = clamp((vh * 0.88 - b.top) / (vh * 0.5), 0, 1);
      var n = Math.round(p * w.chars.length);
      for (var i = 0; i < w.chars.length; i++) w.chars[i].style.opacity = i < n ? 1 : 0.16;
    });
    // アイコンが線で描かれる
    drawIcons.forEach(function (svg) {
      var b = svg.getBoundingClientRect();
      var p = clamp((vh * 0.92 - b.top) / (vh * 0.42), 0, 1);
      svg.style.setProperty('--draw', (1 - ease(p)).toFixed(3));
      svg.style.opacity = (0.15 + 0.85 * p).toFixed(3);
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
    if (y > lastY + 4 && y > window.innerHeight) header.classList.add('is-hidden');
    else if (y < lastY - 4 || y < window.innerHeight) header.classList.remove('is-hidden');
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

  /* ---------- ふわっと表示（下の方のセクション） ---------- */
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

  // ページ内リンク：クリックしたときだけ、なめらかに移動する
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var id = a.getAttribute('href');
      var target = id === '#top' ? null : document.querySelector(id);
      if (id !== '#top' && !target) return;
      ev.preventDefault();
      var top = target ? target.getBoundingClientRect().top + window.scrollY - 60 : 0;
      window.scrollTo({ top: top, behavior: REDUCE ? 'auto' : 'smooth' });
    });
  });

  // 確認用：?at=1200 で、その位置までスクロールした状態を表示する
  var AT = parseInt(params.get('at') || '', 10);
  if (!isNaN(AT)) window.addEventListener('load', function () { window.scrollTo(0, AT); });

  /* ---------- GSAP の演出 ---------- */
  if (hasGSAP && !CAPTURE && !REDUCE) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

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
    gsap.to('.hd-1', { x: -220, ease: 'none', scrollTrigger: heroST });
    gsap.to('.hd-2', { x: 180, ease: 'none', scrollTrigger: heroST });
    gsap.to('.hd-3', { x: -140, ease: 'none', scrollTrigger: heroST });
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

    // 写真：上下から幕が開くように現れる
    document.querySelectorAll('.svc figure, .option-media, .why-card figure, .trio-card figure').forEach(function (el) {
      gsap.fromTo(el, { clipPath: 'inset(18% 0% 18% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    // 本文のまとまり：うっすら上がって現れる（ぼかしの動きは重いので使わない）
    gsap.utils.toArray('.statement-lead, .issues-note, .view-head > p, .view-quote, .rings li, .stages li > div, .program-head .sec-lead, .bridge-lead, .chain li, .about-grid > *, .feature-body, .svc-body, .option-body').forEach(function (el) {
      gsap.fromTo(el, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });

    // No.2 の橋渡し：左右のカードが中央へ寄り、No.2 が浮かび、間を光がつなぐ
    var trioTL = gsap.timeline({ scrollTrigger: { trigger: '.trio', start: 'top 80%', once: true } });
    trioTL.fromTo('.trio-card.is-left', { x: -90, opacity: 0 }, { x: 0, opacity: 1, duration: 1.2, ease: 'expo.out' }, 0)
          .fromTo('.trio-card.is-right', { x: 90, opacity: 0 }, { x: 0, opacity: 1, duration: 1.2, ease: 'expo.out' }, 0)
          .fromTo('.trio-card.is-core', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.2, ease: 'expo.out' }, 0.25)
          .fromTo('.trio-link', { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power2.out' }, 0.6);

    // Process・For You・お問い合わせ・関連サイト：順番に立ち上がる
    [['.steps li', 0.12], ['.check-list li', 0.06], ['.cta-box', 0.15], ['.related-card', 0.15]].forEach(function (g) {
      var els = gsap.utils.toArray(g[0]);
      if (!els.length) return;
      gsap.fromTo(els, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: g[1],
        scrollTrigger: { trigger: els[0], start: 'top 88%', once: true } });
    });
    gsap.fromTo('.features .glow-frame', { scale: 0.94, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.3, ease: 'expo.out', stagger: 0.1,
      scrollTrigger: { trigger: '.features', start: 'top 70%', once: true } });

    // 理由の4枚：PCでは縦スクロールに合わせて横へ流れる
    var mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', function () {
      var pin = document.querySelector('.why-pin');
      var track = document.querySelector('.why-track');
      pin.classList.add('is-pinned');
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var tween = gsap.fromTo(track, { x: 0 }, { x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: pin, start: 'center center', end: function () { return '+=' + dist(); }, pin: true, scrub: true, invalidateOnRefresh: true } });
      return function () { pin.classList.remove('is-pinned'); if (tween.scrollTrigger) tween.scrollTrigger.kill(); };
    });

    // 画像・文字の読み込みで高さが変わったら、位置を測り直す（ずれて飛ぶのを防ぐ）
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

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
     3Dの「EQ」：青を主にしたガラス＋黄色の混じるネオンの光
     ・縁ほど強く光るガラス（フレネル）を加算合成。表面を黄色の光の帯がゆっくり流れる
     ・輪郭の線（ネオン管）＋光のにじみ（UnrealBloom）＋動いたときの光の残像（Afterimage）
     ・STATEMENT では奥から回りながら手前へ迫り、画面いっぱいになる
     ・その後は各セクションの data-eq（right / left / far / center / hide）の位置へ移る
     ===================================================================== */
  var canvas = document.querySelector('.eq3d');
  // ?noeq … 確認用（ソフトウェア描画の撮影では光の処理が重く画面が止まるので、3Dだけ外して撮る）
  if (!hasThree || !canvas || CAPTURE || params.has('noeq')) return;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  } catch (e) { return; }
  var narrowDevice = window.innerWidth < 900;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrowDevice ? 1.25 : 1.5));
  renderer.setClearColor(0x0a0c10, 1);
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 1, 1200);
  camera.position.set(0, 0, 100);
  var group = new THREE.Group();
  scene.add(group);

  var glassMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uGlow: { value: 1 },
      cDeep: { value: new THREE.Color(0x0b3d91) },
      cBlue: { value: new THREE.Color(0x2f8bff) },
      cCyan: { value: new THREE.Color(0x8fe3ff) },
      cYellow: { value: new THREE.Color(0xffd23f) }
    },
    vertexShader: [
      'varying vec3 vN; varying vec3 vV; varying vec3 vP;',
      'void main(){',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position;',
      '  gl_Position = projectionMatrix * mv;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uTime; uniform float uGlow; uniform vec3 cDeep; uniform vec3 cBlue; uniform vec3 cCyan; uniform vec3 cYellow;',
      'varying vec3 vN; varying vec3 vV; varying vec3 vP;',
      'void main(){',
      '  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));',
      '  float fr = pow(f, 1.8);',
      '  float wave = sin(vP.x * 0.16 + vP.y * 0.1 - uTime * 1.1) * 0.5 + 0.5;',
      '  float streak = smoothstep(0.6, 1.0, wave);',
      '  float flick = 0.92 + 0.08 * sin(uTime * 7.0 + vP.y);',
      '  vec3 glass = mix(cDeep, cBlue, 0.35 + 0.65 * fr);',
      '  vec3 col = glass * (0.12 + fr * 0.95) + cCyan * pow(fr, 5.0) * 1.1 + cYellow * streak * (0.3 + fr * 1.1);',
      '  float a = clamp(0.1 + fr * 0.8 + streak * 0.3, 0.0, 1.0);',
      '  gl_FragColor = vec4(col * uGlow * flick, a);',
      '}'
    ].join('\n'),
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
  });
  var edgeBlue = new THREE.LineBasicMaterial({ color: 0x6cc4ff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  var edgeYellow = new THREE.LineBasicMaterial({ color: 0xffcf4a, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });

  // 光のにじみと残像（読めなければ、そのまま描く）
  var composer = null, bloom = null, after = null;
  if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass && THREE.AfterimagePass) {
    try {
      composer = new THREE.EffectComposer(renderer);
      composer.addPass(new THREE.RenderPass(scene, camera));
      bloom = new THREE.UnrealBloomPass(new THREE.Vector2(512, 512), 0.9, 0.38, 0.12);
      composer.addPass(bloom);
      after = new THREE.AfterimagePass(0.84);
      composer.addPass(after);
    } catch (e) { composer = null; }
  }

  var textW = 1, ready = false;
  var loader = new THREE.FontLoader();
  loader.load('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json', function (font) {
    var geo = new THREE.TextGeometry('EQ', {
      font: font, size: 20, height: 6, curveSegments: 14,
      bevelEnabled: true, bevelThickness: 1.4, bevelSize: 0.8, bevelOffset: 0, bevelSegments: 8
    });
    geo.computeBoundingBox();
    geo.center();
    geo.computeVertexNormals();
    textW = geo.boundingBox.max.x - geo.boundingBox.min.x;
    group.add(new THREE.Mesh(geo, glassMat));
    var edges = new THREE.EdgesGeometry(geo, 28);
    group.add(new THREE.LineSegments(edges, edgeBlue));
    var glowLines = new THREE.LineSegments(edges, edgeYellow);
    glowLines.scale.setScalar(1.012);
    group.add(glowLines);
    ready = true;
    resize();
  }, undefined, function () { /* 文字データが読めなければ何もしない */ });

  var W = 1, H = 1, base = 1;
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    if (composer) { composer.setSize(w, h); if (bloom) bloom.resolution.set(w / 2, h / 2); }
    camera.aspect = w / h; camera.updateProjectionMatrix();
    H = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    W = H * camera.aspect;
    base = (W * (w < 900 ? 1.05 : 0.86)) / textW;
  }
  window.addEventListener('resize', resize);
  resize();

  function pose(mode) {
    var narrow = window.innerWidth < 900;
    switch (mode) {
      // 本文の後ろに来るので、明るさを落として読みやすさを保つ
      case 'right':  return { x: W * (narrow ? .22 : .32),  y: H * .04,  z: -40,  s: narrow ? .62 : .5, o: .55 };
      case 'left':   return { x: -W * (narrow ? .22 : .32), y: -H * .04, z: -40,  s: narrow ? .62 : .5, o: .55 };
      case 'far':    return { x: W * .16,  y: -H * .1, z: -220, s: .9, o: .45 };
      case 'center': return { x: 0, y: 0, z: -60, s: .85, o: .6 };
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
    if (!ready || document.hidden) return;
    var t = clock.getElapsedTime();
    var y = window.scrollY;
    var dy = y - lastScroll; lastScroll = y;
    spin += clamp(dy, -120, 120) * 0.0016;          // スクロールした分だけ回る

    var target;
    if (eqMode === 'intro') {
      // 奥から回りながら手前へ迫る
      var a = ease(clamp(statementP / 0.5, 0, 1));
      var back = clamp((statementP - 0.42) / 0.16, 0, 1);   // 文字が出るころ、少し奥へ下がって暗くなる
      target = { x: 0, y: 0, z: lerp(-480, 0, a) - back * 70, s: 1, o: clamp(statementP * 4, 0, 1) * (1 - back * 0.5) };
      st.ry = lerp(st.ry, lerp(-3.4, 0, a) + (statementP > .5 ? (statementP - .5) * .5 : 0), 0.2);
      st.rx = lerp(st.rx, lerp(0.9, 0.06, a), 0.2);
      spin = 0;
    } else if (eqMode === 'orbit') {
      // Features 以降：時間とスクロールで、奥へ下がったり手前に来たり、左右へ揺れたりしながら回る
      var sx = Math.sin(t * 0.32 + y * 0.0009);
      var depth = 0.5 + 0.5 * Math.sin(t * 0.45 + y * 0.0012);
      target = { x: W * 0.3 * sx, y: H * 0.08 * Math.cos(t * 0.27), z: lerp(-20, -330, depth), s: window.innerWidth < 900 ? .62 : .55, o: .6 };
      st.ry = lerp(st.ry, Math.sin(spin) * .7 + sx * .6, 0.05);
      st.rx = lerp(st.rx, .15 + .25 * Math.cos(t * .3), 0.05);
    } else {
      target = pose(eqMode);
      // 真横を向いて板に見えないよう、振れ幅をおさえる
      st.ry = lerp(st.ry, Math.sin(spin) * .85 + Math.sin(t * .35) * .2, 0.06);
      st.rx = lerp(st.rx, .12 + Math.sin(t * .27) * .08, 0.06);
    }
    var k = eqMode === 'intro' ? 0.25 : 0.05;
    st.x = lerp(st.x, target.x, k); st.y = lerp(st.y, target.y, k); st.z = lerp(st.z, target.z, k);
    st.s = lerp(st.s, target.s, k); st.o = lerp(st.o, target.o, k);

    group.position.set(st.x, st.y + Math.sin(t * .8) * .6, st.z);
    group.scale.setScalar(base * st.s);
    group.rotation.set(st.rx + mouseY * .18, st.ry + mouseX * .3, 0);
    glassMat.uniforms.uTime.value = t;
    canvas.style.setProperty('--eq-o', st.o.toFixed(3));
    if (st.o > 0.005) { if (composer) composer.render(); else renderer.render(scene, camera); }
  }
  frame();
})();
