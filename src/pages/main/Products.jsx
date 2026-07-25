import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, TextInput, Select, Label, Textarea, Badge, Spinner, Card, Pagination } from 'flowbite-react';
import {
  HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash,
  HiOutlineTag, HiOutlinePhotograph, HiOutlineEye, HiOutlineEyeOff,
} from 'react-icons/hi';
import api from '@/services/api';
import { PRODUCTS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import RequiredMark from '@/components/RequiredMark';
import { ToastContainer, useToast } from '@/components/Toast';
import { getProductImageSrc, attachProductImageFallback } from '@/utils/productImages';

const CATEGORIES = ['Coffee', 'Barley', 'Supplements', 'Beverages', 'Personal Care', 'Other'];

const EMPTY_FORM = {
  name: '', sku: '', category: '', retail_price: '', partner_price: '',
  unit: 'box', description: '', is_active: true,
};

// Hoisted outside Products so React never recreates this component on each render.
// Receives all external state/handlers via props — no closure captures of parent state.
function ProductFormFields({ form, fld, imagePreview, fileInputRef, handleImageChange }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label htmlFor="pr_name" className="mb-1">
          Product Name<RequiredMark />
        </Label>
        <TextInput id="pr_name" value={form.name} onChange={fld('name')} placeholder="Nogatu Max Coffee" required />
      </div>
      <div>
        <Label htmlFor="pr_sku" className="mb-1">SKU</Label>
        <TextInput id="pr_sku" value={form.sku} onChange={fld('sku')} placeholder="NMC-001" />
      </div>
      <div>
        <Label htmlFor="pr_category" className="mb-1">Category</Label>
        <Select id="pr_category" value={form.category} onChange={fld('category')}>
          <option value="">Select category...</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      <div>
        <Label htmlFor="pr_retail_price" className="mb-1">Retail Price (₱)</Label>
        <TextInput id="pr_retail_price" type="number" min="0" step="0.01" value={form.retail_price} onChange={fld('retail_price')} placeholder="0.00" />
      </div>
      <div>
        <Label htmlFor="pr_partner_price" className="mb-1">Partner Price (₱)</Label>
        <TextInput id="pr_partner_price" type="number" min="0" step="0.01" value={form.partner_price} onChange={fld('partner_price')} placeholder="0.00" />
      </div>
      <div>
        <Label htmlFor="pr_unit" className="mb-1">Unit</Label>
        <Select id="pr_unit" value={form.unit} onChange={fld('unit')}>
          <option value="box">Box</option>
          <option value="sachet">Sachet</option>
          <option value="bottle">Bottle</option>
          <option value="pack">Pack</option>
          <option value="piece">Piece</option>
        </Select>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <input type="checkbox" id="is_active" checked={!!form.is_active} onChange={fld('is_active')} className="w-4 h-4 text-amber-500" />
        <Label htmlFor="is_active">Active / Listed</Label>
      </div>
      <div className="col-span-2">
        <Label htmlFor="pr_description" className="mb-1">Description</Label>
        <Textarea id="pr_description" value={form.description} onChange={fld('description')} rows={2} placeholder="Product description..." />
      </div>
      <div className="col-span-2">
        <Label htmlFor="pr_image" className="mb-1">Product Image</Label>
        {imagePreview && (
          <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg border border-gray-200 mb-2" />
        )}
        <input id="pr_image" type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageChange} />
        <Button color="light" size="sm" onClick={() => fileInputRef.current?.click()}>
          <HiOutlinePhotograph className="w-4 h-4 mr-1.5" />
          {imagePreview ? 'Change Image' : 'Upload Image'}
        </Button>
      </div>
    </div>
  );
}

