// Sponsorship modal
const sponsorshipBtn = document.getElementById('sponsorship-btn');
const modal = document.getElementById('sponsorship-modal');
const modalClose = document.getElementById('modal-close');
const copyEmailBtn = document.getElementById('copy-email-btn');

sponsorshipBtn.addEventListener('click', () => {
  modal.style.display = 'flex';
});

modalClose.addEventListener('click', () => {
  modal.style.display = 'none';
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

// Copy email
copyEmailBtn.addEventListener('click', () => {
  navigator.clipboard.writeText('brendan@inflate.agency');
  const copyIcon = copyEmailBtn.querySelector('.icon-copy');
  const checkIcon = copyEmailBtn.querySelector('.icon-check');
  const copyText = copyEmailBtn.querySelector('.copy-text');

  copyIcon.style.display = 'none';
  checkIcon.style.display = 'block';
  copyText.textContent = 'Copied!';

  setTimeout(() => {
    copyIcon.style.display = 'block';
    checkIcon.style.display = 'none';
    copyText.textContent = 'Copy Email Address';
  }, 2000);
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    modal.style.display = 'none';
  }
});
