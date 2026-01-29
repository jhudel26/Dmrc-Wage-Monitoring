// Import shared utilities (available as global WageUtils)
// import WageUtils from './utils.js';

console.log('APP.JS: File loaded and executing');
console.log('APP.JS: WageUtils available:', typeof WageUtils);

// Main Application
class WageRatesApp {
  constructor() {
    console.log('APP.JS: WageRatesApp constructor called');
    
    this.regions = [];
    this.filteredRegions = [];
    this.currentView = 'grid'; // 'grid' or 'list'
    this.sortBy = 'region-asc';
    this.sectorFilter = 'all'; // 'all', 'agriculture', 'non-agriculture'
    this.lastDataCheck = 0;
    // Default OFF unless user explicitly enabled it (toggle/localStorage)
    this.notificationsEnabled = false;
    this.notificationPermission = 'default';
    this.firebaseInitialized = false;
    this.firebaseListener = null;
    this.timers = []; // Track timers for cleanup
    this.eventListeners = []; // Track event listeners for cleanup
    
    // Initialize with error handling
    try {
      this.initializeElements();
      this.initializeEventListeners();
      this.initializeNotifications();
      this.setupStorageListener();
      
      // Clear any pending notifications from previous session
      this.clearPendingNotifications();
      
      this.loadData();
      
      // Initialize Firebase notifications after a short delay
      this.timers.push(setTimeout(() => {
        if (typeof firebase !== 'undefined') {
          console.log('🔥 Firebase detected, initializing notifications...');
          this.initializeFirebaseNotifications();
        } else {
          console.log('⏳ Firebase not yet loaded, will retry...');
          this.timers.push(setTimeout(() => this.initializeFirebaseNotifications(), 1000));
        }
      }, 500));
      
      // Force service worker update to ensure latest version
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.update();
          });
        }).catch(error => {
          console.warn('Service worker registration check failed:', error);
        });
      }
    } catch (error) {
      console.error('❌ Error during initialization:', error);
      this.showError('Application initialization failed. Please refresh the page.');
    }
    
    // Note: No more polling needed - Firebase handles real-time updates
  }

  // Cleanup method to prevent memory leaks
  cleanup() {
    console.log('🧹 Cleaning up app resources...');
    
    // Clear all timers
    this.timers.forEach(timerId => clearTimeout(timerId));
    this.timers = [];
    
    // Remove event listeners
    this.eventListeners.forEach(({element, event, handler}) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
    
    // Remove Firebase listener
    if (this.firebaseListener) {
      const database = window.getFirebaseDatabase();
      if (database) {
        database.ref('wageUpdates').off('value', this.firebaseListener);
      }
      this.firebaseListener = null;
    }
    
    // Remove notification elements
    document.querySelectorAll('.alert.position-fixed').forEach(el => el.remove());
  }

  // Notification methods
  initializeFirebaseNotifications() {
  try {
    console.log('🔥 initializeFirebaseNotifications called');
    
    const database = window.getFirebaseDatabase();
    if (!database) {
      console.log('❌ Firebase not available, using fallback system');
      return;
    }

    this.firebaseInitialized = true;
    console.log('✅ Firebase initialized successfully');

    // Track last seen update to avoid notifying on initial load/reload
    const lastSeenKey = 'last-seen-firebase-update-timestamp';
    let lastSeen = localStorage.getItem(lastSeenKey) || null;
    let isInitialSnapshot = true;

    // Listen for wage data updates with validation
    this.firebaseListener = database.ref('wageUpdates').on('value', (snapshot) => {
      const data = snapshot.val();
      console.log('🔥 Firebase update received:', data);
      
      // Validate data structure
      if (!this.validateFirebaseData(data)) {
        console.error('❌ Invalid Firebase data structure:', data);
        return;
      }

      // Firebase 'value' fires immediately with current data.
      // Do NOT show a notification for that initial snapshot.
      if (isInitialSnapshot) {
        isInitialSnapshot = false;
        if (data && data.timestamp) {
          lastSeen = data.timestamp;
          localStorage.setItem(lastSeenKey, data.timestamp);
        }
        // Still refresh data once on initial connect
        setTimeout(() => this.loadData(), 250);
        return;
      }

      // If we've already seen this update (page reload), don't notify again.
      if (data && data.timestamp && lastSeen && data.timestamp === lastSeen) {
        return;
      }
      
      console.log('🔔 Notifications enabled:', this.notificationsEnabled);
      
      if (data && this.notificationsEnabled) {
        console.log('🔔 Showing Firebase notification to user');
        this.showDataUpdateNotification(data.lastUpdated);

        if (data.timestamp) {
          lastSeen = data.timestamp;
          localStorage.setItem(lastSeenKey, data.timestamp);
        }
        
        // Reload data
        setTimeout(() => {
          this.loadData();
        }, 1000);
      } else {
        console.log('🔕 Firebase update ignored:', {
          hasData: !!data,
          notificationsEnabled: this.notificationsEnabled
        });

        if (data && data.timestamp) {
          lastSeen = data.timestamp;
          localStorage.setItem(lastSeenKey, data.timestamp);
        }
        
        // Even if notifications are disabled, still reload data to keep it fresh
        if (data) {
          console.log('📱 Reloading data without notification (notifications disabled)');
          setTimeout(() => {
            this.loadData();
          }, 1000);
        }
      }
    });

    console.log('✅ Firebase notifications initialized');
    console.log('🔥 Firebase listener set up for wageUpdates');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
  }
}

  clearPendingNotifications() {
    try {
      // Clear any pending notifications from localStorage
      const pendingNotifications = [
        'wage-data-update',
        'pending-notification',
        'last-notification'
      ];
      
      pendingNotifications.forEach(key => {
        if (localStorage.getItem(key)) {
          console.log('🧹 Clearing pending notification:', key);
          localStorage.removeItem(key);
        }
      });
      
      // Also clear sessionStorage notifications
      sessionStorage.removeItem('wage-data-update');
      
      console.log('✅ Pending notifications cleared');
    } catch (error) {
      console.error('❌ Error clearing notifications:', error);
    }
  }

  async triggerFirebaseNotification(lastUpdated) {
    // Validate input
    if (!lastUpdated || typeof lastUpdated !== 'string') {
      console.error('Invalid lastUpdated for Firebase notification:', lastUpdated);
      return;
    }
    
    if (!this.firebaseInitialized) {
      console.log('Firebase not initialized, skipping');
      return;
    }

    try {
      const database = window.getFirebaseDatabase();
      if (!database) {
        console.error('Firebase database not available');
        return;
      }

      const notificationData = {
        lastUpdated: lastUpdated,
        timestamp: new Date().toISOString(),
        message: 'Wage data has been updated by administrator',
        type: 'wage-update',
        source: 'admin-panel'
      };

      // Validate data before sending
      if (!this.validateFirebaseData(notificationData)) {
        console.error('Invalid notification data structure:', notificationData);
        return;
      }

      await database.ref('wageUpdates').set(notificationData);
      console.log('Firebase notification triggered:', notificationData);
    } catch (error) {
      console.error('Failed to trigger Firebase notification:', error);
    }
  }

  initializeElements() {
    this.elements = {
      wageCards: document.getElementById('wage-cards'),
      searchInput: document.getElementById('search-input'),
      sortSelect: document.getElementById('sort-select'),
      sectorFilter: document.getElementById('sector-filter'),
      toggleViewBtn: document.getElementById('toggle-view'),
      lastUpdated: document.querySelector('#last-updated .fw-bold'),
      footerUpdateDate: document.getElementById('footer-update-date'),
      notificationToggle: document.getElementById('notification-toggle')
    };
  }

  initializeEventListeners() {
    // Helper method to add tracked event listeners
    const addTrackedListener = (element, event, handler) => {
      if (element && handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({element, event, handler});
      }
    };
    
    // Use debounced search to avoid filtering on every keystroke
    const debouncedFilter =
      typeof WageUtils !== 'undefined' && WageUtils && typeof WageUtils.debounce === 'function'
        ? WageUtils.debounce(() => this.filterRegions(), 300)
        : () => this.filterRegions();
    this.debouncedFilterRegions = debouncedFilter;
    
    addTrackedListener(this.elements.searchInput, 'input', this.debouncedFilterRegions);
    addTrackedListener(this.elements.sortSelect, 'change', (e) => {
      this.sortBy = e.target.value;
      this.renderRegions();
    });
    addTrackedListener(this.elements.sectorFilter, 'change', (e) => {
      this.sectorFilter = e.target.value;
      this.filterRegions();
    });
    addTrackedListener(this.elements.toggleViewBtn, 'click', () => this.toggleView());
    addTrackedListener(this.elements.notificationToggle, 'change', (e) => {
      this.handleNotificationToggle(e.target.checked);
    });
    
    // Add cleanup on page unload
    const cleanupHandler = () => this.cleanup();
    window.addEventListener('beforeunload', cleanupHandler);
    this.eventListeners.push({element: window, event: 'beforeunload', handler: cleanupHandler});
  }

  async loadData() {
    try {
      // Debug: Check if WageUtils is available
      console.log('WageUtils available:', typeof WageUtils);
      console.log('WageUtils object:', WageUtils);
      
      if (!WageUtils) {
        throw new Error('WageUtils is not available');
      }
      
      console.log('Starting API call...');
      const data = await WageUtils.apiCall('wages');
      console.log('API call successful, data:', data);
      
      this.regions = data.regions;
      this.filteredRegions = [...this.regions];
      this.lastDataCheck = data.lastUpdated;
      
      // Update last updated date
      const lastUpdated = new Date(data.lastUpdated);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const formattedDate = WageUtils.formatDate(data.lastUpdated, options);
      
      if (this.elements.lastUpdated) {
        this.elements.lastUpdated.textContent = formattedDate;
      }
      
      const footerUpdateDate = document.getElementById('footer-update-date');
      if (footerUpdateDate) {
        footerUpdateDate.textContent = formattedDate;
      }
      
      // Update page title with last updated date
      document.title = `DMRC Regional Minimum Wage Monitoring - Updated ${formattedDate}`;
      
      this.renderRegions();
    } catch (error) {
      console.error('Error loading wage data:', error);
      this.showError(`Failed to load wage data: ${error.message}. Please try again later.`);
    }
  }

  filterRegions() {
    const searchTerm = this.elements.searchInput.value.trim().toLowerCase();
    
    // Start with all regions
    let baseFiltered = [...this.regions];
    
    // Apply search filter
    if (searchTerm) {
      baseFiltered = baseFiltered.filter(region => {
        const parts = [];
        
        // Core region fields
        if (region.name) parts.push(region.name);
        if (region.id) parts.push(region.id);
        if (region.wageOrder) parts.push(region.wageOrder);
        if (region.dateEffective) parts.push(region.dateEffective);
        if (region.notes) parts.push(region.notes);

        // Rates and tranches
        if (Array.isArray(region.rates)) {
          region.rates.forEach(rate => {
            if (!rate) return;
            if (rate.type) parts.push(rate.type);
            if (rate.coverage) parts.push(rate.coverage);
            if (typeof rate.amount === 'number') parts.push(String(rate.amount));

            if (Array.isArray(rate.tranches)) {
              rate.tranches.forEach(tranche => {
                if (!tranche) return;
                if (typeof tranche.amount === 'number') parts.push(String(tranche.amount));
                if (tranche.coverage) parts.push(tranche.coverage);
                if (tranche.effectiveDate) parts.push(tranche.effectiveDate);
                if (tranche.status) parts.push(tranche.status);
              });
            }
          });
        }

        const searchableText = parts.filter(Boolean).join(' ').toLowerCase();
        return searchableText.includes(searchTerm);
      });
    }
    
    // Apply sector filter
    if (this.sectorFilter !== 'all') {
      baseFiltered = baseFiltered.filter(region => {
        return region.rates.some(rate => 
          rate.type.toLowerCase() === this.sectorFilter.toLowerCase()
        );
      });
    }
    
    this.filteredRegions = baseFiltered;
    this.renderRegions();
  }

  sortRegions() {
    switch (this.sortBy) {
      case 'region-asc':
        this.filteredRegions.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'region-desc':
        this.filteredRegions.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'wage-high':
        this.filteredRegions.sort((a, b) => this.getMaxWage(b) - this.getMaxWage(a));
        break;
      case 'wage-low':
        this.filteredRegions.sort((a, b) => this.getMinWage(a) - this.getMinWage(b));
        break;
    }
  }

  getMaxWage(region) {
    return Math.max(...region.rates.map(rate => {
      if (rate.tranches && rate.tranches.length > 0) {
        return Math.max(...rate.tranches.map(t => t.amount || 0));
      }
      return rate.amount || 0;
    }));
  }

  getMinWage(region) {
    return Math.min(...region.rates.map(rate => {
      if (rate.tranches && rate.tranches.length > 0) {
        return Math.min(...rate.tranches.map(t => t.amount || 0));
      }
      return rate.amount || 0;
    }));
  }

  toggleView() {
    this.currentView = this.currentView === 'grid' ? 'list' : 'grid';
    this.elements.wageCards.classList.toggle('list-view', this.currentView === 'list');
    this.elements.wageCards.classList.toggle('grid-view', this.currentView === 'grid');
    
    const icon = this.elements.toggleViewBtn.querySelector('i');
    
    if (this.currentView === 'grid') {
      icon.className = 'bi bi-grid-3x3-gap-fill me-2';
      this.elements.toggleViewBtn.innerHTML = '<i class="bi bi-grid-3x3-gap-fill me-2"></i>Grid View';
    } else {
      icon.className = 'bi bi-list-ul me-2';
      this.elements.toggleViewBtn.innerHTML = '<i class="bi bi-list-ul me-2"></i>List View';
    }
    
    // Re-render regions with new view
    this.renderRegions();
  }

  // Helper function to convert URLs in text to clickable links
  makeLinksClickable(text) {
    return WageUtils.makeLinksClickable(text);
  }

  renderRegions() {
    this.sortRegions();
    
    if (!this.elements.wageCards) {
      console.error('Wage cards container not found');
      return;
    }
    
    if (this.filteredRegions.length === 0) {
      this.elements.wageCards.innerHTML = `
        <div class="col-12">
          <div class="alert alert-warning">
            No regions found matching your search. Try a different term.
          </div>
        </div>
      `;
      return;
    }

    // List View - Single table with all regions
    if (this.currentView === 'list') {
      // First, collect all unique tranches across all regions
      const allTranches = new Set();
      const regionTranches = {};
      
      this.filteredRegions.forEach(region => {
        const nonAgriRate = region.rates.find(rate => rate.type === 'Non-Agriculture') || {};
        const agriRate = region.rates.find(rate => rate.type === 'Agriculture') || {};
        
        const getTranches = (rate) => {
          if (rate.tranches && rate.tranches.length > 0) {
            return rate.tranches.map(tranche => tranche.status || 'current');
          } else {
            return ['current'];
          }
        };
        
        const nonAgriTranches = getTranches(nonAgriRate);
        const agriTranches = getTranches(agriRate);
        const regionTrancheList = [...new Set([...nonAgriTranches, ...agriTranches])];
        
        regionTranches[region.id] = regionTrancheList;
        regionTrancheList.forEach(tranche => allTranches.add(tranche));
      });
      
      const sortedTranches = Array.from(allTranches).sort((a, b) => {
        const order = { 'current': 0, 'upcoming': 1 };
        return order[a] - order[b];
      });
      
      let tableHTML = `
        <div class="col-12">
          <div class="card">
            <div class="card-body p-0">
              <div class="table-responsive sticky-container">
                <table class="table table-hover table-compact mb-0 sticky-header">
                  <thead class="table-light">
                    <tr>
                      <th rowspan="2">Region</th>
                      <th rowspan="2">Wage Order</th>
                      ${this.sectorFilter === 'all' || this.sectorFilter === 'non-agriculture' ? 
                        `<th colspan="${sortedTranches.length * 2}" class="text-center">Non-Agriculture</th>` : ''}
                      ${this.sectorFilter === 'all' || this.sectorFilter === 'agriculture' ? 
                        `<th colspan="${sortedTranches.length * 2}" class="text-center">Agriculture</th>` : ''}
                      <th rowspan="2">Notes</th>
                    </tr>
                    <tr>
      `;

      // Add tranche headers for Non-Agriculture
      if (this.sectorFilter === 'all' || this.sectorFilter === 'non-agriculture') {
        sortedTranches.forEach(tranche => {
          const trancheName = tranche === 'current' ? 'Current' : 'Upcoming';
          const trancheNum = tranche === 'upcoming' ? '2' : '1';
          tableHTML += `
            <th class="text-center">${trancheName}<br><small>Tranche ${trancheNum}</small></th>
            <th class="text-center">Effective</th>
          `;
        });
      }

      // Add tranche headers for Agriculture
      if (this.sectorFilter === 'all' || this.sectorFilter === 'agriculture') {
        sortedTranches.forEach(tranche => {
          const trancheName = tranche === 'current' ? 'Current' : 'Upcoming';
          const trancheNum = tranche === 'upcoming' ? '2' : '1';
          tableHTML += `
            <th class="text-center">${trancheName}<br><small>Tranche ${trancheNum}</small></th>
            <th class="text-center">Effective</th>
          `;
        });
      }

      tableHTML += `
                    </tr>
                  </thead>
                  <tbody>
      `;

      this.filteredRegions.forEach(region => {
        const nonAgriRate = region.rates.find(rate => rate.type === 'Non-Agriculture') || {};
        const agriRate = region.rates.find(rate => rate.type === 'Agriculture') || {};
        
        const formatCurrency = WageUtils.formatCurrency;
        
        const getTrancheData = (rate) => {
          if (rate.tranches && rate.tranches.length > 0) {
            const trancheMap = {};
            rate.tranches.forEach(tranche => {
              trancheMap[tranche.status || 'current'] = {
                amount: formatCurrency(tranche.amount || 0),
                coverage: tranche.coverage || '',
                effectiveDate: tranche.effectiveDate
              };
            });
            return trancheMap;
          } else {
            return {
              current: {
                amount: formatCurrency(rate.amount || 0),
                coverage: rate.coverage || '',
                effectiveDate: region.dateEffective
              }
            };
          }
        };
        
        const nonAgriTranches = getTrancheData(nonAgriRate);
        const agriTranches = getTrancheData(agriRate);

        tableHTML += `
          <tr>
            <td>
              <div class="fw-semibold text-primary">${region.name}</div>
              <small class="text-muted">${region.id.toUpperCase()}</small>
            </td>
            <td><span class="badge bg-secondary">${region.wageOrder}</span></td>
        `;

        // Add Non-Agriculture tranches
        if (this.sectorFilter === 'all' || this.sectorFilter === 'non-agriculture') {
          sortedTranches.forEach(tranche => {
            const data = nonAgriTranches[tranche];
            if (data) {
              tableHTML += `
                <td class="text-center">
                  <div class="fw-bold text-primary">${data.amount}/day</div>
                  ${data.coverage ? `<small class="text-muted">${data.coverage}</small>` : ''}
                </td>
                <td class="text-center">
                  <small>${new Date(data.effectiveDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</small>
                </td>
              `;
            } else {
              tableHTML += `
                <td class="text-center"><span class="text-muted">-</span></td>
                <td class="text-center"><span class="text-muted">-</span></td>
              `;
            }
          });
        }

        // Add Agriculture tranches
        if (this.sectorFilter === 'all' || this.sectorFilter === 'agriculture') {
          sortedTranches.forEach(tranche => {
            const data = agriTranches[tranche];
            if (data && data.amount && data.amount !== '₱0' && !data.amount.includes('₱0')) {
              tableHTML += `
                <td class="text-center">
                  <div class="fw-bold text-info">${data.amount}/day</div>
                  ${data.coverage ? `<small class="text-muted">${data.coverage}</small>` : ''}
                </td>
                <td class="text-center">
                  <small>${new Date(data.effectiveDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</small>
                </td>
              `;
            } else {
              tableHTML += `
                <td class="text-center"><span class="text-muted">-</span></td>
                <td class="text-center"><span class="text-muted">-</span></td>
              `;
            }
          });
        }

        tableHTML += `
            <td>
              ${region.notes ? `<small class="text-muted">${this.makeLinksClickable(region.notes)}</small>` : '<span class="text-muted">-</span>'}
            </td>
          </tr>
        `;
      });

      tableHTML += `
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;

      this.elements.wageCards.innerHTML = tableHTML;
    } else {
      // Grid View - Individual cards
      this.elements.wageCards.innerHTML = this.filteredRegions
        .map(region => this.createRegionCard(region))
        .join('');
    }
    
    // Re-initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  createRegionCard(region) {
    const nonAgriRate = region.rates.find(rate => rate.type === 'Non-Agriculture') || {};
    const agriRate = region.rates.find(rate => rate.type === 'Agriculture') || {};
    
    const formatCurrency = WageUtils.formatCurrency;
    
    // Helper function to get display amount and coverage for tranches
    const getRateDisplay = (rate) => {
      if (rate.tranches && rate.tranches.length > 0) {
        const currentTranche = rate.tranches.find(t => t.status === 'current') || rate.tranches[0];
        const upcomingTranche = rate.tranches.find(t => t.status === 'upcoming');
        
        let amountDisplay = formatCurrency(currentTranche.amount || 0);
        let coverageDisplay = currentTranche.coverage || '';
        let trancheDetails = '';
        
        if (upcomingTranche) {
          const upcomingDate = new Date(upcomingTranche.effectiveDate).toLocaleDateString('en-PH', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          trancheDetails = formatCurrency(upcomingTranche.amount);
          coverageDisplay += ` (Next: ${upcomingTranche.effectiveDate})`;
        }
        
        return { 
          amount: amountDisplay, 
          coverage: coverageDisplay,
          trancheDetails: trancheDetails,
          currentAmount: currentTranche.amount || 0,
          upcomingAmount: upcomingTranche ? upcomingTranche.amount : null,
          upcomingDate: upcomingTranche ? upcomingTranche.effectiveDate : null
        };
      } else {
        return {
          amount: formatCurrency(rate.amount || 0),
          coverage: rate.coverage || '',
          trancheDetails: '',
          currentAmount: rate.amount || 0,
          upcomingAmount: null,
          upcomingDate: null
        };
      }
    };
    
    const nonAgriDisplay = getRateDisplay(nonAgriRate);
    const agriDisplay = getRateDisplay(agriRate);

    // Helper function to format tranche date
    const formatTrancheDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // Grid View (default) - Modern Professional Design with Separate Tranches
    return `
      <div class="col-md-6 col-lg-4">
        <div class="card h-100 region-card">
          <div class="card-body">
            <h6 class="region-name">${region.name}</h6>
            
            <!-- Non-Agriculture Current Tranche -->
            ${this.sectorFilter === 'all' || this.sectorFilter === 'non-agriculture' ? `
              <div class="rate-section">
                <div class="rate-header">
                  <div class="rate-title">Non-Agriculture</div>
                  <div class="rate-amount primary">${nonAgriDisplay.amount}</div>
                </div>
                ${nonAgriDisplay.coverage ? `<div class="rate-details">${nonAgriDisplay.coverage}</div>` : ''}
              </div>
              
              <!-- Non-Agriculture 2nd Tranche (if available) -->
              ${nonAgriDisplay.trancheDetails ? `
                <div class="rate-section tranche-section">
                  <div class="rate-header">
                    <div class="rate-title">Non-Agriculture (2nd Tranche)</div>
                    <div class="rate-amount primary">${nonAgriDisplay.trancheDetails}</div>
                  </div>
                  <div class="tranche-info">Upcoming Rate</div>
                  ${nonAgriDisplay.upcomingDate ? `<div class="tranche-date">Date Effective: ${formatTrancheDate(nonAgriDisplay.upcomingDate)}</div>` : ''}
                </div>
              ` : ''}
            ` : ''}
            
            <!-- Agriculture Current Tranche -->
            ${(this.sectorFilter === 'all' || this.sectorFilter === 'agriculture') && agriDisplay.amount !== '₱0' ? `
              <div class="rate-section">
                <div class="rate-header">
                  <div class="rate-title">Agriculture</div>
                  <div class="rate-amount info">${agriDisplay.amount}</div>
                </div>
                ${agriDisplay.coverage ? `<div class="rate-details">${agriDisplay.coverage}</div>` : ''}
              </div>
            ` : ''}
            
            <!-- Agriculture 2nd Tranche (if available) -->
            ${(this.sectorFilter === 'all' || this.sectorFilter === 'agriculture') && agriDisplay.trancheDetails ? `
              <div class="rate-section tranche-section">
                <div class="rate-header">
                  <div class="rate-title">Agriculture (2nd Tranche)</div>
                  <div class="rate-amount info">${agriDisplay.trancheDetails}</div>
                </div>
                <div class="tranche-info">Upcoming Rate</div>
                ${agriDisplay.upcomingDate ? `<div class="tranche-date">Date Effective: ${formatTrancheDate(agriDisplay.upcomingDate)}</div>` : ''}
              </div>
            ` : ''}
            
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Wage Order</span>
                <span class="info-value">${region.wageOrder}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Effective</span>
                <span class="info-value">${new Date(region.dateEffective).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status</span>
                <span class="info-value">${nonAgriDisplay.trancheDetails || agriDisplay.trancheDetails ? 'Multi-tranche' : 'Single rate'}</span>
              </div>
            </div>
            
            ${region.notes ? `
              <div class="notes-section">
                <div class="notes-text">
                  <i class="bi bi-info-circle"></i> ${this.makeLinksClickable(region.notes)}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // Notification methods
  async initializeNotifications() {
    // Load saved notification preference (default to current toggle state)
    const savedPreference = localStorage.getItem('wage-notifications-enabled');
    const defaultEnabled = !!this.elements.notificationToggle?.checked;
    const enabled =
      savedPreference === 'true' ? true :
      savedPreference === 'false' ? false :
      defaultEnabled;

    this.notificationsEnabled = enabled;
    if (this.elements.notificationToggle) {
      this.elements.notificationToggle.checked = enabled;
    }

    // Check current notification permission
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
    }
  }

  setupStorageListener() {
    // Listen for custom events from admin panel (same tab)
    window.addEventListener('wageDataUpdated', (e) => {
      console.log('App: Received wageDataUpdated event:', e.detail);
      if (e.detail && this.notificationsEnabled) {
        this.showDataUpdateNotification(e.detail.lastUpdated);
        
        // Reload data after a short delay to ensure server has updated
        setTimeout(() => {
          this.loadData();
        }, 1000);
      }
    });

    // Listen for storage events from admin panel (cross-tab)
    window.addEventListener('storage', (e) => {
      console.log('Storage event received:', {
        key: e.key,
        newValue: e.newValue,
        notificationsEnabled: this.notificationsEnabled,
        notificationToggle: this.elements.notificationToggle?.checked
      });
      
      if (e.key === 'wage-data-update' && e.newValue) {
        try {
          const notificationData = JSON.parse(e.newValue);
          console.log('App: Received storage event:', notificationData);
          
          // Check all conditions
          const conditions = {
            typeMatches: notificationData.type === 'wage-update',
            notificationsEnabled: this.notificationsEnabled,
            hasNotificationToggle: !!this.elements.notificationToggle,
            toggleChecked: this.elements.notificationToggle?.checked
          };
          
          console.log('Storage event conditions:', conditions);
          
          if (notificationData.type === 'wage-update' && this.notificationsEnabled) {
            console.log('All conditions met, showing notification...');
            // Show immediate notification
            this.showDataUpdateNotification(notificationData.lastUpdated);
            
            // Reload data after a short delay to ensure server has updated
            setTimeout(() => {
              this.loadData();
            }, 1000);
          } else {
            console.log('Conditions not met - notification will not show');
            if (!this.notificationsEnabled) {
              console.log('❌ Notifications are disabled');
            }
            if (notificationData.type !== 'wage-update') {
              console.log('❌ Wrong notification type:', notificationData.type);
            }
          }
        } catch (error) {
          console.error('Error parsing storage notification:', error);
        }
      }
    });

    // Check for any pending notifications on load (both sessionStorage and localStorage)
    const checkPendingNotification = (storage, storageName) => {
      const pendingNotification = storage.getItem('wage-data-update');
      if (pendingNotification) {
        try {
          const notificationData = JSON.parse(pendingNotification);
          const notificationTime = new Date(notificationData.timestamp);
          const now = new Date();
          
          // Only show if notification is less than 1 minute old
          if (now - notificationTime < 60000 && this.notificationsEnabled) {
            console.log(`App: Found pending notification in ${storageName}:`, notificationData);
            this.showDataUpdateNotification(notificationData.lastUpdated);
            
            // Reload data
            setTimeout(() => {
              this.loadData();
            }, 1000);
          }
          
          // Clear old notifications
          storage.removeItem('wage-data-update');
        } catch (error) {
          storage.removeItem('wage-data-update');
        }
      }
    };

    // Check both sessionStorage and localStorage
    checkPendingNotification(sessionStorage, 'sessionStorage');
    checkPendingNotification(localStorage, 'localStorage');
  }

  async handleNotificationToggle(enabled) {
    this.notificationsEnabled = enabled;
    
    // Save preference
    localStorage.setItem('wage-notifications-enabled', enabled.toString());
    
    // Clear any forced in-app notification setting when enabling
    if (enabled) {
      localStorage.removeItem('use-in-app-notifications');
      await this.requestNotificationPermission();
    }
  }

  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      this.showNotificationError('Your browser does not support desktop notifications');
      return;
    }

    // Check if HTTPS is enabled in production
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1' && !location.hostname.includes('xampp')) {
      // Check if we're on InfinityFree or similar free hosting
      if (location.hostname.includes('infinityfree') || location.hostname.includes('epizy')) {
        console.log('🌐 InfinityFree detected - Firebase notifications enabled, desktop notifications require HTTPS');
        this.showNotificationError('Desktop notifications require HTTPS. Using Firebase real-time notifications with in-app alerts.');
        this.notificationsEnabled = true; // Enable Firebase notifications
        localStorage.setItem('wage-notifications-enabled', 'true');
        localStorage.setItem('use-in-app-notifications', 'true');
        return;
      } else {
        this.showNotificationError('Notifications require HTTPS in production. Please use a secure connection.');
        // Reset toggle
        if (this.elements.notificationToggle) {
          this.elements.notificationToggle.checked = false;
        }
        this.notificationsEnabled = false;
        localStorage.setItem('wage-notifications-enabled', 'false');
        return;
      }
    }

    if (this.notificationPermission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        this.notificationPermission = permission;
        
        if (permission === 'granted') {
          // Register service worker for better notification support
          await this.registerServiceWorker();
          this.showNotificationSuccess('Notifications enabled! You will be alerted when wage data is updated.');
          localStorage.setItem('use-in-app-notifications', 'false');
        } else {
          this.showNotificationError('Notification permission denied. Using in-app notifications instead.');
          this.notificationsEnabled = true; // Enable in-app notifications
          localStorage.setItem('wage-notifications-enabled', 'true');
          localStorage.setItem('use-in-app-notifications', 'true');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        this.showNotificationError('Failed to request notification permission. Using in-app notifications instead.');
        this.notificationsEnabled = true; // Enable in-app notifications
        localStorage.setItem('wage-notifications-enabled', 'true');
        localStorage.setItem('use-in-app-notifications', 'true');
      }
    }
  }

  async registerServiceWorker() {
    try {
      if ('serviceWorker' in navigator) {
        // Create a simple service worker for notifications
        // Use a relative path so it works when hosted in a subfolder
        const swRegistration = await navigator.serviceWorker.register('./sw.js?v=2.0.1');
        console.log('Service Worker registered for notifications:', swRegistration);
        
        // Force update the service worker to ensure latest version
        if (swRegistration.active) {
          swRegistration.update();
        }
        
        return swRegistration;
      }
    } catch (error) {
      console.log('Service Worker registration failed, using fallback:', error);
    }
  }

  // Sanitize HTML content to prevent XSS
  sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Validate Firebase data structure
  validateFirebaseData(data) {
    if (!data || typeof data !== 'object') return false;
    
    const requiredFields = ['lastUpdated', 'timestamp', 'type'];
    return requiredFields.every(field => data.hasOwnProperty(field));
  }

  showDataUpdateNotification(lastUpdated) {
    console.log('showDataUpdateNotification called with:', lastUpdated);
    
    // Validate input
    if (!lastUpdated || typeof lastUpdated !== 'string') {
      console.error('Invalid lastUpdated data:', lastUpdated);
      return;
    }
    
    const useInAppNotifications = localStorage.getItem('use-in-app-notifications') === 'true';
    console.log('useInAppNotifications:', useInAppNotifications);
    console.log('notificationPermission:', this.notificationPermission);
    console.log('notificationsEnabled:', this.notificationsEnabled);
  
    // Prioritize desktop notifications when permission is granted
    if (this.notificationPermission === 'granted' && !useInAppNotifications) {
      console.log('Using desktop notification');
      this.showDesktopNotification(lastUpdated);
    } else {
      console.log('Using in-app notification');
      this.showInAppNotification(lastUpdated);
    }
  
    // Store notification time for server-based checking
    localStorage.setItem('last-notification-time', lastUpdated);
  }

  showInAppNotification(lastUpdated) {
    console.log('showInAppNotification called with:', lastUpdated);
    
    const updatedDate = new Date(lastUpdated);
    const formattedDate = updatedDate.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    console.log('Creating Firebase-powered in-app notification for date:', formattedDate);
  
    // Create a prominent in-app notification with Firebase branding
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'alert alert-info alert-dismissible fade show position-fixed';
    notificationDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 450px; border-left: 4px solid #ffca28; background: linear-gradient(135deg, #fff3e0 0%, #ffffff 100%); box-shadow: 0 4px 20px rgba(255, 193, 7, 0.3); animation: slideInRight 0.3s ease-out;';
    
    // Sanitize all dynamic content
    const safeFormattedDate = this.sanitizeHTML(formattedDate);
    
    notificationDiv.innerHTML = `
      <div class="d-flex align-items-start">
        <div class="me-3">
          <div style="background: #ffca28; color: #000; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
            🔥
          </div>
        </div>
        <div class="flex-grow-1">
          <h6 class="alert-heading mb-1" style="color: #f57c00;">Firebase Real-time Update!</h6>
          <p class="mb-1"><strong>Wage rates updated on ${safeFormattedDate}</strong></p>
          <small class="text-muted">✨ Real-time notification via Firebase • Data refreshed automatically</small>
        </div>
        <button type="button" class="btn-close ms-2" data-bs-dismiss="alert"></button>
      </div>
    `;
    
    console.log('Firebase notification element created, adding to DOM...');
  
    // Add enhanced animation CSS
    if (!document.getElementById('notification-animations')) {
      try {
        if (!document.head) {
          console.error('Document head not available for CSS injection');
          return;
        }
        
        const style = document.createElement('style');
        style.id = 'notification-animations';
        style.textContent = `
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 4px 20px rgba(255, 193, 7, 0.3); }
            50% { box-shadow: 0 4px 30px rgba(255, 193, 7, 0.6); }
          }
          .notification-pulse {
            animation: pulse 2s infinite;
          }
          .firebase-notification {
            animation: glow 2s infinite;
          }
        `;
        document.head.appendChild(style);
      } catch (error) {
        console.error('Error adding animation CSS:', error);
      }
    }
    
    // Add notification to DOM with error handling
    try {
      if (!document.body) {
        console.error('Document body not available for notification');
        return;
      }
      
      document.body.appendChild(notificationDiv);
      notificationDiv.classList.add('firebase-notification');
      console.log('Firebase notification added to DOM');
    } catch (error) {
      console.error('Error adding notification to DOM:', error);
      return;
    }
  
    // Add enhanced pulse animation to notification toggle
    if (this.elements.notificationToggle) {
      this.elements.notificationToggle.parentElement.classList.add('notification-pulse');
      setTimeout(() => {
        this.elements.notificationToggle.parentElement.classList.remove('notification-pulse');
      }, 4000);
    }
  
    // Auto-remove after 12 seconds (longer for visibility) - track timer
    const timerId = setTimeout(() => {
      console.log('Removing Firebase notification after timeout');
      if (notificationDiv.parentNode) {
        notificationDiv.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
          if (notificationDiv.parentNode) {
            notificationDiv.parentNode.removeChild(notificationDiv);
          }
        }, 300);
      }
    }, 12000);
    
    // Track timer for cleanup
    if (this.timers) {
      this.timers.push(timerId);
    }
  
    // Try to show a basic browser notification even on HTTP (some browsers allow it)
    if ('Notification' in window) {
      try {
        // Check if we can show notifications even without permission (some browsers allow on HTTP for localhost-like environments)
        if (Notification.permission === 'default') {
          // Try to request permission silently
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              const notification = new Notification('🔥 Firebase: Wage Rates Updated', {
                body: `Updated on ${formattedDate}. Real-time update via Firebase.`,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">�</text></svg>',
                tag: 'wage-update-firebase'
              });
              setTimeout(() => notification.close(), 5000);
            }
          });
        }
      } catch (error) {
        console.log('Desktop notification not available on HTTP, using enhanced in-app only:', error);
      }
    }
  }

  showDesktopNotification(lastUpdated) {
    const updatedDate = new Date(lastUpdated);
    const formattedDate = updatedDate.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  
    const notificationOptions = {
      body: `The minimum wage data has been updated on ${formattedDate}. Click to view the latest information.`,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💰</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💰</text></svg>',
      tag: 'wage-update',
      requireInteraction: true
    };
    
    // Try to use service worker first (with actions)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const swOptions = {
        ...notificationOptions,
        vibrate: [100, 50, 100],
        actions: [
          {
            action: 'view',
            title: 'View Updates'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      };
      
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title: 'Wage Rates Data Updated',
        options: swOptions
      });
    } else {
      // Fallback to regular notification (without actions)
      const notification = new Notification('Wage Rates Data Updated', notificationOptions);
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    }
  }

  showNotificationSuccess(message) {
    // Validate and sanitize message
    if (!message || typeof message !== 'string') {
      console.error('Invalid notification message:', message);
      return;
    }
    
    const safeMessage = this.sanitizeHTML(message);
    
    // Create a temporary success alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 300px;';
    alertDiv.innerHTML = `
      <i class="bi bi-check-circle-fill me-2"></i>
      ${safeMessage}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to DOM with error handling
    try {
      if (!document.body) {
        console.error('Document body not available for success notification');
        return;
      }
      document.body.appendChild(alertDiv);
    } catch (error) {
      console.error('Error adding success notification to DOM:', error);
      return;
    }
    
    // Auto-remove after 5 seconds
    const timerId = setTimeout(() => {
      try {
        if (alertDiv && alertDiv.parentNode) {
          alertDiv.parentNode.removeChild(alertDiv);
        }
      } catch (error) {
        console.error('Error removing success notification:', error);
      }
    }, 5000);
    
    // Track timer for cleanup
    if (this.timers) {
      this.timers.push(timerId);
    }
  }

  showNotificationError(message) {
    // Validate and sanitize message
    if (!message || typeof message !== 'string') {
      console.error('Invalid notification message:', message);
      return;
    }
    
    const safeMessage = this.sanitizeHTML(message);
    
    // Create a temporary error alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-warning alert-dismissible fade show position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 300px;';
    alertDiv.innerHTML = `
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      ${safeMessage}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to DOM with error handling
    try {
      if (!document.body) {
        console.error('Document body not available for error notification');
        return;
      }
      document.body.appendChild(alertDiv);
    } catch (error) {
      console.error('Error adding error notification to DOM:', error);
      return;
    }
    
    // Auto-remove after 5 seconds
    const timerId = setTimeout(() => {
      try {
        if (alertDiv && alertDiv.parentNode) {
          alertDiv.parentNode.removeChild(alertDiv);
        }
      } catch (error) {
        console.error('Error removing error notification:', error);
      }
    }, 5000);
    
    // Track timer for cleanup
    if (this.timers) {
      this.timers.push(timerId);
    }
  }

  updateStatistics() {
    const totalRegionsEl = document.getElementById('total-regions');
    const avgWageEl = document.getElementById('avg-wage');
    
    if (totalRegionsEl) {
      totalRegionsEl.textContent = this.regions.length;
    }
    
    if (avgWageEl) {
      const avgWage = this.calculateAverageWage();
      avgWageEl.textContent = `₱${avgWage.toLocaleString()}`;
    }
  }
  
  calculateAverageWage() {
    if (this.regions.length === 0) return 0;
    
    const totalWage = this.regions.reduce((sum, region) => {
      const nonAgriRate = region.rates.find(r => r.type === 'Non-Agriculture');
      if (nonAgriRate) {
        if (nonAgriRate.tranches && nonAgriRate.tranches.length > 0) {
          const currentTranche = nonAgriRate.tranches.find(t => t.status === 'current') || nonAgriRate.tranches[0];
          return sum + (currentTranche.amount || 0);
        }
        return sum + (nonAgriRate.amount || 0);
      }
      return sum;
    }, 0);
    
    return Math.round(totalWage / this.regions.length);
  }

  showError(message) {
    if (this.elements.wageCards) {
      this.elements.wageCards.innerHTML = `
        <div class="col-12">
          <div class="alert alert-danger d-flex justify-content-between align-items-start flex-wrap gap-2" role="alert">
            <div>
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              ${message}
            </div>
            <button type="button" class="btn btn-sm btn-outline-light ms-auto" id="retry-load-data">
              <i class="bi bi-arrow-clockwise me-1"></i>Retry
            </button>
          </div>
        </div>
      `;
      const retryBtn = document.getElementById('retry-load-data');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this.loadData());
      }
    } else {
      console.error('Error:', message);
    }
  }
}

// Initialize the app when DOM is ready (deduplicated)
function bootWageRatesApp() {
  console.log('APP.JS: Booting WageRatesApp');

  const app = new WageRatesApp();

  // Expose app to global scope for debugging and testing
  window.app = app;
  window.wageApp = app;

  // Essential Firebase functions
  window.checkFirebaseStatus = () => {
    console.log('🔥 Firebase Status Check:');
    console.log('- firebaseInitialized:', app.firebaseInitialized);
    console.log('- notificationsEnabled:', app.notificationsEnabled);
    console.log('- database available:', !!window.getFirebaseDatabase());

    if (window.getFirebaseDatabase()) {
      console.log('✅ Firebase is ready');
    } else {
      console.log('❌ Firebase not loaded yet');
    }
  };

  window.testFirebaseNotification = async () => {
    console.log('🧪 Testing Firebase notification...');

    if (!app.firebaseInitialized) {
      console.log('❌ Firebase not initialized, initializing now...');
      app.initializeFirebaseNotifications();

      setTimeout(() => {
        window.testFirebaseNotification();
      }, 2000);
      return;
    }

    try {
      const database = window.getFirebaseDatabase();
      if (!database) {
        console.error('❌ Database not available');
        return;
      }

      const testData = {
        lastUpdated: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        message: 'Test notification from Firebase',
        type: 'wage-update'
      };

      await database.ref('wageUpdates').set(testData);
      console.log('✅ Firebase test notification sent:', testData);

    } catch (error) {
      console.error('❌ Firebase test failed:', error);
    }
  };

  window.forceFirebaseInit = () => {
    console.log('🔧 Forcing Firebase initialization...');

    if (typeof firebase !== 'undefined') {
      console.log('✅ Firebase SDK loaded, initializing...');
      app.initializeFirebaseNotifications();
    } else {
      console.log('❌ Firebase SDK not loaded, waiting...');
      setTimeout(window.forceFirebaseInit, 1000);
    }
  };

  window.testFirebaseListener = async function() {
    console.log('🧪 Testing Firebase listener...');

    try {
      const database = window.getFirebaseDatabase();
      if (!database) {
        console.error('❌ Database not available');
        return;
      }

      const testData = {
        lastUpdated: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        message: 'Test notification from listener test',
        type: 'wage-update',
        listenerTest: true,
        source: 'test-function'
      };

      // Validate test data
      const requiredFields = ['lastUpdated', 'timestamp', 'type'];
      const isValid = requiredFields.every(field => Object.prototype.hasOwnProperty.call(testData, field));

      if (!isValid) {
        console.error('❌ Invalid test data structure:', testData);
        return;
      }

      console.log('📤 Sending test data to Firebase listener:', testData);
      await database.ref('wageUpdates').set(testData);
      console.log('✅ Test data sent - check if listener receives it');

      // Clean up after 3 seconds
      setTimeout(() => {
        try {
          database.ref('wageUpdates').remove();
          console.log('🧹 Test data cleared');
        } catch (error) {
          console.error('Error cleaning up test data:', error);
        }
      }, 3000);

    } catch (error) {
      console.error('❌ Firebase listener test failed:', error);
    }
  };

  console.log('Essential functions available:');
  console.log('- checkFirebaseStatus() - Check Firebase connection');
  console.log('- testFirebaseNotification() - Test Firebase notifications');
  console.log('- forceFirebaseInit() - Force Firebase initialization');
  console.log('- testFirebaseListener() - Test Firebase listener');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootWageRatesApp);
} else {
  bootWageRatesApp();
}
