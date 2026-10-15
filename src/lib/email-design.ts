export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// Inline styles and table layout work in common email clients; plain text remains available.
export function renderEmailHtml(subject: string, body: string, siteUrl = "https://parrotrehome.com") {
  let logoUrl = "https://parrotrehome.com/brand/parrotrehome-emblem.png";
  try {
    const url = new URL("/brand/parrotrehome-emblem.png", siteUrl);
    if (["https:", "http:"].includes(url.protocol)) logoUrl = url.href;
  } catch { /* Keep the production asset URL for invalid configuration. */ }
  // Explicit paragraphs and line breaks survive Outlook, which may ignore white-space CSS.
  const linked = (value: string) => escapeHtml(value).replace(/https?:\/\/[^\s<>]+/g, url => `<a href="${url}" style="color:#47745B;text-decoration:underline;word-break:break-all">${url}</a>`);
  const content = body.replace(/\r\n/g, "\n").split(/\n\s*\n/).map(paragraph =>
    `<p style="margin:0 0 18px;font-size:15px;line-height:1.7">${linked(paragraph).replace(/\n/g, "<br>")}</p>`
  ).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#F7F6F1;color:#424B50;font-family:Lato,Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#fff;border:1px solid #E5E2DA;border-radius:16px"><tr><td style="padding:28px;border-bottom:4px solid #E0BD69"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle;padding-right:12px"><img src="${escapeHtml(logoUrl)}" width="56" height="56" alt="ParrotRehome parrot and shelter logo" style="display:block;border:0;width:56px;height:56px"></td><td style="vertical-align:middle;font-family:Georgia,serif;font-size:28px;line-height:1.1"><span style="color:#47745B">Parrot</span><span style="color:#424B50">Rehome</span></td></tr></table><p style="margin:8px 0 0;font-size:12px;color:#89959A">Responsible avian companionship</p></td></tr><tr><td style="padding:28px"><h1 style="font-family:Georgia,serif;font-size:24px;line-height:1.3;color:#424B50">${escapeHtml(subject)}</h1><div style="font-size:15px;line-height:1.7">${content}</div></td></tr><tr><td style="padding:20px 28px;background:#F7F6F1;font-size:12px;line-height:1.6;color:#424B50">Use Reply in your email app to contact our team. Keep your request reference. Payment is confirmed only after verification. Never send passwords or card numbers by email.</td></tr></table></td></tr></table></body></html>`;
}
