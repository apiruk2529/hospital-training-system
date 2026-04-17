// Component Loader Utility
// This script loads HTML components dynamically

/**
 * Load HTML component into a container
 * @param {string} componentPath - Path to the component HTML file
 * @param {string} containerId - ID of the container element
 * @returns {Promise<void>}
 */
async function loadComponent(componentPath, containerId) {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`Failed to load component: ${componentPath}`);
        }
        const html = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
        } else {
            console.warn(`Container #${containerId} not found`);
        }
    } catch (error) {
        console.error('Error loading component:', error);
    }
}

/**
 * Load multiple components in parallel
 * @param {Array<{path: string, containerId: string}>} components - Array of component configs
 * @returns {Promise<void>}
 */
async function loadComponents(components) {
    const promises = components.map(({ path, containerId }) =>
        loadComponent(path, containerId)
    );
    await Promise.all(promises);
}

/**
 * Initialize all components when DOM is ready
 */
async function initializeComponents() {
    const components = [
        { path: '/components/login.html', containerId: 'loginPageContainer' },
        { path: '/components/navbar.html', containerId: 'navbarContainer' },
        { path: '/components/dashboard.html', containerId: 'dashboardContainer' },
        { path: '/components/records.html', containerId: 'recordsContainer' },
        { path: '/components/users.html', containerId: 'usersContainer' },
        { path: '/components/online-training.html', containerId: 'onlineTrainingContainer' },
        { path: '/components/course-detail.html', containerId: 'courseDetailContainer' },
        { path: '/components/media-library.html', containerId: 'mediaLibraryContainer' },

        { path: '/components/modals.html', containerId: 'modalsContainer' }
    ];

    await loadComponents(components);

    // Trigger custom event when all components are loaded
    document.dispatchEvent(new CustomEvent('componentsLoaded'));

    // Set flag for scripts that load after components
    window.componentsLoaded = true;
}

// Load components when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeComponents);
} else {
    initializeComponents();
}
