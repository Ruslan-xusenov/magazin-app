import { createSignal, createContext, useContext } from "solid-js";
import { translations } from "./translations";

const I18nContext = createContext();

export function I18nProvider(props) {
    const [lang, setLang] = createSignal(localStorage.getItem('lang') || 'uz');

    // t() must be called inside reactive scope (JSX, createEffect, createMemo)
    // Accessing lang() inside t() ensures SolidJS tracks the dependency
    const t = (path) => {
        const currentLang = lang(); // This tracks the signal
        const keys = path.split('.');
        let result = translations[currentLang];
        if (!result) return path;
        for (const key of keys) {
            if (result === undefined || result[key] === undefined) return path;
            result = result[key];
        }
        return result;
    };

    const changeLang = (newLang) => {
        setLang(newLang);
        localStorage.setItem('lang', newLang);
    };

    return (
        <I18nContext.Provider value={{ lang, setLang: changeLang, t }}>
            {props.children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    return useContext(I18nContext);
}
