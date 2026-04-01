"use client";

import { useEffect, useState } from "react";

export function useOtpTimer(initialSeconds = 60) {
    const [seconds, setSeconds] = useState(initialSeconds);

    useEffect(() => {
        if (seconds <= 0) return;

        const timer = setTimeout(() => {
            setSeconds((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [seconds]);

    const reset = () => setSeconds(initialSeconds);

    return {
        seconds,
        isActive: seconds > 0,
        reset,
    };
}