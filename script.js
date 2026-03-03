// ==================== CONFIGURATION ====================
// UPDATE THESE WITH YOUR ACTUAL URLs
const CLOUDFLARE_WORKER_URL = 'https://sky-eats-proxy.jjanalystofficial.workers.dev'; // NO trailing slash
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyOlDRyJM-RMtC7kE01MhrQduOmiaKP31gWcVxrf_xvJ-QUCkCoiueCdJz0ytD90Zt2/exec'; // Replace with your Apps Script URL

// ==================== EMAILJS CONFIGURATION ====================
// Get these from your EmailJS dashboard
const EMAILJS_PUBLIC_KEY = '86-3q2DtoKe08Yj1m'; // Replace with your actual key
const EMAILJS_SERVICE_ID = 'service_lck41bm';
const EMAILJS_TEMPLATE_ID = 'template_w5b28t2';

// ==================== DATA STORAGE ====================
let users = JSON.parse(localStorage.getItem('users')) || {};
let orders = JSON.parse(localStorage.getItem('orders')) || [];
let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;
let cart = [];
let sessionTimer;
let warningTimer;
let resetCodes = {};

// Order status sequence
const orderStatusSequence = [
  { key: 'pending', label: 'Order Placed', icon: '📝' },
  { key: 'preparing', label: 'Preparing Order', icon: '👨‍🍳' },
  { key: 'dispatch', label: 'Order Dispatch', icon: '📦' },
  { key: 'pickup', label: 'Order Pick up by rider', icon: '🛵' },
  { key: 'delivered', label: 'Delivered to your doorstep', icon: '✅' }
];

// Promo options
const promoOptions = [
  { value: 'none', label: '❌ None', color: 'none' },
  { value: '50% OFF', label: '🔥 50% OFF', color: 'linear-gradient(135deg, #c62828, #ff5a00)' },
  { value: 'NEW', label: '✨ NEW', color: 'linear-gradient(135deg, #4caf50, #8bc34a)' },
  { value: 'BESTSELLER', label: '🏆 BESTSELLER', color: 'linear-gradient(135deg, #ffa500, #ff8c00)' },
  { value: 'HOT DEAL', label: '🔥 HOT DEAL', color: 'linear-gradient(135deg, #ff4444, #cc0000)' },
  { value: 'LIMITED', label: '⏳ LIMITED', color: 'linear-gradient(135deg, #9370db, #8a2be2)' }
];

// Menu items data
const menuItems = {
  chicken: [
    { name: '6 pcs Wings', price: 200, hasFlavor: true, flavors: ['Cheesy Parmesan', 'Chili Cheese', 'Buffalo Spicy', 'Salted Egg', 'Golden Soy Caramel'] },
    { name: '12 pcs Wings', price: 380, hasFlavor: true, flavors: ['Cheesy Parmesan', 'Chili Cheese', 'Buffalo Spicy', 'Salted Egg', 'Golden Soy Caramel'] },
    { name: '24 pcs Wings', price: 650, hasFlavor: true, flavors: ['Cheesy Parmesan', 'Chili Cheese', 'Buffalo Spicy', 'Salted Egg', 'Golden Soy Caramel'] }
  ],
  sisig: [
    { name: 'Sisig Solo', price: 99, hasAddons: true, addons: [
      { name: 'Egg', price: 20 }, { name: 'Mayo', price: 5 }, { name: 'Sili', price: 5 }, { name: 'Onion', price: 5 }
    ]},
    { name: 'Sisig Barkada', price: 200, hasAddons: true, addons: [
      { name: 'Egg', price: 20 }, { name: 'Mayo', price: 5 }, { name: 'Sili', price: 5 }, { name: 'Onion', price: 5 }
    ]}
  ],
  ricemeal: [
    { name: 'Wings Ricemeal', price: 79, desc: '2 pcs Chicken • 1 Rice', hasFlavor: true, flavors: ['Cheesy Parmesan', 'Chili Cheese', 'Buffalo Spicy', 'Salted Egg', 'Golden Soy Caramel'] },
    { name: 'Sisig Ricemeal', price: 79, desc: 'Sisig • 1 Rice' },
    { name: 'Wings Silog', price: 89, desc: '1 Rice • 2 pcs Chicken • 1 Egg', hasFlavor: true, flavors: ['Cheesy Parmesan', 'Chili Cheese', 'Buffalo Spicy', 'Salted Egg', 'Golden Soy Caramel'] },
    { name: 'Sisig Silog', price: 89, desc: 'Sisig • 1 Rice • 1 Egg' }
  ],
  drinks: [
    { name: 'Iced Tea', price: 35 },
    { name: 'Soda', price: 40 },
    { name: 'Bottled Water', price: 20 }
  ],
  snacks: [
    { name: 'French Fries', price: 60 },
    { name: 'Onion Rings', price: 65 }
  ]
};

// ==================== GLOBAL FUNCTION DECLARATIONS ====================
// Make all functions globally available for HTML onclick attributes
window.showSection = showSection;
window.showOrderHistory = showOrderHistory;
window.showAdminPanel = showAdminPanel;
window.showStockManagement = showStockManagement;
window.updateOrderStatus = updateOrderStatus;
window.filterStockTable = filterStockTable;
window.exportStockReport = exportStockReport;
window.resetAllStock = resetAllStock;
window.updateStock = updateStock;
window.validateStock = validateStock;
window.logout = logout;
window.switchAuthTab = switchAuthTab;
window.togglePassword = togglePassword;
window.handleSignup = handleSignup;
window.handleLogin = handleLogin;
window.showForgotPassword = showForgotPassword;
window.closeForgotModal = closeForgotModal;
window.backToStep1 = backToStep1;
window.sendResetCode = sendResetCode;
window.resetPassword = resetPassword;

