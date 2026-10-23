// Ek socket ke liye alag limiter banta hai (closure mein timestamps yaad rakhta hai)
export function createRateLimiter(maxEvents, windowMs) {
    let timestamps = [];
    return () => {
        const now = Date.now();
        timestamps = timestamps.filter((t) => now - t < windowMs); // purane hata do
        if (timestamps.length >= maxEvents)
            return false; // limit puri, rok do
        timestamps.push(now);
        return true;
    };
}
