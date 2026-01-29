// Shared utility functions for Wage Rates App
const WageUtils = {
    // Currency formatting
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount || 0);
    },

    // Date formatting
    formatDate(dateString, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-PH', options);
    },

    // API service with fallback
    async apiCall(endpoint, options = {}) {
        console.log(`WageUtils.apiCall called with endpoint: ${endpoint}`);
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            // Try simplified API first
            const simpleUrl = `./api/${endpoint}_simple.php`;
            console.log(`Trying simplified API: ${simpleUrl}`);
            let response = await fetch(simpleUrl, finalOptions);
            console.log(`Simplified API response status: ${response.status}`);
            
            // Fallback to original API if simplified fails
            if (!response.ok) {
                console.log('Simplified API failed, trying original...');
                const originalUrl = `./api/${endpoint}.php`;
                console.log(`Trying original API: ${originalUrl}`);
                response = await fetch(originalUrl, finalOptions);
                console.log(`Original API response status: ${response.status}`);
            }
            
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            
            const data = await response.json();
            console.log('API response data:', data);
            
            // Check for error response
            if (data.error) {
                throw new Error(data.error);
            }
            
            return data;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    },

    // Convert URLs to clickable links
    makeLinksClickable(text) {
        if (!text) return '';
        
        const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
        
        return text.replace(urlPattern, (match) => {
            const url = match.startsWith('www.') ? 'https://' + match : match;
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="note-link">${match}</a>`;
        });
    },

    // Debounce function for search
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Get tranche data helper
    getTrancheData(rate, trancheNum) {
        if (rate.tranches && rate.tranches.length > 0) {
            const tranche = rate.tranches.find(t => t.status === (trancheNum === 1 ? 'current' : 'upcoming'));
            return tranche || null;
        }
        return null;
    },

    // Get display amount for rates
    getDisplayAmount(rate) {
        if (rate.tranches && rate.tranches.length > 0) {
            const currentTranche = rate.tranches.find(t => t.status === 'current') || rate.tranches[0];
            const upcomingTranche = rate.tranches.find(t => t.status === 'upcoming');
            let display = `₱${(currentTranche.amount || 0).toLocaleString()}`;
            if (upcomingTranche) {
                display += ` → ₱${upcomingTranche.amount.toLocaleString()}`;
            }
            return display;
        }
        return `₱${(rate.amount || 0).toLocaleString()}`;
    }
};

// Export for different module systems
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS
        module.exports = factory();
    } else {
        // Browser globals
        root.WageUtils = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    return WageUtils;
}));