// ==================== DOM ELEMENTS ====================
let cartItems, cartSubtotalSpan, deliveryFeeSpan, cartTotalSpan, citySelect, placeOrderBtn;
let reviewModal, reviewDetails, editOrderBtn, confirmOrderBtn, totalPayMsg;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 SkyEats Initializing...');
  
  // Initialize EmailJS
  try {
    if (typeof emailjs !== 'undefined') {
      emailjs.init(EMAILJS_PUBLIC_KEY);
      console.log('✅ EmailJS initialized');
    }
  } catch (error) {
    console.warn('⚠️ EmailJS init failed:', error);
  }
  
  // Initialize DOM elements
  cartItems = document.getElementById("cart-items");
  cartSubtotalSpan = document.getElementById("cart-subtotal");
  deliveryFeeSpan = document.getElementById("delivery-fee");
  cartTotalSpan = document.getElementById("cart-total");
  citySelect = document.getElementById("cust-city");
  placeOrderBtn = document.getElementById("place-order");
  reviewModal = document.getElementById("review-modal");
  reviewDetails = document.getElementById("review-details");
  editOrderBtn = document.getElementById("edit-order");
  confirmOrderBtn = document.getElementById("confirm-order");
  totalPayMsg = document.getElementById("total-pay-msg");

  // Initialize stock from localStorage or set defaults
  initializeStock();
  
  renderMenuItems();
  
  // Check if user is logged in
  if (currentUser) {
    hideAuthModal();
    updateUIForLoggedInUser();
    startSessionTimer();
    
    // Auto-fill saved info
    document.getElementById('cust-name').value = currentUser.name || '';
    document.getElementById('cust-contact').value = currentUser.phone || '';
    document.getElementById('cust-address').value = currentUser.address || '';
    if (currentUser.city) {
      document.getElementById('cust-city').value = currentUser.city;
    }
  } else {
    showAuthModal();
  }

  // Event listeners
  citySelect.addEventListener("change", function() {
    updateCartDisplay();
  });

  placeOrderBtn.addEventListener("click", placeOrder);
  editOrderBtn.addEventListener("click", function() {
    reviewModal.style.display = "none";
  });
  confirmOrderBtn.addEventListener("click", confirmOrder);

  window.addEventListener("click", function(event) {
    if (event.target === reviewModal) {
      reviewModal.style.display = "none";
    }
    if (event.target === document.getElementById('forgot-modal')) {
      closeForgotModal();
    }
  });

  updateCartDisplay();
  
  // Test API connection
  testAPIConnection();
});

// ==================== API FUNCTIONS ====================

/**
 * Show loading spinner
 */
function showLoading() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) spinner.style.display = 'flex';
}

/**
 * Hide loading spinner
 */
function hideLoading() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) spinner.style.display = 'none';
}

/**
 * Make API request to Cloudflare Worker
 */
async function apiRequest(endpoint, method = 'GET', data = null) {
  showLoading();
  try {
    // Clean URLs
    let baseUrl = CLOUDFLARE_WORKER_URL;
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    
    if (endpoint.startsWith('/')) endpoint = endpoint.slice(1);
    
    const url = `${baseUrl}/${endpoint}`;
    console.log(`📡 API ${method}: ${url}`, data);
    
    const options = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
    };
    
    if (data) options.body = JSON.stringify(data);
    
    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    options.signal = controller.signal;
    
    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    console.log('📡 API Response:', result);
    
    hideLoading();
    return result;
    
  } catch (error) {
    hideLoading();
    console.error('❌ API Error:', error);
    
    // Fallback to local storage
    return { 
      status: 'error', 
      message: error.message,
      fallback: true,
      offline: true
    };
  }
}

/**
 * Make request to Apps Script (direct fallback)
 */
async function appsScriptRequest(action, data = {}) {
  showLoading();
  try {
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append('action', action);
    
    console.log(`📡 Apps Script ${action}:`, data);
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data })
    });
    
    const result = await response.json();
    console.log('📡 Apps Script Response:', result);
    
    hideLoading();
    return result;
    
  } catch (error) {
    hideLoading();
    console.error('❌ Apps Script Error:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Test API connection
 */
async function testAPIConnection() {
  console.log('🔍 Testing API connections...');
  
  // Test Cloudflare Worker
  try {
    const workerTest = await apiRequest('test', 'GET');
    if (workerTest.status === 'ok') {
      console.log('✅ Cloudflare Worker connected');
    } else {
      console.warn('⚠️ Cloudflare Worker test failed');
    }
  } catch (error) {
    console.warn('⚠️ Cloudflare Worker not reachable');
  }
  
  // Test Apps Script
  try {
    const scriptTest = await appsScriptRequest('test');
    if (scriptTest.status === 'success') {
      console.log('✅ Apps Script connected');
    } else {
      console.warn('⚠️ Apps Script test failed');
    }
  } catch (error) {
    console.warn('⚠️ Apps Script not reachable');
  }
}

// ==================== AUTHENTICATION FUNCTIONS ====================

/**
 * Handle signup
 */
async function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const phone = document.getElementById('signup-phone').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const address = document.getElementById('signup-address').value.trim();
  const city = document.getElementById('signup-city').value;
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;
  
  if (!name || !phone || !email || !address || !city || !password) {
    alert('Please fill in all fields');
    return;
  }
  
  if (password !== confirmPassword) {
    document.getElementById('password-error').textContent = 'Passwords do not match';
    return;
  }
  
  if (password.length < 6) {
    alert('Password must be at least 6 characters');
    return;
  }
  
  const userData = {
    phone,
    name,
    email,
    address,
    city,
    password,
    isAdmin: phone === '09123456789'
  };
  
  // Try Cloudflare Worker first
  let result = await apiRequest('api/users', 'POST', userData);
  
  if (result.status === 'success' || result.offline) {
    // Save to localStorage as backup
    users[phone] = userData;
    localStorage.setItem('users', JSON.stringify(users));
    
    currentUser = userData;
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    document.getElementById('cust-name').value = name;
    document.getElementById('cust-contact').value = phone;
    document.getElementById('cust-address').value = address;
    document.getElementById('cust-city').value = city;
    
    hideAuthModal();
    updateUIForLoggedInUser();
    startSessionTimer();
    alert('✅ Sign up successful! Welcome to Sky Eats!');
  } else {
    alert('❌ Error: ' + (result.message || 'Could not create account'));
  }
}

/**
 * Handle login
 */
async function handleLogin() {
  const phone = document.getElementById('login-phone').value.trim();
  const password = document.getElementById('login-password').value;
  
  if (!phone || !password) {
    alert('Please enter phone and password');
    return;
  }
  
  // Try Cloudflare Worker first
  let result = await apiRequest(`api/users?phone=${phone}`, 'GET');
  
  if (result.status === 'error' && result.offline) {
    // Fallback to Apps Script login
    result = await appsScriptRequest('login', { phone, password });
  }
  
  if (result.status === 'success' && result.user) {
    const user = result.user;
    
    if (user.password === password || result.status === 'success') {
      currentUser = user;
      sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      document.getElementById('cust-name').value = user.name || '';
      document.getElementById('cust-contact').value = user.phone || '';
      document.getElementById('cust-address').value = user.address || '';
      if (user.city) {
        document.getElementById('cust-city').value = user.city;
      }
      
      hideAuthModal();
      updateUIForLoggedInUser();
      startSessionTimer();
      alert('✅ Login successful!');
    } else {
      alert('❌ Invalid password');
    }
  } else {
    // Fallback to localStorage
    const user = users[phone];
    if (user && user.password === password) {
      currentUser = user;
      sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      document.getElementById('cust-name').value = user.name || '';
      document.getElementById('cust-contact').value = user.phone || '';
      document.getElementById('cust-address').value = user.address || '';
      if (user.city) {
        document.getElementById('cust-city').value = user.city;
      }
      
      hideAuthModal();
      updateUIForLoggedInUser();
      startSessionTimer();
    } else {
      alert('❌ Phone number not found or invalid password');
    }
  }
}

/**
 * Logout user
 */
function logout() {
  currentUser = null;
  sessionStorage.removeItem('currentUser');
  cart = [];
  updateCartDisplay();
  showAuthModal();
  updateUIForLoggedOutUser();
  clearInterval(sessionTimer);
  clearInterval(warningTimer);
  document.getElementById('session-warning').style.display = 'none';
  showSection('all');
}

/**
 * Show auth modal
 */
function showAuthModal() {
  document.getElementById('auth-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

/**
 * Hide auth modal
 */
function hideAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
  document.body.style.overflow = 'auto';
}

/**
 * Update UI for logged in user
 */
function updateUIForLoggedInUser() {
  document.getElementById('user-info-sidebar').style.display = 'block';
  document.getElementById('sidebar-user-name').textContent = `👤 ${currentUser.name}`;
  document.getElementById('sidebar-user-phone').textContent = `📱 ${currentUser.phone}`;
  
  document.getElementById('cust-name').readOnly = false;
  document.getElementById('cust-contact').readOnly = false;
  document.getElementById('cust-city').disabled = false;
  document.getElementById('cust-address').readOnly = false;
  document.getElementById('place-order').disabled = false;
  document.getElementById('place-order').textContent = '📦 Place Order';
  
  document.getElementById('logout-btn').style.display = 'block';
  document.getElementById('history-link').style.display = 'block';
  
  if (currentUser.isAdmin) {
    document.getElementById('admin-link').style.display = 'block';
    document.getElementById('stock-link').style.display = 'block';
  }
  
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.disabled = false;
  });
}

