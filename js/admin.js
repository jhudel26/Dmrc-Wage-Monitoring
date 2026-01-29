// Import shared utilities (available as global WageUtils)
// import WageUtils from './utils.js';

// Admin Interface for Managing Wage Data
document.addEventListener('DOMContentLoaded', () => {
    // Firebase config is now loaded directly in admin.html
    console.log('Admin panel initialized');

    // DOM Elements
    const regionsSection = document.getElementById('regions-section');
    const regionFormSection = document.getElementById('region-form-section');
    const importExportSection = document.getElementById('import-export-section');
    const regionsTableBody = document.getElementById('regions-table-body');
    const regionForm = document.getElementById('region-form');
    const saveChangesBtn = document.getElementById('save-changes');
    const saveSuccessAlert = document.getElementById('save-success');
    const pageTitle = document.getElementById('page-title');
    const formTitle = document.getElementById('form-title');
    const regionsTab = document.getElementById('regions-tab');
    const addRegionTab = document.getElementById('add-region-tab');
    const importExportTab = document.getElementById('import-export-tab');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const enableAgriToggle = document.getElementById('enable-agri');
    const agriFields = document.getElementById('agri-fields');
    
    // Import/Export Elements
    const downloadJsonBtn = document.getElementById('download-json');
    const downloadCsvBtn = document.getElementById('download-csv');
    const downloadExcelBtn = document.getElementById('download-excel');
    const importFileInput = document.getElementById('import-file');
    const uploadFileBtn = document.getElementById('upload-file');
    const downloadTemplateBtn = document.getElementById('download-template');
    const downloadExcelTemplateBtn = document.getElementById('download-excel-template');
    const importPreviewCard = document.getElementById('import-preview-card');
    const importPreviewBody = document.getElementById('import-preview-body');
    const cancelImportBtn = document.getElementById('cancel-import');
    const confirmImportBtn = document.getElementById('confirm-import');
    const importWarning = document.getElementById('import-warning');
    const importWarningText = document.getElementById('import-warning-text');
    const lastExportDate = document.getElementById('last-export-date');
    
    // Tranche toggles and fields
    const enableNonAgriTranchesToggle = document.getElementById('enable-non-agri-tranches');
    const enableAgriTranchesToggle = document.getElementById('enable-agri-tranches');
    const nonAgriSingle = document.getElementById('non-agri-single');
    const nonAgriTranches = document.getElementById('non-agri-tranches');
    const agriSingle = document.getElementById('agri-single');
    const agriTranches = document.getElementById('agri-tranches');
    
    // Form fields
    const regionNameInput = document.getElementById('region-name');
    const regionIdInput = document.getElementById('region-id');
    const wageOrderInput = document.getElementById('wage-order');
    const dateEffectiveInput = document.getElementById('date-effective');
    const nonAgriAmountInput = document.getElementById('non-agri-amount');
    const nonAgriCoverageInput = document.getElementById('non-agri-coverage');
    const agriAmountInput = document.getElementById('agri-amount');
    const agriCoverageInput = document.getElementById('agri-coverage');
    const notesInput = document.getElementById('notes');
    const editIndexInput = document.getElementById('edit-index');
    
    // Tranche fields
    const nonAgriTranche1Amount = document.getElementById('non-agri-tranche1-amount');
    const nonAgriTranche1Date = document.getElementById('non-agri-tranche1-date');
    const nonAgriTranche1Coverage = document.getElementById('non-agri-tranche1-coverage');
    const nonAgriTranche2Amount = document.getElementById('non-agri-tranche2-amount');
    const nonAgriTranche2Date = document.getElementById('non-agri-tranche2-date');
    const nonAgriTranche2Coverage = document.getElementById('non-agri-tranche2-coverage');
    const agriTranche1Amount = document.getElementById('agri-tranche1-amount');
    const agriTranche1Date = document.getElementById('agri-tranche1-date');
    const agriTranche1Coverage = document.getElementById('agri-tranche1-coverage');
    const agriTranche2Amount = document.getElementById('agri-tranche2-amount');
    const agriTranche2Date = document.getElementById('agri-tranche2-date');
    const agriTranche2Coverage = document.getElementById('agri-tranche2-coverage');

    // State
    let wageData = { regions: [] };
    let currentEditIndex = -1;
    let regionToDelete = null;
    let importData = null; // Store imported data for preview

    // Initialize the page
    async function init() {
        await loadWageData();
        setupEventListeners();
        initializeRequiredAttributes(); // Initialize required attributes on page load
        showRegionsList();
    }

    // Load wage data from the server
    async function loadWageData() {
        try {
            // Try simplified API first
            let response = await fetch('./api/wages_simple.php');
            
            // Fallback to original API if simplified fails
            if (!response.ok) {
                console.log('Simplified API failed, trying original...');
                response = await fetch('./api/wages.php');
            }
            
            if (!response.ok) throw new Error('Failed to load wage data');
            
            const data = await response.json();
            
            // Check for error response
            if (data.error) {
                throw new Error(data.error);
            }
            
            wageData = data;
            renderRegionsTable();
        } catch (error) {
            console.error('Error loading wage data:', error);
            
            // Show more detailed error message using inline notification
            const errorMessage = error.message || 'Unknown error occurred';
            showAdminNotification(
                `Failed to load wage data: ${errorMessage}<br><small>Please check that the data file exists, PHP permissions are correct, and the server is configured properly.</small>`,
                'danger'
            );
        }
    }

    // Save wage data to the server
    async function saveWageData() {
        try {
            // Update the last updated date
            const now = new Date();
            wageData.lastUpdated = now.toISOString().split('T')[0];
            
            // Save via simplified API directly to avoid redirect changing POST to GET
            const result = await fetch('./api/wages_simple.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(wageData, null, 2)
            });
            
            if (!result.ok) throw new Error('Failed to save wage data');
            
            const responseData = await result.json();
            
            // Check for error response
            if (responseData.error) {
                throw new Error(responseData.error);
            }
            
            // Trigger notification for connected clients
            await triggerDataUpdateNotification(wageData.lastUpdated);
            
            // Also trigger Firebase notification if available
            await triggerFirebaseNotification(wageData.lastUpdated);
            
            // Show success message
            saveSuccessAlert.classList.remove('d-none');
            setTimeout(() => {
                saveSuccessAlert.classList.add('d-none');
            }, 3000);
            
            return true;
        } catch (error) {
            console.error('Error saving wage data:', error);
            
            // Show more detailed error message using inline notification
            const errorMessage = error.message || 'Unknown error occurred';
            showAdminNotification(
                `Failed to save wage data: ${errorMessage}<br><small>Please check that the data file is writable, PHP permissions are correct, and the server has enough disk space.</small>`,
                'danger'
            );
            return false;
        }
    }

    // Trigger notification for data updates
    async function triggerDataUpdateNotification(lastUpdated) {
        try {
            console.log('Admin: Data saved, triggering notification for lastUpdated:', lastUpdated);
            
            // Create a simple notification file that clients can check
            const notificationData = {
                type: 'wage-update',
                timestamp: new Date().toISOString(),
                lastUpdated: lastUpdated,
                message: 'Wage data has been updated by administrator'
            };
            
            // Store in sessionStorage for same-tab communication
            sessionStorage.setItem('wage-data-update', JSON.stringify(notificationData));
            
            // Also store in localStorage for cross-tab communication
            localStorage.setItem('wage-data-update', JSON.stringify(notificationData));
            
            // Trigger a custom event that can be listened to in the same tab
            window.dispatchEvent(new CustomEvent('wageDataUpdated', {
                detail: notificationData
            }));
            
            console.log('Data update notification triggered:', notificationData);
            
            // Show immediate feedback to admin
            showAdminNotification('Data updated successfully! Users will be notified.');
            
        } catch (error) {
            console.error('Error triggering notification:', error);
        }
    }

    // Trigger Firebase notification for real-time updates
    async function triggerFirebaseNotification(lastUpdated) {
        try {
            console.log('🔥 Admin: Triggering Firebase notification for:', lastUpdated);
            
            const database = window.getFirebaseDatabase();
            if (!database) {
                console.log('❌ Firebase database not available, skipping Firebase notification');
                return;
            }

            const notificationData = {
                lastUpdated: lastUpdated,
                timestamp: new Date().toISOString(),
                message: 'Wage data has been updated by administrator',
                type: 'wage-update'
            };

            console.log('📤 Sending Firebase notification:', notificationData);
            await database.ref('wageUpdates').set(notificationData);
            console.log('✅ Firebase notification triggered successfully');
        } catch (error) {
            console.error('❌ Failed to trigger Firebase notification:', error);
        }
    }

    // Show notification to admin
    function showAdminNotification(message, type = 'info') {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notificationDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 300px;';
        notificationDiv.setAttribute('role', 'alert');
        notificationDiv.innerHTML = `
            <i class="bi bi-info-circle-fill me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notificationDiv);
        
        setTimeout(() => {
            if (notificationDiv.parentNode) {
                notificationDiv.parentNode.removeChild(notificationDiv);
            }
        }, 4000);
    }
    
    // Add Firebase test function for admin
    window.testAdminFirebase = async () => {
        console.log('🧪 Admin: Testing Firebase notification...');
        
        try {
            const database = window.getFirebaseDatabase();
            if (!database) {
                console.error('❌ Firebase database not available');
                return;
            }
            
            const testData = {
                lastUpdated: new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString(),
                message: 'Test notification from admin panel',
                type: 'wage-update',
                adminTest: true
            };
            
            console.log('📤 Admin sending test notification:', testData);
            await database.ref('wageUpdates').set(testData);
            console.log('✅ Admin Firebase test sent successfully');
            
        } catch (error) {
            console.error('❌ Admin Firebase test failed:', error);
        }
    };
    
    console.log('Admin functions available:');
    console.log('- testAdminFirebase() - Test Firebase notifications from admin');

    // Render the regions table
    function renderRegionsTable() {
        if (!wageData.regions || wageData.regions.length === 0) {
            regionsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No regions found. Click "Add New Region" to get started.</td>
                </tr>
            `;
            return;
        }

        regionsTableBody.innerHTML = wageData.regions.map((region, index) => {
            const nonAgriRate = region.rates.find(rate => rate.type === 'Non-Agriculture') || {};
            const agriRate = region.rates.find(rate => rate.type === 'Agriculture');
            
            // Handle tranche data
            const getDisplayAmount = (rate) => {
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
            };
            
            return `
                <tr data-index="${index}">
                    <td>${region.name}</td>
                    <td>${region.wageOrder}</td>
                    <td>${formatDate(region.dateEffective)}</td>
                    <td>${getDisplayAmount(nonAgriRate)}</td>
                    <td>${agriRate ? getDisplayAmount(agriRate) : 'N/A'}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-primary me-1 edit-region" data-index="${index}" aria-label="Edit ${region.name}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger delete-region" data-index="${index}" aria-label="Delete ${region.name}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Show the regions list view
    function showRegionsList() {
        regionsSection.style.display = 'block';
        regionFormSection.style.display = 'none';
        pageTitle.textContent = 'Manage Regions';
        regionsTab.classList.add('active');
        addRegionTab.classList.remove('active');
    }

    // Show the add region form
    function showAddRegionForm() {
        resetForm();
        regionsSection.style.display = 'none';
        regionFormSection.style.display = 'block';
        formTitle.textContent = 'Add New Region';
        regionsTab.classList.remove('active');
        addRegionTab.classList.add('active');
    }

    // Show the edit region form
    function showEditRegionForm(index) {
        const region = wageData.regions[index];
        if (!region) return;

        currentEditIndex = index;
        editIndexInput.value = index;
        
        // Show the form first (without resetting)
        regionsSection.style.display = 'none';
        regionFormSection.style.display = 'block';
        formTitle.textContent = 'Edit Region';
        regionsTab.classList.remove('active');
        addRegionTab.classList.add('active');
        
        // Set form values
        regionNameInput.value = region.name || '';
        regionIdInput.value = region.id || '';
        wageOrderInput.value = region.wageOrder || '';
        dateEffectiveInput.value = region.dateEffective || '';
        notesInput.value = region.notes || '';
        
        // Set non-agriculture rates
        const nonAgriRate = region.rates.find(rate => rate.type === 'Non-Agriculture');
        if (nonAgriRate) {
            if (nonAgriRate.tranches && nonAgriRate.tranches.length > 0) {
                // Handle tranche data
                const currentTranche = nonAgriRate.tranches.find(t => t.status === 'current') || nonAgriRate.tranches[0];
                nonAgriAmountInput.value = currentTranche.amount || '';
                nonAgriCoverageInput.value = currentTranche.coverage || '';
            } else {
                // Handle legacy single amount
                nonAgriAmountInput.value = nonAgriRate.amount || '';
                nonAgriCoverageInput.value = nonAgriRate.coverage || '';
            }
        }
        
        // Set agriculture rates
        const agriRate = region.rates.find(rate => rate.type === 'Agriculture');
        if (agriRate) {
            enableAgriToggle.checked = true;
            agriFields.style.display = 'block';
            if (agriRate.tranches && agriRate.tranches.length > 0) {
                // Handle tranche data
                const currentTranche = agriRate.tranches.find(t => t.status === 'current') || agriRate.tranches[0];
                agriAmountInput.value = currentTranche.amount || '';
                agriCoverageInput.value = currentTranche.coverage || '';
            } else {
                // Handle legacy single amount
                agriAmountInput.value = agriRate.amount || '';
                agriCoverageInput.value = agriRate.coverage || '';
            }
        } else {
            enableAgriToggle.checked = false;
            agriFields.style.display = 'none';
            agriAmountInput.value = '';
            agriCoverageInput.value = '';
        }
    }

    // Reset the form to its default state
    function resetForm() {
        currentEditIndex = -1;
        editIndexInput.value = '';
        regionForm.reset();
        enableAgriToggle.checked = true;
        agriFields.style.display = 'block';
        
        // Initialize required attributes after reset
        initializeRequiredAttributes();
    }

    // Initialize required attributes based on current toggle states
    function initializeRequiredAttributes() {
        const agriEnabled = enableAgriToggle.checked;
        const agriTranchesEnabled = enableAgriTranchesToggle.checked;
        const nonAgriTranchesEnabled = enableNonAgriTranchesToggle.checked;
        
        // Handle agriculture fields
        if (agriAmountInput) agriAmountInput.required = agriEnabled && !agriTranchesEnabled;
        if (agriCoverageInput) agriCoverageInput.required = agriEnabled && !agriTranchesEnabled;
        
        // Handle agriculture tranche fields
        const agriTranche1Amount = document.getElementById('agri-tranche1-amount');
        const agriTranche1Coverage = document.getElementById('agri-tranche1-coverage');
        const agriTranche2Amount = document.getElementById('agri-tranche2-amount');
        const agriTranche2Coverage = document.getElementById('agri-tranche2-coverage');
        
        if (agriTranche1Amount) agriTranche1Amount.required = agriEnabled && agriTranchesEnabled;
        if (agriTranche1Coverage) agriTranche1Coverage.required = agriEnabled && agriTranchesEnabled;
        if (agriTranche2Amount) agriTranche2Amount.required = agriEnabled && agriTranchesEnabled;
        if (agriTranche2Coverage) agriTranche2Coverage.required = agriEnabled && agriTranchesEnabled;
        
        // Handle non-agriculture fields
        if (nonAgriAmountInput) nonAgriAmountInput.required = !nonAgriTranchesEnabled;
        if (nonAgriCoverageInput) nonAgriCoverageInput.required = !nonAgriTranchesEnabled;
        
        // Handle non-agriculture tranche fields
        const nonAgriTranche1Amount = document.getElementById('non-agri-tranche1-amount');
        const nonAgriTranche1Coverage = document.getElementById('non-agri-tranche1-coverage');
        const nonAgriTranche2Amount = document.getElementById('non-agri-tranche2-amount');
        const nonAgriTranche2Coverage = document.getElementById('non-agri-tranche2-coverage');
        
        if (nonAgriTranche1Amount) nonAgriTranche1Amount.required = nonAgriTranchesEnabled;
        if (nonAgriTranche1Coverage) nonAgriTranche1Coverage.required = nonAgriTranchesEnabled;
        if (nonAgriTranche2Amount) nonAgriTranche2Amount.required = nonAgriTranchesEnabled;
        if (nonAgriTranche2Coverage) nonAgriTranche2Coverage.required = nonAgriTranchesEnabled;
    }

    // Handle form submission
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        // Helper function to create rate data
        const createRateData = (type, enableTranches) => {
            if (enableTranches) {
                // Create tranche data
                const tranches = [];
                
                // Tranche 1 (current)
                if (type === 'Non-Agriculture') {
                    const amount1 = parseInt(nonAgriTranche1Amount.value) || 0;
                    const date1 = nonAgriTranche1Date.value;
                    const coverage1 = nonAgriTranche1Coverage.value.trim();
                    if (amount1 > 0) {
                        tranches.push({
                            amount: amount1,
                            effectiveDate: date1,
                            coverage: coverage1,
                            status: 'current'
                        });
                    }
                    
                    // Tranche 2 (upcoming)
                    const amount2 = parseInt(nonAgriTranche2Amount.value) || 0;
                    const date2 = nonAgriTranche2Date.value;
                    const coverage2 = nonAgriTranche2Coverage.value.trim();
                    if (amount2 > 0) {
                        tranches.push({
                            amount: amount2,
                            effectiveDate: date2,
                            coverage: coverage2,
                            status: 'upcoming'
                        });
                    }
                } else {
                    const amount1 = parseInt(agriTranche1Amount.value) || 0;
                    const date1 = agriTranche1Date.value;
                    const coverage1 = agriTranche1Coverage.value.trim();
                    if (amount1 > 0) {
                        tranches.push({
                            amount: amount1,
                            effectiveDate: date1,
                            coverage: coverage1,
                            status: 'current'
                        });
                    }
                    
                    const amount2 = parseInt(agriTranche2Amount.value) || 0;
                    const date2 = agriTranche2Date.value;
                    const coverage2 = agriTranche2Coverage.value.trim();
                    if (amount2 > 0) {
                        tranches.push({
                            amount: amount2,
                            effectiveDate: date2,
                            coverage: coverage2,
                            status: 'upcoming'
                        });
                    }
                }
                
                return {
                    type: type,
                    tranches: tranches
                };
            } else {
                // Create single amount data (legacy format)
                if (type === 'Non-Agriculture') {
                    return {
                        type: type,
                        amount: parseInt(nonAgriAmountInput.value) || 0,
                        coverage: nonAgriCoverageInput.value.trim()
                    };
                } else {
                    return {
                        type: type,
                        amount: parseInt(agriAmountInput.value) || 0,
                        coverage: agriCoverageInput.value.trim()
                    };
                }
            }
        };
        
        // Get form values
        const regionData = {
            id: regionIdInput.value.trim(),
            name: regionNameInput.value.trim(),
            wageOrder: wageOrderInput.value.trim(),
            dateEffective: dateEffectiveInput.value,
            rates: [
                createRateData('Non-Agriculture', enableNonAgriTranchesToggle.checked)
            ],
            notes: notesInput.value.trim()
        };
        
        // Add agriculture rate if enabled
        if (enableAgriToggle.checked) {
            regionData.rates.push(
                createRateData('Agriculture', enableAgriTranchesToggle.checked)
            );
        }
        
        // Update or add the region
        if (currentEditIndex >= 0) {
            // Update existing region
            wageData.regions[currentEditIndex] = regionData;
        } else {
            // Add new region
            wageData.regions.push(regionData);
        }
        
        // Save changes
        const success = await saveWageData();
        if (success) {
            renderRegionsTable();
            showRegionsList();
        }
    }

    // Delete a region
    async function deleteRegion(index) {
        if (index >= 0 && index < wageData.regions.length) {
            wageData.regions.splice(index, 1);
            const success = await saveWageData();
            if (success) {
                renderRegionsTable();
            }
        }
    }

    // Format date for display
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-PH', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    // Show the import/export section
    function showImportExport() {
        regionsSection.style.display = 'none';
        regionFormSection.style.display = 'none';
        importExportSection.style.display = 'block';
        pageTitle.textContent = 'Import/Export Data';
        regionsTab.classList.remove('active');
        addRegionTab.classList.remove('active');
        importExportTab.classList.add('active');
        
        // Update last export date
        if (wageData.lastUpdated) {
            lastExportDate.textContent = formatDate(wageData.lastUpdated);
        }
    }

    // Download data as JSON
    function downloadJSON() {
        const dataStr = JSON.stringify(wageData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `wage-rates-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Update last export date
        lastExportDate.textContent = formatDate(new Date().toISOString().split('T')[0]);
    }

    // Download data as CSV
    function downloadCSV() {
        let csv = 'Region ID,Region Name,Wage Order,Date Effective,Non-Agriculture Rate,Non-Agriculture Coverage,Agriculture Rate,Agriculture Coverage,Notes\n';
        
        wageData.regions.forEach(region => {
            const nonAgriRate = region.rates.find(r => r.type === 'Non-Agriculture') || {};
            const agriRate = region.rates.find(r => r.type === 'Agriculture') || {};
            
            const getRateAmount = (rate) => {
                if (rate.tranches && rate.tranches.length > 0) {
                    const current = rate.tranches.find(t => t.status === 'current') || rate.tranches[0];
                    return current.amount || 0;
                }
                return rate.amount || 0;
            };
            
            const getRateCoverage = (rate) => {
                if (rate.tranches && rate.tranches.length > 0) {
                    const current = rate.tranches.find(t => t.status === 'current') || rate.tranches[0];
                    return current.coverage || '';
                }
                return rate.coverage || '';
            };
            
            csv += `"${region.id}","${region.name}","${region.wageOrder}","${region.dateEffective}",`;
            csv += `"${getRateAmount(nonAgriRate)}","${getRateCoverage(nonAgriRate)}",`;
            csv += `"${getRateAmount(agriRate)}","${getRateCoverage(agriRate)}",`;
            csv += `"${region.notes || ''}"\n`;
        });
        
        const dataBlob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `wage-rates-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Update last export date
        lastExportDate.textContent = formatDate(new Date().toISOString().split('T')[0]);
    }

    // Download data as Excel
    function downloadExcel() {
        // Create worksheet data
        const wsData = [];
        
        // Add headers
        wsData.push([
            'Region ID',
            'Region Name',
            'Wage Order',
            'Date Effective',
            'Non-Agriculture Rate',
            'Non-Agriculture Coverage',
            'Non-Agriculture Tranche 1 Amount',
            'Non-Agriculture Tranche 1 Date',
            'Non-Agriculture Tranche 1 Coverage',
            'Non-Agriculture Tranche 2 Amount',
            'Non-Agriculture Tranche 2 Date',
            'Non-Agriculture Tranche 2 Coverage',
            'Agriculture Rate',
            'Agriculture Coverage',
            'Agriculture Tranche 1 Amount',
            'Agriculture Tranche 1 Date',
            'Agriculture Tranche 1 Coverage',
            'Agriculture Tranche 2 Amount',
            'Agriculture Tranche 2 Date',
            'Agriculture Tranche 2 Coverage',
            'Notes'
        ]);
        
        // Add data rows
        wageData.regions.forEach(region => {
            const nonAgriRate = region.rates.find(r => r.type === 'Non-Agriculture') || {};
            const agriRate = region.rates.find(r => r.type === 'Agriculture') || {};
            
            // Get tranche data
            const getTrancheData = (rate, trancheNum) => {
                if (rate.tranches && rate.tranches.length > 0) {
                    const tranche = rate.tranches.find(t => t.status === (trancheNum === 1 ? 'current' : 'upcoming'));
                    return tranche || null;
                }
                return null;
            };
            
            const nonAgriTranche1 = getTrancheData(nonAgriRate, 1);
            const nonAgriTranche2 = getTrancheData(nonAgriRate, 2);
            const agriTranche1 = getTrancheData(agriRate, 1);
            const agriTranche2 = getTrancheData(agriRate, 2);
            
            const row = [
                region.id || '',
                region.name || '',
                region.wageOrder || '',
                region.dateEffective || '',
                // Non-Agriculture
                nonAgriTranche1 ? (nonAgriTranche1.amount || 0) : (nonAgriRate.amount || 0),
                nonAgriTranche1 ? (nonAgriTranche1.coverage || '') : (nonAgriRate.coverage || ''),
                nonAgriTranche1 ? (nonAgriTranche1.amount || '') : '',
                nonAgriTranche1 ? (nonAgriTranche1.effectiveDate || '') : '',
                nonAgriTranche1 ? (nonAgriTranche1.coverage || '') : '',
                nonAgriTranche2 ? (nonAgriTranche2.amount || '') : '',
                nonAgriTranche2 ? (nonAgriTranche2.effectiveDate || '') : '',
                nonAgriTranche2 ? (nonAgriTranche2.coverage || '') : '',
                // Agriculture
                agriTranche1 ? (agriTranche1.amount || 0) : (agriRate.amount || 0),
                agriTranche1 ? (agriTranche1.coverage || '') : (agriRate.coverage || ''),
                agriTranche1 ? (agriTranche1.amount || '') : '',
                agriTranche1 ? (agriTranche1.effectiveDate || '') : '',
                agriTranche1 ? (agriTranche1.coverage || '') : '',
                agriTranche2 ? (agriTranche2.amount || '') : '',
                agriTranche2 ? (agriTranche2.effectiveDate || '') : '',
                agriTranche2 ? (agriTranche2.coverage || '') : '',
                region.notes || ''
            ];
            
            wsData.push(row);
        });
        
        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Set column widths
        const colWidths = [
            { wch: 12 }, // Region ID
            { wch: 25 }, // Region Name
            { wch: 15 }, // Wage Order
            { wch: 15 }, // Date Effective
            { wch: 18 }, // Non-Agriculture Rate
            { wch: 30 }, // Non-Agriculture Coverage
            { wch: 20 }, // Non-Agriculture Tranche 1 Amount
            { wch: 15 }, // Non-Agriculture Tranche 1 Date
            { wch: 25 }, // Non-Agriculture Tranche 1 Coverage
            { wch: 20 }, // Non-Agriculture Tranche 2 Amount
            { wch: 15 }, // Non-Agriculture Tranche 2 Date
            { wch: 25 }, // Non-Agriculture Tranche 2 Coverage
            { wch: 18 }, // Agriculture Rate
            { wch: 30 }, // Agriculture Coverage
            { wch: 20 }, // Agriculture Tranche 1 Amount
            { wch: 15 }, // Agriculture Tranche 1 Date
            { wch: 25 }, // Agriculture Tranche 1 Coverage
            { wch: 20 }, // Agriculture Tranche 2 Amount
            { wch: 15 }, // Agriculture Tranche 2 Date
            { wch: 25 }, // Agriculture Tranche 2 Coverage
            { wch: 40 }  // Notes
        ];
        ws['!cols'] = colWidths;
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Wage Rates');
        
        // Add metadata sheet
        const metadataData = [
            ['Wage Rates Data Export'],
            [''],
            ['Export Information'],
            ['Export Date:', new Date().toLocaleString()],
            ['Total Regions:', wageData.regions.length],
            ['Last Updated:', wageData.lastUpdated || 'N/A'],
            [''],
            ['Data Structure'],
            ['Region ID: Unique identifier for the region'],
            ['Region Name: Full name of the region'],
            ['Wage Order: Official wage order number'],
            ['Date Effective: Date when rates take effect'],
            ['Non-Agriculture Rate: Daily wage for non-agricultural workers'],
            ['Agriculture Rate: Daily wage for agricultural workers'],
            ['Tranche 1: Current or first tranche'],
            ['Tranche 2: Upcoming or second tranche (if applicable)'],
            [''],
            ['Notes: Additional information about the region']
        ];
        
        const metadataWs = XLSX.utils.aoa_to_sheet(metadataData);
        const metadataColWidths = [
            { wch: 25 },
            { wch: 50 }
        ];
        metadataWs['!cols'] = metadataColWidths;
        XLSX.utils.book_append_sheet(wb, metadataWs, 'Instructions');
        
        // Generate filename with date
        const fileName = `wage-rates-${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Download the file
        XLSX.writeFile(wb, fileName);
        
        // Update last export date
        lastExportDate.textContent = formatDate(new Date().toISOString().split('T')[0]);
    }

    // Download template CSV
    function downloadTemplate() {
        const template = 'Region ID,Region Name,Wage Order,Date Effective,Non-Agriculture Rate,Non-Agriculture Coverage,Agriculture Rate,Agriculture Coverage,Notes\n';
        const templateBlob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(templateBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'wage-rates-template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Download Excel template
    function downloadExcelTemplate() {
        // Create template data with sample rows
        const templateData = [
            [
                'Region ID',
                'Region Name',
                'Wage Order',
                'Date Effective',
                'Non-Agriculture Rate',
                'Non-Agriculture Coverage',
                'Non-Agriculture Tranche 1 Amount',
                'Non-Agriculture Tranche 1 Date',
                'Non-Agriculture Tranche 1 Coverage',
                'Non-Agriculture Tranche 2 Amount',
                'Non-Agriculture Tranche 2 Date',
                'Non-Agriculture Tranche 2 Coverage',
                'Agriculture Rate',
                'Agriculture Coverage',
                'Agriculture Tranche 1 Amount',
                'Agriculture Tranche 1 Date',
                'Agriculture Tranche 1 Coverage',
                'Agriculture Tranche 2 Amount',
                'Agriculture Tranche 2 Date',
                'Agriculture Tranche 2 Coverage',
                'Notes'
            ],
            // Sample data rows
            [
                'ncr',
                'National Capital Region',
                'RB-01',
                '2024-01-01',
                570,
                'All workers',
                570,
                '2024-01-01',
                'All workers',
                600,
                '2024-06-01',
                'All workers',
                525,
                'Agricultural workers',
                550,
                '2024-06-01',
                'Agricultural workers',
                '',
                '',
                '',
                'Sample region with multi-tranche rates'
            ],
            [
                'region1',
                'Sample Region',
                'RB-02',
                '2024-02-01',
                450,
                'All workers',
                '',
                '',
                '',
                '',
                '',
                '',
                400,
                'Agricultural workers',
                '',
                '',
                '',
                '',
                '',
                '',
                'Sample region with single rates'
            ]
        ];
        
        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(templateData);
        
        // Set column widths
        const colWidths = [
            { wch: 12 }, // Region ID
            { wch: 25 }, // Region Name
            { wch: 15 }, // Wage Order
            { wch: 15 }, // Date Effective
            { wch: 18 }, // Non-Agriculture Rate
            { wch: 30 }, // Non-Agriculture Coverage
            { wch: 20 }, // Non-Agriculture Tranche 1 Amount
            { wch: 15 }, // Non-Agriculture Tranche 1 Date
            { wch: 25 }, // Non-Agriculture Tranche 1 Coverage
            { wch: 20 }, // Non-Agriculture Tranche 2 Amount
            { wch: 15 }, // Non-Agriculture Tranche 2 Date
            { wch: 25 }, // Non-Agriculture Tranche 2 Coverage
            { wch: 18 }, // Agriculture Rate
            { wch: 30 }, // Agriculture Coverage
            { wch: 20 }, // Agriculture Tranche 1 Amount
            { wch: 15 }, // Agriculture Tranche 1 Date
            { wch: 25 }, // Agriculture Tranche 1 Coverage
            { wch: 20 }, // Agriculture Tranche 2 Amount
            { wch: 15 }, // Agriculture Tranche 2 Date
            { wch: 25 }, // Agriculture Tranche 2 Coverage
            { wch: 40 }  // Notes
        ];
        ws['!cols'] = colWidths;
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        
        // Add instructions sheet
        const instructionsData = [
            ['Wage Rates Template Instructions'],
            [''],
            ['How to Use This Template'],
            ['1. Fill in the "Template" sheet with your wage rate data'],
            ['2. Required fields: Region ID, Region Name, Wage Order, Date Effective'],
            ['3. At least Non-Agriculture Rate or Agriculture Rate is required'],
            ['4. Save the file and upload it using the Import function'],
            [''],
            ['Field Descriptions'],
            ['Region ID: Unique identifier (e.g., ncr, region1, car)'],
            ['Region Name: Full name of the region'],
            ['Wage Order: Official wage order number (e.g., RB-01)'],
            ['Date Effective: Date when rates take effect (YYYY-MM-DD)'],
            [''],
            ['Rate Information'],
            ['Non-Agriculture Rate: Daily wage for non-agricultural workers'],
            ['Agriculture Rate: Daily wage for agricultural workers'],
            [''],
            ['Tranche Information (Optional)'],
            ['Tranche 1: Current or first tranche'],
            ['Tranche 2: Upcoming or second tranche'],
            ['Leave tranche fields empty if not using tranches'],
            [''],
            ['Sample Data'],
            ['See the Template sheet for example entries'],
            ['Delete sample rows before adding your data'],
            [''],
            ['Important Notes'],
            ['- Do not modify the header row'],
            ['- Use numeric values for rates (no currency symbols)'],
            ['- Date format should be YYYY-MM-DD'],
            ['- Region ID must be unique'],
            ['- Empty cells will be ignored during import']
        ];
        
        const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
        const instructionsColWidths = [
            { wch: 30 },
            { wch: 60 }
        ];
        instructionsWs['!cols'] = instructionsColWidths;
        XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');
        
        // Download the file
        XLSX.writeFile(wb, 'wage-rates-template.xlsx');
    }

    // Handle file upload
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const fileName = file.name.toLowerCase();
        const fileExtension = fileName.split('.').pop();
        
        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            // Handle Excel file
            handleExcelUpload(file);
        } else {
            // Handle JSON/CSV files
            handleTextFileUpload(file, fileExtension);
        }
    }

    // Handle Excel file upload
    function handleExcelUpload(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Get the first worksheet
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                // Convert to JSON with date formatting
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                    header: 1,
                    dateNF: 'yyyy-mm-dd',
                    raw: false
                });
                
                // Process the data
                const regions = processExcelData(jsonData);
                
                if (regions.length > 0) {
                    importData = { regions };
                    showImportPreview(importData);
                } else {
                    throw new Error('No valid data found in Excel file');
                }
                
            } catch (error) {
                importWarning.classList.remove('d-none');
                importWarningText.textContent = 'Excel file error: ' + error.message;
                uploadFileBtn.disabled = true;
            }
        };
        
        reader.readAsArrayBuffer(file);
    }

    // Convert Excel date number to formatted date string
    function convertExcelDate(excelDate) {
        if (!excelDate) return '';
        
        // If it's already a string, return as is
        if (typeof excelDate === 'string') return excelDate;
        
        // If it's a number, convert from Excel serial date
        if (typeof excelDate === 'number') {
            // Excel dates start from 1900-01-01, but there's a bug where 1900 is treated as a leap year
            // So we need to adjust for this
            const date = new Date((excelDate - 25569) * 86400 * 1000);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        // If it's a Date object, format it
        if (excelDate instanceof Date) {
            const year = excelDate.getFullYear();
            const month = String(excelDate.getMonth() + 1).padStart(2, '0');
            const day = String(excelDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        return '';
    }

    // Process Excel data into regions format
    function processExcelData(jsonData) {
        if (jsonData.length < 2) {
            throw new Error('Excel file must have at least a header row and one data row');
        }
        
        const headers = jsonData[0];
        const regions = [];
        
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            // Skip empty rows
            if (row.every(cell => !cell || cell === '')) continue;
            
            const region = {
                id: row[0] || '',
                name: row[1] || '',
                wageOrder: row[2] || '',
                dateEffective: convertExcelDate(row[3]) || '',
                rates: [],
                notes: row[20] || ''
            };
            
            // Process Non-Agriculture rates
            const nonAgriRate = processRateData(row, 4, 'Non-Agriculture');
            if (nonAgriRate) {
                region.rates.push(nonAgriRate);
            }
            
            // Process Agriculture rates
            const agriRate = processRateData(row, 12, 'Agriculture');
            if (agriRate) {
                region.rates.push(agriRate);
            }
            
            // Only add region if it has valid data
            if (region.id && region.name && region.wageOrder && region.dateEffective) {
                regions.push(region);
            }
        }
        
        return regions;
    }

    // Process rate data from Excel row
    function processRateData(row, startIndex, type) {
        const currentAmount = row[startIndex];
        const currentCoverage = row[startIndex + 1];
        const tranche1Amount = row[startIndex + 2];
        const tranche1Date = convertExcelDate(row[startIndex + 3]);
        const tranche1Coverage = row[startIndex + 4];
        const tranche2Amount = row[startIndex + 5];
        const tranche2Date = convertExcelDate(row[startIndex + 6]);
        const tranche2Coverage = row[startIndex + 7];
        
        // Check if we have any rate data
        const hasRate = currentAmount || tranche1Amount || tranche2Amount;
        if (!hasRate) return null;
        
        const rate = { type: type };
        
        // Check for tranches
        if (tranche1Amount || tranche2Amount) {
            rate.tranches = [];
            
            // Add tranche 1 (current)
            if (tranche1Amount) {
                rate.tranches.push({
                    amount: parseFloat(tranche1Amount) || 0,
                    effectiveDate: tranche1Date || '',
                    coverage: tranche1Coverage || '',
                    status: 'current'
                });
            }
            
            // Add tranche 2 (upcoming)
            if (tranche2Amount) {
                rate.tranches.push({
                    amount: parseFloat(tranche2Amount) || 0,
                    effectiveDate: tranche2Date || '',
                    coverage: tranche2Coverage || '',
                    status: 'upcoming'
                });
            }
        } else {
            // Single rate
            rate.amount = parseFloat(currentAmount) || 0;
            rate.coverage = currentCoverage || '';
        }
        
        return rate;
    }

    // Handle text file upload (JSON/CSV)
    function handleTextFileUpload(file, fileExtension) {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                let data;
                
                if (fileExtension === 'json') {
                    data = JSON.parse(e.target.result);
                } else if (fileExtension === 'csv') {
                    data = parseCSV(e.target.result);
                } else {
                    throw new Error('Unsupported file format');
                }
                
                // Validate data structure
                if (!data.regions || !Array.isArray(data.regions)) {
                    throw new Error('Invalid data structure. Expected regions array.');
                }
                
                importData = data;
                showImportPreview(data);
                
            } catch (error) {
                importWarning.classList.remove('d-none');
                importWarningText.textContent = error.message;
                uploadFileBtn.disabled = true;
            }
        };
        
        reader.readAsText(file);
    }

    // Parse CSV data
    function parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        const regions = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            
            if (values.length >= 9) {
                const region = {
                    id: values[0] || '',
                    name: values[1] || '',
                    wageOrder: values[2] || '',
                    dateEffective: values[3] || '',
                    rates: [
                        {
                            type: 'Non-Agriculture',
                            amount: parseFloat(values[4]) || 0,
                            coverage: values[5] || ''
                        }
                    ],
                    notes: values[8] || ''
                };
                
                // Add agriculture rate if provided
                if (values[6] && parseFloat(values[6]) > 0) {
                    region.rates.push({
                        type: 'Agriculture',
                        amount: parseFloat(values[6]) || 0,
                        coverage: values[7] || ''
                    });
                }
                
                regions.push(region);
            }
        }
        
        return { regions };
    }

    // Show import preview
    function showImportPreview(data) {
        importPreviewBody.innerHTML = '';
        
        data.regions.forEach((region, index) => {
            const nonAgriRate = region.rates.find(r => r.type === 'Non-Agriculture') || {};
            const agriRate = region.rates.find(r => r.type === 'Agriculture');
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${region.name}</td>
                <td>${region.wageOrder}</td>
                <td>₱${(nonAgriRate.amount || 0).toLocaleString()}</td>
                <td>${agriRate ? `₱${(agriRate.amount || 0).toLocaleString()}` : 'N/A'}</td>
                <td>${formatDate(region.dateEffective)}</td>
                <td><span class="badge bg-success">Ready</span></td>
            `;
            importPreviewBody.appendChild(row);
        });
        
        importPreviewCard.classList.remove('d-none');
        uploadFileBtn.disabled = false;
        importWarning.classList.add('d-none');
    }

    // Confirm import
    async function confirmImport() {
        if (!importData) return;
        
        // Create backup
        const backupData = JSON.parse(JSON.stringify(wageData));
        
        try {
            // Replace current data with imported data
            wageData = importData;
            
            // Save to server
            const success = await saveWageData();
            
            if (success) {
                // Update UI
                renderRegionsTable();
                showRegionsList();
                
                // Reset import form
                importData = null;
                importFileInput.value = '';
                importPreviewCard.classList.add('d-none');
                uploadFileBtn.disabled = true;
                
                showAdminNotification('Data imported successfully!', 'success');
            } else {
                // Restore backup on failure
                wageData = backupData;
                throw new Error('Failed to save imported data');
            }
        } catch (error) {
            // Restore backup on error
            wageData = backupData;
            importWarning.classList.remove('d-none');
            importWarningText.textContent = 'Import failed: ' + error.message;
        }
    }

    // Cancel import
    function cancelImport() {
        importData = null;
        importFileInput.value = '';
        importPreviewCard.classList.add('d-none');
        uploadFileBtn.disabled = true;
        importWarning.classList.add('d-none');
    }

    // Set up event listeners
    function setupEventListeners() {
        // Navigation
        regionsTab.addEventListener('click', showRegionsList);
        addRegionTab.addEventListener('click', showAddRegionForm);
        importExportTab.addEventListener('click', showImportExport);
        cancelEditBtn.addEventListener('click', showRegionsList);
        
        // Form submission
        regionForm.addEventListener('submit', handleFormSubmit);
        
        // Save changes button
        saveChangesBtn.addEventListener('click', async () => {
            const success = await saveWageData();
            if (success) {
                renderRegionsTable();
            }
        });
        
        // Import/Export buttons
        downloadJsonBtn.addEventListener('click', downloadJSON);
        downloadCsvBtn.addEventListener('click', downloadCSV);
        downloadExcelBtn.addEventListener('click', downloadExcel);
        downloadTemplateBtn.addEventListener('click', downloadTemplate);
        downloadExcelTemplateBtn.addEventListener('click', downloadExcelTemplate);
        
        // File upload
        importFileInput.addEventListener('change', handleFileUpload);
        uploadFileBtn.addEventListener('click', () => {
            if (importData) {
                showImportPreview(importData);
            }
        });
        
        // Import preview buttons
        cancelImportBtn.addEventListener('click', cancelImport);
        confirmImportBtn.addEventListener('click', confirmImport);
        
        // Toggle agriculture fields
        enableAgriToggle.addEventListener('change', (e) => {
            agriFields.style.display = e.target.checked ? 'block' : 'none';
            
            // Handle single agriculture fields
            if (agriAmountInput) {
                agriAmountInput.required = e.target.checked;
            }
            if (agriCoverageInput) {
                agriCoverageInput.required = e.target.checked;
            }
            
            // Handle agriculture tranche fields
            const agriTranche1Amount = document.getElementById('agri-tranche1-amount');
            const agriTranche1Coverage = document.getElementById('agri-tranche1-coverage');
            const agriTranche2Amount = document.getElementById('agri-tranche2-amount');
            const agriTranche2Coverage = document.getElementById('agri-tranche2-coverage');
            
            if (agriTranche1Amount) {
                agriTranche1Amount.required = e.target.checked && enableAgriTranchesToggle.checked;
            }
            if (agriTranche1Coverage) {
                agriTranche1Coverage.required = e.target.checked && enableAgriTranchesToggle.checked;
            }
            if (agriTranche2Amount) {
                agriTranche2Amount.required = e.target.checked && enableAgriTranchesToggle.checked;
            }
            if (agriTranche2Coverage) {
                agriTranche2Coverage.required = e.target.checked && enableAgriTranchesToggle.checked;
            }
        });
        
        // Toggle tranche fields for Non-Agriculture
        enableNonAgriTranchesToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                nonAgriSingle.style.display = 'none';
                nonAgriTranches.style.display = 'block';
                nonAgriAmountInput.required = false;
                nonAgriCoverageInput.required = false;
            } else {
                nonAgriSingle.style.display = 'block';
                nonAgriTranches.style.display = 'none';
                nonAgriAmountInput.required = true;
                nonAgriCoverageInput.required = true;
            }
        });
        
        // Toggle tranche fields for Agriculture
        enableAgriTranchesToggle.addEventListener('change', (e) => {
            const agriEnabled = enableAgriToggle.checked;
            
            if (e.target.checked) {
                agriSingle.style.display = 'none';
                agriTranches.style.display = 'block';
                agriAmountInput.required = false;
                agriCoverageInput.required = false;
                
                // Set required for tranche fields if agriculture is enabled
                const agriTranche1Amount = document.getElementById('agri-tranche1-amount');
                const agriTranche1Coverage = document.getElementById('agri-tranche1-coverage');
                const agriTranche2Amount = document.getElementById('agri-tranche2-amount');
                const agriTranche2Coverage = document.getElementById('agri-tranche2-coverage');
                
                if (agriTranche1Amount) agriTranche1Amount.required = agriEnabled;
                if (agriTranche1Coverage) agriTranche1Coverage.required = agriEnabled;
                if (agriTranche2Amount) agriTranche2Amount.required = agriEnabled;
                if (agriTranche2Coverage) agriTranche2Coverage.required = agriEnabled;
            } else {
                agriSingle.style.display = 'block';
                agriTranches.style.display = 'none';
                agriAmountInput.required = agriEnabled;
                agriCoverageInput.required = agriEnabled;
                
                // Remove required from tranche fields
                const agriTranche1Amount = document.getElementById('agri-tranche1-amount');
                const agriTranche1Coverage = document.getElementById('agri-tranche1-coverage');
                const agriTranche2Amount = document.getElementById('agri-tranche2-amount');
                const agriTranche2Coverage = document.getElementById('agri-tranche2-coverage');
                
                if (agriTranche1Amount) agriTranche1Amount.required = false;
                if (agriTranche1Coverage) agriTranche1Coverage.required = false;
                if (agriTranche2Amount) agriTranche2Amount.required = false;
                if (agriTranche2Coverage) agriTranche2Coverage.required = false;
            }
        });
        
        // Handle edit/delete buttons (delegated events)
        regionsTableBody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (!row) return;
            
            const index = parseInt(row.dataset.index);
            if (isNaN(index)) return;
            
            if (e.target.closest('.edit-region')) {
                e.preventDefault();
                showEditRegionForm(index);
            } else if (e.target.closest('.delete-region')) {
                e.preventDefault();
                regionToDelete = index;
                const modal = new bootstrap.Modal(document.getElementById('confirm-delete-modal'));
                modal.show();
            }
        });
        
        // Confirm delete
        document.getElementById('confirm-delete').addEventListener('click', async () => {
            if (regionToDelete !== null) {
                await deleteRegion(regionToDelete);
                regionToDelete = null;
                const modal = bootstrap.Modal.getInstance(document.getElementById('confirm-delete-modal'));
                modal.hide();
            }
        });
    }

    // Initialize the admin interface
    init();
});
