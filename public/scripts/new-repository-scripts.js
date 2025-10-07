const repository_image = document.querySelector('#repository_image');

const edit_repo_image = document.querySelector('#edit_repo_image');
const submit_repo_btn = document.querySelector('#submit_repo_btn');
const upload_videos_btn = document.querySelector('#upload_videos_btn')
const upload_files_btn = document.querySelector('#upload_files_btn')

const repo_image_input = document.querySelector('#repo_image_input');
const repo_videos_input = document.querySelector('#repo_videos_input');
const repo_files_input = document.querySelector('#repo_files_input');

const details_owner = document.querySelector('#details_owner');
const details_file_amount = document.querySelector('#details_file_amount');

const repository_file_list = document.querySelector('#repository_file_list');

const repo_name = document.querySelector('#repo_name'); //input with dataset name
const repo_description = document.querySelector('#repo_description');
const author = sessionStorage.currentUser;
const status = 'Pendiente';

details_owner.innerHTML = `Owner: ${author}`;

edit_repo_image.addEventListener('click', () => {
    repo_image_input.click();
});

upload_videos_btn.addEventListener('click', () => {
    repo_videos_input.click();
});

upload_files_btn.addEventListener('click', () => {
    repo_files_input.click();
});

let allSelectedFiles = [];

repo_videos_input.addEventListener('change', (event) => {
    const newFiles = Array.from(event.target.files);
    
    if (newFiles.length > 0) {
        const message_container = document.querySelector('.message_container');
        const title_message_box = document.querySelector('.title_message_box');
        const content_message_box = document.querySelector('.content_message_box');
        
        content_message_box.innerHTML = '';

        let new_p = document.createElement('p');

        title_message_box.children[0].innerHTML = 'Video added'; 

        new_p.innerHTML = 'The video was added succesfully.';

        content_message_box.appendChild(new_p);

        message_container.style = 'display:flex;';
        return;
    }
});

repo_files_input.addEventListener('change', (event) => {
    const newFiles = Array.from(event.target.files);
    
    if (newFiles.length > 0) {
        // Add new files to our global array, avoiding duplicates
        newFiles.forEach(file => {
            if (!allSelectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                allSelectedFiles.push(file);
            }
            details_file_amount.innerHTML = `Files: ${newFiles.length}`;
        });
        
        // Update the visual list
        updateFileListDisplay();
        
        // Update the actual file input (optional, for form submission)
        updateFileInput();
    }
});

// Function to update the visual file list
function updateFileListDisplay() {
    // Clear the current display
    repository_file_list.innerHTML = '';
    
    // Add all files to the display
    allSelectedFiles.forEach((file, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'repository_file_item';
        
        const fileSize = formatFileSize(file.size);
        
        listItem.innerHTML = `
            <p>${file.name}</p>
            <div class="file_item_details">
                <p>${fileSize}</p>
                <button class="remove-file-btn" data-index="${index}"><i class='bx bx-trash'></i></button>
            </div>
        `;
        
        repository_file_list.appendChild(listItem);
    });
    
    // Add remove functionality
    addRemoveFileListeners();
}

// Updated remove function
function addRemoveFileListeners() {
    const removeButtons = repository_file_list.querySelectorAll('.remove-file-btn');
    removeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(button.getAttribute('data-index'));
            removeFileByIndex(index);
        });
    });
}

function removeFileByIndex(index) {
    // Remove file from array
    allSelectedFiles.splice(index, 1);
    
    // Update display
    updateFileListDisplay();
    
    // Update file input
    updateFileInput();
}

// Function to update the actual file input using DataTransfer
function updateFileInput() {
    // Create a new DataTransfer object
    const dataTransfer = new DataTransfer();
    
    // Add all files to the DataTransfer object
    allSelectedFiles.forEach(file => {
        dataTransfer.items.add(file);
    });
    
    // Update the file input files
    repo_files_input.files = dataTransfer.files;
}


repo_image_input.addEventListener('change', (event) => {
    const selectedFile = event.target.files[0];
    
    if (selectedFile) {
        // Check if the file is an image
        if (!selectedFile.type.startsWith('image/')) {
            const message_container = document.querySelector('.message_container');
            const title_message_box = document.querySelector('.title_message_box');
            const content_message_box = document.querySelector('.content_message_box');
            
            content_message_box.innerHTML = '';

            let new_p = document.createElement('p');

            title_message_box.children[0].innerHTML = 'Alert'; 

            new_p.innerHTML = 'Please select an image file';

            content_message_box.appendChild(new_p);

            message_container.style = 'display:flex;';
            repo_image_input.value = ''; // Clear the input
            return;
        }

        // Create a FileReader to read the image file
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Set the background image with the data URL
            repository_image.style.backgroundImage = `url(${e.target.result})`;
        };
        
        reader.onerror = function() {
            const message_container = document.querySelector('.message_container');
            const title_message_box = document.querySelector('.title_message_box');
            const content_message_box = document.querySelector('.content_message_box');
            
            content_message_box.innerHTML = '';

            let new_p = document.createElement('p');

            title_message_box.children[0].innerHTML = 'Alert'; 

            new_p.innerHTML = 'Error reading the image file';

            content_message_box.appendChild(new_p);

            message_container.style = 'display:flex;';
            repo_image_input.value = ''; // Clear the input
            return;
        };
        
        // Read the file as Data URL
        reader.readAsDataURL(selectedFile);
    } else {
        repository_image.style.backgroundImage = 'none';
    }
});