/**
 * Update UI for logged out user
 */
function updateUIForLoggedOutUser() {
  document.getElementById('user-info-sidebar').style.display = 'none';
  document.getElementById('logout-btn').style.display = 'none';
  document.getElementById('history-link').style.display = 'none';
  document.getElementById('admin-link').style.display = 'none';
  document.getElementById('stock-link').style.display = 'none';
  
  document.getElementById('place-order').disabled = true;
  document.getElementById('place-order').textContent = '🔒 Login to Order';
  
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.disabled = true;
  });
  
  document.getElementById('cust-name').value = '';
  document.getElementById('cust-contact').value = '';
  document.getElementById('cust-address').value = '';
  document.getElementById('cust-city').selectedIndex = 0;
}

/**
 * Switch auth tab
 */
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  
  if (tab === 'login') {
    document.querySelector('[onclick="switchAuthTab(\'login\')"]').classList.add('active');
    document.getElementById('login-form').classList.add('active');
  } else {
    document.querySelector('[onclick="switchAuthTab(\'signup\')"]').classList.add('active');
    document.getElementById('signup-form').classList.add('active');
  }
}

/**
 * Toggle password visibility
 */
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
}

// ==================== FORGOT PASSWORD FUNCTIONS ====================

/**
 * Show forgot password modal
 */
function showForgotPassword() {
  document.getElementById('auth-modal').style.display = 'none';
  document.getElementById('forgot-modal').style.display = 'flex';
  document.getElementById('forgot-step1').style.display = 'block';
  document.getElementById('forgot-step2').style.display = 'none';
  document.getElementById('forgot-message').innerHTML = '';
}

/**
 * Close forgot password modal
 */
function closeForgotModal() {
  document.getElementById('forgot-modal').style.display = 'none';
  document.getElementById('auth-modal').style.display = 'flex';
}

/**
 * Back to step 1 of forgot password
 */
function backToStep1() {
  document.getElementById('forgot-step1').style.display = 'block';
  document.getElementById('forgot-step2').style.display = 'none';
}

/**
 * Send reset code
 */
