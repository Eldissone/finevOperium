import '../index.css';

document.addEventListener('DOMContentLoaded', () => {
  // Intersection Observer for scroll animations
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal').forEach((el) => {
    observer.observe(el);
  });


  // Hero parallax for backdrop and subtle tilt
  const hero = document.querySelector('.hero-section');
  const backdrop = document.querySelector('.hero-backdrop');
  if (hero && backdrop) {
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 .. 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const tx = x * 18; // translate range
      const ty = y * 12;
      const rotate = x * 2;
      backdrop.style.transform = `translate(calc(-50% + ${tx}px), calc(-55% + ${ty}px)) rotate(${rotate}deg)`;
    });

    hero.addEventListener('mouseleave', () => {
      backdrop.style.transform = 'translate(-50%, -55%)';
    });
  }
});

const spans = document.querySelectorAll("#text span");

let lastIndex = spans.length - 1;

// inicia na última letra
activateEffect(lastIndex);

spans.forEach((span, index) => {

  span.addEventListener("mousemove", () => {
    lastIndex = index;
    activateEffect(index);
  });

});

// quando sair do texto inteiro
document.querySelector("#text").addEventListener("mouseleave", () => {
  activateEffect(lastIndex);
});

function activateEffect(index){

  // limpa classes
  spans.forEach(s => {
    s.className = "";
  });

  // letra principal
  spans[index]?.classList.add("active");

  // direita
  spans[index + 1]?.classList.add("level-1");
  spans[index + 2]?.classList.add("level-2");
  spans[index + 3]?.classList.add("level-3");

  // esquerda
  spans[index - 1]?.classList.add("level-1");
  spans[index - 2]?.classList.add("level-2");
  spans[index - 3]?.classList.add("level-3");
}