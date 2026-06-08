// appended header scroll behavior (separate file for patching)
(function setupHeaderScroll() {
  const header = document.querySelector('header');
  const hero = document.querySelector('.hero-section');
  if (!header || !hero) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        header.classList.remove('scrolled');
      } else {
        header.classList.add('scrolled');
      }
    });
  }, { root: null, threshold: 0.05 });

  io.observe(hero);
})();