async function sendResetCode() {
  const phone = document.getElementById('forgot-phone').value.trim();
  const email = document.getElementById('forgot-email').value.trim();
  const messageDiv = document.getElementById('forgot-message');
  
  if (!phone || !email) {
    messageDiv.innerHTML = '<div class="error-message">Please enter phone and email</div>';
    return;
  }
  
  // Check user exists in localStorage
  const user = users[phone];
  
  if (user && user.email === email) {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 15 * 60 * 1000;
    
    // Store code in memory
    resetCodes[phone] = {
      code,
      email,
      expiry
    };
    
    messageDiv.innerHTML = '<div class="success-message">Sending reset code...</div>';
    
    try {
      // Check if EmailJS is available
      if (typeof emailjs === 'undefined' || EMAILJS_PUBLIC_KEY === 'YOUR_ACTUAL_PUBLIC_KEY') {
        // Fallback - show code directly
        messageDiv.innerHTML = `
          <div class="success-message">
            ⚠️ Email service not configured<br>
            <strong>Your reset code is: ${code}</strong><br>
            <small>Please use this code to reset your password</small>
          </div>
        `;
        
        setTimeout(() => {
          document.getElementById('forgot-step1').style.display = 'none';
          document.getElementById('forgot-step2').style.display = 'block';
        }, 2000);
        return;
      }
      
      // Send email via EmailJS
      const templateParams = {
        to_email: email,
        from_name: 'Sky Eats',
        user_name: user.name || 'Customer',
        reset_code: code,
        user_phone: phone,
        message: `Your password reset code is: ${code}. This code will expire in 15 minutes.`
      };
      
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      );
      
      if (response.status === 200) {
        messageDiv.innerHTML = `
          <div class="success-message">
            ✅ Reset code sent to ${email}<br>
            <small>Please check your inbox (also check spam folder)</small>
          </div>
        `;
        
        setTimeout(() => {
          document.getElementById('forgot-step1').style.display = 'none';
          document.getElementById('forgot-step2').style.display = 'block';
          messageDiv.innerHTML = '';
        }, 2000);
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('EmailJS Error:', error);
      
      // Fallback - show code directly
      messageDiv.innerHTML = `
        <div class="success-message">
          ⚠️ Email service unavailable<br>
          <strong>Your reset code is: ${code}</strong><br>
          <small>Please use this code to reset your password</small>
        </div>
      `;
      
      setTimeout(() => {
        document.getElementById('forgot-step1').style.display = 'none';
        document.getElementById('forgot-step2').style.display = 'block';
        messageDiv.innerHTML = '';
      }, 2000);
    }
  } else {
    messageDiv.innerHTML = '<div class="error-message">Phone number or email not registered</div>';
  }
}

/**
 * Reset password
 */
async function resetPassword() {
  const phone = document.getElementById('forgot-phone').value.trim();
  const code = document.getElementById('verification-code').value.trim();
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-new-password').value;
  const messageDiv = document.getElementById('forgot-message');
  
  if (!code || !newPassword || !confirmPassword) {
    alert('Please fill in all fields');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }
  
  if (newPassword.length < 6) {
    alert('Password must be at least 6 characters');
    return;
  }
  
  const resetData = resetCodes[phone];
  
  if (!resetData) {
    alert('No reset code found. Please request again.');
    backToStep1();
    return;
  }
  
  if (Date.now() > resetData.expiry) {
    alert('Reset code has expired. Please request again.');
    delete resetCodes[phone];
    backToStep1();
    return;
  }
  
  if (resetData.code !== code) {
    alert('Invalid verification code');
    return;
  }
  
  messageDiv.innerHTML = '<div class="success-message">Updating password...</div>';
  
  try {
    // Try Cloudflare Worker first
    let updateResult = await apiRequest('api/users', 'PUT', {
      phone: phone,
      password: newPassword
    });
    
    if (updateResult.status === 'error' && updateResult.offline) {
      // Fallback to Apps Script
      updateResult = await appsScriptRequest('updatePassword', {
        phone,
        newPassword
      });
    }
    
    if (updateResult.status === 'success') {
      // Update localStorage
      if (users[phone]) {
        users[phone].password = newPassword;
        localStorage.setItem('users', JSON.stringify(users));
      }
      
      messageDiv.innerHTML = `
        <div class="success-message">
          ✅ Password updated successfully!<br>
          <small>Redirecting to login...</small>
        </div>
      `;
      
      delete resetCodes[phone];
      
      setTimeout(() => {
        closeForgotModal();
        document.getElementById('forgot-phone').value = '';
        document.getElementById('forgot-email').value = '';
        document.getElementById('verification-code').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-new-password').value = '';
        switchAuthTab('login');
      }, 2000);
    } else {
      messageDiv.innerHTML = '<div class="error-message">Failed to update password. Please try again.</div>';
    }
  } catch (error) {
    console.error('Password update error:', error);
    messageDiv.innerHTML = '<div class="error-message">Error updating password. Please try again.</div>';
  }
}

// ==================== SESSION MANAGEMENT ====================

/**
 * Start session timer
 */
function startSessionTimer() {
  let timeLeft = 120 * 60; // 2 hours in seconds
  const warningTime = 5 * 60; // 5 minutes
  
  clearInterval(sessionTimer);
  clearInterval(warningTimer);
  
  sessionTimer = setInterval(() => {
    timeLeft--;
    
    if (timeLeft <= warningTime && timeLeft > 0) {
      showSessionWarning(timeLeft);
    }
    
    if (timeLeft <= 0) {
      clearInterval(sessionTimer);
      clearInterval(warningTimer);
      logout();
      alert('Session expired. Please login again.');
    }
  }, 1000);
}

/**
 * Show session warning
 */
function showSessionWarning(secondsLeft) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  document.getElementById('session-timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  document.getElementById('session-warning').style.display = 'block';
  
  clearInterval(warningTimer);
  warningTimer = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(warningTimer);
      document.getElementById('session-warning').style.display = 'none';
    } else {
      const mins = Math.floor(secondsLeft / 60);
      const secs = secondsLeft % 60;
      document.getElementById('session-timer').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  }, 1000);
}

// ==================== MENU FUNCTIONS ====================

/**
 * Initialize stock in localStorage
 */
function initializeStock() {
  for (let category in menuItems) {
    menuItems[category].forEach((item, index) => {
      const stockKey = `stock_${category}_${index}`;
      if (!localStorage.getItem(stockKey)) {
        localStorage.setItem(stockKey, '10');
      }
      
      const promoKey = `promo_${category}_${index}`;
      if (!localStorage.getItem(promoKey)) {
        localStorage.setItem(promoKey, 'none');
      }
    });
  }
}

/**
 * Render all menu items
 */
function renderMenuItems() {
  for (let category in menuItems) {
    const container = document.getElementById(`${category}-products`);
    if (!container) continue;
    
    container.innerHTML = '';
    menuItems[category].forEach((item, index) => {
      container.appendChild(createMenuItemCard(item, category, index));
    });
  }
  
  const allContainer = document.getElementById('all-products');
  if (allContainer) {
    allContainer.innerHTML = '';
    for (let category in menuItems) {
      menuItems[category].forEach((item, index) => {
        allContainer.appendChild(createMenuItemCard(item, category, index));
      });
    }
  }
}

/**
 * Create menu item card
 */
