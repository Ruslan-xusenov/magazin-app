import { createSignal, Show, onMount } from 'solid-js';
import { userLogin, socialAuth, login } from '../api/client';
import { useI18n } from '../i18n/context';

function LoginPage(props) {
    const { t } = useI18n();
    const [email, setEmail] = createSignal('');
    const [password, setPassword] = createSignal('');
    const [step, setStep] = createSignal('select_method'); // select_method, user_login, admin_login
    const [error, setError] = createSignal('');
    const [loading, setLoading] = createSignal(false);

    onMount(() => {
        // 1. Load Telegram Widget Script
        const tgScript = document.createElement('script');
        tgScript.src = "https://telegram.org/js/telegram-widget.js?22";
        tgScript.async = true;
        tgScript.setAttribute('data-telegram-login', "magazin_uz_bot"); // User should change this to their bot username
        tgScript.setAttribute('data-size', "large");
        tgScript.setAttribute('data-onauth', "onTelegramAuth(user)");
        tgScript.setAttribute('data-request-access', "write");
        
        // Callback for Telegram Auth
        window.onTelegramAuth = async (user) => {
            setLoading(true);
            try {
                const res = await socialAuth({
                    ...user,
                    provider: 'telegram',
                    provider_id: String(user.id),
                    email: user.username ? `${user.username}@telegram.me` : `tg_${user.id}@example.com`,
                    first_name: user.first_name || '',
                    last_name: user.last_name || ''
                });
                if (res.success) {
                    props.onLogin(res.data.token, false, res.data.user);
                } else {
                    setError(res.message);
                }
            } catch (err) {
                setError(t('admin.unknown_error'));
            }
            setLoading(false);
        };

        const tgContainer = document.getElementById('telegram-login-container');
        if (tgContainer) tgContainer.appendChild(tgScript);

        // 2. Load Google Identity Services
        const googleScript = document.createElement('script');
        googleScript.src = "https://accounts.google.com/gsi/client";
        googleScript.async = true;
        googleScript.defer = true;
        document.head.appendChild(googleScript);

        window.handleGoogleResponse = async (response) => {
            // Decode JWT (simplified for demo, backend should verify properly)
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            setLoading(true);
            try {
                const res = await socialAuth({
                    provider: 'google',
                    provider_id: payload.sub,
                    email: payload.email,
                    first_name: payload.given_name,
                    last_name: payload.family_name,
                    token: response.credential
                });
                if (res.success) {
                    props.onLogin(res.data.token, false, res.data.user);
                } else {
                    setError(res.message);
                }
            } catch (err) {
                setError(t('admin.unknown_error'));
            }
            setLoading(false);
        };

        // 3. Load Facebook SDK
        window.fbAsyncInit = function() {
            window.FB.init({
                appId      : 'YOUR_FB_APP_ID', // User should change this
                cookie     : true,
                xfbml      : true,
                version    : 'v18.0'
            });
        };

        const fbScript = document.createElement('script');
        fbScript.src = "https://connect.facebook.net/en_US/sdk.js";
        fbScript.async = true;
        fbScript.defer = true;
        document.head.appendChild(fbScript);
    });

    const handleFacebookLogin = () => {
        window.FB.login(function(response) {
            if (response.status === 'connected') {
                window.FB.api('/me', {fields: 'first_name,last_name,email'}, async function(userData) {
                    setLoading(true);
                    try {
                        const res = await socialAuth({
                            provider: 'facebook',
                            provider_id: userData.id,
                            email: userData.email || `fb_${userData.id}@example.com`,
                            first_name: userData.first_name,
                            last_name: userData.last_name,
                            token: response.authResponse.accessToken
                        });
                        if (res.success) {
                            props.onLogin(res.data.token, false, res.data.user);
                        } else {
                            setError(res.message);
                        }
                    } catch (err) {
                        setError(t('admin.unknown_error'));
                    }
                    setLoading(false);
                });
            }
        }, {scope: 'public_profile,email'});
    };

    const handleUserLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await userLogin(email(), password());
            if (res.success) {
                props.onLogin(res.data.token, false, res.data.user);
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError(t('admin.unknown_error'));
        }
        setLoading(false);
    };

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await login(email(), password());
            if (res.success) {
                props.onLogin(res.data.token, res.data.is_admin);
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError(t('admin.unknown_error'));
        }
        setLoading(false);
    };

    const handleGoogleAuth = async () => {
        // For real Google auth, we redirect or use Google One Tap
        // Implementation with window.google.accounts.id is complex for a quick fix
        // We redirect to a backend URL that handles Google OAuth
        window.location.href = '/api/auth/google';
    };

    return (
        <div style="display: flex; align-items: center; justify-content: center; min-height: 80vh; padding: 20px;">
            <div class="login-card">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 class="login-title">{t('auth.title')}</h1>
                    <p class="login-subtitle">{t('auth.subtitle')}</p>
                </div>

                <Show when={error()}>
                    <div class="login-error">{error()}</div>
                </Show>

                <Show when={step() === 'select_method'}>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div id="telegram-login-container" style="display: flex; justify-content: center; margin-bottom: 8px;"></div>
                        
                        <div 
                            id="g_id_onload"
                            data-client_id="166926794258-4ncs1uenbgf30ldvhptg5hj2gvirnpd.apps.googleusercontent.com"
                            data-context="signin"
                            data-ux_mode="popup"
                            data-callback="handleGoogleResponse"
                            data-auto_prompt="false"
                        ></div>
                        <div class="g_id_signin" data-type="standard" data-shape="rectangular" data-theme="outline" data-text="signin_with" data-size="large" data-logo_alignment="left"></div>

                        <button
                            type="button"
                            class="social-btn facebook-btn"
                            style="background: #1877F2; color: white;"
                            onClick={handleFacebookLogin}
                            disabled={loading()}
                        >
                            <span class="social-icon">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            </span>
                            {t('auth.social_fb')}
                        </button>

                        <div class="separator">
                            <span>{t('auth.or')}</span>
                        </div>

                        <button class="btn btn-primary" style="width: 100%;" onClick={() => setStep('user_login')}>
                            {t('auth.email_login')}
                        </button>

                        <button class="btn" style="width: 100%; background: transparent; border: 1px dashed var(--border);" onClick={() => setStep('admin_login')}>
                            {t('auth.admin_login')}
                        </button>

                        <div style="text-align: center; margin-top: 8px;">
                            <span style="color: var(--text-secondary); font-size: 0.9rem;">
                                {t('auth.no_account')}{' '}
                                <span
                                    style="color: var(--accent); cursor: pointer; font-weight: 600;"
                                    onClick={() => props.navigate('register')}
                                >
                                    {t('auth.register_btn')}
                                </span>
                            </span>
                        </div>
                    </div>
                </Show>

                <Show when={step() === 'user_login'}>
                    <form onSubmit={handleUserLogin}>
                        <div class="form-group">
                            <label class="form-label">{t('auth.email_label')}</label>
                            <input
                                type="email"
                                class="form-input"
                                placeholder="name@example.com"
                                value={email()}
                                onInput={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading()}
                            />
                        </div>
                        <div class="form-group">
                            <label class="form-label">{t('auth.password')}</label>
                            <input
                                type="password"
                                class="form-input"
                                placeholder="••••••"
                                value={password()}
                                onInput={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading()}
                            />
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%;" disabled={loading()}>
                            {loading() ? '...' : t('nav.login')}
                        </button>
                        <button
                            type="button"
                            style="background:none; border:none; width:100%; color:var(--text-secondary); cursor:pointer; margin-top: 16px; padding: 8px;"
                            onClick={() => setStep('select_method')}
                        >
                            {t('auth.back')}
                        </button>
                    </form>
                </Show>

                <Show when={step() === 'admin_login'}>
                    <form onSubmit={handleAdminLogin}>
                        <div class="form-group">
                            <label class="form-label">{t('auth.username')}</label>
                            <input
                                type="text"
                                class="form-input"
                                value={email()}
                                onInput={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading()}
                            />
                        </div>
                        <div class="form-group">
                            <label class="form-label">{t('auth.password')}</label>
                            <input
                                type="password"
                                class="form-input"
                                value={password()}
                                onInput={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading()}
                            />
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%;" disabled={loading()}>
                            {loading() ? '...' : t('nav.login')}
                        </button>
                        <button
                            type="button"
                            style="background:none; border:none; width:100%; color:var(--text-secondary); cursor:pointer; margin-top: 16px; padding: 8px;"
                            onClick={() => setStep('select_method')}
                        >
                            {t('auth.back')}
                        </button>
                    </form>
                </Show>
            </div>
        </div>
    );
}

export default LoginPage;
