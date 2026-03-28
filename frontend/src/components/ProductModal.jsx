import { createSignal, createEffect } from 'solid-js';
import { useI18n } from '../i18n/context';

function ProductModal(props) {
    const { t } = useI18n();
    const { product, onSave, onClose } = props;
    const isEditing = !!product;

    const [name, setName] = createSignal(product?.name || '');
    const [description, setDescription] = createSignal(product?.description || '');
    const [price, setPrice] = createSignal(product?.price || '');
    const [category, setCategory] = createSignal(product?.category || '');
    const [quantity, setQuantity] = createSignal(product?.quantity || 0);
    const [inStock, setInStock] = createSignal(product?.in_stock !== false);
    const [imageFile, setImageFile] = createSignal(null);
    const [imagePreview, setImagePreview] = createSignal(product?.image_url || '');
    const [loading, setLoading] = createSignal(false);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setImagePreview(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name().trim()) return;

        setLoading(true);

        const formData = new FormData();
        formData.append('name', name());
        formData.append('description', description());
        formData.append('price', price().toString());
        formData.append('category', category());
        formData.append('quantity', quantity().toString());
        formData.append('in_stock', inStock().toString());

        if (imageFile()) {
            formData.append('image', imageFile());
        }

        await onSave(formData, product?.id);
        setLoading(false);
    };

    return (
        <div class="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div class="modal">
                <div class="modal-header">
                    <h2>{isEditing ? t('admin_modal.title_edit') : t('admin_modal.title_new')}</h2>
                    <button class="modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">{t('admin_modal.field_name')} *</label>
                            <input
                                type="text"
                                class="form-input"
                                placeholder={t('admin_modal.placeholder_name')}
                                value={name()}
                                onInput={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label class="form-label">{t('admin_modal.field_desc')}</label>
                            <textarea
                                class="form-textarea"
                                placeholder={t('admin_modal.placeholder_desc')}
                                value={description()}
                                onInput={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">{t('admin_modal.field_price')} ({t('products.currency')}) *</label>
                                <input
                                    type="number"
                                    class="form-input"
                                    placeholder="100000"
                                    value={price()}
                                    onInput={(e) => setPrice(e.target.value)}
                                    min="0"
                                    step="100"
                                    required
                                />
                            </div>

                            <div class="form-group">
                                <label class="form-label">{t('admin_modal.field_qty')}</label>
                                <input
                                    type="number"
                                    class="form-input"
                                    placeholder="0"
                                    value={quantity()}
                                    onInput={(e) => setQuantity(parseInt(e.target.value) || 0)}
                                    min="0"
                                />
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">{t('admin_modal.field_cat')}</label>
                                <input
                                    type="text"
                                    class="form-input"
                                    placeholder="Elektronika"
                                    value={category()}
                                    onInput={(e) => setCategory(e.target.value)}
                                />
                            </div>

                            <div class="form-group">
                                <label class="form-label">{t('admin_modal.field_status')}</label>
                                <label style="display: flex; align-items: center; gap: 10px; padding: 12px 0; cursor: pointer;">
                                    <input
                                        type="checkbox"
                                        checked={inStock()}
                                        onChange={(e) => setInStock(e.target.checked)}
                                        style="width: 18px; height: 18px; accent-color: var(--accent);"
                                    />
                                    <span style="font-size: 0.9rem;">{t('products.in_stock')}</span>
                                </label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">{t('admin_modal.field_img')}</label>
                            <div
                                class="image-upload"
                                onClick={() => document.getElementById('imageInput').click()}
                            >
                                {imagePreview() ? (
                                    <img src={imagePreview()} class="image-preview" alt="Preview" />
                                ) : (
                                    <>
                                        <div class="image-upload-icon">📷</div>
                                        <p class="image-upload-text">{t('admin_modal.img_upload_text')}</p>
                                    </>
                                )}
                            </div>
                            <input
                                type="file"
                                id="imageInput"
                                accept="image/*"
                                style="display: none;"
                                onChange={handleImageChange}
                            />
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onClick={onClose}>
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            class="btn btn-primary"
                            disabled={loading()}
                        >
                            {loading() ? `⏳ ${t('admin_modal.loading_save')}` : isEditing ? `💾 ${t('common.save')}` : `➕ ${t('common.confirm')}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ProductModal;
