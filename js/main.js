/* EQ Business Nexus LP
   ?capture=1 … ヘッドレス撮影用（表示アニメーションを止めて全部表示） */
(function () {
  // 問い合わせ先。申込フォームができたら、ここの3つを URL に差し替えるだけでよい
  var MAIL = 'info@brifu.co.jp';
  var BODY = encodeURIComponent('会社名・団体名：\nお名前：\nご連絡先：\nご相談内容（分かる範囲で）：\n');
  var CTA = {
    consult:   'mailto:' + MAIL + '?subject=' + encodeURIComponent('【個別相談】EQ Business Nexus') + '&body=' + BODY,
    corporate: 'mailto:' + MAIL + '?subject=' + encodeURIComponent('【企業・組織】EQ Business Nexus の活用相談') + '&body=' + BODY,
    inquiry:   'mailto:' + MAIL + '?subject=' + encodeURIComponent('【お問い合わせ】EQ Business Nexus') + '&body=' + BODY
  };
  document.querySelectorAll('[data-cta]').forEach(function (a) {
    var url = CTA[a.getAttribute('data-cta')];
    if (url) a.setAttribute('href', url);
  });

  var root = document.documentElement;
  if (new URLSearchParams(location.search).has('capture')) {
    root.classList.add('capture');
    return;
  }

  // スクロールで要素をふわっと表示
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  // スマホの固定ボタン：FVを過ぎたら出し、最終CTAが見えたら隠す
  var sticky = document.querySelector('.sticky-cta');
  var hero = document.querySelector('.hero');
  var finalCta = document.getElementById('contact');
  function updateSticky() {
    var pastHero = hero.getBoundingClientRect().bottom < 0;
    var atFinal = finalCta.getBoundingClientRect().top < window.innerHeight;
    sticky.classList.toggle('is-shown', pastHero && !atFinal);
  }
  window.addEventListener('scroll', updateSticky, { passive: true });
  updateSticky();
})();
