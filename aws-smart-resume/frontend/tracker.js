/**
 * AWS Smart Resume Tracker
 * Tracks user engagement and sends data to Serverless Backend
 */

// Generate a random Session ID
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const SESSION_ID = localStorage.getItem('resume_session_id') || generateUUID();
localStorage.setItem('resume_session_id', SESSION_ID);

const IS_REPEAT_VISIT = localStorage.getItem('resume_visited') === 'true';
localStorage.setItem('resume_visited', 'true');

// Tracking State
let trackingData = {
    sessionId: SESSION_ID,
    isRepeatVisit: IS_REPEAT_VISIT,
    startTime: new Date().toISOString(),
    referrer: document.referrer || 'direct',
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    scrollDepth: 0,
    sectionsViewed: {},
    timeSpent: 0
};

// Section Timer
const sections = ['hero', 'about', 'skills', 'projects', 'experience', 'certifications'];
const sectionTimers = {};

sections.forEach(id => {
    trackingData.sectionsViewed[id] = 0;
    sectionTimers[id] = { start: null, total: 0 };
});

// Intersection Observer for Section Visibility
const observerOptions = {
    root: null,
    threshold: 0.5 // 50% visible to count as viewing
};

const observer = new IntersectionObserver((entries) => {
    const now = Date.now();
    entries.forEach(entry => {
        const id = entry.target.id;
        if (entry.isIntersecting) {
            sectionTimers[id].start = now;
        } else {
            if (sectionTimers[id].start) {
                const duration = (now - sectionTimers[id].start) / 1000;
                trackingData.sectionsViewed[id] += duration;
                sectionTimers[id].start = null;
            }
        }
    });
}, observerOptions);

sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
});

// Scroll Tracking
const updateScrollDepth = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.body.offsetHeight;
    const winHeight = window.innerHeight;
    const scrollPercent = (scrollTop + winHeight) / docHeight * 100;
    
    // Track milestones
    [25, 50, 75, 100].forEach(milestone => {
        if (scrollPercent >= milestone && trackingData.scrollDepth < milestone) {
            trackingData.scrollDepth = milestone;
        }
    });
};

window.addEventListener('scroll', () => {
    // Simple throttle
    if (!window.scrollThrottle) {
        window.scrollThrottle = setTimeout(() => {
            updateScrollDepth();
            window.scrollThrottle = null;
        }, 500);
    }
});

// Data Transmission
const sendData = (isFinal = false) => {
    // Update final times
    const now = Date.now();
    trackingData.timeSpent = (now - new Date(trackingData.startTime).getTime()) / 1000;
    
    // Close any open section timers
    Object.keys(sectionTimers).forEach(id => {
        if (sectionTimers[id].start) {
            const duration = (now - sectionTimers[id].start) / 1000;
            trackingData.sectionsViewed[id] += duration;
            // Don't reset start here if not final, as we are still viewing
            if (isFinal) sectionTimers[id].start = null; 
            else sectionTimers[id].start = now; // Reset start to now for next interval
        }
    });

    const payload = JSON.stringify(trackingData);

    if (isFinal && navigator.sendBeacon) {
        // Use Beacon for page unload
        navigator.sendBeacon(`${window.API_ENDPOINT}/track`, payload);
    } else {
        // Use Fetch for interval updates
        fetch(`${window.API_ENDPOINT}/track`, {
            method: 'POST',
            body: payload,
            headers: {
                'Content-Type': 'application/json'
            },
            keepalive: true
        }).catch(err => console.error('Tracking Error:', err));
    }
};

// Send pulse every 10 seconds
setInterval(() => sendData(false), 10000);

// Send on page unload
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        sendData(true);
    }
});
window.addEventListener('beforeunload', () => sendData(true));

// Initial load event
console.log('AWS Smart Resume Tracker Initialized');
