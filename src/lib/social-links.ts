export function toWhatsAppLink(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  const digits = value.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}`;
}

export function toInstagramLink(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  const handle = value.replace(/^@/, "");
  return `https://instagram.com/${handle}`;
}
