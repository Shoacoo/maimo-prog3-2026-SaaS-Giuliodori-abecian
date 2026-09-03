"use client";

import { useState } from "react";
import Image from "next/image";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
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

const COPY = {
  signin: {
    toggleLabel: "Crear cuenta",
    heading: "Bienvenido de vuelta viajero!",
    subheading: "Ingresa con tu cuenta",
    submitLabel: "Ingresar",
  },
  signup: {
    toggleLabel: "Ingresar",
    heading: "Comencemos tu viaje!",
    subheading: "Crea tu cuenta para empezar",
    submitLabel: "Crear cuenta",
  },
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const copy = COPY[mode];

  function toggleMode() {
    setMode((current) => (current === "signin" ? "signup" : "signin"));
    setError("");
    setInfo("");
  }

  async function applyPersistence() {
    await setPersistence(
      getClientAuth(),
      rememberMe ? browserLocalPersistence : browserSessionPersistence,
    );
  }

  async function finishLogin(userCredential) {
    await persistSession(userCredential.user);
    router.push(nextUrl);
    router.refresh();
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    try {
      await applyPersistence();
      const action =
        mode === "signup"
          ? createUserWithEmailAndPassword
          : signInWithEmailAndPassword;

      await finishLogin(await action(getClientAuth(), email, password));
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesion.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");
    setInfo("");

    try {
      await applyPersistence();
      await finishLogin(await signInWithPopup(getClientAuth(), getGoogleProvider()));
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesion con Google.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Ingresa tu email para recuperar la contraseña.");
      setInfo("");
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");

    try {
      await sendPasswordResetEmail(getClientAuth(), email);
      setInfo("Te enviamos un email para restablecer tu contraseña.");
    } catch (err) {
      setError(err.message || "No se pudo enviar el email de recuperacion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className="grid w-full max-w-7xl overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(20,25,60,0.35)] scheme-light md:grid-cols-2"
      aria-labelledby="login-title"
    >
      <div className="relative hidden min-h-[560px] md:block">
        <Image
          src={heroImage}
          alt="Arco del Museo del Louvre con la piramide de vidrio al fondo"
          fill
          sizes="(min-width: 768px) 50vw, 0px"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
            Tu viaje perfecto, sin esfuerzo!
          </h2>
          <p className="mt-4 text-sm leading-6 text-white/85 sm:text-base">
            Planifica, organiza y controla tus viajes en un mismo lugar y no
            pierdas control de tu experiencia!
          </p>
        </div>
      </div>

      <div className="flex flex-col p-8 sm:p-12">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggleMode}
            className="rounded-full bg-[#7386f5] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#5f70e0]"
          >
            {copy.toggleLabel}
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center py-8">
          <div className="mx-auto w-full max-w-md">
            <h1
              id="login-title"
              className="text-2xl font-semibold text-gray-900 sm:text-3xl"
            >
              {copy.heading}
            </h1>
            <span className="mt-3 block h-1 w-10 rounded-full bg-[#7386f5]" />

            <p className="mt-8 text-sm text-gray-500">{copy.subheading}</p>

            <form onSubmit={handleEmailSubmit} className="mt-4 grid gap-5">
              <label className="grid gap-2 text-sm text-gray-700">
                <span>Email:</span>
                <input
                  className="h-11 rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-[#7386f5] focus:ring-1 focus:ring-[#7386f5]"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-gray-700">
                <span>Contraseña:</span>
                <input
                  className="h-11 rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-[#7386f5] focus:ring-1 focus:ring-[#7386f5]"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  minLength={6}
                  required
                />
              </label>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-500">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border border-gray-300 bg-white accent-[#7386f5]"
                  />
                  Recordarme
                </label>
                {mode === "signin" ? (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-gray-500 underline underline-offset-2 hover:text-gray-800"
                  >
                    Recuperar contraseña
                  </button>
                ) : null}
              </div>

              <button
                type="submit"
                className="mt-1 h-11 rounded-md bg-[#7386f5] text-sm font-semibold text-white transition hover:bg-[#5f70e0] disabled:hover:bg-[#7386f5]"
                disabled={loading}
              >
                {copy.submitLabel}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">Otras opciones</p>
              <span className="mx-auto mt-2 block h-0.5 w-16 rounded-full bg-[#7386f5]" />
            </div>

            <button
              type="button"
              className="mt-6 flex h-11 w-full items-center justify-center gap-3 rounded-md border border-gray-300 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <GoogleIcon />
              Continuar con Google
            </button>

            {error ? (
              <p className="mt-5 text-sm leading-6 text-red-600">{error}</p>
            ) : null}
            {info ? (
              <p className="mt-5 text-sm leading-6 text-emerald-600">{info}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
