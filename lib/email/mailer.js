import nodemailer from "nodemailer";

// Envio de emails transaccionales por SMTP (por defecto Gmail con una
// "contraseña de aplicación"). Solo corre en el servidor: las credenciales
// nunca llegan al navegador.
let transporter = null;

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

// La cuenta SMTP es solo el buzon tecnico de envio: el nombre visible del
// remitente (fromName) y el Reply-To pueden ser los del usuario que invita.
export async function sendEmail({ to, subject, html, text, replyTo, fromName = "Triphy" }) {
  if (!isEmailConfigured()) {
    throw new Error("Faltan SMTP_USER y SMTP_PASS para enviar emails.");
  }

  const safeName = String(fromName).replace(/["\\\r\n<>]/g, "").slice(0, 60) || "Triphy";
  return getTransporter().sendMail({
    from: `"${safeName}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text,
    replyTo,
  });
}
