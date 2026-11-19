"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { prepareAvatar } from "@/lib/users/avatarClient";
import { deleteAvatar, saveProfile, uploadAvatar } from "@/app/dashboard/perfil/actions";
import UserAvatar from "@/components/profile/UserAvatar";
import InlineEdit from "@/components/profile/InlineEdit";
import FriendsPanel from "@/components/profile/FriendsPanel";
import AccountSettings from "@/components/profile/AccountSettings";
import EditProfileModal from "@/components/profile/EditProfileModal";
import { PencilIcon } from "@/components/profile/InlineEdit";

const CURRENCY_LABELS = {
  ARS: "Peso argentino",
  USD: "Dólar",
  EUR: "Euro",
  BRL: "Real",
  CLP: "Peso chileno",
  UYU: "Peso uruguayo",
  MXN: "Peso mexicano",
};

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function Chip({ children }) {
  return <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">{children}</span>;
}

function StatChip({ value, label, color }) {
  return (
    <div className="flex items-baseline gap-1.5 rounded-full bg-gray-50 px-3.5 py-1.5 ring-1 ring-gray-100">
      <span className="text-base font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

// Aviso chico abajo al centro ("Guardado", "Solicitud enviada", errores).
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      role="status"
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-xl ${
        toast.type === "error" ? "bg-red-600" : "bg-gray-900"
      }`}
    >
      {toast.type === "error" ? "" : "✓ "}
      {toast.text}
    </div>
  );
}

// "Mi perfil" con estilo de red social: los datos se ven como perfil y se
// editan en el lugar (lapiz al pasar el mouse); la foto se cambia tocandola.
export default function ProfileView({ profile, stats, currencies, friendships }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [data, setData] = useState({
    displayName: profile.displayName,
    bio: profile.bio,
    homeCity: profile.homeCity,
    homeCountry: profile.homeCountry,
    currency: profile.currency,
  });
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [hasCustomAvatar, setHasCustomAvatar] = useState(profile.hasCustomAvatar);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const notify = (text) => setToast({ type: "ok", text, at: Date.now() });
  const fail = (text) => setToast({ type: "error", text, at: Date.now() });

  // Guardado optimista: se ve el cambio enseguida y si el servidor lo rechaza
  // se vuelve al valor anterior.
  function save(changes) {
    const previous = data;
    const next = { ...data, ...changes };
    setData(next);
    startTransition(async () => {
      const result = await saveProfile(next).catch(() => ({ error: "No se pudo guardar." }));
      if (result?.error) {
        setData(previous);
        fail(result.error);
        return;
      }
      notify("Guardado");
      router.refresh();
    });
  }

  async function pickPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await prepareAvatar(file);
      const previous = avatarUrl;
      setAvatarUrl(dataUrl);
      const result = await uploadAvatar(dataUrl);
      if (result?.error) {
        setAvatarUrl(previous);
        throw new Error(result.error);
      }
      setAvatarUrl(result.avatarUrl);
      setHasCustomAvatar(true);
      notify("Foto actualizada");
      router.refresh();
    } catch (error) {
      fail(error.message || "No se pudo subir la foto.");
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    setUploading(true);
    const result = await deleteAvatar().catch(() => ({ error: "No se pudo quitar la foto." }));
    setUploading(false);
    if (result?.error) return fail(result.error);
    setAvatarUrl(profile.googlePhoto);
    setHasCustomAvatar(false);
    notify(profile.googlePhoto ? "Volviste a tu foto de Google" : "Foto quitada");
    router.refresh();
  }

  const location = [data.homeCity, data.homeCountry].filter(Boolean).join(", ");

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      {/* Perfil */}
      <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        <div className="relative h-36 bg-linear-to-br from-[#7386f5] via-[#5f70e0] to-[#143DA6]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.25),transparent_45%)]" />
        </div>

        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-14 flex items-end justify-between gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Cambiar foto de perfil"
              className="group relative rounded-full transition hover:scale-[1.02]"
            >
              <UserAvatar src={avatarUrl} name={data.displayName || profile.email} size={112} className="ring-4" />
              <span
                className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white transition ${
                  uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                }`}
              >
                {uploading ? <span className="text-xs font-semibold">Subiendo…</span> : <CameraIcon />}
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />

            <div className="flex flex-wrap items-center justify-end gap-1.5 pb-2 text-[11px] font-semibold">
              {profile.role === "admin" ? <span className="rounded-full bg-[#7386f5]/12 px-2.5 py-1 text-[#5f70e0]">Admin</span> : null}
              {profile.hasGoogle ? <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">Google</span> : null}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-[#7386f5] hover:text-[#5f70e0]"
              >
                <PencilIcon size={13} />
                Editar perfil
              </button>
            </div>
          </div>

          <div className="mt-3">
            <InlineEdit
              label="nombre"
              value={data}
              placeholder="Agregá tu nombre"
              fields={[{ key: "displayName", label: "Nombre", maxLength: 60, className: "text-2xl font-bold" }]}
              onSave={save}
              renderView={(value) => <span className="text-2xl font-bold text-gray-900">{value.displayName}</span>}
            />
            <p className="text-sm text-gray-400">{profile.email}</p>
          </div>

          <div className="mt-3 max-w-2xl">
            <InlineEdit
              label="bio"
              multiline
              value={data}
              placeholder="Agregá una bio: qué tipo de viajes te gustan, a dónde querés ir…"
              fields={[{ key: "bio", label: "Sobre vos", maxLength: 280, className: "text-sm" }]}
              onSave={save}
              renderView={(value) => <span className="whitespace-pre-line text-[15px] leading-relaxed text-gray-700">{value.bio}</span>}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <InlineEdit
              label="ubicación"
              value={data}
              placeholder="📍 Agregá de dónde sos"
              fields={[
                { key: "homeCity", label: "Ciudad", placeholder: "Ciudad", maxLength: 60, className: "text-sm" },
                { key: "homeCountry", label: "País", placeholder: "País", maxLength: 60, className: "text-sm" },
              ]}
              onSave={save}
              renderView={() => <Chip>📍 {location}</Chip>}
            />
            <InlineEdit
              label="moneda"
              value={data}
              placeholder="💱 Moneda"
              fields={[
                {
                  key: "currency",
                  label: "Moneda preferida",
                  className: "text-sm",
                  options: currencies.map((code) => ({ value: code, label: `${CURRENCY_LABELS[code] || code} (${code})` })),
                },
              ]}
              onSave={save}
              renderView={(value) => (
                <Chip>
                  💱 {CURRENCY_LABELS[value.currency] || value.currency} ({value.currency})
                </Chip>
              )}
            />
            {hasCustomAvatar ? (
              <button type="button" onClick={removePhoto} disabled={uploading} className="text-xs font-medium text-gray-400 hover:text-red-600">
                {profile.googlePhoto ? "Usar mi foto de Google" : "Quitar foto"}
              </button>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <StatChip value={stats.trips} label={stats.trips === 1 ? "viaje" : "viajes"} color="#7386F5" />
            <StatChip value={stats.countries} label={stats.countries === 1 ? "país" : "países"} color="#7CBE66" />
            <StatChip value={stats.cities} label={stats.cities === 1 ? "ciudad" : "ciudades"} color="#F5A524" />
            <StatChip value={friendships.friends.length} label={friendships.friends.length === 1 ? "amigo" : "amigos"} color="#143DA6" />
          </div>
        </div>
      </section>

      <FriendsPanel friendships={friendships} onToast={notify} />

      <AccountSettings profile={profile} ownTrips={stats.ownTrips} onToast={notify} />

      {editing ? (
        <EditProfileModal
          data={data}
          avatarUrl={avatarUrl}
          email={profile.email}
          currencies={currencies}
          currencyLabels={CURRENCY_LABELS}
          onSave={save}
          onPickPhoto={() => fileRef.current?.click()}
          onClose={() => setEditing(false)}
        />
      ) : null}

      <Toast toast={toast} />
    </div>
  );
}
