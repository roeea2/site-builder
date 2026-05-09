export const config = { runtime: 'nodejs' };

const NOTIFY_EMAILS = ['roeea2@gmail.com'];

function formatHours(opening_hours) {
  if (!opening_hours) return '—';
  if (opening_hours.type === '24/7') return '24/7';
  const DAY_NAMES = { sun: 'ראשון', mon: 'שני', tue: 'שלישי', wed: 'רביעי', thu: 'חמישי', fri: 'שישי', sat: 'שבת' };
  return Object.entries(opening_hours.schedule || {})
    .map(([day, val]) => val.open ? `${DAY_NAMES[day]}: ${val.from}-${val.to}` : `${DAY_NAMES[day]}: סגור`)
    .join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const {
    full_name, phone, barber_name, email, address, description, services,
    bg_color, primary_color, opening_hours,
    social_facebook, social_instagram, social_tiktok,
    booking_url, logo_url,
  } = req.body;

  const hoursText = formatHours(opening_hours);
  const servicesText = Array.isArray(services) && services.length ? services.join(', ') : '—';

  const htmlBody = `
<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:24px;border-radius:8px;">
  <h2 style="color:#333;border-bottom:2px solid #22a9c5;padding-bottom:12px;">לקוח חדש נרשם – קאטסייט ✂</h2>

  <table style="width:100%;border-collapse:collapse;margin-top:16px;">
    <tr style="background:#fff;"><td style="padding:10px;font-weight:bold;color:#555;width:35%;">שם מלא</td><td style="padding:10px;">${full_name || '—'}</td></tr>
    <tr style="background:#f5f5f5;"><td style="padding:10px;font-weight:bold;color:#555;">טלפון</td><td style="padding:10px;">${phone || '—'}</td></tr>
    <tr style="background:#fff;"><td style="padding:10px;font-weight:bold;color:#555;">שם המספרה</td><td style="padding:10px;">${barber_name || '—'}</td></tr>
    <tr style="background:#f5f5f5;"><td style="padding:10px;font-weight:bold;color:#555;">אימייל</td><td style="padding:10px;">${email || '—'}</td></tr>
    <tr style="background:#fff;"><td style="padding:10px;font-weight:bold;color:#555;">כתובת</td><td style="padding:10px;">${address || '—'}</td></tr>
    <tr style="background:#f5f5f5;"><td style="padding:10px;font-weight:bold;color:#555;">שירותים</td><td style="padding:10px;">${servicesText}</td></tr>
    <tr style="background:#fff;"><td style="padding:10px;font-weight:bold;color:#555;">תיאור</td><td style="padding:10px;">${description || '—'}</td></tr>
    <tr style="background:#f5f5f5;"><td style="padding:10px;font-weight:bold;color:#555;">צבע רקע</td><td style="padding:10px;"><span style="display:inline-block;width:16px;height:16px;background:${bg_color};border:1px solid #ccc;vertical-align:middle;border-radius:3px;margin-left:6px;"></span>${bg_color || '—'}</td></tr>
    <tr style="background:#fff;"><td style="padding:10px;font-weight:bold;color:#555;">צבע עיקרי</td><td style="padding:10px;"><span style="display:inline-block;width:16px;height:16px;background:${primary_color};border:1px solid #ccc;vertical-align:middle;border-radius:3px;margin-left:6px;"></span>${primary_color || '—'}</td></tr>
    <tr style="background:#f5f5f5;"><td style="padding:10px;font-weight:bold;color:#555;">שעות פתיחה</td><td style="padding:10px;white-space:pre-line;">${hoursText}</td></tr>
    <tr style="background:#fff;"><td style="padding:10px;font-weight:bold;color:#555;">קישור לתורים</td><td style="padding:10px;">${booking_url ? `<a href="${booking_url}">${booking_url}</a>` : '—'}</td></tr>
    <tr style="background:#f5f5f5;"><td style="padding:10px;font-weight:bold;color:#555;">פייסבוק</td><td style="padding:10px;">${social_facebook ? `<a href="${social_facebook}">${social_facebook}</a>` : '—'}</td></tr>
    <tr style="background:#fff;"><td style="padding:10px;font-weight:bold;color:#555;">אינסטגרם</td><td style="padding:10px;">${social_instagram ? `<a href="${social_instagram}">${social_instagram}</a>` : '—'}</td></tr>
    <tr style="background:#f5f5f5;"><td style="padding:10px;font-weight:bold;color:#555;">טיקטוק</td><td style="padding:10px;">${social_tiktok ? `<a href="${social_tiktok}">${social_tiktok}</a>` : '—'}</td></tr>
    <tr style="background:#fff;"><td style="padding:10px;font-weight:bold;color:#555;">לוגו</td><td style="padding:10px;">${logo_url ? `<a href="${logo_url}">צפה בלוגו</a>` : '—'}</td></tr>
  </table>

  <p style="margin-top:24px;color:#888;font-size:13px;">הלקוח טרם השלים תשלום – ממתין לשלב התשלום.</p>
</div>`;

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'קאטסייט <onboarding@resend.dev>',
      to: NOTIFY_EMAILS,
      subject: `לקוח חדש: ${barber_name || full_name} – קאטסייט`,
      html: htmlBody,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();
    console.error('Resend error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }

  res.status(200).json({ ok: true });
}
