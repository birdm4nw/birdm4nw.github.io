document.addEventListener('DOMContentLoaded', function () {
    const toggleButton = document.getElementById('theme-toggle');

    if (!toggleButton) {
        console.error("Theme toggle button not found");
        return;
    }

    const body = document.body;
    const icon = toggleButton.querySelector('i');

    function setIcon(isDark) {
        if (!icon) return;
        if (isDark) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    // Check Local Storage
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        setIcon(true);
    } else {
        setIcon(false);
    }

    toggleButton.addEventListener('click', function (e) {
        e.preventDefault();
        console.log("Toggle clicked"); // Debug
        body.classList.toggle('dark-mode');

        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            setIcon(true);
        } else {
            localStorage.setItem('theme', 'light');
            setIcon(false);
        }
    });
});
