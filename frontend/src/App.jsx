import { createSignal } from 'solid-js';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CartPage from './pages/CartPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProfilePage from './pages/ProfilePage';
import Toast from './components/Toast';
import { getToken, removeToken, setToken, setIsAdmin, isAdmin as checkIsAdmin, setUserInfo, getUserInfo, isLoggedIn } from './api/client';

function App() {
    const [page, setPage] = createSignal('home');
    const [isAdmin, setIsAdminState] = createSignal(checkIsAdmin());
    const [isLogged, setIsLogged] = createSignal(isLoggedIn());
    const [toasts, setToasts] = createSignal([]);
    const [productId, setProductId] = createSignal(null);

    const navigate = (p, data) => {
        if (p === 'product_detail' && data) {
            setProductId(data);
        }
        setPage(p);
        window.scrollTo(0, 0);
    };

    const handleLogin = (token, adminStatus, userInfo) => {
        setToken(token);
        setIsAdmin(adminStatus);
        setIsAdminState(adminStatus);
        setIsLogged(true);

        if (userInfo) {
            setUserInfo(userInfo);
        }

        if (adminStatus) {
            setPage('admin');
            addToast('Admin sifatida kirdingiz!', 'success');
        } else {
            setPage('home');
            addToast('Muvaffaqiyatli kirdingiz!', 'success');
        }
    };

    const handleLogout = () => {
        removeToken();
        setIsAdminState(false);
        setIsLogged(false);
        setPage('home');
        addToast("Tizimdan chiqdingiz", 'success');
    };

    const addToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    return (
        <>
            <Navbar
                page={page}
                navigate={navigate}
                isAdmin={isAdmin}
                isLogged={isLogged}
                onLogout={handleLogout}
            />
            <Toast toasts={toasts} />

            {page() === 'home' && <HomePage navigate={navigate} />}
            {page() === 'products' && <ProductsPage isAdmin={isAdmin} addToast={addToast} navigate={navigate} setProductId={setProductId} />}
            {page() === 'admin' && isAdmin() && <AdminPage addToast={addToast} />}
            {page() === 'login' && <LoginPage onLogin={handleLogin} navigate={navigate} />}
            {page() === 'register' && <RegisterPage onLogin={handleLogin} navigate={navigate} addToast={addToast} />}
            {page() === 'admin' && !isAdmin() && <LoginPage onLogin={handleLogin} navigate={navigate} />}
            {page() === 'cart' && <CartPage navigate={navigate} addToast={addToast} />}
            {page() === 'product_detail' && <ProductDetailPage productId={productId()} navigate={navigate} setProductId={setProductId} addToast={addToast} />}
            {page() === 'profile' && <ProfilePage navigate={navigate} onLogout={handleLogout} />}

            <footer class="footer">
                <div class="container">
                    <div class="footer-content">
                        <div class="footer-section">
                            <h3 class="footer-brand">Magazin</h3>
                            <p class="footer-desc">Sifatli mahsulotlar markazi. Eng yaxshi narxlar va tezkor yetkazib berish.</p>
                        </div>
                        <div class="footer-section">
                            <h4>Sahifalar</h4>
                            <div class="footer-links">
                                <span onClick={() => navigate('home')}>Bosh sahifa</span>
                                <span onClick={() => navigate('products')}>Mahsulotlar</span>
                                <span onClick={() => navigate('cart')}>Savat</span>
                            </div>
                        </div>
                        <div class="footer-section">
                            <h4>Bog'lanish</h4>
                            <div class="footer-links">
                                <span>📞 +998 90 123 45 67</span>
                                <span>📧 info@magazin.uz</span>
                                <span>📍 Toshkent, O'zbekiston</span>
                            </div>
                        </div>
                    </div>
                    <div class="footer-bottom">
                        <p>© 2026 <span>Magazin</span> — Barcha huquqlar himoyalangan</p>
                    </div>
                </div>
            </footer>
        </>
    );
}

export default App;
