import { createSignal, createEffect, Show } from 'solid-js';
import { useI18n } from '../i18n/context';

function Navbar(props) {
    const { t, lang, setLang } = useI18n();
    const [cartCount, setCartCount] = createSignal(0);
    const [showLang, setShowLang] = createSignal(false);

    // Track cart count
    createEffect(() => {
        const updateCount = () => {
            try {
                const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                setCartCount(cart.reduce((sum, item) => sum + (item.qty || 1), 0));
            } catch {
                setCartCount(0);
            }
        };
        updateCount();
        // Listen for storage changes
        window.addEventListener('storage', updateCount);
        const interval = setInterval(updateCount, 2000);
        return () => {
            window.removeEventListener('storage', updateCount);
            clearInterval(interval);
        };
    });

    const languages = [
        { code: 'uz', name: "O'zbekcha" },
        { code: 'ru', name: 'Русский' },
        { code: 'en', name: 'English' },
        { code: 'tr', name: 'Türkçe' },
        { code: 'tj', name: 'Тоҷикӣ' }
    ];

    return (
        <>
            <div class="navbar-top">
                <div class="container" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span>📍 {t('nav.top_location')}</span>
                        <span style="margin-left: 16px;">{t('nav.top_pickup')}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <span style="color: var(--accent); cursor: pointer; white-space: nowrap;">{t('nav.top_qa')}</span>
                        <span style="cursor: pointer; white-space: nowrap;" onClick={() => props.navigate('profile')}>{t('nav.top_orders')}</span>

                        <div class="lang-selector" onClick={() => setShowLang(!showLang())}>
                            <span style="font-weight: 600; cursor: pointer;">
                                {languages.find(l => l.code === lang())?.name || 'Til'} ▾
                            </span>
                            <div class="lang-dropdown" style={{ display: showLang() ? 'block' : '' }}>
                                {languages.map(l => (
                                    <div
                                        class={`lang-item ${lang() === l.code ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLang(l.code);
                                            setShowLang(false);
                                        }}
                                    >
                                        {l.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <nav class="navbar">
                <div class="container navbar-inner">
                    <div class="navbar-logo" onClick={() => props.navigate('home')}>
                        Magazin
                    </div>

                    <button class="navbar-catalog-btn" onClick={() => props.navigate('products')}>
                        <span style="font-size: 1.2rem;">☰</span> {t('nav.products')}
                    </button>

                    <div class="navbar-search">
                        <input
                            type="text"
                            placeholder={t('nav.search')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    props.navigate('products');
                                }
                            }}
                        />
                        <button class="navbar-search-btn">🔍</button>
                    </div>

                    <div class="navbar-actions">
                        {props.isAdmin() ? (
                            <>
                                <button class="nav-action-item" onClick={() => props.navigate('admin')}>
                                    <span class="nav-action-icon">⚙️</span>
                                    <span>{t('nav.admin')}</span>
                                </button>
                                <button class="nav-action-item" onClick={props.onLogout}>
                                    <span class="nav-action-icon">🚪</span>
                                    <span>{t('nav.logout')}</span>
                                </button>
                            </>
                        ) : props.isLogged() ? (
                            <>
                                <button class="nav-action-item" onClick={() => props.navigate('profile')}>
                                    <span class="nav-action-icon">👤</span>
                                    <span>{t('profile.my_profile')}</span>
                                </button>
                                <button class="nav-action-item" onClick={props.onLogout}>
                                    <span class="nav-action-icon">🚪</span>
                                    <span>{t('nav.logout')}</span>
                                </button>
                            </>
                        ) : (
                            <button class="nav-action-item" onClick={() => props.navigate('login')}>
                                <span class="nav-action-icon">👤</span>
                                <span>{t('nav.login')}</span>
                            </button>
                        )}
                        <button class="nav-action-item cart-nav-item" onClick={() => props.navigate('cart')}>
                            <span class="nav-action-icon">🛍️</span>
                            <span>{t('nav.cart')}</span>
                            <Show when={cartCount() > 0}>
                                <span class="cart-badge">{cartCount()}</span>
                            </Show>
                        </button>
                    </div>
                </div>
            </nav>
        </>
    );
}

export default Navbar;
