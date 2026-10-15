export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// Inline styles and table layout work in common email clients; plain text remains available.
export function renderEmailHtml(subject: string, body: string) {
  const content = escapeHtml(body).replace(/https?:\/\/[^\s<>]+/g, (url) =>
    `<a href="${url}" style="color:#47745B;text-decoration:underline">${url}</a>`);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#F7F6F1;color:#424B50;font-family:Lato,Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#fff;border:1px solid #E5E2DA;border-radius:16px"><tr><td style="padding:28px;border-bottom:4px solid #E0BD69"><span style="font-family:Georgia,serif;font-size:28px;color:#47745B">ParrotRehome</span><p style="margin:8px 0 0;font-size:12px;color:#89959A">Responsible avian companionship</p></td></tr><tr><td style="padding:28px"><h1 style="font-family:Georgia,serif;font-size:24px;line-height:1.3;color:#424B50">${escapeHtml(subject)}</h1><div style="white-space:pre-wrap;font-size:15px;line-height:1.7">${content}</div></td></tr><tr><td style="padding:20px 28px;background:#F7F6F1;font-size:12px;line-height:1.6;color:#424B50">Keep your request reference when contacting our team. Payment is confirmed only after verification. Never send passwords or card numbers by email.</td></tr></table></td></tr></table></body></html>`;
}
