import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, TextInput, Select, Label, Textarea, Badge, Spinner, Card, Pagination } from 'flowbite-react';
import {
  HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash,
  HiOutlineTag, HiOutlinePhotograph,
} from 'react-icons/hi';
import api from '@/services/api';
import { PRODUCTS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';

const CATEGORIES = ['Coffee', 'Barley', 'Supplements', 'Beverages', 'Personal Care', 'Other'];

const EMPTY_FORM = {
  name: '', sku: '', category: '', retail_price: '', partner_price: '',
  unit: 'box', description: '', is_active: true,
};

export default function Products() {
  const { toasts, showToast, dismiss } = useToast();
  const fileInputRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
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
        params: { page, search: search || undefined, limit: 16 },
      });
      setProducts(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

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
      unit: p.unit, description: p.description || '', is_active: p.is_active,
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

  const fld = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const ProductFormFields = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label value="Product Name" className="mb-1" />
        <TextInput value={form.name} onChange={fld('name')} placeholder="Nogatu Max Coffee" required />
      </div>
      <div>
        <Label value="SKU" className="mb-1" />
        <TextInput value={form.sku} onChange={fld('sku')} placeholder="NMC-001" />
      </div>
      <div>
        <Label value="Category" className="mb-1" />
        <Select value={form.category} onChange={fld('category')}>
          <option value="">Select category...</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      <div>
        <Label value="Retail Price (₱)" className="mb-1" />
        <TextInput type="number" min="0" step="0.01" value={form.retail_price} onChange={fld('retail_price')} placeholder="0.00" />
      </div>
      <div>
        <Label value="Partner Price (₱)" className="mb-1" />
        <TextInput type="number" min="0" step="0.01" value={form.partner_price} onChange={fld('partner_price')} placeholder="0.00" />
      </div>
      <div>
        <Label value="Unit" className="mb-1" />
        <Select value={form.unit} onChange={fld('unit')}>
          <option value="box">Box</option>
          <option value="sachet">Sachet</option>
          <option value="bottle">Bottle</option>
          <option value="pack">Pack</option>
          <option value="piece">Piece</option>
        </Select>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <input type="checkbox" id="is_active" checked={form.is_active} onChange={fld('is_active')} className="w-4 h-4 text-amber-500" />
        <Label htmlFor="is_active" value="Active / Listed" />
      </div>
      <div className="col-span-2">
        <Label value="Description" className="mb-1" />
        <Textarea value={form.description} onChange={fld('description')} rows={2} placeholder="Product description..." />
      </div>
      <div className="col-span-2">
        <Label value="Product Image" className="mb-1" />
        {imagePreview && (
          <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg border border-gray-200 mb-2" />
        )}
        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageChange} />
        <Button color="light" size="sm" onClick={() => fileInputRef.current?.click()}>
          <HiOutlinePhotograph className="w-4 h-4 mr-1.5" />
          {imagePreview ? 'Change Image' : 'Upload Image'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="page-enter">
      <PageHeader
        title="Products"
        subtitle="Manage your product catalog"
        actions={[{ label: 'Add Product', icon: <HiOutlinePlus className="w-4 h-4" />, onClick: openAdd }]}
      />

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <TextInput
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products..."
            className="pl-8"
            sizing="sm"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[var(--dark-card)] rounded-xl border border-gray-100 dark:border-[var(--dark-border)] p-3">
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
              className="bg-white dark:bg-[var(--dark-card)] rounded-xl border border-gray-100 dark:border-[var(--dark-border)] p-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
              onClick={() => openDetail(p)}
            >
              <div className="relative">
                <img
                  src={p.image_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231e1613'/%3E%3Crect x='60' y='60' width='80' height='80' rx='8' fill='%23271c18'/%3E%3Cpath d='M85 95 L100 75 L115 95 L130 110 H70 Z' fill='%23B85C00' opacity='0.6'/%3E%3Ccircle cx='115' cy='82' r='8' fill='%23B85C00' opacity='0.5'/%3E%3C/svg%3E"}
                  alt={p.name}
                  className="w-full h-36 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231e1613'/%3E%3Crect x='60' y='60' width='80' height='80' rx='8' fill='%23271c18'/%3E%3Cpath d='M85 95 L100 75 L115 95 L130 110 H70 Z' fill='%23B85C00' opacity='0.6'/%3E%3Ccircle cx='115' cy='82' r='8' fill='%23B85C00' opacity='0.5'/%3E%3C/svg%3E";
                  }}
                />
                {!p.is_active && (
                  <span className="absolute top-2 right-2 bg-gray-700 text-white text-xs px-1.5 py-0.5 rounded">
                    Inactive
                  </span>
                )}
              </div>
              <div className="mt-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-[var(--dark-text)] truncate">{p.name}</p>
                <p className="text-xs text-gray-500 dark:text-[var(--dark-muted)] mt-0.5">{p.sku} · {p.category}</p>
                <div className="flex justify-between items-center mt-1.5">
                  <span className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">Partner: {formatCurrency(p.partner_price)}</span>
                </div>
                <p className="text-xs font-medium text-amber-600">{formatCurrency(p.retail_price)}</p>
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
        <ModalBody><ProductFormFields /></ModalBody>
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
            <ProductFormFields />
          ) : (
            selected && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <img
                    src={selected.image_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231e1613'/%3E%3Crect x='60' y='60' width='80' height='80' rx='8' fill='%23271c18'/%3E%3Cpath d='M85 95 L100 75 L115 95 L130 110 H70 Z' fill='%23B85C00' opacity='0.6'/%3E%3Ccircle cx='115' cy='82' r='8' fill='%23B85C00' opacity='0.5'/%3E%3C/svg%3E"}
                    alt={selected.name}
                    className="w-28 h-28 object-cover rounded-xl border"
                    onError={(e) => {
                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231e1613'/%3E%3Crect x='60' y='60' width='80' height='80' rx='8' fill='%23271c18'/%3E%3Cpath d='M85 95 L100 75 L115 95 L130 110 H70 Z' fill='%23B85C00' opacity='0.6'/%3E%3Ccircle cx='115' cy='82' r='8' fill='%23B85C00' opacity='0.5'/%3E%3C/svg%3E";
                    }}
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

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
