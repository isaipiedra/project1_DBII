document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registerForm');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('profilePicture');
    const filePreview = document.getElementById('filePreview');
    const fileError = document.getElementById('fileError');
    
    // Configuración de la API
    const API_BASE_URL = 'http://localhost:3000';
    
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
        const textElements = fileUploadArea.querySelectorAll('p, span, div:not(.file-preview)');
        fileUploadArea.querySelectorAll('p').forEach(p => p.remove());
        
        const fileNameElement = document.createElement('p');
        fileNameElement.textContent = `Selected: ${fileName}`;
        fileNameElement.style.fontWeight = 'bold';
        fileNameElement.style.margin = '10px 0 5px 0';
        
        const changeTextElement = document.createElement('p');
        changeTextElement.textContent = 'Click to change or drag a new file';
        changeTextElement.style.fontSize = '14px';
        changeTextElement.style.color = 'var(--lighter-purple)';
        changeTextElement.style.margin = '0';
        
        const icon = fileUploadArea.querySelector('i');
        fileUploadArea.insertBefore(changeTextElement, icon.nextSibling);
        fileUploadArea.insertBefore(fileNameElement, icon.nextSibling);
    }
    
    function resetFileUploadText() {
        fileUploadArea.querySelectorAll('p').forEach(p => p.remove());
        
        const originalText1 = document.createElement('p');
        originalText1.textContent = 'Click to upload or drag and drop';
        originalText1.style.margin = '10px 0 5px 0';
        
        const originalText2 = document.createElement('p');
        originalText2.textContent = 'PNG, JPG, GIF up to 5MB';
        originalText2.style.fontSize = '14px';
        originalText2.style.color = 'var(--lighter-purple)';
        originalText2.style.margin = '0';
        
        const icon = fileUploadArea.querySelector('i');
        fileUploadArea.insertBefore(originalText2, icon.nextSibling);
        fileUploadArea.insertBefore(originalText1, icon.nextSibling);
    }
    
    resetFileUploadText();
    
    // Form validation and submission 
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        clearAllErrors();
        
        let isValid = validateForm();
        
        if (isValid) {
            await submitForm();
        }
    });
    
    async function submitForm() {
        const submitBtn = form.querySelector('.btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Creating Account...';
        submitBtn.disabled = true;
        
        try {
            // Convert username to lowercase before sending
            const usernameInput = document.getElementById('username');
            const originalUsername = usernameInput.value.trim();
            const lowercaseUsername = originalUsername.toLowerCase();
            
            // Update the input value with lowercase username for consistency
            usernameInput.value = lowercaseUsername;

            // Obtener la imagen como base64 si existe
            let profilePictureBase64 = null;
            const fileInput = document.getElementById('profilePicture');
            
            if (fileInput.files.length > 0) {
                profilePictureBase64 = await convertImageToBase64(fileInput.files[0]);
            }

            // Preparar datos del formulario
            const formData = {
                firstName: document.getElementById('firstName').value.trim(),
                lastName: document.getElementById('lastName').value.trim(),
                birthDate: document.getElementById('dateOfBirth').value,
                password: document.getElementById('password').value,
                profilePicture: profilePictureBase64
            };
            
            // Validar el tamaño de la imágen
            if (profilePictureBase64 && profilePictureBase64.length > 1.5 * 1024 * 1024) {
                throw new Error('La imagen es demasiado grande. Máximo 1MB permitido.');
            }
            
            // Enviar datos a la API usando el username en minúsculas
            const response = await fetch(`${API_BASE_URL}/users/${lowercaseUsername}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();

            let created_userid = result.user.username;

            const response_node = await fetch(`${API_BASE_URL}/api/reg_user_graph`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: created_userid,
                    user_name: created_userid
                })
            });

            const result_node = await response_node.json();
            
            if (response.ok && response_node.ok) {
                // Registro exitoso
                showSuccessMessage('Account created successfully! Redirecting to login...');
                
                // Redirigir al login después de 2 segundos
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
                
            } else {
                // Error del servidor
                throw new Error(result.error || 'Registration failed');
            }
            
        } catch (error) {
            console.error('Error during registration:', error);
            
            // Mostrar error específico al usuario
            if (error.message.includes('usuario ya existe') || error.message.includes('already exists')) {
                showError(document.getElementById('usernameError'), 'Username already exists');
                document.getElementById('username').parentElement.classList.add('error');
            } else if (error.message.includes('demasiado grande')) {
                showError(document.getElementById('fileError'), 'Image too large. Maximum 1MB allowed.');
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                showGeneralError('Network error. Please check if the server is running.');
            } else {
                showGeneralError(error.message || 'Registration failed. Please try again.');
            }
            
        } finally {
            // Restaurar el botón
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    // Función para convertir imagen a Base64
    function convertImageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                // Redimensionar imagen si es muy grande antes de convertir a base64
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Tamaño máximo para la imagen
                    const MAX_WIDTH = 300;
                    const MAX_HEIGHT = 300;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convertir a base64 con calidad reducida para ahorrar espacio
                    const resizedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(resizedBase64);
                };
                
                img.onerror = function() {
                    // Si no se puede redimensionar, usar el original
                    resolve(e.target.result);
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = function(error) {
                reject(error);
            };
            
            reader.readAsDataURL(file);
        });
    }

    function validateForm() {
        let isValid = true;
        
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
        
        // Validar contraseñas
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (password.value !== confirmPassword.value) {
            showError(document.getElementById('confirmPasswordError'), 'Passwords do not match');
            confirmPassword.parentElement.classList.add('error');
            isValid = false;
        }
        
        // Enhanced password validation
        const passwordErrors = validatePassword(password.value);
        if (password.value && passwordErrors.length > 0) {
            showError(document.getElementById('passwordError'), passwordErrors.join(', '));
            password.parentElement.classList.add('error');
            isValid = false;
        }
        
        // Validar fecha de nacimiento - changed to 16+ years
        const dob = new Date(document.getElementById('dateOfBirth').value);
        if (document.getElementById('dateOfBirth').value) {
            const today = new Date();
            const minAgeDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
            
            if (dob > minAgeDate) {
                showError(document.getElementById('dobError'), 'You must be at least 16 years old');
                document.getElementById('dateOfBirth').parentElement.classList.add('error');
                isValid = false;
            }
        }
        
        // Validar formato de username
        const username = document.getElementById('username').value;
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (username && !usernameRegex.test(username)) {
            showError(document.getElementById('usernameError'), 'Username must be 3-20 characters and contain only letters, numbers, and underscores');
            document.getElementById('username').parentElement.classList.add('error');
            isValid = false;
        }
        
        return isValid;
    }

    // Enhanced password validation function
    function validatePassword(password) {
        const errors = [];
        
        if (password.length < 8) {
            errors.push('at least 8 characters');
        }
        
        if (!/[A-Z]/.test(password)) {
            errors.push('one capital letter');
        }
        
        if (!/[a-z]/.test(password)) {
            errors.push('one lowercase letter');
        }
        
        if (!/\d/.test(password)) {
            errors.push('one number');
        }
        
        // Map error messages to be more user-friendly
        if (errors.length > 0) {
            return ['Password must contain: ' + errors.join(', ')];
        }
        
        return [];
    }
    
    // Real-time validation for password
    document.getElementById('password').addEventListener('input', function() {
        const password = this.value;
        
        if (password) {
            const passwordErrors = validatePassword(password);
            if (passwordErrors.length > 0) {
                showError(document.getElementById('passwordError'), passwordErrors.join(', '));
                this.parentElement.classList.add('error');
            } else {
                clearError(document.getElementById('passwordError'));
                this.parentElement.classList.remove('error');
            }
        } else {
            clearError(document.getElementById('passwordError'));
            this.parentElement.classList.remove('error');
        }
    });
    
    // Real-time validation for confirm password
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

    // Convert username to lowercase in real-time for better UX
    document.getElementById('username').addEventListener('input', function() {
        // Don't convert while typing to avoid cursor jumping
        // The conversion will happen on form submission
    });
    
    // Helper functions
    function showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }
    
    function clearError(element) {
        element.textContent = '';
        element.style.display = 'none';
    }
    
    function clearAllErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(element => {
            element.textContent = '';
            element.style.display = 'none';
        });
        
        const errorInputs = document.querySelectorAll('.form-group.error');
        errorInputs.forEach(element => {
            element.classList.remove('error');
        });
    }
    
    function showSuccessMessage(message) {
        // Eliminar mensajes anteriores
        const existingMessages = document.querySelectorAll('.success-message, .error-message-global');
        existingMessages.forEach(msg => msg.remove());
        
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message active';
        successMessage.innerHTML = `<i class="bx bx-check-circle"></i> ${message}`;
        form.appendChild(successMessage);
    }
    
    function showGeneralError(message) {
        // Eliminar mensajes anteriores
        const existingMessages = document.querySelectorAll('.success-message, .error-message-global');
        existingMessages.forEach(msg => msg.remove());
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message-global active';
        errorMessage.innerHTML = `<i class="bx bx-error-circle"></i> ${message}`;
        form.appendChild(errorMessage);
    }
});