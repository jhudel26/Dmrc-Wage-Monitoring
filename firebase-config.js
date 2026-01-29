// Firebase Configuration for Wage Rates App
// Direct CDN loading approach

// Prevent multiple script execution
if (window.firebaseConfigLoaded) {
  console.log('Firebase config already loaded, skipping...');
} else {
  window.firebaseConfigLoaded = true;

// Firebase configuration
window.firebaseConfig = {
  apiKey: "AIzaSyA8Qi_tj1C4ksQ0lWh95O3mOvAIp52ZK60",
  authDomain: "wage-rates-app.firebaseapp.com",
  databaseURL: "https://wage-rates-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wage-rates-app",
  storageBucket: "wage-rates-app.firebasestorage.app",
  messagingSenderId: "860749054244",
  appId: "1:860749054244:web:0f20750aff94fb0ee4b3b1"
};

// Initialize Firebase variables (using var to avoid block scope issues)
var database;
var messaging;

// Initialize Firebase function
function initializeFirebase() {
  try {
    console.log('🔧 Initializing Firebase...');
    console.log('Firebase available:', typeof firebase !== 'undefined');
    
    if (typeof firebase === 'undefined') {
      console.error('❌ Firebase SDK not loaded');
      return;
    }
    
    // Initialize Firebase app
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(window.firebaseConfig);
      console.log('✅ Firebase app initialized');
    } else {
      console.log('✅ Firebase app already initialized');
    }
    
    // Get services
    database = firebase.database();
    messaging = firebase.messaging();
    
    console.log('✅ Firebase services ready');
    console.log('- Database:', !!database);
    console.log('- Messaging:', !!messaging);
    
    // Initialize app notifications
    if (window.app && window.app.initializeFirebaseNotifications) {
      window.app.initializeFirebaseNotifications();
    }
    
    // Admin panel ready
    if (window.location.href.includes('admin.html')) {
      console.log('🔥 Firebase ready for admin panel');
    }
    
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
  }
}

// Export functions
window.getFirebaseDatabase = function() { return database; };
window.getFirebaseMessaging = function() { return messaging; };
window.initializeFirebaseServices = initializeFirebase;

// Auto-initialize when Firebase is ready
function checkFirebaseReady() {
  if (typeof firebase !== 'undefined') {
    console.log('🔥 Firebase detected, initializing...');
    initializeFirebase();
  } else {
    console.log('⏳ Waiting for Firebase...');
    setTimeout(checkFirebaseReady, 200); // Reduced delay
  }
}

// Start checking only if not already initialized
if (!window.firebaseInitialized) {
  window.firebaseInitialized = true;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkFirebaseReady);
  } else {
    checkFirebaseReady();
  }
}

} // End of firebaseConfigLoaded check
