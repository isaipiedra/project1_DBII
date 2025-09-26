// Login form handling
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');
    const successMessage = document.getElementById('successMessage');

    // Form submission handler
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Reset error messages
        resetErrors();
        
        // Validate inputs
        const isValid = validateForm();
        
        if (isValid) {
            // Simulate login process
            simulateLogin();
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
        
        // Check if it's an email or username
        if (username.includes('@')) {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(username)) {
                showError(usernameError, 'Please enter a valid email address');
                return false;
            }
        } else {
            // Validate username format (alphanumeric, 3-20 characters)
            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernameRegex.test(username)) {
                showError(usernameError, 'Username must be 3-20 characters and contain only letters, numbers, and underscores');
                return false;
            }
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
            showError(passwordError, 'Password must be at least 6 characters long');
            return false;
        }
        
        clearError(passwordError);
        return true;
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

    function simulateLogin() {
        // Show loading state
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Signing In...';
        submitButton.disabled = true;
        
        // Simulate API call delay
        setTimeout(function() {
            // In a real application, this would be an API call to your backend
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            
            // Simple mock authentication
            // In a real app, you would verify credentials against a database
            if ((username === 'demo' || username === 'demo@example.com') && password === 'password') {
                // Save user session
                sessionStorage.setItem('currentUser', username);
                sessionStorage.setItem('isLoggedIn', 'true');
                
                // Show success message
                showSuccess('Login successful! Redirecting...');
                
                // Redirect to main page after a short delay
                setTimeout(function() {
                    window.location.href = 'desktop.html';
                }, 1500);
            } else {
                // Show error for invalid credentials
                showError(passwordError, 'Invalid username or password');
                
                // Restore button
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            }
        }, 1500); // Simulate network delay
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
        
        // Escape to clear form
        if (e.key === 'Escape') {
            loginForm.reset();
            resetErrors();
        }
    });
});

// Utility function to check if user is logged in (to be used in other pages)
function checkLoginStatus() {
    return sessionStorage.getItem('isLoggedIn') === 'true';
}

// Utility function to get current user
function getCurrentUser() {
    return sessionStorage.getItem('currentUser');
}

// Utility function to logout
function logout() {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
}