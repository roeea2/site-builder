export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { leadId, lowProfileCode } = req.body;
  if (!leadId) return res.status(400).json({ error: 'Missing leadId' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 1. Optionally verify with Cardcom
  let cardcomOk = false;
  if (lowProfileCode) {
    try {
      const params = new URLSearchParams({
        TerminalNumber: process.env.CARDCOM_TERMINAL,
        UserName:       process.env.CARDCOM_USERNAME,
        LowProfileCode: lowProfileCode,
      });
      const r = await fetch('https://secure.cardcom.solutions/api/v11/LowProfile/GetLPResult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data = await r.json();
      console.log('Cardcom verify:', JSON.stringify(data));
      cardcomOk = data.ResponseCode === 0 || data.ResponseCode === '0';
    } catch (err) {
      console.warn('Cardcom verify failed (non-fatal):', err.message);
    }
  }

  // 2. Mark is_paid = true in Supabase
  const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`, {
    method: 'PATCH',
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    },
    body: JSON.stringify({ is_paid: true }),
  });

  if (!updateRes.ok) {
    const err = await updateRes.text();
    console.error('Supabase update error:', err);
    return res.status(500).json({ error: 'Failed to update payment status' });
  }

  const leads = await updateRes.json();
  const lead  = Array.isArray(leads) ? leads[0] : leads;

  // 3. Send payment notification email
  if (process.env.RESEND_API_KEY && lead) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL,
          to:   'roeea2@gmail.com',
          subject: `תשלום חדש – ${lead.restaurant_name} (מספרה)`,
          html: `
            <div dir="rtl" style="font-family:sans-serif;max-width:500px;margin:auto">
              <h2 style="color:#0a7a8a">תשלום התקבל – מספרה!</h2>
              <table style="border-collapse:collapse;width:100%">
                <tr><td style="padding:8px;font-weight:bold">מספרה</td><td style="padding:8px">${lead.restaurant_name}</td></tr>
                <tr style="background:#f5f5f5"><td style="padding:8px;font-weight:bold">שם</td><td style="padding:8px">${lead.full_name}</td></tr>
                <tr><td style="padding:8px;font-weight:bold">טלפון</td><td style="padding:8px">${lead.phone}</td></tr>
                <tr style="background:#f5f5f5"><td style="padding:8px;font-weight:bold">אימייל</td><td style="padding:8px">${lead.email || '—'}</td></tr>
                <tr><td style="padding:8px;font-weight:bold">Lead ID</td><td style="padding:8px;font-size:12px;color:#666">${leadId}</td></tr>
              </table>
              <p style="margin-top:24px;color:#555">הפעל <code>/deploy-barber</code> כדי לבנות את האתר.</p>
            </div>
          `,
        }),
      });
    } catch (err) {
      console.warn('Resend email failed (non-fatal):', err.message);
    }
  }

  res.status(200).json({ ok: true, barber: lead?.restaurant_name });
}
