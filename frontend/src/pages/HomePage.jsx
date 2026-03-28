import { createSignal, onMount, For, Show } from 'solid-js';
import ProductCard from '../components/ProductCard';
import { getProducts } from '../api/client';
import { useI18n } from '../i18n/context';

function HomePage(props) {
    const { t } = useI18n();
    const [products, setProducts] = createSignal([]);
    const [loading, setLoading] = createSignal(true);

    onMount(async () => {
        try {
            const res = await getProducts();
            if (res.success) {
                setProducts(res.data.slice(0, 10));
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    });

    const categories = [
        { id: 'elektronika', name: t('home.categories.elektronika') },
        { id: 'kiyim', name: t('home.categories.kiyim') },
        { id: 'poyabzallar', name: t('home.categories.poyabzallar') },
        { id: 'aksessuarlar', name: t('home.categories.aksessuarlar') },
        { id: 'gozallik', name: t('home.categories.gozallik') },
        { id: 'salomatlik', name: t('home.categories.salomatlik') },
        { id: 'uy_uchun', name: t('home.categories.uy_uchun') },
        { id: 'avtotovarlar', name: t('home.categories.avtotovarlar') },
        { id: 'sport', name: t('home.categories.sport') },
        { id: 'bolalar', name: t('home.categories.bolalar') }
    ];

    return (
        <div class="container">
            <div class="category-scroll" style="margin-top: 16px;">
                <For each={categories}>
                    {(cat) => (
                        <button class="category-pill" onClick={() => props.navigate('products')}>
                            {cat.name}
                        </button>
                    )}
                </For>
            </div>

            <div class="hero-banner">
                <div class="hero-banner-content">
                    <h1>{t('hero.title')}</h1>
                    <p>{t('hero.subtitle')}</p>
                    <button class="btn btn-primary" style="width: fit-content;" onClick={() => props.navigate('products')}>
                        {t('nav.products')}
                    </button>
                </div>
                <div class="hero-banner-image"></div>
            </div>

            <div class="section-title">
                <span>🔥 {t('home.trending')}</span>
                <span style="color: var(--text-primary);">{t('products.all')}</span>
            </div>

            <Show when={!loading()} fallback={
                <div style="padding: 40px; text-align: center;">{t('admin.loading')}</div>
            }>
                <div class="products-grid">
                    <For each={products()}>
                        {(product) => (
                            <ProductCard
                                product={product}
                                isAdmin={false}
                                onClick={(p) => props.navigate('product_detail', p.id)}
                            />
                        )}
                    </For>
                </div>
            </Show>
        </div>
    );
}

export default HomePage;