function createMenuItemCard(item, category, index) {
  const card = document.createElement('div');
  card.className = 'menu-card';
  card.dataset.category = category;
  card.dataset.index = index;
  
  const stockKey = `stock_${category}_${index}`;
  const promoKey = `promo_${category}_${index}`;
  const stock = parseInt(localStorage.getItem(stockKey)) || 0;
  const promo = localStorage.getItem(promoKey) || 'none';
  const isOutOfStock = stock <= 0;
  
  let promoHTML = '';
  if (promo !== 'none') {
    const promoOption = promoOptions.find(p => p.value === promo);
    const badgeColor = promoOption ? promoOption.color : 'linear-gradient(135deg, #c62828, #ff5a00)';
    promoHTML = `<div class="promo-badge" style="background: ${badgeColor};">${promo}</div>`;
  }
  
  let controlsHTML = '';
  
  if (item.hasFlavor) {
    controlsHTML += `
      <select class="flavor-select" ${isOutOfStock ? 'disabled' : ''}>
        <option value="" disabled selected>Select Flavor</option>
        ${item.flavors.map(f => `<option>${f}</option>`).join('')}
      </select>
    `;
  }
  
  if (item.hasAddons) {
    controlsHTML += `<div class="addons">`;
    item.addons.forEach(addon => {
      controlsHTML += `
        <label>
          <input type="checkbox" class="addon" data-name="${addon.name}" data-price="${addon.price}" ${isOutOfStock ? 'disabled' : ''}>
          ${addon.name} +₱${addon.price}
        </label>
      `;
    });
    controlsHTML += `</div>`;
  }
  
  controlsHTML += `
    <input type="number" min="0" value="0" class="qty-input" placeholder="Qty" ${isOutOfStock ? 'disabled' : ''}>
    <button class="add-to-cart" ${!currentUser || isOutOfStock ? 'disabled' : ''}>
      ${isOutOfStock ? '❌ Out of Stock' : 'Add to Cart'}
    </button>
  `;
  
  const stockIndicator = currentUser?.isAdmin ? 
    `<small style="display:block; margin-top:5px; color:${stock > 0 ? (stock < 5 ? '#ffa500' : '#28a745') : '#dc3545'}; font-weight:bold;">
      📦 Stock: ${stock} ${stock < 5 ? '⚠️ Low Stock!' : ''}
    </small>` : '';
  
  card.innerHTML = `
    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Ctext x='10' y='50' font-family='Arial' font-size='14' fill='%23999'%3E${item.name}%3C/text%3E%3C/svg%3E" alt="${item.name}">
    ${promoHTML}
    <div class="menu-info">
      <h3>${item.name}</h3>
      ${item.desc ? `<p>${item.desc}</p>` : ''}
      <div class="price">₱${item.price}</div>
      ${stockIndicator}
    </div>
    <div class="controls">
      ${controlsHTML}
    </div>
  `;
  
  const btn = card.querySelector('.add-to-cart');
  if (btn && !isOutOfStock) {
    btn.addEventListener('click', function() {
      if (!currentUser) {
        alert('Please login to order');
        return;
      }
      addToCart(card, item);
    });
  }
  
  return card;
}

/**
 * Add item to cart
 */
function addToCart(card, item) {
  const qtyInput = card.querySelector('.qty-input');
  const qty = parseInt(qtyInput.value);
  
  if (isNaN(qty) || qty <= 0) {
    alert('Please enter a valid quantity');
    qtyInput.value = 0;
    return;
  }
  
  // Get current stock from localStorage
  const category = card.dataset.category;
  const index = card.dataset.index;
  const stockKey = `stock_${category}_${index}`;
  const availableStock = parseInt(localStorage.getItem(stockKey)) || 0;
  
  // Check if enough stock available
  if (qty > availableStock) {
    alert(`❌ Only ${availableStock} available in stock. You tried to add ${qty}.`);
    qtyInput.value = 0;
    return;
  }
  
  const flavorSelect = card.querySelector('.flavor-select');
  if (flavorSelect && !flavorSelect.value) {
    alert('Please select a flavor');
    return;
  }
  
  let addonsTotal = 0;
  let addonsList = [];
  card.querySelectorAll('.addon:checked').forEach(addon => {
    addonsList.push(addon.dataset.name);
    addonsTotal += parseInt(addon.dataset.price);
  });
  
  const itemTotal = (item.price + addonsTotal) * qty;
  let itemName = item.name;
  if (flavorSelect && flavorSelect.value) {
    itemName += ` (${flavorSelect.value})`;
  }
  
  cart.push({
    name: itemName,
    qty: qty,
    addons: addonsList.join(', '),
    subtotal: itemTotal
  });
  
  qtyInput.value = 0;
  if (flavorSelect) flavorSelect.selectedIndex = 0;
  card.querySelectorAll('.addon:checked').forEach(addon => addon.checked = false);
  
  updateCartDisplay();
  alert(`${qty}x ${itemName} added to cart!`);
}

/**
 * Update cart display
 */
function updateCartDisplay() {
  if (cart.length === 0) {
    cartItems.innerHTML = "<li>No items yet</li>";
    cartSubtotalSpan.innerText = "0";
    deliveryFeeSpan.innerText = "0";
    cartTotalSpan.innerText = "0";
    totalPayMsg.innerText = "";
    placeOrderBtn.disabled = !currentUser;
    return;
  }

  cartItems.innerHTML = "";
  let hasStockIssue = false;
  
  cart.forEach((item, index) => {
    // Check if this cart item exceeds available stock
    let stockAvailable = true;
    let availableQty = 0;
    
    // Find current stock for this item
    for (let category in menuItems) {
      menuItems[category].forEach((menuItem, idx) => {
        if (menuItem.name === item.name.split(' (')[0]) {
          const stockKey = `stock_${category}_${idx}`;
          availableQty = parseInt(localStorage.getItem(stockKey)) || 0;
          if (item.qty > availableQty) {
            stockAvailable = false;
          }
        }
      });
    }
    
    const li = document.createElement("li");
    li.innerHTML = `
      <span style="flex:1">
        ${item.qty}x ${item.name} ${item.addons ? '<br><small>' + item.addons + '</small>' : ''}
        ${!stockAvailable ? '<br><small style="color:#c62828;">⚠️ Only ' + availableQty + ' available in stock</small>' : ''}
      </span>
      <span style="font-weight:bold">₱${item.subtotal}</span>
      <button class="remove-item" data-index="${index}" style="margin-left:5px;">✖</button>
    `;
    cartItems.appendChild(li);
    
    if (!stockAvailable) hasStockIssue = true;
  });

  const subtotal = calculateSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = subtotal + deliveryFee;
  
  cartSubtotalSpan.innerText = subtotal;
  deliveryFeeSpan.innerText = deliveryFee;
  cartTotalSpan.innerText = total;
  
  if (citySelect.value) {
    totalPayMsg.innerText = `Total to Pay: ₱${total} (includes ₱${deliveryFee} delivery fee)`;
  } else {
    totalPayMsg.innerText = `Subtotal: ₱${subtotal}`;
  }
  
  // Disable place order if stock issues
  if (hasStockIssue) {
    placeOrderBtn.disabled = true;
    placeOrderBtn.title = "Remove items with insufficient stock";
  } else {
    placeOrderBtn.disabled = !currentUser;
    placeOrderBtn.title = "";
  }

  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.dataset.index);
      cart.splice(index, 1);
      updateCartDisplay();
    });
  });
}

