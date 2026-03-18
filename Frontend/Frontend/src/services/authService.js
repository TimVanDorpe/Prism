// Vergelijk met een C# Service class
// Later vervang je dit door echte API calls

const authService = {
    // Simuleert of gebruiker is ingelogd (in-memory state)
    isAuthenticated: false,

    // Login method - returns true/false
    login: (username, password) => {
        if (username === "admin" && password === "admin") {
            authService.isAuthenticated = true;
            return true;
        }
        return false;
    },

    // Logout method
    logout: () => {
        authService.isAuthenticated = false;
    },

    // Check of gebruiker is ingelogd
    checkAuth: () => {
        return authService.isAuthenticated;
    }
};

export default authService;