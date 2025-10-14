// efeitoMenu.js

function toggleMenu(button) {
    let menu = button.nextElementSibling;
    let isOpen = menu.classList.contains("show");

    document.querySelectorAll(".menu-content").forEach(m => m.classList.remove("show"));
    document.querySelectorAll(".dropbutton").forEach(b => {
        b.setAttribute("aria-expanded", "false");
        b.blur();
    });

    if (!isOpen) {
        menu.classList.add("show");
        button.setAttribute("aria-expanded", "true");
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const menuToggleButton = document.getElementById('menuToggleButton');
    if (menuToggleButton) {
        menuToggleButton.addEventListener('click', function() {
            toggleMenu(this);
        });
    }

    window.onclick = function(event) {
        if (!event.target.closest('.dropbutton')) {
            document.querySelectorAll(".menu-content").forEach(m => m.classList.remove("show"));
            document.querySelectorAll(".dropbutton").forEach(b => {
                b.setAttribute("aria-expanded", "false");
                b.blur();
            });
        }
    };
});