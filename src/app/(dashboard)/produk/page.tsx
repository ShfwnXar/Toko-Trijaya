"use client"

import { useState, useEffect, useCallback } from "react"
import { BarcodeScanner } from "@/components/kasir/barcode-scanner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface Product {
  id: string
  barcode: string
  name: string
  category: string
  purchasePrice: number | string
  retailPrice: number | string
  wholesalePrice: number | string | null
  wholesaleMinQty: number
  stock: number
  minStock: number
  unit: string
  supplierId: string | null
  isActive: boolean
  supplier: { id: string; name: string } | null
}

interface PaginationData {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface FormData {
  barcode: string
  name: string
  category: string
  purchasePrice: string
  retailPrice: string
  wholesalePrice: string
  wholesaleMinQty: string
  stock: string
  minStock: string
  unit: string
  supplierId: string
}

interface FormErrors {
  [key: string]: string
}

const CATEGORIES = ["Makanan", "Minuman", "Sabun", "Rokok", "Alat Tulis", "Lainnya"]

const initialFormData: FormData = {
  barcode: "",
  name: "",
  category: "",
  purchasePrice: "",
  retailPrice: "",
  wholesalePrice: "",
  wholesaleMinQty: "12",
  stock: "0",
  minStock: "10",
  unit: "pcs",
  supplierId: "",
}

export default function ProdukPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  // Form state
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", pagination.page.toString())
      params.set("pageSize", "20")
      if (search) params.set("search", search)
      if (categoryFilter) params.set("category", categoryFilter)

