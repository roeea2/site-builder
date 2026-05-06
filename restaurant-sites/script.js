// Contact modal
const contactBtn = document.getElementById('contact-btn');
const contactBtnHero = document.getElementById('contact-btn-hero');
const ctaContactBtn = document.getElementById('cta-contact-btn');
const modal = document.getElementById('contact-modal');
const modalClose = document.getElementById('modal-close');

function openModal() { modal.style.display = 'flex'; }
function closeModal() { modal.style.display = 'none'; }

contactBtn?.addEventListener('click', openModal);
contactBtnHero?.addEventListener('click', openModal);
ctaContactBtn?.addEventListener('click', openModal);
modalClose?.addEventListener('click', closeModal);
modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// Form submission
const contactForm = document.getElementById('contact-form');
contactForm?.addEventListener('submit', e => {
  e.preventDefault();
  const btn = contactForm.querySelector('button[type="submit"]');
  const original = btn.textContent;
  btn.textContent = '✓ ההודעה נשלחה!';
  btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
  setTimeout(() => { btn.textContent = original; btn.style.background = ''; closeModal(); contactForm.reset(); }, 2000);
});

// Scroll reveal
const faders = document.querySelectorAll('.fade-in');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  });
}, { threshold: 0.15 });
faders.forEach(el => observer.observe(el));

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// Mobile menu
const mobileBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
mobileBtn?.addEventListener('click', () => {
  navLinks.classList.toggle('mobile-open');
});
