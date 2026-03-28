import { createSignal, onMount, Show, For } from 'solid-js';
import { getProduct, getProducts } from '../api/client';
import ProductCard from '../components/ProductCard';
import { useI18n } from '../i18n/context';

function ProductDetailPage(props) {
    const { t } = useI18n();
    const [product, setProduct] = createSignal(null);
    const [related, setRelated] = createSignal([]);
    const [loading, setLoading] = createSignal(true);
    const [qty, setQty] = createSignal(1);
    const [added, setAdded] = createSignal(false);

    onMount(async () => {
        if (!props.productId) return;
        try {
            const res = await getProduct(props.productId);
            if (res.success) {
                setProduct(res.data);
                // Load related products from same category
                const relRes = await getProducts({ category: res.data.category });
                if (relRes.success) {
                    setRelated(relRes.data.filter(p => p.id !== res.data.id).slice(0, 4));
                }
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    });

    const formatPrice = (price) => {
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    const addToCart = () => {
        const p = product();
        if (!p) return;
        try {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const existing = cart.find(item => item.id === p.id);
            if (existing) {
                existing.qty += qty();
            } else {
                cart.push({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    image_url: p.image_url,
                    qty: qty(),
                });
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
            if (props.addToast) props.addToast(t('detail.added_to_cart'), 'success');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div class="container" style="padding-top: 24px; padding-bottom: 40px;">
            <Show when={!loading()} fallback={
                <div style="padding: 60px; text-align: center;">{t('admin.loading')}</div>
            }>
                <Show when={product()} fallback={
                    <div style="padding: 60px; text-align: center;">{t('products.not_found')}</div>
                }>
                    <button
                        class="btn btn-secondary btn-sm"
                        style="margin-bottom: 20px;"
                        onClick={() => props.navigate('products')}
                    >
                        ← {t('common.back')}
                    </button>

                    <div class="product-detail">
                        <div class="product-detail-image">
                            <img
                                src={product().image_url || 'https://via.placeholder.com/500'}
                                alt={product().name}
                            />
                        </div>

                        <div class="product-detail-info">
                            <h1 class="product-detail-title">{product().name}</h1>

                            <div class="product-detail-rating">
                                <span class="star-icon">★★★★★</span>
                                <span style="color: var(--text-secondary); font-size: 0.85rem;">
                                    {Math.floor(Math.random() * 200 + 50)} {t('products.rating_text')}
                                </span>
                            </div>

                            <div class="product-detail-price">
                                {formatPrice(product().price)} {t('products.currency')}
                            </div>

                            <Show when={product().price > 500000}>
                                <div class="product-detail-installment">
                                    {formatPrice(Math.round(product().price / 12))} {t('products.installment')}
                                </div>
                            </Show>

                            <div class="product-detail-status">
                                <span class={product().in_stock ? 'badge-success' : 'badge-danger'}>
                                    {product().in_stock ? t('products.in_stock') : t('products.out_of_stock')}
                                </span>
                                <Show when={product().quantity > 0}>
                                    <span style="color: var(--text-secondary); font-size: 0.85rem;">
                                        {product().quantity} {t('products.items')}
                                    </span>
                                </Show>
                            </div>

                            <Show when={product().description}>
                                <div class="product-detail-desc">
                                    <h3>{t('detail.description')}</h3>
                                    <p>{product().description}</p>
                                </div>
                            </Show>

                            <div class="product-detail-actions">
                                <div class="qty-control">
                                    <button onClick={() => setQty(Math.max(1, qty() - 1))}>−</button>
                                    <span>{qty()}</span>
                                    <button onClick={() => setQty(qty() + 1)}>+</button>
                                </div>
                                <button
                                    class={`btn ${added() ? 'btn-success-filled' : 'btn-primary'}`}
                                    style="flex: 1;"
                                    onClick={addToCart}
                                    disabled={!product().in_stock}
                                >
                                    {added() ? '✓ ' + t('detail.added') : '🛒 ' + t('detail.add_to_cart')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <Show when={related().length > 0}>
                        <div class="section-title" style="margin-top: 40px;">
                            <span>{t('detail.related')}</span>
                        </div>
                        <div class="products-grid">
                            <For each={related()}>
                                {(p) => (
                                    <ProductCard
                                        product={p}
                                        isAdmin={false}
                                        onClick={() => {
                                            props.setProductId(p.id);
                                            window.scrollTo(0, 0);
                                        }}
                                    />
                                )}
                            </For>
                        </div>
                    </Show>
                </Show>
            </Show>
        </div>
    );
}

export default ProductDetailPage;