      const res = await fetch(`/api/products?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.data)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error("Failed to fetch products:", error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, search, categoryFilter])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value === "all" ? "" : value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  const openCreateForm = () => {
    setEditingProduct(null)
    setFormData(initialFormData)
    setFormErrors({})
    setFormOpen(true)
  }

  const openEditForm = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      barcode: product.barcode,
      name: product.name,
      category: product.category,
      purchasePrice: Number(product.purchasePrice).toString(),
      retailPrice: Number(product.retailPrice).toString(),
      wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice).toString() : "",
      wholesaleMinQty: product.wholesaleMinQty.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      unit: product.unit,
      supplierId: product.supplierId || "",
    })
    setFormErrors({})
    setFormOpen(true)
  }

  const openDeleteConfirm = (product: Product) => {
    setDeletingProduct(product)
    setDeleteOpen(true)
  }

  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    if (!formData.barcode.trim()) errors.barcode = "Barcode wajib diisi"
    if (!formData.name.trim()) errors.name = "Nama produk wajib diisi"
    if (!formData.category) errors.category = "Kategori wajib diisi"

    const purchasePrice = parseFloat(formData.purchasePrice)
    const retailPrice = parseFloat(formData.retailPrice)
    const wholesalePrice = formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : null

    if (!formData.purchasePrice || isNaN(purchasePrice) || purchasePrice <= 0) {
      errors.purchasePrice = "Harga beli harus lebih dari 0"
    }
    if (!formData.retailPrice || isNaN(retailPrice) || retailPrice <= 0) {
      errors.retailPrice = "Harga eceran harus lebih dari 0"
    }
    if (purchasePrice > 0 && retailPrice > 0 && retailPrice <= purchasePrice) {
      errors.retailPrice = "Harga eceran harus lebih besar dari harga beli"
    }
    if (wholesalePrice !== null && !isNaN(wholesalePrice)) {
      if (wholesalePrice <= 0) {
        errors.wholesalePrice = "Harga grosir harus lebih dari 0"
      } else if (purchasePrice > 0 && wholesalePrice <= purchasePrice) {
        errors.wholesalePrice = "Harga grosir harus lebih besar dari harga beli"
      }
    }

    if (!formData.unit.trim()) errors.unit = "Unit wajib diisi"

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const payload = {
        barcode: formData.barcode.trim(),
        name: formData.name.trim(),
        category: formData.category,
        purchasePrice: parseFloat(formData.purchasePrice),
        retailPrice: parseFloat(formData.retailPrice),
        wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : null,
        wholesaleMinQty: parseInt(formData.wholesaleMinQty) || 12,
        stock: parseInt(formData.stock) || 0,
        minStock: parseInt(formData.minStock) || 10,
        unit: formData.unit.trim(),
        supplierId: formData.supplierId || null,
      }

      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : "/api/products"
      const method = editingProduct ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setFormOpen(false)
        fetchProducts()
      } else {
        const data = await res.json()
        if (data.details) {
          const serverErrors: FormErrors = {}
          Object.entries(data.details).forEach(([key, messages]) => {
            serverErrors[key] = (messages as string[])[0]
          })
          setFormErrors(serverErrors)
        } else if (data.message) {
          setFormErrors({ _general: data.message })
        }
      }
    } catch (error) {
      console.error("Submit error:", error)
      setFormErrors({ _general: "Gagal menyimpan produk" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingProduct) return

    try {
      const res = await fetch(`/api/products/${deletingProduct.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setDeleteOpen(false)
        setDeletingProduct(null)
        fetchProducts()
      }
    } catch (error) {
      console.error("Delete error:", error)
    }
  }

  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(price))
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Manajemen Produk</h1>
        <Button onClick={openCreateForm} className="bg-primary hover:bg-primary-600">
          + Tambah Produk
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Cari nama atau barcode..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={categoryFilter || "all"} onValueChange={handleCategoryFilter}>
          <SelectTrigger className="sm:max-w-[180px]">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product Table (Desktop) */}
      <div className="hidden md:block border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Eceran</TableHead>
              <TableHead className="text-right">Grosir</TableHead>
              <TableHead className="text-center">Stok</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Tidak ada produk ditemukan
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{product.barcode}</p>
                  </TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell className="text-right">{formatPrice(product.retailPrice)}</TableCell>
                  <TableCell className="text-right">
                    {product.wholesalePrice ? formatPrice(product.wholesalePrice) : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={product.stock <= product.minStock ? "text-red-600 font-semibold" : ""}>
                      {product.stock}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {product.isActive ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditForm(product)}>Edit</Button>
                      {product.isActive && (
                        <Button variant="destructive" size="sm" onClick={() => openDeleteConfirm(product)}>Hapus</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Product Cards (Mobile) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Memuat data...</p>
        ) : products.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Tidak ada produk ditemukan</p>
        ) : (
          products.map((product) => (
            <div key={product.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{product.barcode}</p>
                  <p className="text-xs text-muted-foreground">{product.category}</p>
                </div>
                {product.isActive ? (
                  <Badge variant="default" className="bg-green-100 text-green-800 text-[10px] ml-2">Aktif</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] ml-2">Nonaktif</Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Eceran</p>
                  <p className="font-semibold">{formatPrice(product.retailPrice)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Grosir</p>
                  <p className="font-semibold">{product.wholesalePrice ? formatPrice(product.wholesalePrice) : "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Stok</p>
                  <p className={`font-semibold ${product.stock <= product.minStock ? "text-red-600" : ""}`}>
                    {product.stock} {product.unit}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1 text-xs min-h-[36px]" onClick={() => openEditForm(product)}>Edit</Button>
                {product.isActive && (
                  <Button variant="destructive" size="sm" className="flex-1 text-xs min-h-[36px]" onClick={() => openDeleteConfirm(product)}>Hapus</Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (pagination.page > 1) handlePageChange(pagination.page - 1)
                }}
                className={pagination.page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
              const startPage = Math.max(1, pagination.page - 2)
              const pageNum = startPage + i
              if (pageNum > pagination.totalPages) return null
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href="#"
                    isActive={pageNum === pagination.page}
                    onClick={(e) => {
                      e.preventDefault()
                      handlePageChange(pageNum)
                    }}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              )
            })}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (pagination.page < pagination.totalPages) handlePageChange(pagination.page + 1)
                }}
                className={pagination.page >= pagination.totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Create/Edit Product Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Ubah informasi produk di bawah ini."
                : "Isi data produk baru di bawah ini."}
            </DialogDescription>
          </DialogHeader>

          {formErrors._general && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {formErrors._general}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode *</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Scan atau ketik barcode"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setScannerOpen(!scannerOpen)}
                  className="min-w-[44px]"
                >
                  📷
                </Button>
              </div>
              {scannerOpen && (
                <div className="mt-2">
                  <BarcodeScanner 
                    autoStart={true}
                    onBarcodeDetected={(barcode) => {
                      setFormData({ ...formData, barcode })
                    }} 
                  />
                </div>
              )}
              {formErrors.barcode && (
                <p className="text-sm text-red-600">{formErrors.barcode}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama Produk *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nama produk"
              />
              {formErrors.name && (
                <p className="text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategori *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.category && (
                <p className="text-sm text-red-600">{formErrors.category}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Harga Beli *</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  min="0"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  placeholder="0"
                />
                {formErrors.purchasePrice && (
                  <p className="text-sm text-red-600">{formErrors.purchasePrice}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="retailPrice">Harga Eceran *</Label>
                <Input
                  id="retailPrice"
                  type="number"
                  min="0"
                  value={formData.retailPrice}
                  onChange={(e) => setFormData({ ...formData, retailPrice: e.target.value })}
                  placeholder="0"
                />
                {formErrors.retailPrice && (
                  <p className="text-sm text-red-600">{formErrors.retailPrice}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="wholesalePrice">Harga Grosir</Label>
                <Input
                  id="wholesalePrice"
                  type="number"
                  min="0"
                  value={formData.wholesalePrice}
                  onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                  placeholder="Opsional"
                />
                {formErrors.wholesalePrice && (
                  <p className="text-sm text-red-600">{formErrors.wholesalePrice}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="wholesaleMinQty">Min. Qty Grosir</Label>
                <Input
                  id="wholesaleMinQty"
                  type="number"
                  min="1"
                  value={formData.wholesaleMinQty}
                  onChange={(e) => setFormData({ ...formData, wholesaleMinQty: e.target.value })}
                  placeholder="12"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="stock">Stok</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock">Min. Stok</Label>
                <Input
                  id="minStock"
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit *</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="pcs"
                />
                {formErrors.unit && (
                  <p className="text-sm text-red-600">{formErrors.unit}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-primary hover:bg-primary-600"
            >
              {submitting ? "Menyimpan..." : editingProduct ? "Simpan Perubahan" : "Tambah Produk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nonaktifkan Produk</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menonaktifkan produk{" "}
              <span className="font-semibold">{deletingProduct?.name}</span>?
              Produk tidak akan muncul di pencarian kasir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Nonaktifkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