export default function Products() {
  const { toasts, showToast, dismiss } = useToast();
  const fileInputRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [selected, setSelected] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(PRODUCTS.LIST, {
        params: { page, search: search || undefined, status: statusFilter || undefined, limit: 16 },
      });
      setProducts(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setShowAddModal(true);
  };

  const openDetail = (p) => {
    setSelected(p);
    setForm({
      name: p.name, sku: p.sku, category: p.category,
      retail_price: p.retail_price, partner_price: p.partner_price,
      unit: p.unit, description: p.description || '',
      // Coerce to boolean — the list query omits is_active so p.is_active may be undefined;
      // treat undefined/null as true (active) since the product appeared in the active list.
      is_active: p.is_active !== false && p.is_active !== 0,
    });
    setImageFile(null);
    setImagePreview(p.image_url || null);
    setIsEditing(false);
    setShowDetailModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const buildFormData = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (imageFile) fd.append('image', imageFile);
    return fd;
  };

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      await api.post(PRODUCTS.CREATE, buildFormData(), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Product added successfully', 'success');
      setShowAddModal(false);
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    setSubmitting(true);
    try {
      await api.put(PRODUCTS.UPDATE(selected.id), buildFormData(), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Product updated', 'success');
      setShowDetailModal(false);
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await api.delete(PRODUCTS.DELETE(deleteTarget.id));
      showToast('Product deleted', 'info');
      setDeleteTarget(null);
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const performToggleActive = async (product) => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('is_active', !product.is_active);
      await api.put(PRODUCTS.UPDATE(product.id), fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast(product.is_active ? 'Product deactivated' : 'Product activated', 'success');
      setToggleTarget(null);
      if (showDetailModal) setShowDetailModal(false);
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update product status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = (product) => {
    // Deactivating removes a product from stockist ordering — confirm first.
    if (product.is_active) {
      setToggleTarget(product);
    } else {
      performToggleActive(product);
    }
  };

  const fld = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div className="page-enter">
      <PageHeader
        title="Products"
        subtitle="Manage the Nogatu catalog with cleaner merchandising cards, clearer pricing hierarchy, and a more polished product detail workflow."
        actions={[{ label: 'Add Product', icon: <HiOutlinePlus className="w-4 h-4" />, onClick: openAdd }]}
      />

      {/* Search */}
      <div className="enterprise-panel mb-5 flex gap-3 p-4">
        <div className="relative flex-1 max-w-sm">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <TextInput
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products..."
            className="pl-8"
            sizing="sm"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          sizing="sm"
          className="w-40"
        >
          <option value="">All Products</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="product-admin-card p-3 dark:bg-[var(--dark-card)]">
              <div className="skeleton h-36 w-full rounded-lg mb-3" />
              <div className="skeleton h-4 w-3/4 rounded mb-2" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={HiOutlineTag}
          title="No products found"
          description="Add your first product to get started"
          actionLabel="Add Product"
          onAction={openAdd}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="product-admin-card cursor-pointer p-3 dark:bg-[var(--dark-card)]"
              onClick={() => openDetail(p)}
            >
              <div className="relative">
                <img
                  src={getProductImageSrc(p)}
                  alt={p.name}
                  className="w-full h-36 rounded-lg object-contain bg-[radial-gradient(circle_at_top,rgba(255,220,180,0.3),transparent_55%),linear-gradient(180deg,#2a170b_0%,#1d1108_100%)] p-3"
                  onError={(e) => attachProductImageFallback(e, p)}
                />
                <span className="absolute top-2 right-2">
                  <Badge color={p.is_active ? 'success' : 'gray'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                </span>
              </div>
              <div className="mt-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-[var(--dark-text)] truncate">{p.name}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-[var(--dark-muted)]">{p.sku} · {p.category}</p>
                <div className="flex justify-between items-center mt-1.5">
                  <span className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">Stockist: {formatCurrency(p.partner_price)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm font-semibold text-amber-600">{formatCurrency(p.retail_price)}</p>
                  <Button
                    size="xs"
                    color={p.is_active ? 'light' : 'success'}
                    onClick={(e) => { e.stopPropagation(); handleToggleActive(p); }}
                    title={p.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {p.is_active ? <HiOutlineEyeOff className="w-3.5 h-3.5" /> : <HiOutlineEye className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} showIcons />
        </div>
      )}

      {/* Add Modal */}
      <Modal show={showAddModal} onClose={() => setShowAddModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Add New Product</ModalHeader>
        <ModalBody><ProductFormFields form={form} fld={fld} imagePreview={imagePreview} fileInputRef={fileInputRef} handleImageChange={handleImageChange} /></ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleAdd} disabled={submitting}>Add Product</Button>
          <Button color="gray" onClick={() => setShowAddModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Detail/Edit Modal */}
      <Modal show={showDetailModal} onClose={() => setShowDetailModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>
          {isEditing ? `Edit — ${selected?.name}` : selected?.name}
        </ModalHeader>
        <ModalBody>
          {isEditing ? (
            <ProductFormFields form={form} fld={fld} imagePreview={imagePreview} fileInputRef={fileInputRef} handleImageChange={handleImageChange} />
          ) : (
            selected && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <img
                    src={getProductImageSrc(selected)}
                    alt={selected.name}
                    className="h-28 w-28 rounded-xl border bg-[radial-gradient(circle_at_top,rgba(255,220,180,0.3),transparent_55%),linear-gradient(180deg,#2a170b_0%,#1d1108_100%)] object-contain p-3"
                    onError={(e) => attachProductImageFallback(e, selected)}
                  />
                  <div className="flex-1 space-y-1">
                    <p className="text-lg font-bold text-gray-900 dark:text-[var(--dark-text)]">{selected.name}</p>
                    <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)]">SKU: <span className="font-mono">{selected.sku}</span></p>
                    <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)]">Category: {selected.category}</p>
                    <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)]">Unit: {selected.unit}</p>
                    <span className={`badge-${selected.is_active ? 'active' : 'inactive'}`}>
                      {selected.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 p-3 bg-amber-50 dark:bg-[var(--dark-card2)] rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">Retail Price</p>
                    <p className="font-bold text-amber-700">{formatCurrency(selected.retail_price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">Partner Price</p>
                    <p className="font-bold text-gray-900 dark:text-[var(--dark-text)]">{formatCurrency(selected.partner_price)}</p>
                  </div>
                </div>
                {selected.description && (
                  <p className="text-sm text-gray-600 dark:text-[var(--dark-muted)]">{selected.description}</p>
                )}
              </div>
            )
          )}
        </ModalBody>
        <ModalFooter>
          {isEditing ? (
            <>
              <Button color="warning" onClick={handleEdit} disabled={submitting}>Save</Button>
              <Button color="gray" onClick={() => setIsEditing(false)}>Cancel</Button>
            </>
          ) : (
            <>
              <Button color="warning" size="sm" onClick={() => setIsEditing(true)}>
                <HiOutlinePencil className="w-4 h-4 mr-1" /> Edit
              </Button>
              <Button color={selected?.is_active ? 'gray' : 'success'} size="sm" onClick={() => handleToggleActive(selected)}>
                {selected?.is_active ? <HiOutlineEyeOff className="w-4 h-4 mr-1" /> : <HiOutlineEye className="w-4 h-4 mr-1" />}
                {selected?.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button color="failure" size="sm" outline onClick={() => { setShowDetailModal(false); setDeleteTarget(selected); }}>
                <HiOutlineTrash className="w-4 h-4 mr-1" /> Delete
              </Button>
              <Button color="gray" size="sm" onClick={() => setShowDetailModal(false)}>Close</Button>
            </>
          )}
        </ModalFooter>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        show={!!deleteTarget}
        title="Delete Product"
        message={`Delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="failure"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        loading={submitting}
      />

      {/* Deactivate Confirm */}
      <ConfirmModal
        show={!!toggleTarget}
        title="Deactivate Product"
        message={`Deactivate "${toggleTarget?.name}"? It will be hidden from stockist catalogs until reactivated.`}
        confirmLabel="Deactivate"
        confirmColor="failure"
        onConfirm={() => performToggleActive(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        loading={submitting}
      />

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
