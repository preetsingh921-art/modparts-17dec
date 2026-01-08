import { useState, useEffect } from 'react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const SiteSettings = () => {
    const [settings, setSettings] = useState({
        site_title: 'Sardaarji Autoparts',
        site_subtitle: 'Vintage Motorcycle Parts & Accessories',
        tagline: 'Quality Parts for Classic Bikes Since 1970',
        description: 'Your trusted source for vintage Yamaha RD350 motorcycle parts and accessories. We specialize in rare and hard-to-find components for classic motorcycles.',
        contact_email: '',
        contact_phone: '',
        contact_address: '',
        copyright_text: '© 2024 Sardaarji Autoparts. All rights reserved.',
        meta_keywords: 'motorcycle parts, yamaha rd350, vintage parts, classic motorcycle, autoparts',
        meta_author: 'Sardaarji Autoparts',
        social_facebook: '',
        social_instagram: '',
        social_twitter: ''
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        // Load settings from localStorage or API
        const savedSettings = localStorage.getItem('siteSettings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            // Save to localStorage (can be replaced with API call)
            localStorage.setItem('siteSettings', JSON.stringify(settings));

            setMessage({ type: 'success', text: 'Settings saved successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <LoadingSpinner size="xl" text="Loading settings..." variant="gear" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: "'Oswald', sans-serif" }}>
                Site Settings
            </h2>

            {message.text && (
                <div className={`mb-6 p-4 rounded ${message.type === 'success' ? 'bg-green-600/20 text-green-400 border border-green-600' : 'bg-red-600/20 text-red-400 border border-red-600'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-8">
                {/* Site Identity */}
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-[#F5F0E1] mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>
                        Site Identity
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[#A8A090] text-sm mb-2">Site Title</label>
                            <input
                                type="text"
                                name="site_title"
                                value={settings.site_title}
                                onChange={handleChange}
                                className="w-full bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-4 py-2 focus:outline-none focus:border-[#8B2332]"
                            />
                        </div>
                        <div>
                            <label className="block text-[#A8A090] text-sm mb-2">Subtitle</label>
                            <input
                                type="text"
                                name="site_subtitle"
                                value={settings.site_subtitle}
                                onChange={handleChange}
                                className="w-full bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-4 py-2 focus:outline-none focus:border-[#8B2332]"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[#A8A090] text-sm mb-2">Tagline</label>
                            <input
                                type="text"
                                name="tagline"
                                value={settings.tagline}
                                onChange={handleChange}
                                className="w-full bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-4 py-2 focus:outline-none focus:border-[#8B2332]"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[#A8A090] text-sm mb-2">Site Description</label>
                            <textarea
                                name="description"
                                value={settings.description}
                                onChange={handleChange}
                                rows={3}
                                className="w-full bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-4 py-2 focus:outline-none focus:border-[#8B2332]"
                            />
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-[#F5F0E1] mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>
                        Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[#A8A090] text-sm mb-2">Email</label>
                            <input
                                type="email"
                                name="contact_email"
                                value={settings.contact_email}
                                onChange={handleChange}
                                className="w-full bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-4 py-2 focus:outline-none focus:border-[#8B2332]"
                                placeholder="contact@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-[#A8A090] text-sm mb-2">Phone</label>
                            <input
                                type="tel"
                                name="contact_phone"
                                value={settings.contact_phone}
                                onChange={handleChange}
                                className="w-full bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-4 py-2 focus:outline-none focus:border-[#8B2332]"
                                placeholder="+1 (555) 123-4567"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[#A8A090] text-sm mb-2">Address</label>
                            <textarea
                                name="contact_address"
                                value={settings.contact_address}
                                onChange={handleChange}
                                rows={2}
                                className="w-full bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-4 py-2 focus:outline-none focus:border-[#8B2332]"
                                placeholder="123 Main Street, City, Country"
                            />
                        </div>
                    </div>
                </div>

                {/* SEO & Meta */}
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-[#F5F0E1] mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>
                        SEO & Meta Information
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-[#A8A090] text-sm mb-2">Meta Keywords</label>
                            <input
                                type="text"
                                name="meta_keywords"
                                value={settings.meta_keywords}
                                onChange={handleChange}
                                className="w-full bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-4 py-2 focus:outline-none focus:border-[#8B2332]"
                                placeholder="keyword1, keyword2, keyword3"
                            />
                        </div>
                        <div>
                            <label className="block text-[#A8A090] text-sm mb-2">Meta Author</label>
                            <input
                                type="text"
                                name="meta_author"
                                value={settings.meta_author}
                                onChange={handleChange}
                                className="w-full bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-4 py-2 focus:outline-none focus:border-[#8B2332]"
                            />
                        </div>
                        <div>
                            <label className="block text-[#A8A090] text-sm mb-2">Copyright Text</label>
                            <input
                                type="text"
                                name="copyright_text"
                                value={settings.copyright_text}
                                onChange={handleChange}
                                className="w-full bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-4 py-2 focus:outline-none focus:border-[#8B2332]"
                            />
                        </div>
                    </div>
                </div>

                {/* Social Media */}
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-[#F5F0E1] mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>
                        Social Media Links
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[#A8A090] text-sm mb-2">Facebook</label>
                            <input
                                type="url"
                                name="social_facebook"
                                value={settings.social_facebook}
                                onChange={handleChange}
                                className="w-full bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-4 py-2 focus:outline-none focus:border-[#8B2332]"
                                placeholder="https://facebook.com/..."
                            />
                        </div>
                        <div>
                            <label className="block text-[#A8A090] text-sm mb-2">Instagram</label>
                            <input
                                type="url"
                                name="social_instagram"
                                value={settings.social_instagram}
                                onChange={handleChange}
                                className="w-full bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-4 py-2 focus:outline-none focus:border-[#8B2332]"
                                placeholder="https://instagram.com/..."
                            />
                        </div>
                        <div>
                            <label className="block text-[#A8A090] text-sm mb-2">Twitter/X</label>
                            <input
                                type="url"
                                name="social_twitter"
                                value={settings.social_twitter}
                                onChange={handleChange}
                                className="w-full bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-4 py-2 focus:outline-none focus:border-[#8B2332]"
                                placeholder="https://twitter.com/..."
                            />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-[#8B2332] text-white px-8 py-3 rounded font-semibold hover:bg-[#a02a3d] transition-colors disabled:opacity-50 flex items-center"
                        style={{ fontFamily: "'Oswald', sans-serif" }}
                    >
                        {saving ? (
                            <>
                                <LoadingSpinner size="sm" showText={false} />
                                <span className="ml-2">Saving...</span>
                            </>
                        ) : (
                            'Save Settings'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SiteSettings;
