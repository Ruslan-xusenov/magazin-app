import { render } from 'solid-js/web';
import App from './App';
import './index.css';
import { I18nProvider } from './i18n/context';

render(() => (
    <I18nProvider>
        <App />
    </I18nProvider>
), document.getElementById('root'));
