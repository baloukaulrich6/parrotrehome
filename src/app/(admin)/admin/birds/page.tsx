import { formatBirdAge } from "@/lib/bird-age";
import { requireStaffPage } from "@/lib/staff-page";
import Link from "next/link";
import { db } from "@/lib/db";
import { BIRD_STATUS_META, formatUsd, formatDateOnly } from "@/lib/constants";
import { Bird as BirdIcon, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { BirdFormDialog } from "@/components/admin/bird-form";
import { DeleteBirdButton } from "@/components/admin/delete-bird-button";
import { can } from "@/lib/rbac";
import { getServerUser } from "@/lib/auth";

export const metadata = { title: "Birds — Admin" };

type SearchParams = { status?: string; q?: string };

export default async function AdminBirdsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaffPage();
  const sp = await searchParams;
  const user = await getServerUser();
  const canManage = user ? can(user.role, "inventory:manage_birds") : false;
  const where: Record<string, unknown> = {};
  if (sp.status) where.status = sp.status;
  if (sp.q) {
    where.OR = [
      { commonName: { contains: sp.q } },
      { species: { contains: sp.q } },
      { individualId: { contains: sp.q } },
    ];
  }
  const birds = await db.bird.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Inventory</p>
          <h1 className="font-heading text-slate text-[26px] lg:text-[32px] font-bold">
            Bird dossiers
          </h1>
          <p className="text-feather text-[14px] font-body mt-1">
            {birds.length} individual bird{birds.length !== 1 ? "s" : ""} — each is a unique dossier, not a stock quantity (A-13).
          </p>
        </div>
        <BirdFormDialog mode="create" />
      </div>

      <form method="get" className="bg-white rounded-xl border border-feather/20 p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label htmlFor="q" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Search</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-feather" aria-hidden />
            <input id="q" type="search" name="q" defaultValue={sp.q} placeholder="Name, species, ID..." className="w-full h-10 pl-9 pr-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
          </div>
        </div>
        <div>
          <label htmlFor="status" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Status</label>
          <select id="status" name="status" defaultValue={sp.status ?? ""} className="mt-1 h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring">
            <option value="">Any</option>
            <option value="AVAILABLE">Available</option>
            <option value="RESERVED">Reserved</option>
            <option value="UNAVAILABLE">Unavailable</option>
            <option value="SOLD">Sold</option>
          </select>
        </div>
        <button type="submit" className="h-10 px-5 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold inline-flex items-center gap-2">
          <Search className="h-4 w-4" /> Search
        </button>
      </form>

      {birds.length === 0 ? (
        <div className="bg-white rounded-xl border border-feather/20 p-12 text-center">
          <BirdIcon className="h-10 w-10 text-feather mx-auto mb-3" aria-hidden />
          <h2 className="font-heading text-slate text-[20px] mb-2">No birds found</h2>
          <p className="text-feather text-[14px] font-body">Try adjusting your filters or add a new bird dossier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {birds.map((b) => {
            const photos: string[] = b.photos ? JSON.parse(b.photos) : [];
            const photo = photos[0] ?? "";
            const status = BIRD_STATUS_META[b.status];
            return (
              <article key={b.id} className="bg-white rounded-xl border border-feather/20 overflow-hidden">
                <div className="relative aspect-[16/10] overflow-hidden bg-feather/10">
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt={b.commonName} className="w-full h-full object-cover" />
                  )}
                  <span className={`absolute top-2 left-2 status-badge ${status.className} text-[11px]`}>
                    {status.label}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-[11px] text-feather font-body italic mb-0.5">{b.species}</p>
                  <h3 className="font-heading text-slate text-[16px] font-semibold mb-2 leading-tight">{b.commonName}</h3>
                  <div className="grid grid-cols-2 gap-2 text-[12px] font-body mb-3">
                    <div>
                      <p className="text-feather text-[10px] uppercase">ID</p>
                      <p className="text-slate">{b.individualId ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-feather text-[10px] uppercase">Age</p>
                      <p className="text-slate">{formatBirdAge(b.ageYears)}</p>
                    </div>
                    <div>
                      <p className="text-feather text-[10px] uppercase">Sex</p>
                      <p className="text-slate">{b.sex ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-feather text-[10px] uppercase">Origin</p>
                      <p className="text-slate">{b.originState ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-feather/15 pt-2">
                    <div>
                      <p className="text-[10px] text-feather uppercase">Price</p>
                      <p className="text-slate font-body font-bold">{b.priceUsd ? formatUsd(Number(b.priceUsd)) : "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManage && (
                        <>
                          <BirdFormDialog
                            mode="edit"
                            bird={{
                              id: b.id,
                              species: b.species,
                              commonName: b.commonName,
                              individualId: b.individualId ?? undefined,
                              ageYears: b.ageYears ?? undefined,
                              sex: b.sex ?? undefined,
                              photos: b.photos,
                              status: b.status,
                              location: b.location ?? undefined,
                              priceUsd: b.priceUsd ?? undefined,
                              shortDescription: b.shortDescription ?? undefined,
                              longDescription: b.longDescription ?? undefined,
                              careNotes: b.careNotes ?? undefined,
                              breederName: b.breederName ?? undefined,
                              originState: b.originState ?? undefined,
                            }}
                            trigger={
                              <button className="inline-flex items-center gap-1 text-tail-red text-[12px] font-body font-semibold hover:underline">
                                <Pencil className="h-3 w-3" /> Edit
                              </button>
                            }
                          />
                          {b.status !== "RESERVED" && b.status !== "SOLD" && (
                            <DeleteBirdButton birdId={b.id} birdName={b.commonName} />
                          )}
                        </>
                      )}
                      <Link
                        href={`/parrots/${b.id}`}
                        className="inline-flex items-center gap-1 text-feather hover:text-slate text-[12px] font-body font-semibold hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
