import { createSignal, onMount, Show } from 'solid-js';
import { getUserProfile, getToken } from '../api/client';
import { useI18n } from '../i18n/context';

function ProfilePage(props) {
    const { t } = useI18n();
    const [profile, setProfile] = createSignal(null);
    const [loading, setLoading] = createSignal(true);

    onMount(async () => {
        if (!getToken()) {
            props.navigate('login');
            return;
        }
        try {
            const res = await getUserProfile();
            if (res.success) {
                setProfile(res.data);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    });

    return (
        <div class="container" style="padding-top: 24px; padding-bottom: 40px;">
            <Show when={!loading()} fallback={
                <div style="padding: 60px; text-align: center;">{t('admin.loading')}</div>
            }>
                <Show when={profile()} fallback={
                    <div class="empty-state">
                        <div class="empty-state-icon">👤</div>
                        <h2>{t('profile.login_required')}</h2>
                        <button class="btn btn-primary" onClick={() => props.navigate('login')}>
                            {t('nav.login')}
                        </button>
                    </div>
                }>
                    <div class="profile-container">
                        <div class="profile-header">
                            <div class="profile-avatar">
                                {(profile().first_name || profile().username || '?')[0].toUpperCase()}
                            </div>
                            <div class="profile-name-section">
                                <h1>
                                    {profile().first_name
                                        ? `${profile().first_name} ${profile().last_name || ''}`
                                        : profile().username}
                                </h1>
                                <span class="profile-badge">
                                    {profile().type === 'admin' ? '👑 Admin' : '👤 ' + t('profile.user')}
                                </span>
                            </div>
                        </div>

                        <div class="profile-cards">
                            <div class="profile-card">
                                <h3>{t('profile.personal_info')}</h3>
                                <div class="profile-field">
                                    <label>Email</label>
                                    <span>{profile().email || '—'}</span>
                                </div>
                                <Show when={profile().phone}>
                                    <div class="profile-field">
                                        <label>{t('auth.phone_label')}</label>
                                        <span>{profile().phone}</span>
                                    </div>
                                </Show>
                                <Show when={profile().provider && profile().provider !== 'email'}>
                                    <div class="profile-field">
                                        <label>{t('profile.auth_method')}</label>
                                        <span style="text-transform: capitalize;">{profile().provider}</span>
                                    </div>
                                </Show>
                            </div>

                            <div class="profile-card">
                                <h3>{t('profile.orders')}</h3>
                                <div class="empty-state" style="padding: 24px;">
                                    <div style="font-size: 2rem;">📦</div>
                                    <p style="color: var(--text-secondary);">{t('profile.no_orders')}</p>
                                </div>
                            </div>
                        </div>

                        <button
                            class="btn btn-danger"
                            style="margin-top: 24px;"
                            onClick={props.onLogout}
                        >
                            🚪 {t('nav.logout')}
                        </button>
                    </div>
                </Show>
            </Show>
        </div>
    );
}

export default ProfilePage;
