// script.js
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registerForm');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('profilePicture');
    const filePreview = document.getElementById('filePreview');
    const fileError = document.getElementById('fileError');
    
    // File upload functionality
    fileUploadArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        fileUploadArea.classList.add('highlight');
    }
    
    function unhighlight() {
        fileUploadArea.classList.remove('highlight');
    }
    
    fileUploadArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length) {
            fileInput.files = files;
            handleFileSelection(files[0]);
        }
    }
    
    fileInput.addEventListener('change', function() {
        if (fileInput.files.length) {
            handleFileSelection(fileInput.files[0]);
        }
    });
    
    function handleFileSelection(file) {
        if (file && file.type.startsWith('image/')) {
            // Check file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                showError(fileError, 'File size must be less than 5MB');
                fileInput.value = '';
                fileUploadArea.classList.remove('has-file');
                filePreview.classList.remove('active');
                resetFileUploadText();
                return;
            }
            
            fileUploadArea.classList.add('has-file');
            clearError(fileError);
            
            // Update the text to show file name
            updateFileUploadText(file.name);
            
            const reader = new FileReader();
            reader.onload = function(e) {
                filePreview.innerHTML = `<img src="${e.target.result}" alt="Profile preview">`;
                filePreview.classList.add('active');
            };
            reader.readAsDataURL(file);
        } else {
            showError(fileError, 'Please select a valid image file (PNG, JPG, GIF)');
            fileInput.value = '';
            fileUploadArea.classList.remove('has-file');
            filePreview.classList.remove('active');
            resetFileUploadText();
        }
    }
    
    function updateFileUploadText(fileName) {
        // Find all text elements in the file upload area
        const textElements = fileUploadArea.querySelectorAll('p, span, div:not(.file-preview)');
        
        // Clear existing content except the icon
        fileUploadArea.querySelectorAll('p').forEach(p => p.remove());
        
        // Add the file name text
        const fileNameElement = document.createElement('p');
        fileNameElement.textContent = `Selected: ${fileName}`;
        fileNameElement.style.fontWeight = 'bold';
        fileNameElement.style.margin = '10px 0 5px 0';
        
        const changeTextElement = document.createElement('p');
        changeTextElement.textContent = 'Click to change or drag a new file';
        changeTextElement.style.fontSize = '14px';
        changeTextElement.style.color = 'var(--lighter-purple)';
        changeTextElement.style.margin = '0';
        
        // Insert after the icon
        const icon = fileUploadArea.querySelector('i');
        fileUploadArea.insertBefore(changeTextElement, icon.nextSibling);
        fileUploadArea.insertBefore(fileNameElement, icon.nextSibling);
    }
    
    function resetFileUploadText() {
        // Clear existing content except the icon
        fileUploadArea.querySelectorAll('p').forEach(p => p.remove());
        
        // Add back the original text
        const originalText1 = document.createElement('p');
        originalText1.textContent = 'Click to upload or drag and drop';
        originalText1.style.margin = '10px 0 5px 0';
        
        const originalText2 = document.createElement('p');
        originalText2.textContent = 'PNG, JPG, GIF up to 5MB';
        originalText2.style.fontSize = '14px';
        originalText2.style.color = 'var(--lighter-purple)';
        originalText2.style.margin = '0';
        
        // Insert after the icon
        const icon = fileUploadArea.querySelector('i');
        fileUploadArea.insertBefore(originalText2, icon.nextSibling);
        fileUploadArea.insertBefore(originalText1, icon.nextSibling);
    }
    
    // Initialize with the original text
    resetFileUploadText();
    
    // Form validation and submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Clear previous errors
        clearAllErrors();
        
        let isValid = validateForm();
        
        if (isValid) {
            // Simulate form submission
            const submitBtn = form.querySelector('.btn-primary');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Creating Account...';
            submitBtn.disabled = true;
            
            // Simulate API call
            setTimeout(function() {
                // Show success message
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message active';
                successMessage.innerHTML = '<i class="bx bx-check-circle"></i> Account created successfully! Redirecting...';
                form.appendChild(successMessage);
                
                // Redirect after delay (simulation)
                setTimeout(function() {
                    window.location.href = 'desktop.html';
                }, 2000);
            }, 1500);
        }
    });
    
    function validateForm() {
        let isValid = true;
        
        // Validate required fields
        const requiredFields = [
            { id: 'firstName', message: 'First name is required' },
            { id: 'lastName', message: 'Last name is required' },
            { id: 'dateOfBirth', message: 'Date of birth is required' },
            { id: 'username', message: 'Username is required' },
            { id: 'password', message: 'Password is required' },
            { id: 'confirmPassword', message: 'Please confirm your password' }
        ];
        
        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (!element.value.trim()) {
                showError(document.getElementById(field.id + 'Error'), field.message);
                element.parentElement.classList.add('error');
                isValid = false;
            }
        });
        
        // Validate password match
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (password.value !== confirmPassword.value) {
            showError(document.getElementById('confirmPasswordError'), 'Passwords do not match');
            confirmPassword.parentElement.classList.add('error');
            isValid = false;
        }
        
        // Validate password strength
        if (password.value.length > 0 && password.value.length < 8) {
            showError(document.getElementById('passwordError'), 'Password must be at least 8 characters');
            password.parentElement.classList.add('error');
            isValid = false;
        }
        
        // Validate date of birth (must be at least 13 years old)
        const dob = new Date(document.getElementById('dateOfBirth').value);
        if (document.getElementById('dateOfBirth').value) {
            const today = new Date();
            const minAgeDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
            
            if (dob > minAgeDate) {
                showError(document.getElementById('dobError'), 'You must be at least 13 years old');
                document.getElementById('dateOfBirth').parentElement.classList.add('error');
                isValid = false;
            }
        }
        
        // Validate username format
        const username = document.getElementById('username').value;
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (username && !usernameRegex.test(username)) {
            showError(document.getElementById('usernameError'), 'Username must be 3-20 characters and contain only letters, numbers, and underscores');
            document.getElementById('username').parentElement.classList.add('error');
            isValid = false;
        }
        
        return isValid;
    }
    
    // Real-time validation for password confirmation
    document.getElementById('confirmPassword').addEventListener('input', function() {
        const password = document.getElementById('password').value;
        const confirmPassword = this.value;
        
        if (password && confirmPassword && password !== confirmPassword) {
            showError(document.getElementById('confirmPasswordError'), 'Passwords do not match');
            this.parentElement.classList.add('error');
        } else {
            clearError(document.getElementById('confirmPasswordError'));
            this.parentElement.classList.remove('error');
        }
    });
    
    // Real-time validation for password strength
    document.getElementById('password').addEventListener('input', function() {
        if (this.value.length > 0 && this.value.length < 8) {
            showError(document.getElementById('passwordError'), 'Password must be at least 8 characters');
            this.parentElement.classList.add('error');
        } else {
            clearError(document.getElementById('passwordError'));
            this.parentElement.classList.remove('error');
        }
    });
    
    // Helper functions
    function showError(element, message) {
        element.textContent = message;
    }
    
    function clearError(element) {
        element.textContent = '';
    }
    
    function clearAllErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(element => {
            element.textContent = '';
        });
        
        const errorInputs = document.querySelectorAll('.form-group.error');
        errorInputs.forEach(element => {
            element.classList.remove('error');
        });
    }
});