import { createSignal, createEffect, onMount, For, Show } from 'solid-js';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/client';
import { useI18n } from '../i18n/context';

function ProductsPage(props) {
    const { t } = useI18n();
    const [products, setProducts] = createSignal([]);
    const [loading, setLoading] = createSignal(true);
    const [search, setSearch] = createSignal('');
    const [activeCategory, setActiveCategory] = createSignal('');
    const [categories, setCategories] = createSignal([]);
    const [showModal, setShowModal] = createSignal(false);
    const [editProduct, setEditProduct] = createSignal(null);
    const [deleteConfirm, setDeleteConfirm] = createSignal(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = {};
            if (search()) params.search = search();
            if (activeCategory()) params.category = activeCategory();

            const res = await getProducts(params);
            if (res.success) {
                setProducts(res.data || []);
                const cats = [...new Set((res.data || []).map(p => p.category).filter(Boolean))];
                if (!activeCategory()) setCategories(cats);
            }
        } catch (err) {
            console.error('Failed to fetch products:', err);
        }
        setLoading(false);
    };

    onMount(fetchProducts);

    const handleCategoryFilter = (cat) => {
        setActiveCategory(cat === activeCategory() ? '' : cat);
        setTimeout(fetchProducts, 100);
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
            props.addToast(t('admin.unknown_error'), 'error');
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
            } else {
                props.addToast(res.message, 'error');
            }
        } catch (err) {
            props.addToast(t('admin.unknown_error'), 'error');
        }
    };

    return (
        <div class="container" style="padding-top: 24px;">

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="font-size: 1.8rem;">
                    {activeCategory() ? activeCategory() : t('products.title')}
                    <span style="color: var(--text-secondary); font-size: 1.2rem; font-weight: normal; margin-left: 12px;">
                        {products().length} {t('products.items')}
                    </span>
                </h2>
                {props.isAdmin() && (
                    <button class="btn btn-primary" onClick={() => { setEditProduct(null); setShowModal(true); }}>
                        + {t('products.add_new')}
                    </button>
                )}
            </div>

            <div style="display: flex; gap: 32px; align-items: flex-start;">
                <aside style="width: 240px; flex-shrink: 0;">
                    <h3 style="margin-bottom: 16px; font-size: 1rem;">{t('products.categories')}</h3>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button
                            class={`category-pill ${!activeCategory() ? 'active' : ''}`}
                            style="text-align: left; background: transparent; padding: 6px 12px; border-radius: 4px;"
                            onClick={() => handleCategoryFilter('')}
                        >
                            {t('products.all')}
                        </button>
                        <For each={categories()}>
                            {(cat) => (
                                <button
                                    class={`category-pill ${activeCategory() === cat ? 'active' : ''}`}
                                    style="text-align: left; background: transparent; padding: 6px 12px; border-radius: 4px;"
                                    onClick={() => handleCategoryFilter(cat)}
                                >
                                    {cat}
                                </button>
                            )}
                        </For>
                    </div>
                </aside>

                <div style="flex: 1;">
                    <Show when={!loading()} fallback={<div style="padding: 40px; text-align: center;">{t('admin.loading')}</div>}>
                        <Show when={products().length > 0} fallback={<div style="padding: 40px; text-align: center; color: var(--text-secondary);">{t('products.not_found')}</div>}>
                            <div class="products-grid">
                                <For each={products()}>
                                    {(product) => (
                                        <ProductCard
                                            product={product}
                                            isAdmin={props.isAdmin()}
                                            onEdit={(p) => { setEditProduct(p); setShowModal(true); }}
                                            onDelete={(p) => setDeleteConfirm(p)}
                                            onClick={(p) => {
                                                if (props.navigate) {
                                                    props.navigate('product_detail', p.id);
                                                }
                                            }}
                                        />
                                    )}
                                </For>
                            </div>
                        </Show>
                    </Show>
                </div>
            </div>

            <Show when={showModal()}>
                <ProductModal
                    product={editProduct()}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditProduct(null); }}
                />
            </Show>

            <Show when={deleteConfirm()}>
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
            </Show>
        </div>
    );
}

export default ProductsPage;
