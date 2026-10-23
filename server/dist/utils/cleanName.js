// Naam mein sirf letters, numbers aur spaces rakhta hai. Khali bache to null deta hai.
export function cleanName(value) {
    if (typeof value !== "string")
        return null;
    const cleaned = value
        .replace(/[^\p{L}\p{N} ]/gu, "") // baaki characters hata do (<, >, emoji, etc.)
        .replace(/\s+/g, " ") // lagatar spaces ek bana do
        .trim()
        .slice(0, 20);
    return cleaned.length > 0 ? cleaned : null;
}
