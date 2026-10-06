export function whatsappContact(number?: string): { href: string } | null {
  const value = number?.trim();
  if (!value || !/^\+[1-9]\d{7,14}$/.test(value)) return null;
  return { href: `https://wa.me/${value.slice(1)}?text=${encodeURIComponent("Hola, quiero consultar un trabajo de chapa y pintura.")}` };
}
