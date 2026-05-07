/**
 * DateUtils.js (Backend)
 * Centralized logic for handling IST (Indian Standard Time) across the backend services.
 * Since AWS servers default to UTC, we use this utility to ensure business days 
 * always align with India time.
 */

export const getISTDate = (dateInput = new Date()) => {
    const d = new Date(dateInput);
    // Offset by 5.5 hours to move from UTC to IST
    return new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
};

export const getISTBoundaries = (dateInput = new Date()) => {
    // 1. Move to IST
    const istNow = getISTDate(dateInput);
    
    // 2. Set to 00:00:00 and 23:59:59 of that IST date
    const startOfDay = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 23, 59, 59, 999));
    
    // 3. Shift back to UTC for database storage/query (MongoDB stores in UTC)
    startOfDay.setTime(startOfDay.getTime() - (5.5 * 60 * 60 * 1000));
    endOfDay.setTime(endOfDay.getTime() - (5.5 * 60 * 60 * 1000));
    
    return { startOfDay, endOfDay };
};

/**
 * Standardizes a date as "YYYY-MM-DD" for indexing and comparison.
 * Safe for UTC servers as it anchors to IST first.
 */
export const formatDateKey = (dateInput) => {
    if (!dateInput) return "";
    const istDate = getISTDate(dateInput);
    const y = istDate.getUTCFullYear();
    const m = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(istDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Normalizes a date for "Business Storage" (Noon UTC).
 * Matches the frontend's toBusinessISO behavior.
 */
export const toBusinessDate = (date) => {
    const d = new Date(date);
    d.setUTCHours(12, 0, 0, 0); // Noon anchor
    return d;
};
