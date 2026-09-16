/**
 * Routed Tabs Widget with Premium Sliding Animation
 * @module widgets/routed-tabs
 */

import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { Link, useLocation, matchPath } from 'react-router-dom';
import { motion } from '@shared/ui/motion';

// ============================================================================
// Constants
// ============================================================================

const TAB_HEIGHT = 48;
const TRANSITION_SPRING = motion.spring;
const GLOW_COLOR = 'rgba(25, 118, 210, 0.4)';

// ============================================================================
// Types
// ============================================================================

export interface TabItem {
    label: string;
    path: string;
    icon?: React.ReactElement;
}

interface RoutedTabsProps {
    tabs: TabItem[];
    baseUrl: string;
}

// ============================================================================
// Sliding Indicator Component
// ============================================================================

interface SlidingIndicatorProps {
    left: number;
    width: number;
    mounted: boolean;
}

const SlidingIndicator = memo(function SlidingIndicator({ left, width, mounted }: SlidingIndicatorProps) {
    if (width === 0) return null;

    return (
        <Box
            sx={{
                position: 'absolute',
                bottom: 0,
                height: 3,
                left,
                width,
                borderRadius: '3px 3px 0 0',
                bgcolor: 'primary.main',
                transition: mounted ? `left ${TRANSITION_SPRING}, width ${TRANSITION_SPRING}` : 'none',
                boxShadow: `0 0 12px ${GLOW_COLOR}`,
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: '-4px -8px',
                    background: `radial-gradient(ellipse at center, ${GLOW_COLOR} 0%, transparent 70%)`,
                    opacity: 0.6,
                },
            }}
        />
    );
});

// ============================================================================
// Tab Item Component
// ============================================================================

interface TabItemComponentProps {
    tab: TabItem;
    isActive: boolean;
    onMeasure: (path: string, rect: DOMRect) => void;
}

const TabItemComponent = memo(function TabItemComponent({ tab, isActive, onMeasure }: TabItemComponentProps) {
    const ref = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        if (ref.current) {
            onMeasure(tab.path, ref.current.getBoundingClientRect());
        }
    }, [tab.path, onMeasure]);

    // Re-measure on window resize
    useEffect(() => {
        const handleResize = () => {
            if (ref.current) {
                onMeasure(tab.path, ref.current.getBoundingClientRect());
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [tab.path, onMeasure]);

    return (
        <Box
            ref={ref}
            component={Link}
            to={tab.path}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                height: TAB_HEIGHT,
                textDecoration: 'none',
                color: isActive ? 'primary.main' : 'text.secondary',
                position: 'relative',
                transition: motion.transition(['color', 'background-color'], 'base'),
                '&:hover': {
                    color: isActive ? 'primary.main' : 'text.primary',
                    bgcolor: isActive ? 'transparent' : 'action.hover',
                },
            }}
        >
            {tab.icon && (
                <Box
                    sx={{
                        display: 'flex',
                        transition: `transform ${TRANSITION_SPRING}`,
                        transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    }}
                >
                    {tab.icon}
                </Box>
            )}
            <Typography
                variant="body1"
                sx={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.95rem',
                    transition: motion.transition(['transform', 'font-weight'], 'base'),
                    transform: isActive ? 'translateY(-1px)' : 'none',
                }}
            >
                {tab.label}
            </Typography>
        </Box>
    );
});

// ============================================================================
// Main Component
// ============================================================================

export const RoutedTabs = memo(function RoutedTabs({ tabs, baseUrl }: RoutedTabsProps) {
    const location = useLocation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);
    const [tabRects, setTabRects] = useState<Record<string, DOMRect>>({});

    // Determine active tab
    const activeTab = tabs.find((tab) => matchPath({ path: `${baseUrl}/${tab.path}/*` }, location.pathname)) || tabs[0];

    // Delayed mount for animation
    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Measure tab positions
    const handleMeasure = useCallback((path: string, rect: DOMRect) => {
        setTabRects((prev) => ({ ...prev, [path]: rect }));
    }, []);

    // Calculate indicator position
    const containerRect = containerRef.current?.getBoundingClientRect();
    const activeRect = activeTab ? tabRects[activeTab.path] : null;

    const indicatorLeft = activeRect && containerRect ? activeRect.left - containerRect.left : 0;
    const indicatorWidth = activeRect?.width || 0;

    return (
        <Paper
            ref={containerRef}
            variant="outlined"
            sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 1,
                borderColor: 'divider',
            }}
        >
            <Box
                role="tablist"
                sx={{
                    display: 'flex',
                    position: 'relative',
                }}
            >
                {tabs.map((tab) => (
                    <TabItemComponent
                        key={tab.path}
                        tab={tab}
                        isActive={tab.path === activeTab?.path}
                        onMeasure={handleMeasure}
                    />
                ))}
            </Box>
            <SlidingIndicator left={indicatorLeft} width={indicatorWidth} mounted={mounted} />
        </Paper>
    );
});
