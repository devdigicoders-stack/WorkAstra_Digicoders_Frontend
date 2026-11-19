/**
 * getImageUrl — Converts any stored image URL to a usable full URL
 *
 * Handles 3 cases:
 * 1. Old records: "http://localhost:8008/uploads/xxx.png" → replace with VITE_BASE_URL
 * 2. New records: "/uploads/xxx.png" → prepend VITE_BASE_URL
 * 3. Cloudinary / external URLs: "https://res.cloudinary.com/..." → use as-is
 */
const BASE_URL = import.meta.env.VITE_BASE_URL || "";

export const getImageUrl = (url) => {
    if (!url) return null;

    // Old localhost URLs — replace localhost part with live backend URL
    if (url.startsWith("http://localhost")) {
        return url.replace(/^http:\/\/localhost:\d+/, BASE_URL);
    }

    // Relative path like /uploads/xxx.png — prepend backend base URL
    if (url.startsWith("/")) {
        return `${BASE_URL}${url}`;
    }

    // Already absolute URL (Cloudinary, external CDN etc.) — use as-is
    return url;
};
