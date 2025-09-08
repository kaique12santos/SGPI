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

window.onclick = function(event) {
    
    if (!event.target.closest('.dropbutton')) {
        document.querySelectorAll(".menu-content").forEach(m => m.classList.remove("show"));
        document.querySelectorAll(".dropbutton").forEach(b => {
            b.setAttribute("aria-expanded", "false");
            b.blur();
        });
    }
};


