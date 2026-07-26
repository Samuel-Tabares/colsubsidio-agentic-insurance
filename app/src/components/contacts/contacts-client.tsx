"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  MessageSquareText,
  Pencil,
  Search,
} from "lucide-react";
import type { ContactRowDto, StageDto } from "@/lib/types";
import { formatPhone } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChannelBadge } from "@/components/admin/channel-badge";
import { ClientDetail } from "@/components/admin/client-detail";

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
}

export function ContactsClient() {
  const [contacts, setContacts] = useState<ContactRowDto[]>([]);
  const [stages, setStages] = useState<StageDto[]>([]);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<ContactRowDto | null>(null);
  const [detail, setDetail] = useState<ContactRowDto | null>(null);

  const refetch = useCallback(async () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (showArchived) params.set("archived", "true");
    const res = await fetch(`/api/contacts?${params}`).catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as { contacts: ContactRowDto[] };
    setContacts(data.contacts);
  }, [query, showArchived]);

  useEffect(() => {
    const t = setTimeout(() => void refetch(), 250);
    return () => clearTimeout(t);
  }, [refetch]);

  useEffect(() => {
    fetch("/api/pipeline/stages")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStages(d.stages as StageDto[]))
      .catch(() => {});
  }, []);

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    void refetch();
  }

  const currentStageId =
    stages.find((s) => s.name === detail?.stageName)?.id ?? null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
        <h2 className="font-display text-lg font-semibold text-brand-blue">
          Contactos
        </h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-text-3">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-brand-blue"
            />
            Ver archivados
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-3" />
            <Input
              placeholder="Buscar por nombre o teléfono…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-72 pl-8"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {contacts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium">Sin contactos</p>
            <p className="max-w-sm text-xs text-text-3">
              Cada persona que hable con Asegura por WhatsApp o web quedará
              registrada aquí automáticamente.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Seguro</TableHead>
                  <TableHead>Última interacción</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => setDetail(c)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.name}</span>
                        {c.archivedAt && (
                          <Badge variant="secondary">Archivado</Badge>
                        )}
                      </div>
                      <div className="text-xs text-text-3">
                        {formatPhone(c.phone)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.stageName ? (
                        <Badge
                          variant="secondary"
                          className="bg-brand-blue/10 text-brand-blue"
                        >
                          {c.stageName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-text-3">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{c.seguro ?? "—"}</TableCell>
                    <TableCell className="text-sm text-text-3">
                      {relativeTime(c.ultimaInteraccion)}
                    </TableCell>
                    <TableCell>
                      <ChannelBadge canal={c.canal} />
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex shrink-0 items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar"
                          title="Editar"
                          onClick={() => setEditing(c)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Link href={`/inbox?contact=${c.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Ver chat"
                            title="Ver chat"
                          >
                            <MessageSquareText className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={c.archivedAt ? "Desarchivar" : "Archivar"}
                          title={c.archivedAt ? "Desarchivar" : "Archivar"}
                          onClick={() =>
                            void patch(c.id, { archived: !c.archivedAt })
                          }
                        >
                          {c.archivedAt ? (
                            <ArchiveRestore className="h-4 w-4" />
                          ) : (
                            <Archive className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {detail && (
        <Modal onClose={() => setDetail(null)} wide title="Detalle del cliente">
          <ClientDetail
            contact={detail}
            canal={detail.canal}
            stages={stages}
            currentStageId={currentStageId}
          />
        </Modal>
      )}

      {editing && (
        <EditDialog
          contact={editing}
          onClose={() => setEditing(null)}
          onSave={async (patchBody) => {
            await patch(editing.id, patchBody);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Modal({
  title,
  wide = false,
  onClose,
  children,
}: {
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-lg border bg-card p-5 shadow-xl ${
          wide ? "max-w-3xl" : "max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-display font-semibold text-brand-blue">
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}

function EditDialog({
  contact,
  onClose,
  onSave,
}: {
  contact: ContactRowDto;
  onClose: () => void;
  onSave: (patch: { name: string; notes: string }) => Promise<void>;
}) {
  const [name, setName] = useState(contact.name);
  const [notes, setNotes] = useState(contact.notes ?? "");

  return (
    <Modal title="Editar contacto" onClose={onClose}>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="edit-name">
            Nombre
          </label>
          <Input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="edit-notes">
            Notas
          </label>
          <Textarea
            id="edit-notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={!name.trim()}
          onClick={() => void onSave({ name: name.trim(), notes })}
        >
          Guardar
        </Button>
      </div>
    </Modal>
  );
}
