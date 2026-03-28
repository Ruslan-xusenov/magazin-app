import { createSignal, onMount, For, Show } from 'solid-js';
import { getProducts, updateProduct, deleteProduct, createProduct } from '../api/client';
import ProductModal from '../components/ProductModal';
import { useI18n } from '../i18n/context';

function AdminPage(props) {
    const { t } = useI18n();
    const [products, setProducts] = createSignal([]);
    const [loading, setLoading] = createSignal(true);

    const [showModal, setShowModal] = createSignal(false);
    const [editProduct, setEditProduct] = createSignal(null);
    const [deleteConfirm, setDeleteConfirm] = createSignal(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await getProducts();
            if (res.success) {
                setProducts(res.data || []);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    onMount(fetchProducts);

    const stats = () => {
        const p = products();
        const total = p.length;
        const inStock = p.filter(x => x.in_stock).length;
        const outOfStock = total - inStock;
        const value = p.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
        return { total, inStock, outOfStock, value };
    };

    const handleSave = async (formData, id) => {
        try {
            let res;
            if (id) {
                res = await updateProduct(id, formData);
            } else {
                res = await createProduct(formData);
            }

            if (res.success) {
                props.addToast(id ? t('admin.save_success') : t('admin.create_success'), 'success');
                setShowModal(false);
                setEditProduct(null);
                fetchProducts();
            } else {
                props.addToast(res.message, 'error');
            }
        } catch (err) {
            props.addToast(t('admin.server_error'), 'error');
        }
    };

    const handleDelete = async () => {
        const product = deleteConfirm();
        if (!product) return;
        try {
            const res = await deleteProduct(product.id);
            if (res.success) {
                props.addToast(t('admin.delete_success'), 'success');
                setDeleteConfirm(null);
                fetchProducts();
            }
        } catch (err) {
            props.addToast(t('admin.unknown_error'), 'error');
        }
    };

    return (
        <div class="container" style="padding-top: 32px; padding-bottom: 60px;">

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
                <div>
                    <h2 style="font-size: 2rem;">{t('admin.title')}</h2>
                    <p style="color: var(--text-secondary);">{t('admin.management')} ({products().length})</p>
                </div>
                <button class="btn btn-primary" onClick={() => { setEditProduct(null); setShowModal(true); }}>
                    + {t('products.add_new')}
                </button>
            </div>

            <div class="admin-stats">
                <div class="stat-card">
                    <div style="color: var(--text-secondary); margin-bottom: 8px;">{t('admin.total_products')}</div>
                    <div class="stat-value">{stats().total}</div>
                </div>
                <div class="stat-card">
                    <div style="color: var(--success); margin-bottom: 8px;">{t('admin.stock_available')}</div>
                    <div class="stat-value" style="color: var(--text-primary);">{stats().inStock}</div>
                </div>
                <div class="stat-card">
                    <div style="color: var(--danger); margin-bottom: 8px;">{t('admin.out_of_stock')}</div>
                    <div class="stat-value" style="color: var(--text-primary);">{stats().outOfStock}</div>
                </div>
                <div class="stat-card">
                    <div style="color: var(--text-secondary); margin-bottom: 8px;">{t('admin.total_value')}</div>
                    <div class="stat-value" style="color: var(--text-primary);">{stats().value.toLocaleString()} {t('products.currency')}</div>
                </div>
            </div>

            <div style="background: white; border-radius: var(--radius-md); border: 1px solid var(--border); overflow-x: auto;">
                <Show when={!loading()} fallback={<div style="padding: 40px; text-align: center;">{t('admin.loading')}</div>}>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>{t('admin.table_img')}</th>
                                <th>{t('admin.table_name')}</th>
                                <th>{t('admin.table_cat')}</th>
                                <th>{t('admin.table_price')}</th>
                                <th>{t('admin.table_qty')}</th>
                                <th>{t('admin.table_status')}</th>
                                <th style="text-align: right;">{t('admin.table_actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <For each={products()} fallback={<tr><td colspan="7" style="text-align: center; padding: 40px;">{t('admin.no_products')}</td></tr>}>
                                {(product) => (
                                    <tr style="background: white;">
                                        <td>
                                            <img src={product.image_url || 'https://via.placeholder.com/60?text=No+Img'} class="product-thumb" />
                                        </td>
                                        <td>
                                            <div style="font-weight: 500;">{product.name}</div>
                                            <div style="font-size: 0.8rem; color: var(--text-secondary);">ID: {product.id}</div>
                                        </td>
                                        <td><span class="category-pill" style="padding: 4px 10px; font-size: 0.8rem;">{product.category || 'Noma\'lum'}</span></td>
                                        <td style="font-weight: 600;">{product.price?.toLocaleString()} {t('products.currency')}</td>
                                        <td>{product.quantity} ta</td>
                                        <td>
                                            {product.in_stock && product.quantity > 0 ? (
                                                <span style="color: var(--success); background: #e6f6ee; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">{t('products.in_stock')}</span>
                                            ) : (
                                                <span style="color: var(--danger); background: #ffebeb; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">{t('products.out_of_stock')}</span>
                                            )}
                                        </td>
                                        <td style="text-align: right;">
                                            <button class="btn btn-secondary btn-sm" style="margin-right: 8px;" onClick={() => { setEditProduct(product); setShowModal(true); }}>{t('common.edit')}</button>
                                            <button class="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(product)}>{t('common.delete')}</button>
                                        </td>
                                    </tr>
                                )}
                            </For>
                        </tbody>
                    </table>
                </Show>
            </div>

            {showModal() && (
                <ProductModal
                    product={editProduct()}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditProduct(null); }}
                />
            )}

            {deleteConfirm() && (
                <div class="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div class="modal" style="max-width: 400px;" onClick={e => e.stopPropagation()}>
                        <div class="modal-header">
                            <h2>{t('admin.delete_title')}</h2>
                        </div>
                        <div class="modal-body" style="text-align: center;">
                            {t('admin.delete_confirm')} <strong>"{deleteConfirm().name}"</strong>?
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</button>
                            <button class="btn btn-danger" onClick={handleDelete}>{t('common.delete')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPage;
