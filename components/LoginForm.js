"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { getClientAuth, getGoogleProvider } from "@/lib/firebase/client";
import heroImage from "@/public/login-hero.jpg";

async function persistSession(user) {
  const idToken = await user.getIdToken();
  const response = await fetch("/api/session/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    throw new Error("No se pudo crear la sesion en el servidor.");
  }
}

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true" {...props}>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_SECONDS = 45;

const inputBase =
  "h-11 w-full rounded-md border bg-white px-3 text-sm text-gray-900 outline-none transition focus:ring-1";

function inputClass(state) {
  if (state === "error") return `${inputBase} border-[1.5px] border-red-500 focus:ring-red-500`;
  if (state === "ok") return `${inputBase} border-[1.5px] border-emerald-500 focus:ring-emerald-500`;
  return `${inputBase} border-gray-300 focus:border-[#7386f5] focus:ring-[#7386f5]`;
}

function FieldHint({ tone, children }) {
  if (!children) return null;
  return (
    <p className={`text-xs font-medium ${tone === "ok" ? "text-emerald-600" : "text-red-500"}`}>
      {tone === "ok" ? "✓ " : "⚠ "}
      {children}
    </p>
  );
}

function Field({ label, hint, hintTone, children }) {
  return (
    <label className="grid gap-2 text-sm text-gray-700">
      <span>{label}</span>
      {children}
      <FieldHint tone={hintTone}>{hint}</FieldHint>
    </label>
  );
}

