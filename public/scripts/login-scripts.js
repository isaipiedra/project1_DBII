// Login form handling
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');
    const successMessage = document.getElementById('successMessage');

    // Configuración de la API
    const API_BASE_URL = 'http://localhost:3000';

    // Form submission handler
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Reset error messages
        resetErrors();
        
        // Validate inputs
        const isValid = validateForm();
        
        if (isValid) {
            await handleLogin();
        }
    });

    // Real-time validation
    usernameInput.addEventListener('blur', validateUsername);
    passwordInput.addEventListener('blur', validatePassword);

    function validateForm() {
        let isValid = true;
        
        if (!validateUsername()) isValid = false;
        if (!validatePassword()) isValid = false;
        
        return isValid;
    }

    function validateUsername() {
        const username = usernameInput.value.trim();
        
        if (username === '') {
            showError(usernameError, 'Username or email is required');
            return false;
        }
        
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            showError(usernameError, 'Invalid username or password');
            return false;
        }
        
        clearError(usernameError);
        return true;
    }

    function validatePassword() {
        const password = passwordInput.value;
        
        if (password === '') {
            showError(passwordError, 'Password is required');
            return false;
        }
        
        if (password.length < 6) {
            showError(passwordError, 'Invalid username or password');
            return false;
        }
        
        clearError(passwordError);
        return true;
    }

    async function handleLogin() {
        // Show loading state
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Signing In...';
        submitButton.disabled = true;
        
        try {
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            
            // Llamar a la API de autenticación
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const result = await response.json();

            if (response.ok) {
                // Login exitoso
                showSuccess('Login successful! Redirecting...');
                
                // Guardar información del usuario en sessionStorage
                sessionStorage.setItem('currentUser', username);
                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('userData', JSON.stringify(result.user));
                sessionStorage.setItem('isAdmin', result.user.admin ? 'true' : 'false');
                
                // Redirigir basado en el rol del usuario
                setTimeout(() => {
                    if (result.user.admin === true) {
                        window.location.href = 'admin/desktop.html';
                    } else {
                        window.location.href = 'desktop.html';
                    }
                }, 1000);
                
            } else {
                // Error de autenticación
                throw new Error(result.error || 'Login failed');
            }
            
        } catch (error) {
            console.error('Error during login:', error);
            
            // Mostrar error específico
            if (error.message.includes('Credenciales inválidas') || 
                error.message.includes('Invalid credentials') ||
                error.message.includes('Login failed')) {
                showError(passwordError, 'Invalid username or password');
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                showError(passwordError, 'Network error. Please check if the server is running.');
            } else {
                showError(passwordError, error.message || 'Login failed. Please try again.');
            }
            
            // Restaurar botón
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    }

    function showError(errorElement, message) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    function clearError(errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }

    function resetErrors() {
        clearError(usernameError);
        clearError(passwordError);
        successMessage.classList.remove('active');
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.classList.add('active');
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Enter to submit form
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });

    // Verificar si ya está logueado y redirigir
    checkAndRedirect();
});

// Utility function to check if user is logged in
function checkLoginStatus() {
    return sessionStorage.getItem('isLoggedIn') === 'true';
}

// Utility function to get current user
function getCurrentUser() {
    return sessionStorage.getItem('currentUser');
}

// Utility function to get user data
function getUserData() {
    const userData = sessionStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
}

// Utility function to check if user is admin
function isAdminUser() {
    return sessionStorage.getItem('isAdmin') === 'true';
}

// Utility function to logout
function logout() {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('isAdmin');
    window.location.href = 'login.html';
}

// Verificar si ya está logueado y redirigir a la página correcta
function checkAndRedirect() {
    if (checkLoginStatus()) {
        if (window.location.pathname.includes('login.html')) {
            // Redirigir a la página correcta basada en el rol
            if (isAdminUser()) {
                window.location.href = 'admin/desktop.html';
            } else {
                window.location.href = 'desktop.html';
            }
        }
    }
}

// Proteger páginas que requieren login
function requireAuth() {
    if (!checkLoginStatus()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Proteger páginas de admin
function requireAdminAuth() {
    if (!checkLoginStatus()) {
        window.location.href = '../login.html';
        return false;
    }
    if (!isAdminUser()) {
        window.location.href = '../desktop.html';
        return false;
    }
    return true;
}