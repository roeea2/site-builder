const SUPABASE_URL = 'https://opejdkmykxlefswguado.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZWpka215a3hsZWZzd2d1YWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjYyNjAsImV4cCI6MjA5MzY0MjI2MH0.BMoXpA-R5_49QM--69atVC49cdnnsa0Y_8ogvvqfeDs';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Modal ---
const modal = document.getElementById('contact-modal');
function openModal() { modal.style.display = 'flex'; }
function closeModal() { modal.style.display = 'none'; }

document.getElementById('contact-btn')?.addEventListener('click', openModal);
document.getElementById('contact-btn-hero')?.addEventListener('click', openModal);
document.getElementById('cta-contact-btn')?.addEventListener('click', openModal);
document.getElementById('modal-close')?.addEventListener('click', closeModal);
modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// --- Upload a single file to a Supabase storage bucket ---
async function uploadFile(bucket, file) {
  if (!file) return null;
  const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) { console.error(`Upload error (${bucket}):`, error); return null; }
  return supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
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
    const logoFile   = document.getElementById('input-logo').files[0] || null;
    const imageFiles = [...document.getElementById('input-images').files];
    const menuFile   = document.getElementById('input-menu').files[0] || null;

    // Upload files in parallel
    const [logoUrl, imageUrls, menuUrl] = await Promise.all([
      uploadFile('logos', logoFile),
      uploadFiles('images', imageFiles),
      uploadFile('menus', menuFile),
    ]);

    const { error } = await supabase.from('leads').insert({
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
    });

    if (error) throw error;

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
const navLinks = document.querySelector('.nav-links');
mobileBtn?.addEventListener('click', () => { navLinks.classList.toggle('mobile-open'); });
