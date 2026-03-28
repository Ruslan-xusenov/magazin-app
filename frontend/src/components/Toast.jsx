import { For } from 'solid-js';

function Toast(props) {
    return (
        <div class="toast-container">
            <For each={props.toasts()}>
                {(toast) => (
                    <div class={`toast toast-${toast.type}`}>
                        {toast.type === 'success' ? '✅' : '❌'} {toast.message}
                    </div>
                )}
            </For>
        </div>
    );
}

export default Toast;