submit_repo_btn.addEventListener('click', async () => {
    // Validate required fields
    if (!repo_name.value.trim()) {
        const message_container = document.querySelector('.message_container');
        const title_message_box = document.querySelector('.title_message_box');
        const content_message_box = document.querySelector('.content_message_box');
        
        content_message_box.innerHTML = '';

        let new_p = document.createElement('p');

        title_message_box.children[0].innerHTML = 'Alert'; 

        new_p.innerHTML = 'Please enter a valid data set name';

        content_message_box.appendChild(new_p);

        message_container.style = 'display:flex;';
        return;
    }

    if (!repo_description.value.trim()) {
        const message_container = document.querySelector('.message_container');
        const title_message_box = document.querySelector('.title_message_box');
        const content_message_box = document.querySelector('.content_message_box');
        
        content_message_box.innerHTML = '';

        let new_p = document.createElement('p');

        title_message_box.children[0].innerHTML = 'Alert'; 

        new_p.innerHTML = 'Please enter a dataset description';

        content_message_box.appendChild(new_p);

        message_container.style = 'display:flex;';
        return;
    }

    /* if (!author) {
        alert('User not logged in');
        return;
    } */

    try {
        // Create FormData object
        const formData = new FormData();
        
        let name = repo_name.value.trim();
        let desc = repo_description.value.trim();

        // Add text fields
        formData.append('name', name);
        formData.append('description', desc);
        formData.append('author', author);
        formData.append('status', status);
        formData.append('size', calculateTotalSize()); 

        // Add avatar image if selected
        if (repo_image_input.files.length > 0) {
            formData.append('avatar', repo_image_input.files[0]);
            formData.append('descripcion', repo_image_input.files[0]);
        }

        // Add multiple files
        for (let i = 0; i < repo_files_input.files.length; i++) {
            formData.append('archivos', repo_files_input.files[i]);
        }

        // Add multiple videos
        for (let i = 0; i < repo_videos_input.files.length; i++) {
            formData.append('videos', repo_videos_input.files[i]);
        }

        // Show loading state
        submit_repo_btn.disabled = true;
        submit_repo_btn.textContent = 'Uploading...';

        // Send POST request
        const response = await fetch('http://localhost:3000/api/add_dataset', {
            method: 'POST',
            body: formData
            // Don't set Content-Type header - browser will set it automatically
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        try {
            const response_redis = await fetch(`http://localhost:3000/users/${author}/repositories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: result,
                    name: name,
                    description: desc,
                    language: 'Spanish'
                })
            });

            const result_redis = await response_redis.json();

            if(response_redis.ok) {
                const message_container = document.querySelector('.message_container');
                const title_message_box = document.querySelector('.title_message_box');
                const content_message_box = document.querySelector('.content_message_box');
                
                content_message_box.innerHTML = '';

                let new_p = document.createElement('p');

                title_message_box.children[0].innerHTML = 'Success'; 

                new_p.innerHTML = 'The dataset was created successfully';

                content_message_box.appendChild(new_p);

                message_container.style = 'display:flex;';

                setTimeout(() => {
                    window.location.href = 'desktop.html';
                }, 1500);                
            }
        } catch (err) {
            console.error('Error submitting dataset to redis:', err);
        }
    } catch (error) {
        console.error('Error submitting dataset:', error);
        
        // Show error message to user
        if (error.message.includes('network') || error.message.includes('fetch')) {
            console.error('Network error. Please check your connection and try again.');
        } else {
            console.error(`Error submitting dataset: ${error.message}`);
        }
    } finally {
        // Reset button state
        submit_repo_btn.disabled = false;
        submit_repo_btn.textContent = 'Submit Dataset';
    }
});

// Helper function to calculate total size (optional)
function calculateTotalSize() {
    let totalSize = 0;
    
    // Add avatar file size
    if (repo_image_input.files.length > 0) {
        totalSize += repo_image_input.files[0].size;
    }
    
    // Add files sizes
    for (let i = 0; i < repo_files_input.files.length; i++) {
        totalSize += repo_files_input.files[i].size;
    }
    
    // Add videos sizes
    for (let i = 0; i < repo_videos_input.files.length; i++) {
        totalSize += repo_videos_input.files[i].size;
    }
    
    // Convert to human readable format
    return formatFileSize(totalSize);
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to clear the form
function clearForm() {
    repo_name.value = '';
    repo_description.value = '';
    repo_image_input.value = '';
    repo_files_input.value = '';
    repo_videos_input.value = '';
}