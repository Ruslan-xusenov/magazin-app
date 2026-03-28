import { createSignal, For, Show, createEffect } from 'solid-js';
import { useI18n } from '../i18n/context';

function CartPage(props) {
    const { t } = useI18n();
    const [cartItems, setCartItems] = createSignal([]);

    createEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('cart') || '[]');
            setCartItems(saved);
        } catch {
            setCartItems([]);
        }
    });

    const updateCart = (items) => {
        setCartItems(items);
        localStorage.setItem('cart', JSON.stringify(items));
    };

    const updateQty = (id, delta) => {
        const updated = cartItems().map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.qty + delta);
                return { ...item, qty: newQty };
            }
            return item;
        });
        updateCart(updated);
    };

    const removeItem = (id) => {
        updateCart(cartItems().filter(item => item.id !== id));
    };

    const total = () => cartItems().reduce((sum, item) => sum + item.price * item.qty, 0);

    const formatPrice = (price) => {
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    return (
        <div class="container" style="padding-top: 24px; padding-bottom: 40px;">
            <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 24px;">
                🛒 {t('cart.title')}
            </h1>

            <Show when={cartItems().length > 0} fallback={
                <div class="empty-state">
                    <div class="empty-state-icon">🛍️</div>
                    <h2>{t('cart.empty_title')}</h2>
                    <p>{t('cart.empty_text')}</p>
                    <button class="btn btn-primary" onClick={() => props.navigate('products')}>
                        {t('nav.products')}
                    </button>
                </div>
            }>
                <div class="cart-layout">
                    <div class="cart-items">
                        <For each={cartItems()}>
                            {(item) => (
                                <div class="cart-item">
                                    <div class="cart-item-image">
                                        <img src={item.image_url || 'https://via.placeholder.com/120'} alt={item.name} />
                                    </div>
                                    <div class="cart-item-info">
                                        <h3>{item.name}</h3>
                                        <p class="cart-item-price">{formatPrice(item.price)} {t('products.currency')}</p>
                                    </div>
                                    <div class="cart-item-controls">
                                        <div class="qty-control">
                                            <button onClick={() => updateQty(item.id, -1)}>−</button>
                                            <span>{item.qty}</span>
                                            <button onClick={() => updateQty(item.id, 1)}>+</button>
                                        </div>
                                        <button class="cart-remove-btn" onClick={() => removeItem(item.id)}>
                                            🗑
                                        </button>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>

                    <div class="cart-summary">
                        <h3>{t('cart.summary')}</h3>
                        <div class="cart-summary-row">
                            <span>{t('cart.items_count')}</span>
                            <span>{cartItems().length} {t('products.items')}</span>
                        </div>
                        <div class="cart-summary-row cart-total">
                            <span>{t('cart.total')}</span>
                            <span>{formatPrice(total())} {t('products.currency')}</span>
                        </div>
                        <button class="btn btn-primary" style="width: 100%; margin-top: 16px;">
                            {t('cart.checkout')}
                        </button>
                    </div>
                </div>
            </Show>
        </div>
    );
}

export default CartPage;