/**
 * Calculate cart subtotal
 */
function calculateSubtotal() {
  return cart.reduce((sum, item) => sum + item.subtotal, 0);
}

/**
 * Get delivery fee
 */
function getDeliveryFee() {
  return parseInt(citySelect.value) || 0;
}

// ==================== ORDER FUNCTIONS ====================

/**
 * Place order (show review modal)
 */
function placeOrder() {
  if (cart.length === 0) {
    alert("Your cart is empty. Please add items before placing an order.");
    return;
  }

  const name = document.getElementById("cust-name").value.trim();
  const contact = document.getElementById("cust-contact").value.trim();
  const city = citySelect.options[citySelect.selectedIndex]?.text || '';
  const address = document.getElementById("cust-address").value.trim();

  if (!name || !contact || !citySelect.value || !address) {
    alert("Please fill in all customer information fields.");
    return;
  }

  let itemsHTML = "<ul style='list-style-type:none; padding-left:0;'>";
  cart.forEach(item => {
    itemsHTML += `<li style='margin-bottom:8px;'>• ${item.qty}x ${item.name}`;
    if (item.addons) {
      itemsHTML += `<br><small style='margin-left:15px;'>Add-ons: ${item.addons}</small>`;
    }
    itemsHTML += `<br><strong>₱${item.subtotal}</strong></li>`;
  });
  itemsHTML += "</ul>";

  const subtotal = calculateSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = subtotal + deliveryFee;

  reviewDetails.innerHTML = `
    <p><strong>👤 Name:</strong> ${name}</p>
    <p><strong>📱 Contact:</strong> ${contact}</p>
    <p><strong>📍 City:</strong> ${city}</p>
    <p><strong>🏠 Address:</strong> ${address}</p>
    <h4 style="margin-top:15px;">🛒 Items:</h4>
    ${itemsHTML}
    <hr>
    <p><strong>Subtotal:</strong> ₱${subtotal}</p>
    <p><strong>Delivery Fee:</strong> ₱${deliveryFee}</p>
    <p style="font-size:18px; color:#c62828;"><strong>TOTAL:</strong> ₱${total}</p>
  `;
  
  reviewModal.style.display = "flex";
}

/**
 * Confirm and submit order
 */
async function confirmOrder() {
  const order = {
    customerPhone: currentUser.phone,
    customerName: currentUser.name,
    items: cart.map(item => ({
      name: item.name,
      qty: item.qty,
      addons: item.addons,
      subtotal: item.subtotal
    })),
    subtotal: calculateSubtotal(),
    deliveryFee: getDeliveryFee(),
    total: calculateSubtotal() + getDeliveryFee(),
    address: document.getElementById("cust-address").value.trim(),
    city: document.getElementById("cust-city").options[document.getElementById("cust-city").selectedIndex]?.text,
    status: 'pending',
    timestamp: new Date().toISOString()
  };
  
  // Try Cloudflare Worker first
  let result = await apiRequest('api/orders', 'POST', order);
  
  if (result.status === 'error' && result.offline) {
    // Fallback to Apps Script
    result = await appsScriptRequest('createOrder', { orderData: order });
  }
  
  if (result.status === 'success' || result.offline) {
    // Save to localStorage
    const localOrder = {
      id: Date.now(),
      ...order
    };
    orders.push(localOrder);
    localStorage.setItem('orders', JSON.stringify(orders));
    
    // Update local stock
    cart.forEach(cartItem => {
      for (let category in menuItems) {
        menuItems[category].forEach((item, index) => {
          if (item.name === cartItem.name.split(' (')[0]) {
            const stockKey = `stock_${category}_${index}`;
            const currentStock = parseInt(localStorage.getItem(stockKey)) || 0;
            localStorage.setItem(stockKey, Math.max(0, currentStock - cartItem.qty));
          }
        });
      }
    });
    
    alert("✅ Order placed successfully! Thank you for choosing Sky Eats.");
    cart = [];
    updateCartDisplay();
    reviewModal.style.display = "none";
    renderMenuItems();
  } else {
    alert("❌ Error placing order: " + (result.message || 'Unknown error'));
  }
}

/**
 * Show order history
 */
function showOrderHistory() {
  if (!currentUser) return;
  
  const userOrders = orders.filter(o => o.customerPhone === currentUser.phone).reverse();
  
  let historyHTML = '<div class="order-history">';
  historyHTML += '<button class="back-btn" onclick="showSection(\'all\')">← Back to Menu</button>';
  historyHTML += '<h2>📜 Your Order History</h2>';
  
  if (userOrders.length === 0) {
    historyHTML += '<p style="text-align:center; padding:50px;">No orders yet</p>';
  } else {
    userOrders.forEach(order => {
      const statusInfo = orderStatusSequence.find(s => s.key === order.status);
      let statusClass = `status-${order.status}`;
      
      historyHTML += `
        <div class="order-card">
          <div class="order-header">
            <span><strong>Order #${order.id?.toString().slice(-6) || 'N/A'}</strong></span>
            <span class="status-badge ${statusClass}">${statusInfo?.label || order.status}</span>
          </div>
          <div class="order-header">
            <span>${new Date(order.timestamp).toLocaleString()}</span>
          </div>
          
          ${renderOrderStatusTracker(order)}
          
          <div class="order-items">
            ${order.items.map(item => `<div>• ${item.qty}x ${item.name} ${item.addons ? '('+item.addons+')' : ''} - ₱${item.subtotal}</div>`).join('')}
          </div>
          <div class="order-total">
            Total: ₱${order.total}
          </div>
        </div>
      `;
    });
  }
  
  historyHTML += '</div>';
  document.getElementById('content-area').innerHTML = historyHTML;
}

