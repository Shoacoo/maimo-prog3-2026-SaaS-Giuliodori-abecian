"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, rectSwappingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createNoteFolder,
  deleteNoteFolderAction,
  createNote,
  updateNoteAction,
  deleteNoteAction,
  reorderNotesAction,
} from "@/app/dashboard/trips/actions";

const NOTE_COLORS = [
  { id: "yellow", swatch: "bg-amber-300", card: "bg-amber-100" },
  { id: "rose", swatch: "bg-rose-300", card: "bg-rose-100" },
  { id: "sky", swatch: "bg-sky-300", card: "bg-sky-100" },
  { id: "violet", swatch: "bg-[#7386f5]", card: "bg-[#e9ebfd]" },
];

const DATE_FILTERS = [
  { id: "all", label: "Todas" },
  { id: "today", label: "Hoy" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mes" },
];

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

function colorInfo(colorId) {
  return NOTE_COLORS.find((c) => c.id === colorId) || NOTE_COLORS[0];
}

function matchesDateFilter(note, filter) {
  if (filter === "all") return true;

  const createdAt = new Date(note.createdAt);
  const now = new Date();

  if (filter === "today") {
    return createdAt.toDateString() === now.toDateString();
  }

  if (filter === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return createdAt >= weekAgo;
  }

  if (filter === "month") {
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
  }

  return true;
}

function FolderIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
      <path
        d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 0 1 13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ColorSwatches({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {NOTE_COLORS.map((color) => (
        <button
          key={color.id}
          type="button"
          onClick={() => onChange(color.id)}
          aria-label={color.id}
          className={`h-7 w-7 rounded-full ${color.swatch} transition ${
            value === color.id ? "ring-2 ring-offset-2 ring-gray-900" : "opacity-70 hover:opacity-100"
          }`}
        />
      ))}
    </div>
  );
}

const FORM_INPUT_CLASSES =
  "w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#7386f5]";

function FolderForm({ onCancel, onSubmit }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(NOTE_COLORS[0].id);

  return (
    <div className="col-span-2 flex flex-col gap-3 rounded-2xl border-2 border-[#7386f5] bg-white p-4 shadow-md">
      <input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nombre de la carpeta"
        className={`h-10 text-sm ${FORM_INPUT_CLASSES}`}
      />
      <ColorSwatches value={color} onChange={setColor} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-xs font-medium text-gray-400 hover:text-gray-600">
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => name.trim() && onSubmit({ name, color })}
          className="rounded-full bg-[#7386f5] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#5f70e0]"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function NoteForm({ folders, initial, onCancel, onSubmit }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || "");
  const [color, setColor] = useState(initial?.color || NOTE_COLORS[0].id);
  const [folderId, setFolderId] = useState(initial?.folderId || "");

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-[#7386f5] bg-white p-4 shadow-md">
      <input
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Titulo"
        className={`h-10 font-semibold ${FORM_INPUT_CLASSES}`}
      />
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Escribi tu nota..."
        rows={4}
        className={`resize-none py-2 text-sm ${FORM_INPUT_CLASSES}`}
      />
      <select
        value={folderId}
        onChange={(event) => setFolderId(event.target.value)}
        className={`h-9 text-xs ${FORM_INPUT_CLASSES}`}
      >
        <option value="">Sin carpeta</option>
        {folders.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {folder.name}
          </option>
        ))}
      </select>
      <ColorSwatches value={color} onChange={setColor} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-xs font-medium text-gray-400 hover:text-gray-600">
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => title.trim() && onSubmit({ title, content, color, folderId: folderId || null })}
          className="rounded-full bg-[#7386f5] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#5f70e0]"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function NoteCard({ note, folder, onEdit, onRemove, dragging }) {
  const colors = colorInfo(note.color);

  return (
    <div
      className={`rounded-2xl p-5 shadow-md transition-shadow ${colors.card} ${dragging ? "shadow-2xl" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-gray-900">{note.title}</p>
        {onEdit || onRemove ? (
          <div className="flex shrink-0 gap-1">
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Editar ${note.title}`}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-gray-600 transition hover:bg-white"
              >
                <PencilIcon />
              </button>
            ) : null}
            {onRemove ? (
              <button
                type="button"
                onClick={onRemove}
                aria-label={`Borrar ${note.title}`}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-gray-600 transition hover:bg-white hover:text-red-500"
              >
                <TrashIcon />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {note.content ? <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{note.content}</p> : null}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
        <span>{DATE_FORMATTER.format(new Date(note.createdAt))}</span>
        {folder ? <span className="rounded-full bg-white/70 px-2.5 py-1 font-medium">{folder.name}</span> : null}
      </div>
    </div>
  );
}

