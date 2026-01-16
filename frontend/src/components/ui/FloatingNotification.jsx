import React, { useEffect, useState } from 'react';

/**
 * FloatingNotification - Mobile-friendly notification component
 * Displays at bottom of screen with auto-dismiss
 */
const FloatingNotification = ({ message, type = 'info', duration = 4000, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (!message) return;

        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
                setIsVisible(false);
                if (onDismiss) onDismiss();
            }, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [message, duration, onDismiss]);

    if (!isVisible || !message) return null;

    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return {
                    background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
                    border: '2px solid #4caf50',
                    iconColor: '#4caf50',
                    icon: '✅'
                };
            case 'error':
                return {
                    background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
                    border: '2px solid #f44336',
                    iconColor: '#f44336',
                    icon: '❌'
                };
            case 'warning':
                return {
                    background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
                    border: '2px solid #B8860B',
                    iconColor: '#B8860B',
                    icon: '⚠️'
                };
            default:
                return {
                    background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
                    border: '2px solid #2196f3',
                    iconColor: '#2196f3',
                    icon: 'ℹ️'
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: `translateX(-50%) translateY(${isExiting ? '100px' : '0'})`,
                zIndex: 10000,
                width: 'calc(100% - 40px)',
                maxWidth: '400px',
                padding: '16px 20px',
                borderRadius: '12px',
                background: styles.background,
                border: styles.border,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
                opacity: isExiting ? 0 : 1,
                fontFamily: "'Oswald', sans-serif"
            }}
            onClick={() => {
                setIsExiting(true);
                setTimeout(() => {
                    setIsVisible(false);
                    if (onDismiss) onDismiss();
                }, 300);
            }}
        >
            <span style={{ fontSize: '24px' }}>{styles.icon}</span>
            <span style={{
                color: '#F5F0E1',
                fontSize: '14px',
                flex: 1,
                lineHeight: '1.4'
            }}>
                {message}
            </span>
            <button
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '4px'
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsExiting(true);
                    setTimeout(() => {
                        setIsVisible(false);
                        if (onDismiss) onDismiss();
                    }, 300);
                }}
            >
                ×
            </button>
        </div>
    );
};

export default FloatingNotification;
