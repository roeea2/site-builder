export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { leadId, barberName, customerName } = req.body;

  const params = new URLSearchParams({
    TerminalNumber:     process.env.CARDCOM_TERMINAL,
    UserName:           process.env.CARDCOM_USERNAME,
    APILevel:           '10',
    Operation:          '1',
    SumToBePaid:        '500',
    CoinID:             '1',
    ProductName:        'Barber Website - CutSite',
    SuccessRedirectUrl: `${process.env.BARBERS_SITE_URL || 'https://barbers-sites.vercel.app'}/success`,
    ErrorRedirectUrl:   `${process.env.BARBERS_SITE_URL || 'https://barbers-sites.vercel.app'}/error`,
    Language:           'he',
    InternalDealNumber: leadId || '',
    ReturnValue:        leadId || '',
    CustomerName:       customerName || '',
    CSSUrl:             `${process.env.BARBERS_SITE_URL || 'https://barbers-sites.vercel.app'}/cardcom.css`,
  });

  const cardcomRes = await fetch('https://secure.cardcom.solutions/Interface/LowProfile.aspx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const text = await cardcomRes.text();
  console.log('Cardcom raw response:', text);

  let parsed = Object.fromEntries(new URLSearchParams(text));
  if (!parsed.ResponseCode && text.includes(';')) {
    const parts = text.split(';');
    parsed = { ResponseCode: parts[0], Description: parts[2] || text };
  }

  if (parsed.ResponseCode === '0') {
    res.status(200).json({ url: parsed.url });
  } else {
    console.error('Cardcom error:', parsed.ResponseCode, parsed.Description, '| raw:', text);
    res.status(400).json({
      error: parsed.Description || 'שגיאה בעיבוד התשלום',
      code: parsed.ResponseCode,
      raw: text,
    });
  }
}
