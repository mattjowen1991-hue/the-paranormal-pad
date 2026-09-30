// ─── Email (Web3Forms) ───────────────────────────────────────────
// Sends the Contact form to The Reporter's inbox, and emails an alert when
// someone files a witness statement. Key lives in EMAIL in js/data.js.
// Web3Forms free plan: 250 emails/month. https://web3forms.com

const Email = (() => {
  const key = () => (typeof EMAIL !== 'undefined' && EMAIL.web3formsKey) || '';
  const enabled = () => !!key();

  // fields: plain object of label → value; shown in the email in this order.
  async function send(subject, fields, replyTo) {
    if (!enabled()) throw new Error('Email is not set up yet');
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: key(),
        subject,
        from_name: 'The Paranormal Pad',
        ...(replyTo ? { replyto: replyTo } : {}),
        ...fields
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.message || `Email failed (${res.status})`);
    return data;
  }

  return { send, enabled, commentAlerts: () => enabled() && (typeof EMAIL === 'undefined' || EMAIL.commentAlerts !== false) };
})();
