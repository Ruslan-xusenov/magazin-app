import { createSignal, Show } from 'solid-js';
import { registerUser, verifyEmail, socialAuth } from '../api/client';
import { useI18n } from '../i18n/context';

function RegisterPage(props) {
    const { t } = useI18n();
    const [firstName, setFirstName] = createSignal('');
    const [lastName, setLastName] = createSignal('');
    const [email, setEmail] = createSignal('');
    const [password, setPassword] = createSignal('');
    const [confirmPassword, setConfirmPassword] = createSignal('');
    const [phone, setPhone] = createSignal('');
    const [code, setCode] = createSignal('');
    const [step, setStep] = createSignal('form'); // form, verify
    const [error, setError] = createSignal('');
    const [success, setSuccess] = createSignal('');
    const [loading, setLoading] = createSignal(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await registerUser({
                first_name: firstName(),
                last_name: lastName(),
                email: email(),
                password: password(),
                confirm_password: confirmPassword(),
                phone: phone(),
            });

            if (res.success) {
                setStep('verify');
                setSuccess(res.message);
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError(t('admin.unknown_error'));
        }
        setLoading(false);
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await verifyEmail(email(), code());
            if (res.success) {
                setSuccess(res.message);
                // Redirect to login page after 1.5 seconds
                setTimeout(() => {
                    props.navigate('login');
                    if (props.addToast) props.addToast(t('auth.register_success'), 'success');
                }, 1500);
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError(t('admin.unknown_error'));
        }
        setLoading(false);
    };

    const handleSocialAuth = async (provider) => {
        setError('');
        setLoading(true);
        try {
            // In a real app, this would open OAuth popup
            // For demo, we simulate with mock data
            const mockData = {
                provider,
                provider_id: `${provider}_${Date.now()}`,
                email: `demo_${provider}@example.com`,
                first_name: 'Demo',
                last_name: 'User',
            };

            const res = await socialAuth(mockData);
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

    const SocialButton = (p) => (
        <button
            type="button"
            class="social-btn"
            onClick={() => handleSocialAuth(p.provider)}
            disabled={loading()}
        >
            <span class="social-icon" innerHTML={p.icon}></span>
            {p.label}
        </button>
    );

    return (
        <div style="display: flex; align-items: center; justify-content: center; min-height: 80vh; padding: 20px;">
            <div class="login-card" style="max-width: 480px;">
                <div style="text-align: center; margin-bottom: 28px;">
                    <h1 class="login-title">{t('auth.register_title')}</h1>
                    <p class="login-subtitle">{t('auth.register_subtitle')}</p>
                </div>

                <Show when={error()}>
                    <div class="login-error">{error()}</div>
                </Show>

                <Show when={success()}>
                    <div class="login-success">{success()}</div>
                </Show>

                <Show when={step() === 'form'}>
                    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                        <SocialButton
                            provider="facebook"
                            icon='<svg viewBox="0 0 24 24" width="20" height="20" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'
                            label={t('auth.social_fb')}
                        />
                        <SocialButton
                            provider="google"
                            icon='<svg viewBox="0 0 24 24" width="20" height="20" fill="#EA4335"><path d="M23.49 12.275c0-.79-.07-1.54-.19-2.275H12v4.51h6.476c-.273 1.554-1.155 2.87-2.463 3.754v3.136h3.987c2.332-2.146 3.676-5.304 3.676-8.915h-.185z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.076 7.936-2.915l-3.987-3.136c-1.076.722-2.457 1.15-4.008 1.15-3.08 0-5.69-2.077-6.622-4.87H1.18v3.238C3.173 21.43 7.245 24 12 24z"/><path fill="#FBBC05" d="M5.38 14.167c-.244-.722-.38-1.503-.38-2.302s.138-1.58.38-2.302V6.324H1.18C.43 7.82 0 9.53 0 11.865s.43 4.045 1.18 5.542l4.2-3.24z"/><path fill="#4285F4" d="M12 4.793c1.761 0 3.342.607 4.587 1.796l3.439-3.439C17.945 1.15 15.234 0 12 0 7.245 0 3.173 2.57 1.18 6.324l4.2 3.238c.932-2.792 3.542-4.769 6.622-4.769z"/></svg>'
                            label={t('auth.social_google')}
                        />
                        <SocialButton
                            provider="telegram"
                            icon='<svg viewBox="0 0 24 24" width="20" height="20" fill="#229ED9"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.294-.593.294l.214-3.05 5.558-5.02c.24-.213-.054-.334-.373-.121l-6.87 4.326-2.962-.924c-.643-.204-.658-.643.136-.953l11.57-4.46c.538-.196 1.006.128.82.936z"/></svg>'
                            label={t('auth.social_tg')}
                        />
                    </div>

                    <div class="separator">
                        <span>{t('auth.or')}</span>
                    </div>

                    <form onSubmit={handleRegister} style="margin-top: 20px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div class="form-group">
                                <label class="form-label">{t('auth.first_name')}</label>
                                <input
                                    type="text"
                                    class="form-input"
                                    placeholder={t('auth.first_name_placeholder')}
                                    value={firstName()}
                                    onInput={(e) => setFirstName(e.target.value)}
                                    required
                                    disabled={loading()}
                                />
                            </div>
                            <div class="form-group">
                                <label class="form-label">{t('auth.last_name')}</label>
                                <input
                                    type="text"
                                    class="form-input"
                                    placeholder={t('auth.last_name_placeholder')}
                                    value={lastName()}
                                    onInput={(e) => setLastName(e.target.value)}
                                    required
                                    disabled={loading()}
                                />
                            </div>
                        </div>

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
                            <label class="form-label">{t('auth.phone_label')}</label>
                            <input
                                type="tel"
                                class="form-input"
                                placeholder="+998 90 123 45 67"
                                value={phone()}
                                onInput={(e) => setPhone(e.target.value)}
                                required
                                disabled={loading()}
                            />
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div class="form-group">
                                <label class="form-label">{t('auth.password')}</label>
                                <input
                                    type="password"
                                    class="form-input"
                                    placeholder="••••••"
                                    value={password()}
                                    onInput={(e) => setPassword(e.target.value)}
                                    required
                                    minLength="6"
                                    disabled={loading()}
                                />
                            </div>
                            <div class="form-group">
                                <label class="form-label">{t('auth.confirm_password')}</label>
                                <input
                                    type="password"
                                    class="form-input"
                                    placeholder="••••••"
                                    value={confirmPassword()}
                                    onInput={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength="6"
                                    disabled={loading()}
                                />
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 8px;" disabled={loading()}>
                            {loading() ? '...' : t('auth.register_btn')}
                        </button>

                        <div style="text-align: center; margin-top: 16px;">
                            <span style="color: var(--text-secondary); font-size: 0.9rem;">
                                {t('auth.have_account')}{' '}
                                <span
                                    style="color: var(--accent); cursor: pointer; font-weight: 600;"
                                    onClick={() => props.navigate('login')}
                                >
                                    {t('nav.login')}
                                </span>
                            </span>
                        </div>
                    </form>
                </Show>

                <Show when={step() === 'verify'}>
                    <form onSubmit={handleVerify}>
                        <p style="color: var(--text-secondary); margin-bottom: 20px; text-align: center; font-size: 0.9rem;">
                            {t('auth.verify_text')} <strong>{email()}</strong>
                        </p>
                        <div class="form-group">
                            <label class="form-label">{t('auth.enter_code')}</label>
                            <input
                                type="text"
                                class="form-input"
                                placeholder="123456"
                                maxLength="6"
                                value={code()}
                                onInput={(e) => setCode(e.target.value)}
                                required
                                disabled={loading()}
                                style="font-size: 1.5rem; text-align: center; letter-spacing: 0.5em;"
                            />
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%;" disabled={loading() || code().length < 6}>
                            {loading() ? '...' : t('auth.verify')}
                        </button>
                    </form>
                </Show>
            </div>
        </div>
    );
}

export default RegisterPage;