function SortableNoteCard({ note, folder, onEdit, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-4 touch-none break-inside-avoid cursor-grab active:cursor-grabbing"
    >
      <NoteCard note={note} folder={folder} onEdit={onEdit} onRemove={onRemove} />
    </div>
  );
}

export default function NotesView({ tripId, notes, noteFolders }) {
  const router = useRouter();
  const dndId = useId();
  const [localNotes, setLocalNotes] = useState(notes);
  const [localFolders, setLocalFolders] = useState(noteFolders);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [dateFilter, setDateFilter] = useState("all");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingNote, setCreatingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [draggingNoteId, setDraggingNoteId] = useState(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => setLocalNotes(notes), [notes]);
  useEffect(() => setLocalFolders(noteFolders), [noteFolders]);

  function toggleFolder(folderId) {
    setActiveFolderId((current) => (current === folderId ? null : folderId));
  }

  function handleCreateFolder({ name, color }) {
    const optimistic = { id: `optimistic-${Date.now()}`, name, color };
    setLocalFolders((current) => [...current, optimistic]);
    setCreatingFolder(false);
    setError("");

    startTransition(async () => {
      try {
        await createNoteFolder(tripId, { name, color });
        router.refresh();
      } catch {
        setLocalFolders((current) => current.filter((f) => f.id !== optimistic.id));
        setError("No se pudo crear la carpeta.");
      }
    });
  }

  function handleDeleteFolder(folderId) {
    const previousFolders = localFolders;
    const previousNotes = localNotes;
    setLocalFolders((current) => current.filter((f) => f.id !== folderId));
    setLocalNotes((current) => current.map((n) => (n.folderId === folderId ? { ...n, folderId: null } : n)));
    if (activeFolderId === folderId) setActiveFolderId(null);
    setError("");

    startTransition(async () => {
      try {
        await deleteNoteFolderAction(tripId, folderId);
        router.refresh();
      } catch {
        setLocalFolders(previousFolders);
        setLocalNotes(previousNotes);
        setError("No se pudo borrar la carpeta.");
      }
    });
  }

  function handleCreateNote(data) {
    const now = new Date().toISOString();
    const optimistic = { id: `optimistic-${Date.now()}`, ...data, createdAt: now, updatedAt: now };
    setLocalNotes((current) => [optimistic, ...current]);
    setCreatingNote(false);
    setError("");

    startTransition(async () => {
      try {
        await createNote(tripId, data);
        router.refresh();
      } catch {
        setLocalNotes((current) => current.filter((n) => n.id !== optimistic.id));
        setError("No se pudo crear la nota.");
      }
    });
  }

  function handleUpdateNote(noteId, data) {
    const previous = localNotes;
    setLocalNotes((current) =>
      current.map((n) => (n.id === noteId ? { ...n, ...data, updatedAt: new Date().toISOString() } : n)),
    );
    setEditingNoteId(null);
    setError("");

    startTransition(async () => {
      try {
        await updateNoteAction(tripId, noteId, data);
        router.refresh();
      } catch {
        setLocalNotes(previous);
        setError("No se pudo editar la nota.");
      }
    });
  }

  function handleDeleteNote(noteId) {
    const previous = localNotes;
    setLocalNotes((current) => current.filter((n) => n.id !== noteId));
    setError("");

    startTransition(async () => {
      try {
        await deleteNoteAction(tripId, noteId);
        router.refresh();
      } catch {
        setLocalNotes(previous);
        setError("No se pudo borrar la nota.");
      }
    });
  }

  // Swaps two notes' positions in the full (unfiltered) list - the active
  // filter/date-tab only changes what's visible, never the underlying order,
  // so a swap made while filtered still applies to the right two notes.
  function handleReorderNotes(activeNoteId, overNoteId) {
    const previous = localNotes;
    const i = localNotes.findIndex((n) => n.id === activeNoteId);
    const j = localNotes.findIndex((n) => n.id === overNoteId);
    if (i === -1 || j === -1) return;

    const reordered = [...localNotes];
    [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
    setLocalNotes(reordered);
    setError("");

    startTransition(async () => {
      try {
        await reorderNotesAction(tripId, reordered.map((n) => n.id));
      } catch {
        setLocalNotes(previous);
        setError("No se pudo guardar el nuevo orden.");
      }
    });
  }

  const visibleNotes = localNotes
    .filter((note) => (activeFolderId ? note.folderId === activeFolderId : true))
    .filter((note) => matchesDateFilter(note, dateFilter));

  const draggingNote = localNotes.find((n) => n.id === draggingNoteId) || null;
  const draggingNoteFolder = draggingNote ? localFolders.find((f) => f.id === draggingNote.folderId) : null;

  return (
    <div>
      {error ? <p className="mb-4 text-sm text-red-500">{error}</p> : null}

      <h2 className="text-lg font-bold text-gray-900">Carpetas recientes</h2>
      <div className="mt-4 grid grid-cols-2 items-start gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {localFolders.map((folder) => {
          const colors = colorInfo(folder.color);
          const active = activeFolderId === folder.id;
          return (
            <div
              key={folder.id}
              className={`relative flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-md transition ${
                active ? "border-[#7386f5] ring-2 ring-[#7386f5]/30" : "border-gray-100"
              }`}
            >
              <button
                type="button"
                onClick={() => handleDeleteFolder(folder.id)}
                aria-label={`Borrar carpeta ${folder.name}`}
                className="absolute right-3 top-3 text-gray-300 transition hover:text-red-500"
              >
                <TrashIcon />
              </button>
              <button type="button" onClick={() => toggleFolder(folder.id)} className="flex flex-col items-start gap-3 pr-5 text-left">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${colors.swatch}`}>
                  <FolderIcon />
                </span>
                <span className="wrap-break-word font-semibold text-gray-900">{folder.name}</span>
              </button>
            </div>
          );
        })}

        {creatingFolder ? (
          <FolderForm onCancel={() => setCreatingFolder(false)} onSubmit={handleCreateFolder} />
        ) : (
          <button
            type="button"
            onClick={() => setCreatingFolder(true)}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#7386f5]/40 p-4 text-sm font-medium text-[#7386f5] transition hover:border-[#7386f5] hover:bg-[#7386f5]/5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#7386f5] text-lg leading-none">
              +
            </span>
            Nueva carpeta
          </button>
        )}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-gray-900">Mis notas</h2>
        <div className="flex gap-1 rounded-full bg-gray-100 p-1 text-sm">
          {DATE_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setDateFilter(filter.id)}
              className={`rounded-full px-3 py-1.5 font-medium transition ${
                dateFilter === filter.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {creatingNote ? (
          <div className="w-1/2 min-w-70">
            <NoteForm folders={localFolders} onCancel={() => setCreatingNote(false)} onSubmit={handleCreateNote} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreatingNote(true)}
            className="group inline-flex h-11 items-center gap-2 rounded-full bg-[#7386f5] px-6 text-sm font-semibold text-white shadow-md transition-all duration-300 ease-out hover:scale-110 hover:bg-[#5f70e0] hover:shadow-xl"
          >
            Nueva nota
            <span className="transition-transform duration-300 ease-out group-hover:translate-x-1.5">→</span>
          </button>
        )}
      </div>

      {visibleNotes.length === 0 ? (
        <p className="mt-6 text-sm text-gray-400">
          {activeFolderId || dateFilter !== "all" ? "No hay notas que coincidan con el filtro." : "Todavia no agregaste notas."}
        </p>
      ) : (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => setDraggingNoteId(event.active.id)}
          onDragEnd={(event) => {
            const { active, over } = event;
            setDraggingNoteId(null);
            if (over && active.id !== over.id) {
              handleReorderNotes(active.id, over.id);
            }
          }}
          onDragCancel={() => setDraggingNoteId(null)}
        >
          <SortableContext items={visibleNotes.map((note) => note.id)} strategy={rectSwappingStrategy}>
            <div className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3">
              {visibleNotes.map((note) => {
                if (editingNoteId === note.id) {
                  return (
                    <div key={note.id} className="mb-4 break-inside-avoid">
                      <NoteForm
                        folders={localFolders}
                        initial={note}
                        onCancel={() => setEditingNoteId(null)}
                        onSubmit={(data) => handleUpdateNote(note.id, data)}
                      />
                    </div>
                  );
                }

                const folder = localFolders.find((f) => f.id === note.folderId);

                return (
                  <SortableNoteCard
                    key={note.id}
                    note={note}
                    folder={folder}
                    onEdit={() => setEditingNoteId(note.id)}
                    onRemove={() => handleDeleteNote(note.id)}
                  />
                );
              })}
            </div>
          </SortableContext>

          <DragOverlay>
            {draggingNote ? (
              <div className="w-72">
                <NoteCard note={draggingNote} folder={draggingNoteFolder} dragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