/**
 * Render order status tracker
 */
function renderOrderStatusTracker(order) {
  const currentStatusIndex = orderStatusSequence.findIndex(s => s.key === order.status);
  
  let statusHTML = '<div class="order-status-tracker">';
  statusHTML += '<h4>Order Status</h4>';
  statusHTML += '<div class="status-steps">';
  
  orderStatusSequence.forEach((step, index) => {
    let stepClass = '';
    if (index < currentStatusIndex) stepClass = 'completed';
    if (index === currentStatusIndex) stepClass = 'active';
    
    statusHTML += `
      <div class="status-step">
        <div class="step-icon ${stepClass}">${step.icon}</div>
        <div class="step-label ${stepClass}">${step.label}</div>
      </div>
    `;
  });
  
  statusHTML += '</div></div>';
  return statusHTML;
}

// ==================== ADMIN FUNCTIONS ====================

/**
 * Show admin panel
 */
function showAdminPanel() {
  if (!currentUser || !currentUser.isAdmin) return;
  
  let adminHTML = '<div class="admin-panel">';
  adminHTML += '<button class="back-btn" onclick="showSection(\'all\')">← Back to Menu</button>';
  adminHTML += '<div class="admin-header"><h2>👑 Admin Panel - Manage Orders</h2>';
  adminHTML += '<button onclick="showStockManagement()">📦 Manage Stock & Promo</button>';
  adminHTML += '</div>';
  
  if (orders.length === 0) {
    adminHTML += '<p style="text-align:center; padding:50px;">No orders yet</p>';
  } else {
    adminHTML += '<div class="orders-table"><table>';
    adminHTML += '<tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th><th>Time</th></tr>';
    
    [...orders].reverse().forEach(order => {
      const statusInfo = orderStatusSequence.find(s => s.key === order.status);
      let statusClass = `status-${order.status}`;
      
      const currentIndex = orderStatusSequence.findIndex(s => s.key === order.status);
      const nextStatuses = orderStatusSequence.slice(currentIndex + 1);
      
      let actionButtons = '';
      if (nextStatuses.length > 0) {
        actionButtons = nextStatuses.map(s => 
          `<button class="update-status-btn" onclick="updateOrderStatus(${order.id}, '${s.key}')">${s.label}</button>`
        ).join('');
      } else {
        actionButtons = '<span style="color:#999;">Completed</span>';
      }
      
      adminHTML += `
        <tr>
          <td>#${order.id?.toString().slice(-6) || 'N/A'}</td>
          <td>${order.customerName}<br><small>${order.customerPhone}</small></td>
          <td>${order.items.map(i => `${i.qty}x ${i.name}`).join('<br>')}</td>
          <td>₱${order.total}</td>
          <td><span class="status-badge ${statusClass}">${statusInfo?.label || order.status}</span></td>
          <td>${actionButtons}</td>
          <td>${new Date(order.timestamp).toLocaleString()}</td>
        </tr>
      `;
    });
    
    adminHTML += '</table></div>';
  }
  
  adminHTML += '</div>';
  document.getElementById('content-area').innerHTML = adminHTML;
}

/**
 * Update order status
 */
function updateOrderStatus(orderId, newStatus) {
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = newStatus;
    localStorage.setItem('orders', JSON.stringify(orders));
    
    if (document.getElementById('content-area').innerHTML.includes('Admin Panel')) {
      showAdminPanel();
    }
    
    alert(`✅ Order status updated to ${getStatusLabel(newStatus)}`);
    return true;
  }
  return false;
}

/**
 * Get status label
 */
function getStatusLabel(status) {
  const statusInfo = orderStatusSequence.find(s => s.key === status);
  return statusInfo ? statusInfo.label : status;
}

// ==================== STOCK MANAGEMENT FUNCTIONS ====================

/**
 * Show stock management panel
 */
