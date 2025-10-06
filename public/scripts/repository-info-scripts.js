document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const dataset_id = urlParams.get('id');

    const delete_btn = document.querySelector('#delete_btn');
    const play_btn = document.querySelector('#play_btn');
    const close_video_btn = document.querySelector('#close_video_btn');

    let show_video = false;

    /* --------- RATING STARS BEHAVIORS --------- */
    const stars_count = document.querySelector('#stars_count');
    const stars = stars_count.children;

    let starIsLocked = false;

    function cleanStars () {
        for (let j = 0; j < stars.length; j++) {
            stars[j].style = 'color: var(--white)';
        }
    }

    function starsHover (i) {
        if (starIsLocked) return;
        for (let j = 0; j < i+1; j++) {
            stars[j].style = 'color: var(--yellow)';
        }
        for (let k = stars.length-1; k > i; k--) {
            stars[k].style = 'color: var(--white)';
        }
    }

    stars_count.addEventListener('mouseleave', cleanStars);
        for (let i = 0; i < stars.length; i++) {
            stars[i].addEventListener('mouseover', () => starsHover(i) );

            stars[i].addEventListener('click', () => {
                stars_count.removeEventListener('mouseleave', cleanStars);
                starIsLocked = true;
                for (let j = 0; j < i+1; j++) {            
                    stars[j].style = 'color: var(--yellow)';
                }
                for (let k = stars.length-1; k > i; k--) {
                    stars[k].style = 'color: var(--white)';
                }
        });
    }

    play_btn.addEventListener('click', () => {
        const video_container = document.querySelector('.video_container');
        
        if(!show_video) {
            video_container.style = "display:block";
            show_video = true;
        } else {
            video_container.style = "display:none";
            show_video = false;
        }        
    });

    close_video_btn.addEventListener('click', () => {
        const video_container = document.querySelector('.video_container');
        const video_guide = document.querySelector('#video_guide');

        video_container.style = "display:none";  
        video_guide.pause();  
    });

    delete_btn.addEventListener('click', () => {   
        const message_container = document.querySelector('.message_container');
        const title_message_box = document.querySelector('.title_message_box');
        const content_message_box = document.querySelector('.content_message_box');
        const btns_message_box = document.querySelector('.btns_message_box');

        content_message_box.innerHTML = '';
        btns_message_box.innerHTML = '';

        let new_p = document.createElement('p');

        title_message_box.children[0].innerHTML = 'Delete repository'; 

        new_p.innerHTML = 'You are about to delete this dataset, this action is not reversible. Please make sure you want to continue. Consider this action will permantly hide your repository from everyone. If you agree to continue click "Delete".';

        content_message_box.appendChild(new_p);

        message_container.style = 'display:flex;';

        let new_delete_btn = document.createElement('button');
        new_delete_btn.innerHTML = 'Delete';
        new_delete_btn.id = 'btn_message_delete';

        new_delete_btn.addEventListener('click', async () => {
            try {
                const response_mongo = await fetch(`http://localhost:3000/api/datasets/${dataset_id}/delete`, {method:'PATCH'});                
                const result_mongo = await response_mongo.json();

                const response_redis = await fetch(`http://localhost:3000/users/${sessionStorage.currentUser}/repositories/${dataset_id}`, {method:'DELETE'});
                const result_redis = await response_redis.json();

                if(response_mongo.ok && response_redis.ok) {
                    setTimeout(() => {
                        window.location.href = 'desktop.html';
                    }, 500);
                }                
            } catch (err) {
                console.error(err);
            }
        });

        btns_message_box.appendChild(new_delete_btn);
    });

    async function loadRepoInfo() {
        const repository_image = document.querySelector('#repository_image');

        const repository_name = document.querySelector('#repository_name');
        const repository_owner = document.querySelector('#repository_owner');
        const repository_file_amount = document.querySelector('#repository_file_amount');
        const repository_creation_date = document.querySelector('#repository_creation_date');
        
        const repository_description = document.querySelector('#repository_description');

        const video_guide = document.querySelector('#video_guide');

        try {
            const response = await fetch(`http://localhost:3000/api/datasets/${dataset_id}`, {method:'GET'});
            const result = await response.json();

            if(response.ok) {
                if(result.author === sessionStorage.currentUser) {
                    delete_btn.style = 'display: block';
                }

                repository_image.style.backgroundImage = `url(${asUrl(result.foto_descripcion.file_id)})`;

                repository_name.innerHTML = result.name;
                repository_owner.innerHTML = `Owner: ${result.author}`;
                repository_file_amount.innerHTML = `Files: ${result.archivos.length}`;
                repository_creation_date.innerHTML = formatDate(result.date);

                repository_description.innerHTML = result.description;

                let new_source = document.createElement('source'); 
                new_source.src = asUrl(result.videos[0].file_id);
                new_source.type = 'video/mp4';

                video_guide.appendChild(new_source);   
            }
        } catch (err) {
            console.error(err);
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    }

    function asUrl(fileId){
      return `/api/files/${fileId}`;
    }

    loadRepoInfo();
});

