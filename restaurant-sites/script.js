// Public config injected by build — never hardcode secrets here
const SUPABASE_URL      = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

// --- Modal ---
const modal = document.getElementById('contact-modal');
function openModal()  { modal.style.display = 'flex'; }
function closeModal() { modal.style.display = 'none'; }

document.getElementById('contact-btn')?.addEventListener('click', openModal);
document.getElementById('contact-btn-hero')?.addEventListener('click', openModal);
document.getElementById('cta-contact-btn')?.addEventListener('click', openModal);
document.getElementById('modal-close')?.addEventListener('click', closeModal);
modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// --- Opening hours widget ---
const toggle247 = document.getElementById('input-hours-247');
const hoursGrid = document.getElementById('hours-grid');
const DAYS = ['sun','mon','tue','wed','thu','fri','sat'];

toggle247?.addEventListener('change', () => {
  hoursGrid.style.display = toggle247.checked ? 'none' : 'flex';
});

DAYS.forEach(day => {
  document.getElementById(`hours-open-${day}`)?.addEventListener('change', function() {
    this.closest('.hours-day-row').classList.toggle('day-row-closed', !this.checked);
  });
});

function collectOpeningHours() {
  if (toggle247?.checked) return { type: '24/7' };
  const schedule = {};
  DAYS.forEach(day => {
    schedule[day] = {
      open: document.getElementById(`hours-open-${day}`)?.checked ?? true,
      from: document.getElementById(`hours-from-${day}`)?.value || '12:00',
      to:   document.getElementById(`hours-to-${day}`)?.value   || '23:00',
    };
  });
  return { type: 'hours', schedule };
}

// --- Upload a single file to Supabase Storage via REST ---
async function uploadFile(bucket, file) {
  if (!file) return null;
  const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });
  if (!res.ok) { console.error('Upload error:', await res.text()); return null; }
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// --- Upload multiple files, return array of URLs ---
async function uploadFiles(bucket, files) {
  const urls = [];
  for (const file of files) {
    const url = await uploadFile(bucket, file);
    if (url) urls.push(url);
  }
  return urls;
}

// --- Form submission ---
const contactForm = document.getElementById('contact-form');
contactForm?.addEventListener('submit', async e => {
  e.preventDefault();

  const btn = contactForm.querySelector('button[type="submit"]');
  btn.textContent = 'שולח...';
  btn.disabled = true;

  try {
    const logoFile   = document.getElementById('input-logo').files[0]   || null;
    const imageFiles = [...document.getElementById('input-images').files];
    const menuFile   = document.getElementById('input-menu').files[0]   || null;

    const [logoUrl, imageUrls, menuUrl] = await Promise.all([
      uploadFile('logos', logoFile),
      uploadFiles('images', imageFiles),
      uploadFile('menus', menuFile),
    ]);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        project_name:    'restaurants',
        full_name:       document.getElementById('input-name').value.trim(),
        phone:           document.getElementById('input-phone').value.trim(),
        restaurant_name: document.getElementById('input-restaurant').value.trim(),
        email:           document.getElementById('input-email').value.trim() || null,
        logo_url:        logoUrl,
        images:          imageUrls.length ? imageUrls : null,
        menu_url:        menuUrl,
        bg_color:        document.getElementById('input-bg-color').value,
        primary_color:   document.getElementById('input-primary-color').value,
        description:     document.getElementById('input-description').value.trim() || null,
        address:         document.getElementById('input-address').value.trim()     || null,
        opening_hours:   collectOpeningHours(),
        reservation_url: document.getElementById('input-reservation-url').value.trim() || null,
      }),
    });

    if (!res.ok) throw new Error(await res.text());

    btn.textContent = '✓ נשלח בהצלחה!';
    btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
    setTimeout(() => {
      btn.textContent = 'שליחה ותחילת עבודה';
      btn.style.background = '';
      btn.disabled = false;
      closeModal();
      contactForm.reset();
    }, 2500);

  } catch (err) {
    console.error('Submission error:', err);
    btn.textContent = 'שגיאה – נסה שוב';
    btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    btn.disabled = false;
    setTimeout(() => { btn.textContent = 'שליחה ותחילת עבודה'; btn.style.background = ''; }, 3000);
  }
});

// --- Scroll reveal ---
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// --- Smooth scroll ---
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// --- Mobile menu ---
const mobileBtn = document.querySelector('.mobile-menu-btn');
const navLinks  = document.querySelector('.nav-links');
mobileBtn?.addEventListener('click', () => { navLinks.classList.toggle('mobile-open'); });
