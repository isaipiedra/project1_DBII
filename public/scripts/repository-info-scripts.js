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