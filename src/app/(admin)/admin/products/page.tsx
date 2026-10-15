import { requireStaffPage } from "@/lib/staff-page";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatUsd } from "@/lib/constants";
import { Search, Package, Pencil, Trash2 } from "lucide-react";
import { ProductFormDialog } from "@/components/admin/product-form";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { can } from "@/lib/rbac";
import { getServerUser } from "@/lib/auth";

export const metadata = { title: "Products — Admin" };

type SearchParams = { category?: string; q?: string; low?: string };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaffPage();
  const sp = await searchParams;
  const user = await getServerUser();
  const canManage = user ? can(user.role, "inventory:manage_products") : false;
  const where: Record<string, unknown> = {};
  if (sp.category) where.category = sp.category;
  if (sp.q) {
    where.OR = [
      { name: { contains: sp.q } },
      { sku: { contains: sp.q } },
    ];
  }
  if (sp.low === "1") where.stockQty = { lt: 5 };

  const products = await db.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Inventory</p>
          <h1 className="font-heading text-slate text-[26px] lg:text-[32px] font-bold">
            Products &amp; accessories
          </h1>
          <p className="text-feather text-[14px] font-body mt-1">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <ProductFormDialog mode="create" />
      </div>

      <form method="get" className="bg-white rounded-xl border border-feather/20 p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label htmlFor="q" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Search</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-feather" aria-hidden />
            <input id="q" type="search" name="q" defaultValue={sp.q} placeholder="Name or SKU..." className="w-full h-10 pl-9 pr-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
          </div>
        </div>
        <div>
          <label htmlFor="category" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Category</label>
          <select id="category" name="category" defaultValue={sp.category ?? ""} className="mt-1 h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring">
            <option value="">Any</option>
            <option value="CAGE">Cages</option>
            <option value="PERCH">Perches</option>
            <option value="TOY">Toys</option>
            <option value="FOOD">Food</option>
            <option value="SUPPLY">Supplies</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-[13px] font-body text-feather">
          <input type="checkbox" name="low" value="1" defaultChecked={sp.low === "1"} className="h-4 w-4" />
          Low stock only
        </label>
        <button type="submit" className="h-10 px-5 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold inline-flex items-center gap-2">
          <Search className="h-4 w-4" /> Search
        </button>
      </form>

      <div className="bg-white rounded-xl border border-feather/20 overflow-hidden">
        {products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-10 w-10 text-feather mx-auto mb-3" aria-hidden />
            <h2 className="font-heading text-slate text-[20px] mb-2">No products found</h2>
            <p className="text-feather text-[14px] font-body">Adjust filters or add a new product.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px] font-body">
              <thead className="bg-ivory border-b border-feather/20 text-feather text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Product</th>
                  <th className="text-left px-4 py-3 font-semibold">SKU</th>
                  <th className="text-left px-4 py-3 font-semibold">Category</th>
                  <th className="text-right px-4 py-3 font-semibold">Price</th>
                  <th className="text-right px-4 py-3 font-semibold">Stock</th>
                  <th className="text-left px-4 py-3 font-semibold">Active</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-feather/10">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-feather/5">
                    <td className="px-4 py-3 text-slate font-semibold">{p.name}</td>
                    <td className="px-4 py-3 text-feather text-[12px]">{p.sku}</td>
                    <td className="px-4 py-3 text-feather">{p.category}</td>
                    <td className="px-4 py-3 text-right text-slate font-semibold">{formatUsd(Number(p.priceUsd))}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${p.stockQty < 5 ? "text-tail-red" : "text-forest"}`}>
                        {p.stockQty}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block h-2 w-2 rounded-full ${p.isActive ? "bg-forest" : "bg-feather"}`} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage ? (
                        <div className="flex items-center justify-end gap-3">
                          <ProductFormDialog
                            mode="edit"
                            product={{
                              id: p.id,
                              photos: p.photos ?? "[]",
                              features: p.features ?? "[]",
                              name: p.name,
                              sku: p.sku,
                              category: p.category,
                              description: p.description ?? undefined,
                              dimensions: p.dimensions ?? undefined,
                              compatibility: p.compatibility ?? undefined,
                              priceUsd: Number(p.priceUsd),
                              stockQty: p.stockQty,
                              isActive: p.isActive,
                            }}
                            trigger={
                              <span className="inline-flex items-center gap-1 text-tail-red text-[12px] font-body font-semibold hover:underline cursor-pointer">
                                <Pencil className="h-3 w-3" /> Edit
                              </span>
                            }
                          />
                          <DeleteProductButton productId={p.id} productName={p.name} />
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
