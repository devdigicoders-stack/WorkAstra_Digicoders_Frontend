import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/axios';
import { ENDPOINTS } from '../services/endpoints';

const SecurityContext = createContext();

export const useSecurity = () => useContext(SecurityContext);

export const SecurityProvider = ({ children }) => {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

    // Check if payroll token is already present in session
    useEffect(() => {
        const token = sessionStorage.getItem('payroll_token');
        if (token) {
            api.defaults.headers.common['x-payroll-token'] = token;
            setIsUnlocked(true);
        }
    }, []);

    // Update activity on mouse/keyboard events if unlocked
    useEffect(() => {
        if (!isUnlocked) return;

        const updateActivity = () => setLastActivity(Date.now());
        
        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keypress', updateActivity);
        window.addEventListener('click', updateActivity);
        window.addEventListener('scroll', updateActivity);

        const interval = setInterval(() => {
            if (Date.now() - lastActivity > LOCK_TIMEOUT) {
                setIsUnlocked(false);
                delete api.defaults.headers.common['x-payroll-token'];
                sessionStorage.removeItem('payroll_token');
            }
        }, 10000); // Check every 10 seconds

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keypress', updateActivity);
            window.removeEventListener('click', updateActivity);
            window.removeEventListener('scroll', updateActivity);
            clearInterval(interval);
        };
    }, [isUnlocked, lastActivity]);

    const requestUnlock = useCallback(() => {
        if (!isUnlocked) {
            setIsModalOpen(true);
            return false;
        }
        return true;
    }, [isUnlocked]);

    const verifyPin = async (pin) => {
        try {
            const res = await api.post(ENDPOINTS.AUTH.VERIFY_PIN, { pin });
            if (res.data.success) {
                if (res.data.payrollToken) {
                    api.defaults.headers.common['x-payroll-token'] = res.data.payrollToken;
                    sessionStorage.setItem('payroll_token', res.data.payrollToken);
                }
                setIsUnlocked(true);
                setIsModalOpen(false);
                setLastActivity(Date.now());
                return { success: true };
            }
            return { success: false, message: res.data.message };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.message || "Invalid PIN",
                notSet: error.response?.data?.notSet || false
            };
        }
    };

    return (
        <SecurityContext.Provider value={{ isUnlocked, requestUnlock, verifyPin, isModalOpen, setIsModalOpen }}>
            {children}
        </SecurityContext.Provider>
    );
};
