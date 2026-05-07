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

// --- Form error toast ---
function showFormError(msg) {
  const el = document.getElementById('form-error');
  document.getElementById('form-error-msg').textContent = msg;
  el.style.display = 'flex';
  el.style.animation = 'none';
  requestAnimationFrame(() => { el.style.animation = ''; });
}
function hideFormError() { document.getElementById('form-error').style.display = 'none'; }

// --- Opening hours widget ---
const toggle247  = document.getElementById('input-hours-247');
const hoursGrid  = document.getElementById('hours-grid');
const DAYS = ['sun','mon','tue','wed','thu','fri','sat'];

// 24/7 pill toggle: hide/show grid
toggle247?.addEventListener('change', () => {
  hoursGrid.style.opacity       = toggle247.checked ? '0' : '1';
  hoursGrid.style.pointerEvents = toggle247.checked ? 'none' : '';
  hoursGrid.style.height        = toggle247.checked ? '0' : '';
  hoursGrid.style.overflow      = toggle247.checked ? 'hidden' : '';
});

// Per-day toggle
DAYS.forEach(day => {
  const cb = document.getElementById(`hours-open-${day}`);
  cb?.addEventListener('change', function() {
    this.closest('.hrow').classList.toggle('is-closed', !this.checked);
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

// --- Submitted data storage for step-2 ---
let submittedData = {};
let currentLeadId = null;

// --- Form submission ---
const contactForm = document.getElementById('contact-form');
contactForm?.addEventListener('submit', async e => {
  e.preventDefault();
  hideFormError();

  const btn = contactForm.querySelector('button[type="submit"]');
  btn.textContent = 'שולח...';
  btn.disabled = true;

  try {
    const name           = document.getElementById('input-name').value.trim();
    const phone          = document.getElementById('input-phone').value.trim();
    const restaurantName = document.getElementById('input-restaurant').value.trim();
    const email          = document.getElementById('input-email').value.trim();

    // Store for step-2
    submittedData = { name, phone, restaurantName, email };

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
        'Prefer':        'return=representation',
      },
      body: JSON.stringify({
        project_name:    'restaurants',
        full_name:       name,
        phone:           phone,
        restaurant_name: restaurantName,
        email:           email || null,
        logo_url:        logoUrl,
        images:          imageUrls.length ? imageUrls : null,
        menu_url:        menuUrl,
        bg_color:        document.getElementById('input-bg-color').value,
        primary_color:   document.getElementById('input-primary-color').value,
        description:     document.getElementById('input-description').value.trim() || null,
        address:         document.getElementById('input-address').value.trim()     || null,
        opening_hours:    collectOpeningHours(),
        reservation_url:  document.getElementById('input-reservation-url').value.trim() || null,
        social_facebook:  document.getElementById('input-facebook').value.trim()  || null,
        social_instagram: document.getElementById('input-instagram').value.trim() || null,
        social_tiktok:    document.getElementById('input-tiktok').value.trim()    || null,
      }),
    });

    if (!res.ok) throw new Error(await res.text());

    const inserted = await res.json();
    currentLeadId = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id;

    // Show step-2 instead of closing modal
    document.getElementById('contact-form').style.display = 'none';
    document.getElementById('form-error').style.display = 'none';
    document.querySelector('.modal-text').style.display = 'none';
    document.getElementById('step-payment').style.display = 'block';
    btn.textContent = 'שליחה ותחילת עבודה';
    btn.disabled = false;

  } catch (err) {
    console.error('Submission error:', err);
    showFormError('אירעה שגיאה בשליחה. בדוק את הפרטים ונסה שוב.');
    btn.textContent = 'שליחה ותחילת עבודה';
    btn.disabled = false;
  }
});

// --- WhatsApp callback button ---
document.getElementById('btn-callback')?.addEventListener('click', () => {
  const { name, phone, restaurantName, email } = submittedData;
  const msg = encodeURIComponent(
    `שלום רועי,\nלקוח חדש ממתין לשיחה:\nמסעדה: ${restaurantName}\nשם: ${name}\nטלפון: ${phone}\nאימייל: ${email || '—'}`
  );
  window.open(`https://wa.me/972542345222?text=${msg}`, '_blank');
});

// --- Pay button ---
document.getElementById('btn-pay')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-pay');
  btn.textContent = 'מאתחל תשלום...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: currentLeadId,
        restaurantName: submittedData.restaurantName,
        customerName: submittedData.name,
      }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = '/payment?url=' + encodeURIComponent(data.url);
    } else {
      throw new Error(data.error || 'שגיאה');
    }
  } catch (err) {
    btn.textContent = 'שגיאה — נסה שוב';
    btn.disabled = false;
    setTimeout(() => { btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-left:6px"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> תשלום מאובטח ←'; }, 3000);
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
