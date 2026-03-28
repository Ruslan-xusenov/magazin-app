import { useI18n } from '../i18n/context';

function ProductCard(props) {
    const { t } = useI18n();
    const { product, isAdmin, onEdit, onDelete } = props;

    const rating = (Math.random() * (5.0 - 4.5) + 4.5).toFixed(1);
    const reviews = Math.floor(Math.random() * 500) + 10;
    const installment = Math.ceil(product.price / 12).toLocaleString();

    const handleAddToCart = (e) => {
        e.stopPropagation();
        try {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const existing = cart.find(item => item.id === product.id);
            if (existing) {
                existing.qty += 1;
            } else {
                cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image_url: product.image_url,
                    qty: 1,
                });
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            // Trigger storage event for cart badge update
            window.dispatchEvent(new Event('storage'));
        } catch (err) {
            console.error(err);
        }
    };

    const handleClick = () => {
        if (props.onClick) {
            props.onClick(product);
        }
    };

    return (
        <div class="product-card" onClick={handleClick}>
            <div class="product-image-wrapper">
                <button class="product-fav" onClick={(e) => e.stopPropagation()}>♡</button>
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        class="product-image"
                        loading="lazy"
                    />
                ) : (
                    <div class="product-image" style="display: flex; align-items: center; justify-content: center; font-size: 3rem; background: #f0f0f0;">📦</div>
                )}
            </div>

            <div class="product-info">
                <h3 class="product-name" title={product.name}>{product.name}</h3>

                <div class="product-rating">
                    <span class="star-icon">★</span>
                    <span>{rating} ({reviews} {t('products.rating_text')})</span>
                </div>

                <div style="margin-bottom: 12px;">
                    <span style="font-size: 0.75rem; background: #ffff00; padding: 2px 6px; border-radius: 4px; font-weight: 500;">
                        {installment} {t('products.installment')}
                    </span>
                </div>

                <div class="product-price-row">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); text-decoration: line-through;">
                            {product.price ? (product.price * 1.2).toLocaleString() : ''} {t('products.currency')}
                        </div>
                        <div class="product-price">
                            {product.price?.toLocaleString()} {t('products.currency')}
                        </div>
                    </div>
                    <button class="product-btn-add" onClick={handleAddToCart} title={t('detail.add_to_cart')}>
                        🛒
                    </button>
                </div>
            </div>

            {isAdmin && (
                <div class="admin-actions-overlay">
                    <button class="admin-action-btn" onClick={(e) => { e.stopPropagation(); onEdit(product); }}>
                        ✏️ {t('common.edit')}
                    </button>
                    <button class="admin-action-btn" style="color: var(--danger);" onClick={(e) => { e.stopPropagation(); onDelete(product); }}>
                        🗑️ {t('common.delete')}
                    </button>
                </div>
            )}
        </div>
    );
}

export default ProductCard;
