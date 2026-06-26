import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function initScrollHorizontal() {
  const track = document.getElementById("image-track");
  const images = track.querySelectorAll(".item");
  const totalImages = images.length;

  const gap = parseFloat(getComputedStyle(track).gap) || 0;
  const imageWidth = images[0].offsetWidth;
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    track.style.transform = "translateX(5%)";
    track.style.paddingRight = "";
  } else {
    track.style.transform = "translateX(50%)";
    track.style.paddingRight = `${window.innerWidth / 2}px`;
  }

  const totalContentWidth = (imageWidth * totalImages) + (gap * (totalImages - 1));
  const scrollDistance = totalContentWidth + (isMobile ? 0 : window.innerWidth / 2) - (window.innerWidth / 2);
  const pauseBeforeEnd = (imageWidth + gap) * 1;

  let triggerStart = isMobile ? "top bottom" : "top 55%";
  let triggerEnd = () => `+=${scrollDistance}`;

  if (isMobile) {
    triggerStart = "bottom bottom";
  }

  gsap.to(track, {
    x: () => `-${scrollDistance}px`,
    ease: "power1.out",
    scrollTrigger: {
      trigger: ".horizontal-scroll-wrapper",
      start: triggerStart,
      end: triggerEnd,
      scrub: 0.5,
      invalidateOnRefresh: true,
    }
  });

  ScrollTrigger.create({
    trigger: ".horizontal-scroll-wrapper",
    start: "top top",
    end: () => `+=${scrollDistance - pauseBeforeEnd}`,
    pin: ".horizontal-scroll-wrapper",
    anticipatePin: 1,
    invalidateOnRefresh: true
  });
}

function resetPinStyles() {
  const pinElements = document.querySelectorAll('[data-scrolltrigger-pin-spacer]');
  pinElements.forEach(spacer => {
    const pinned = spacer.firstElementChild;
    if (pinned) {
      spacer.parentElement.insertBefore(pinned, spacer);
    }
    spacer.remove();
  });
}

window.addEventListener("resize", () => {
  ScrollTrigger.getAll().forEach(t => t.kill());
  resetPinStyles();
  requestAnimationFrame(() => {
    initScrollHorizontal();
    ScrollTrigger.refresh();
  });
});

initScrollHorizontal();
