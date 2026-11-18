import { isEmailConfigured, sendEmail } from "./mailer";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function formatDate(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${date}T00:00:00`),
  );
}

function firstName(person) {
  return (person.name || person.email || "").split(/[\s@]/)[0];
}

function buildInvite({ trip, inviterName, inviterEmail, companion, appUrl }) {
  const route = trip.destinations.map((city) => city.name).join(" → ");
  const dates = `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`;
  // El link lleva directo al viaje (despues de iniciar sesion). Si todavia no
  // tiene cuenta abre "Crear cuenta": al registrarse con este email el viaje
  // se le comparte solo (linkPendingInvites).
  const next = trip.id ? `?next=${encodeURIComponent(`/dashboard/trips/${trip.id}`)}` : "";
  const link = `${appUrl}/login${next}${companion.uid ? "" : `${next ? "&" : "?"}registro=1`}`;
  const cta = companion.uid ? "Ver el viaje" : "Crear mi cuenta y ver el viaje";
  const greeting = firstName(companion) ? `¡Hola ${firstName(companion)}!` : "¡Hola!";
  const subject = `${inviterName} te invitó a su viaje "${trip.name}" ✈️`;

  const text = [
    greeting,
    "",
    `${inviterName} (${inviterEmail}) te sumó como compañero de viaje en Triphy. Vas a poder ver y editar el itinerario, las notas, los lugares y los recuerdos del viaje.`,
    "",
    `Viaje: ${trip.name}`,
    `Fechas: ${dates}`,
    `Recorrido: ${route}`,
    "",
    `${cta}: ${link}`,
  ].join("\n");

  const html = `
<div style="background:#f3f4fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#111827">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden">
    <div style="background:#7386f5;padding:24px 32px;color:#ffffff;font-size:20px;font-weight:bold">Triphy</div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 8px;font-size:22px;font-weight:bold">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:22px;color:#4b5563">
        <strong>${escapeHtml(inviterName)}</strong> te sumó como compañero de viaje en Triphy. Vas a poder ver y editar el itinerario, las notas, los lugares y los recuerdos del viaje.
      </p>
      <div style="background:#f9fafb;border-radius:12px;padding:16px 18px;margin-bottom:24px">
        <p style="margin:0 0 6px;font-size:17px;font-weight:bold">${escapeHtml(trip.name)}</p>
        <p style="margin:0 0 4px;font-size:14px;color:#4b5563">🗓️ ${escapeHtml(dates)}</p>
        <p style="margin:0;font-size:14px;color:#4b5563">📍 ${escapeHtml(route)}</p>
      </div>
      <a href="${escapeHtml(link)}" style="display:block;text-align:center;background:#7386f5;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 0;border-radius:10px">${escapeHtml(cta)}</a>
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">
        Recibiste este email porque ${escapeHtml(inviterEmail)} te invitó a un viaje. Si no lo conocés, podés ignorarlo.
      </p>
    </div>
  </div>
</div>`;

  return { subject, html, text };
}

// Manda la invitacion a cada compañero. Nunca hace fallar la creacion del
// viaje: devuelve a quienes se les pudo mandar y a quienes no.
export async function sendTripInvites({ trip, inviter, companions, appUrl }) {
  const recipients = companions.filter((person) => person.email && person.email !== inviter.email);
  if (!recipients.length) return { sent: [], failed: [] };
  if (!isEmailConfigured()) {
    console.warn("[invitaciones] SMTP no configurado: no se enviaron emails.");
    return { sent: [], failed: recipients.map((person) => person.email) };
  }

  const inviterName = inviter.name || inviter.email.split("@")[0];
  const results = await Promise.allSettled(
    recipients.map((companion) => {
      const { subject, html, text } = buildInvite({
        trip,
        inviterName,
        inviterEmail: inviter.email,
        companion,
        appUrl,
      });
      // Cualquier usuario puede invitar: sale como "Juan vía Triphy" y las
      // respuestas le llegan a Juan (Reply-To), no a la cuenta de envío.
      return sendEmail({
        to: companion.email,
        subject,
        html,
        text,
        replyTo: inviter.email,
        fromName: `${inviterName} vía Triphy`,
      });
    }),
  );

  const sent = [];
  const failed = [];
  results.forEach((result, index) => {
    const email = recipients[index].email;
    if (result.status === "fulfilled") sent.push(email);
    else {
      failed.push(email);
      console.error(`[invitaciones] No se pudo enviar a ${email}:`, result.reason?.message || result.reason);
    }
  });
  return { sent, failed };
}