function Checkbox({ checked, onChange, children }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-500">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="sr-only" />
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${checked ? "bg-[#7386f5]" : "border border-gray-300 bg-white"}`}
        aria-hidden="true"
      >
        {checked ? (
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
            <path d="M4 8.5l2.5 2.5L12 5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function Alert({ children }) {
  if (!children) return null;
  return (
    <div className="mt-2 flex items-center gap-2.5 rounded-[10px] border border-red-400 bg-red-500/8 px-3.5 py-2.5 text-[13px] text-red-500">
      <span className="font-bold">✕</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

function passwordStrength(value) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value) || value.length >= 12) score += 1;
  return value ? Math.max(score, 1) : 0;
}

const STRENGTH_LABEL = ["", "Contraseña débil", "Contraseña regular", "Contraseña segura", "Contraseña muy segura"];

function StrengthMeter({ value }) {
  const score = passwordStrength(value);
  if (!value) return null;
  const color = score >= 3 ? "bg-emerald-500" : score === 2 ? "bg-amber-400" : "bg-red-500";
  const text = score >= 3 ? "text-emerald-600" : score === 2 ? "text-amber-500" : "text-red-500";
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4].map((step) => (
        <span key={step} className={`h-1 w-14 rounded-full ${step <= score ? color : "bg-gray-200"}`} />
      ))}
      <span className={`ml-1 text-xs font-medium ${text}`}>{STRENGTH_LABEL[score]}</span>
    </div>
  );
}

function BackToLogin({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="text-left text-xs font-medium text-[#7386f5] hover:underline">
      ← Volver a iniciar sesión
    </button>
  );
}

function OtherOptions() {
  return (
    <div className="mt-8 text-center">
      <p className="text-sm text-gray-500">Otras opciones</p>
      <span className="mx-auto mt-2 block h-0.5 w-16 rounded-full bg-[#7386f5]" />
    </div>
  );
}

// Traduce los codigos de Firebase Auth a mensajes por campo, como en el diseño.
function mapAuthError(err, mode) {
  const code = err?.code || "";
  if (code === "auth/invalid-email") {
    return { email: "Ingresá un email válido (ej: nombre@gmail.com)" };
  }
  if (code === "auth/email-already-in-use") {
    return { email: "Ese email ya tiene una cuenta. Iniciá sesión." };
  }
  if (code === "auth/weak-password") {
    return { password: "La contraseña tiene que tener al menos 6 caracteres." };
  }
  if (code === "auth/user-not-found") {
    return { alert: "No pudimos iniciar sesión. Revisá tus datos.", email: "No hay una cuenta con ese email." };
  }
  if (code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") {
    return { alert: "No pudimos iniciar sesión. Revisá tus datos.", password: "Email o contraseña incorrectos." };
  }
  if (code === "auth/too-many-requests") {
    return { alert: "Demasiados intentos. Esperá unos minutos y volvé a probar." };
  }
  if (code === "auth/popup-closed-by-user") {
    return {};
  }
  return { alert: mode === "signup" ? "No pudimos crear tu cuenta. Probá de nuevo." : "No pudimos iniciar sesión. Revisá tus datos." };
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard/trips";
  // signin | signup | forgot | sent
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  function goTo(nextMode) {
    setMode(nextMode);
    setErrors({});
  }

  async function applyPersistence() {
    await setPersistence(getClientAuth(), rememberMe ? browserLocalPersistence : browserSessionPersistence);
  }

  async function finishLogin(userCredential) {
    await persistSession(userCredential.user);
    router.push(nextUrl);
    router.refresh();
  }

  async function handleSignIn(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!EMAIL_RE.test(email)) nextErrors.email = "Ingresá un email válido (ej: nombre@gmail.com)";
    if (!password) nextErrors.password = "Ingresá tu contraseña.";
    if (Object.keys(nextErrors).length) {
      setErrors({ alert: "No pudimos iniciar sesión. Revisá tus datos.", ...nextErrors });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      await applyPersistence();
      await finishLogin(await signInWithEmailAndPassword(getClientAuth(), email, password));
    } catch (err) {
      setErrors(mapAuthError(err, "signin"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = "Contanos cómo te llamás.";
    if (!EMAIL_RE.test(email)) nextErrors.email = "Ingresá un email válido (ej: nombre@gmail.com)";
    if (password.length < 6) nextErrors.password = "La contraseña tiene que tener al menos 6 caracteres.";
    if (repeatPassword !== password) nextErrors.repeatPassword = "Las contraseñas no coinciden.";
    if (!acceptTerms) nextErrors.alert = "Tenés que aceptar los términos y la política de privacidad.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      await applyPersistence();
      const credential = await createUserWithEmailAndPassword(getClientAuth(), email, password);
      await updateProfile(credential.user, { displayName: name.trim() });
      await finishLogin(credential);
    } catch (err) {
      setErrors(mapAuthError(err, "signup"));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setErrors({});
    try {
      await applyPersistence();
      await finishLogin(await signInWithPopup(getClientAuth(), getGoogleProvider()));
    } catch (err) {
      setErrors(mapAuthError(err, mode));
    } finally {
      setLoading(false);
    }
  }

  async function sendResetLink(event) {
    event?.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setErrors({ email: "Ingresá un email válido (ej: nombre@gmail.com)" });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      await sendPasswordResetEmail(getClientAuth(), email);
      setMode("sent");
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setErrors(mapAuthError(err, "forgot"));
    } finally {
      setLoading(false);
    }
  }

  const emailValid = EMAIL_RE.test(email);
  const toggle =
    mode === "signup"
      ? { label: "Iniciar sesión", onClick: () => goTo("signin") }
      : { label: "Crear cuenta", onClick: () => goTo("signup") };

  return (
    <section
      className="grid w-full max-w-7xl overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(20,25,60,0.35)] scheme-light md:grid-cols-2"
      aria-labelledby="login-title"
    >
      <div className="relative hidden min-h-[760px] md:block">
        <Image
          src={heroImage}
          alt="Arco del Museo del Louvre con la piramide de vidrio al fondo"
          fill
          sizes="(min-width: 768px) 50vw, 0px"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/85" />
        <div className="absolute inset-x-0 bottom-0 grid gap-4 p-10">
          <h2 className="text-4xl font-bold leading-[44px] text-white">Tu viaje perfecto, sin esfuerzo!</h2>
          <p className="text-base leading-[26px] text-white/85">
            Planifica, organiza y controla tus viajes en un mismo lugar y no pierdas control de tu experiencia!
          </p>
        </div>
      </div>

      <div className="flex flex-col p-8 sm:p-12">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggle.onClick}
            className="rounded-full bg-[#7386f5] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#5f70e0]"
          >
            {toggle.label}
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center py-8">
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center gap-2">
              <Image src="/logo-mark.png" alt="" width={28} height={28} className="h-7 w-7" priority />
              <span className="text-lg font-bold text-gray-900">Triphy</span>
            </div>

            {mode === "sent" ? (
              <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7386f5]/10 text-3xl" aria-hidden="true">
                ✉️
              </div>
            ) : null}

            <h1 id="login-title" className="mt-6 text-3xl font-semibold text-gray-900">
              {mode === "signin" && "Bienvenido de vuelta viajero!"}
              {mode === "signup" && "Creá tu cuenta, viajero!"}
              {mode === "forgot" && "¿Olvidaste tu contraseña?"}
              {mode === "sent" && "¡Revisá tu correo! 📬"}
            </h1>
            <span className="mt-3 block h-1 w-10 rounded-full bg-[#7386f5]" />

            {mode === "signin" ? (
              <>
                <p className="mt-8 text-sm text-gray-500">Ingresa con tu cuenta</p>
                <Alert>{errors.alert}</Alert>
                <form onSubmit={handleSignIn} noValidate className="mt-4 grid gap-5">
                  <Field label="Email:" hint={errors.email}>
                    <input
                      className={inputClass(errors.email ? "error" : null)}
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      placeholder="viajero@triphy.app"
                    />
                  </Field>
                  <Field label="Contraseña:" hint={errors.password}>
                    <input
                      className={inputClass(errors.password ? "error" : null)}
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      placeholder="••••••••"
                    />
                  </Field>

                  <div className="flex items-center justify-between">
                    <Checkbox checked={rememberMe} onChange={setRememberMe}>
                      Recordarme
                    </Checkbox>
                    <button
                      type="button"
                      onClick={() => goTo("forgot")}
                      className="text-sm text-gray-500 underline hover:text-gray-800"
                    >
                      Recuperar contraseña
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="mt-1 h-11 rounded-md bg-[#7386f5] text-sm font-semibold text-white transition hover:bg-[#5f70e0] disabled:opacity-70"
                    disabled={loading}
                  >
                    Ingresar
                  </button>
                </form>

                <OtherOptions />
                <GoogleButton onClick={handleGoogleLogin} disabled={loading} label="Continuar con Google" />
              </>
            ) : null}

            {mode === "signup" ? (
              <>
                <p className="mt-6 text-sm text-gray-500">Creá tu cuenta gratis</p>
                <Alert>{errors.alert}</Alert>
                <form onSubmit={handleSignUp} noValidate className="mt-3 grid gap-4">
                  <Field label="Nombre y apellido:" hint={errors.name}>
                    <input
                      className={inputClass(errors.name ? "error" : name.trim() ? "ok" : null)}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                    />
                  </Field>
                  <Field
                    label="Email:"
                    hint={errors.email || (emailValid ? "Email válido" : null)}
                    hintTone={errors.email ? "error" : "ok"}
                  >
                    <input
                      className={inputClass(errors.email ? "error" : emailValid ? "ok" : null)}
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                    />
                  </Field>
                  <label className="grid gap-2 text-sm text-gray-700">
                    <span>Contraseña:</span>
                    <input
                      className={inputClass(errors.password ? "error" : null)}
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                    />
                    <StrengthMeter value={password} />
                    <FieldHint>{errors.password}</FieldHint>
                  </label>
                  <Field
                    label="Repetí la contraseña:"
                    hint={
                      errors.repeatPassword ||
                      (repeatPassword && repeatPassword === password ? "Las contraseñas coinciden" : null)
                    }
                    hintTone={errors.repeatPassword ? "error" : "ok"}
                  >
                    <input
                      className={inputClass(
                        errors.repeatPassword ? "error" : repeatPassword && repeatPassword === password ? "ok" : null,
                      )}
                      type="password"
                      value={repeatPassword}
                      onChange={(event) => setRepeatPassword(event.target.value)}
                      autoComplete="new-password"
                    />
                  </Field>

                  <Checkbox checked={acceptTerms} onChange={setAcceptTerms}>
                    Acepto los términos y la política de privacidad
                  </Checkbox>

                  <button
                    type="submit"
                    className="h-11 rounded-md bg-[#7386f5] text-sm font-semibold text-white transition hover:bg-[#5f70e0] disabled:opacity-70"
                    disabled={loading}
                  >
                    Crear cuenta
                  </button>
                </form>

                <OtherOptions />
                <GoogleButton onClick={handleGoogleLogin} disabled={loading} label="Registrarse con Google" />
              </>
            ) : null}

            {mode === "forgot" ? (
              <>
                <p className="mt-8 text-sm text-gray-500">Te mandamos un enlace para crear una nueva.</p>
                <Alert>{errors.alert}</Alert>
                <form onSubmit={sendResetLink} noValidate className="mt-4 grid gap-5">
                  <Field label="Email:" hint={errors.email}>
                    <input
                      className={inputClass(errors.email ? "error" : null)}
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                    />
                  </Field>
                  <button
                    type="submit"
                    className="mt-8 h-11 rounded-md bg-[#7386f5] text-sm font-semibold text-white transition hover:bg-[#5f70e0] disabled:opacity-70"
                    disabled={loading}
                  >
                    Enviar enlace
                  </button>
                </form>
                <div className="mt-12">
                  <BackToLogin onClick={() => goTo("signin")} />
                </div>
              </>
            ) : null}

            {mode === "sent" ? (
              <>
                <p className="mt-8 text-xs text-gray-500">
                  Enviamos un enlace a {email}. Vence en 1 hora.
                </p>
                <Alert>{errors.alert}</Alert>
                <a
                  href="https://mail.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-12 flex h-11 items-center justify-center rounded-md bg-[#7386f5] text-sm font-semibold text-white transition hover:bg-[#5f70e0]"
                >
                  Abrir Gmail
                </a>
                <div className="mt-12 grid gap-2">
                  <p className="text-xs text-gray-400">
                    ¿No te llegó?{" "}
                    {resendIn > 0 ? (
                      <span className="font-medium">Reenviar en 0:{String(resendIn).padStart(2, "0")}</span>
                    ) : (
                      <button type="button" onClick={sendResetLink} disabled={loading} className="font-medium text-[#7386f5] hover:underline">
                        Reenviar
                      </button>
                    )}
                  </p>
                  <BackToLogin onClick={() => goTo("signin")} />
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function GoogleButton({ onClick, disabled, label }) {
  return (
    <button
      type="button"
      className="mt-6 flex h-11 w-full items-center justify-center gap-3 rounded-md border border-gray-300 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
      onClick={onClick}
      disabled={disabled}
    >
      <GoogleIcon />
      {label}
    </button>
  );
}
