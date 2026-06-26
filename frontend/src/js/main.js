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

// Header: tornar transparente no topo e branco ao rolar para baixo
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

const menuToggle = document.querySelector('#mobileMenuToggle');
const mobileMenu = document.querySelector('#mobileMenu');
if (menuToggle && mobileMenu) {
  const closeMobileMenu = () => mobileMenu.classList.add('hidden');

  menuToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    mobileMenu.classList.toggle('hidden');
  });

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMobileMenu);
  });

  document.addEventListener('click', (event) => {
    if (!mobileMenu.contains(event.target) && !menuToggle.contains(event.target)) {
      closeMobileMenu();
    }
  });
}

const textElement = document.querySelector('#text');
if (textElement) {
  const nodes = Array.from(textElement.childNodes);
  textElement.innerHTML = '';

  const spans = [];
  nodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent.split('').forEach((char) => {
        const span = document.createElement('span');
        span.textContent = char;
        if (char === ' ') {
          span.style.display = 'inline-block';
          span.style.width = '0.35ch';
        }
        textElement.appendChild(span);
        spans.push(span);
      });
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
      textElement.appendChild(document.createElement('br'));
    } else {
      textElement.appendChild(node.cloneNode(true));
    }
  });

  let lastActiveIndex = -1;
  const clearActive = () => spans.forEach((span) => span.classList.remove('active'));
  const setActiveRange = (index) => {
    if (index < 0) return;
    lastActiveIndex = index;
    clearActive();
    for (let i = index; i < index + 3 && i < spans.length; i += 1) {
      spans[i].classList.add('active');
    }
  };

  textElement.addEventListener('mousemove', (event) => {
    const { clientX, clientY } = event;
    let closestIndex = -1;
    let closestDistance = Number.POSITIVE_INFINITY;

    spans.forEach((span, index) => {
      const rect = span.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const distance = Math.hypot(cx - clientX, cy - clientY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveRange(closestIndex);
  });

  textElement.addEventListener('mouseleave', () => {
    if (lastActiveIndex >= 0) {
      setActiveRange(lastActiveIndex);
    }
  });
}