function showStockManagement() {
  if (!currentUser || !currentUser.isAdmin) return;
  
  let totalProducts = 0;
  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  
  for (let category in menuItems) {
    menuItems[category].forEach((item, index) => {
      totalProducts++;
      const stockKey = `stock_${category}_${index}`;
      const stock = parseInt(localStorage.getItem(stockKey)) || 0;
      
      if (stock <= 0) outOfStock++;
      else if (stock < 5) lowStock++;
      else inStock++;
    });
  }
  
  let stockHTML = '<div class="stock-management">';
  
  stockHTML += '<div class="stock-header">';
  stockHTML += '<div>';
  stockHTML += '<button class="back-btn" onclick="showSection(\'all\')">← Back to Menu</button>';
  stockHTML += '<h2 style="margin-top:15px;">📦 Stock & Promo Management</h2>';
  stockHTML += '</div>';
  stockHTML += '<div class="stock-actions">';
  stockHTML += '<input type="text" class="search-stock" id="stockSearch" placeholder="🔍 Search products..." onkeyup="filterStockTable()">';
  stockHTML += '<button class="export-btn" onclick="exportStockReport()">📊 Export Report</button>';
  stockHTML += '<button class="reset-all-btn" onclick="resetAllStock()">🔄 Reset All to 10</button>';
  stockHTML += '</div>';
  stockHTML += '</div>';
  
  stockHTML += '<div class="stock-summary-cards">';
  stockHTML += `<div class="summary-card"><h4>Total Products</h4><div class="number">${totalProducts}</div></div>`;
  stockHTML += `<div class="summary-card"><h4>In Stock</h4><div class="number" style="color:#28a745;">${inStock}</div></div>`;
  stockHTML += `<div class="summary-card"><h4>Low Stock</h4><div class="number" style="color:#ffc107;">${lowStock}</div></div>`;
  stockHTML += `<div class="summary-card"><h4>Out of Stock</h4><div class="number" style="color:#dc3545;">${outOfStock}</div></div>`;
  stockHTML += '</div>';
  
  stockHTML += '<div class="stock-table-container">';
  stockHTML += '<table class="stock-table" id="stockTable">';
  stockHTML += '<thead><tr>';
  stockHTML += '<th>Product</th>';
  stockHTML += '<th>Category</th>';
  stockHTML += '<th>Price</th>';
  stockHTML += '<th>Current Stock</th>';
  stockHTML += '<th>Status</th>';
  stockHTML += '<th>Promo Badge</th>';
  stockHTML += '<th>Actions</th>';
  stockHTML += '</tr></thead>';
  stockHTML += '<tbody>';
  
  for (let category in menuItems) {
    menuItems[category].forEach((item, index) => {
      const stockKey = `stock_${category}_${index}`;
      const promoKey = `promo_${category}_${index}`;
      const currentStock = parseInt(localStorage.getItem(stockKey)) || 0;
      const currentPromo = localStorage.getItem(promoKey) || 'none';
      
      let statusClass = 'status-in-stock';
      let statusText = 'In Stock';
      if (currentStock <= 0) {
        statusClass = 'status-out-of-stock';
        statusText = 'Out of Stock';
      } else if (currentStock < 5) {
        statusClass = 'status-low-stock';
        statusText = 'Low Stock';
      }
      
      let promoOptionsHTML = '';
      promoOptions.forEach(option => {
        const selected = option.value === currentPromo ? 'selected' : '';
        promoOptionsHTML += `<option value="${option.value}" ${selected}>${option.label}</option>`;
      });
      
      stockHTML += `
        <tr class="stock-row" data-product="${item.name.toLowerCase()}" data-category="${category.toLowerCase()}">
          <td class="product-name">${item.name}</td>
          <td><span class="category-badge">${category}</span></td>
          <td>₱${item.price}</td>
          <td>
            <input type="number" id="stock_${category}_${index}" value="${currentStock}" min="0" class="stock-input" 
                   onchange="validateStock(this)" onkeyup="validateStock(this)">
          </td>
          <td><span class="status-badge-stock ${statusClass}">${statusText}</span></td>
          <td>
            <select id="promo_${category}_${index}" class="promo-select">
              ${promoOptionsHTML}
            </select>
          </td>
          <td>
            <button class="save-stock-btn" onclick="updateStock('${category}', ${index})">💾 Save Changes</button>
          </td>
        </tr>
      `;
    });
  }
  
  stockHTML += '</tbody></table>';
  stockHTML += '</div></div>';
  
  document.getElementById('content-area').innerHTML = stockHTML;
}

/**
 * Validate stock input
 */
function validateStock(input) {
  let value = parseInt(input.value);
  if (isNaN(value) || value < 0) {
    input.value = 0;
  }
}

/**
 * Update stock in localStorage
 */
function updateStock(category, index) {
  const stockInput = document.getElementById(`stock_${category}_${index}`);
  const promoSelect = document.getElementById(`promo_${category}_${index}`);
  
  const newStock = stockInput.value;
  const newPromo = promoSelect.value;
  
  localStorage.setItem(`stock_${category}_${index}`, newStock);
  localStorage.setItem(`promo_${category}_${index}`, newPromo);
  
  showNotification(`✅ Stock updated to ${newStock} with promo: ${newPromo === 'none' ? 'None' : newPromo}`);
  showStockManagement();
  renderMenuItems();
}

/**
 * Reset all stock to 10
 */
function resetAllStock() {
  if (confirm('⚠️ Reset ALL stock to 10? This cannot be undone.')) {
    for (let category in menuItems) {
      menuItems[category].forEach((item, index) => {
        localStorage.setItem(`stock_${category}_${index}`, '10');
      });
    }
    showNotification('✅ All stock reset to 10');
    showStockManagement();
    renderMenuItems();
  }
}

/**
 * Filter stock table by search
 */
function filterStockTable() {
  const searchInput = document.getElementById('stockSearch');
  if (!searchInput) return;
  
  const searchText = searchInput.value.toLowerCase();
  const rows = document.querySelectorAll('.stock-row');
  
  rows.forEach(row => {
    const product = row.getAttribute('data-product') || '';
    const category = row.getAttribute('data-category') || '';
    if (product.includes(searchText) || category.includes(searchText)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * Export stock report as CSV
 */
function exportStockReport() {
  let csv = 'Product,Category,Price,Current Stock,Status,Promo Badge\n';
  
  for (let category in menuItems) {
    menuItems[category].forEach((item, index) => {
      const stockKey = `stock_${category}_${index}`;
      const promoKey = `promo_${category}_${index}`;
      const stock = localStorage.getItem(stockKey) || '10';
      const promo = localStorage.getItem(promoKey) || 'none';
      
      let status = 'In Stock';
      if (stock <= 0) status = 'Out of Stock';
      else if (stock < 5) status = 'Low Stock';
      
      csv += `"${item.name}",${category},₱${item.price},${stock},${status},${promo}\n`;
    });
  }
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stock-report-${new Date().toLocaleDateString()}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Show notification
 */
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.background = '#28a745';
  notification.style.color = 'white';
  notification.style.padding = '15px 25px';
  notification.style.borderRadius = '10px';
  notification.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
  notification.style.zIndex = '9999';
  notification.style.animation = 'slideIn 0.3s';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// ==================== SECTION NAVIGATION ====================

/**
 * Show menu section
 */
function showSection(sectionId) {
  document.getElementById('content-area').innerHTML = `
    <div id="all" class="section-title">📋 All Products</div>
    <div class="menu-container" id="all-products"></div>
    <div id="chicken" class="section-title">🍗 Chicken Wings</div>
    <div class="menu-container" id="chicken-products"></div>
    <div id="sisig" class="section-title">🥘 Sisig</div>
    <div class="menu-container" id="sisig-products"></div>
    <div id="ricemeal" class="section-title">🍚 Rice Meals</div>
    <div class="menu-container" id="ricemeal-products"></div>
    <div id="drinks" class="section-title">🥤 Drinks</div>
    <div class="menu-container" id="drinks-products"></div>
    <div id="snacks" class="section-title">🍟 Snacks</div>
    <div class="menu-container" id="snacks-products"></div>
  `;
  
  renderMenuItems();
  
  setTimeout(() => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({behavior: 'smooth'});
    }
  }, 100);

}
