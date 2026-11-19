/**
 * getImageUrl — Converts any stored image URL to a usable full URL
 *
 * Handles:
 * 1. Old records with localhost: "http://localhost:8008/uploads/xxx.png" -> replace with VITE_BASE_URL
 * 2. New records with relative path: "/uploads/xxx.png" -> prepend VITE_BASE_URL
 * 3. Cloudinary / external CDN URLs: "https://res.cloudinary.com/..." -> use as-is
 */
const getBaseUrl = () => {
    const raw = import.meta.env.VITE_BASE_URL || "";
    return raw.replace(/\/+$/, "");
};

export const getImageUrl = (url) => {
    if (!url) return "";

    const baseUrl = getBaseUrl();
    let finalUrl = url;

    // Old localhost URLs (http://localhost:8008 or any port, or http://127.0.0.1)
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(finalUrl)) {
        finalUrl = finalUrl.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, baseUrl);
    } else if (finalUrl.startsWith("/")) {
        finalUrl = `${baseUrl}${finalUrl}`;
    }

    // If page is on HTTPS, ensure all non-localhost URLs use https:// to prevent Mixed Content
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
        if (finalUrl.startsWith("http://") && !/^http:\/\/(localhost|127\.0\.0\.1)/i.test(finalUrl)) {
            finalUrl = finalUrl.replace(/^http:\/\//i, "https://");
        }
    }

    return finalUrl;
};

export const getFileUrl = getImageUrl;
