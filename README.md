# Access the app here: [https://2atoolbox.com](https://2atoolbox.com)

# 2A Toolbox

2A Toolbox is a secure, easy-to-use web application designed for firearm enthusiasts to manage their collection, track range sessions, and monitor ammunition inventory. Built with privacy and performance in mind, all data is stored locally in your browser using IndexedDB. This project was developed with assistance from AI tools like [Gab AI](https://gab.ai).

## Features

*   **Firearm Inventory:** Catalog your firearms with details, optics, and modification tracking.
*   **Ammunition Management:** Keep track of your ammo stash with real-time inventory levels.
*   **Range Sessions:** Log your range trips, track round counts, and deduct ammo used during sessions.
*   **Offline Mode:** Built as a Progressive Web App (PWA); your data stays on your machine, accessible without an internet connection.
*   **Data Sovereignty:** Full import/export capabilities. You own your data. No cloud tracking, no logins, no central servers.
*   **Responsive Design:** Optimized for both desktop and mobile devices.

## Tech Stack

*   **Frontend:** Vanilla JavaScript (ES Modules)
*   **Styling:** Modern, modular CSS
*   **Data Persistence:** IndexedDB (via a custom wrapper)
*   **Architecture:** PWA (Service Workers for offline support)

## Getting Started

### Prerequisites

*   A modern web browser (Chrome, Firefox, Brave, etc.)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/username/2a-toolbox.git
    ```

2.  **Navigate to the directory:**
    ```bash
    cd 2a-toolbox
    ```

3.  **Serve the application:**
    *   Install Python, then run: `python -m http.server 8000` (or use the Python script within the dev_tools folder of this repo).

## Privacy & Security

2A Toolbox is built for those who value privacy:

*   **No Cloud:** This app is hosted on Cloudflare Pages, but the application stores all user data locally in the browser (IndexedDB/PWA). There is no "back-end."; your data never leaves your device unless you manually export it.
*   **No Tracking:** 2A Toolbox does not use analytics, tracking pixels, or remote scripts. The only remote call is for Font Awesome icons via `cdn.jsdelivr.net`, which is handled via https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css in the source code. 


## Attribution

- Inspired by [David Cabal's Gun Tracker](https://github.com/DavidCabal/gun-tracker-downloads/tree/main)
- Icons by [Font Awesome](https://fontawesome.com)
- Hosted using [Cloudflare Pages](https://pages.cloudflare.com)

## License

This project is licensed under the [GNU General Public License v3.0 (GPLv3)](https://www.gnu.org/licenses/gpl-3.0.en.html#license-text).

- **Freedom to use**: Anyone can use this software for any purpose
- **Freedom to study**: Anyone can examine how it works and modify it
- **Freedom to distribute**: Anyone can share original or modified versions
- **Copyleft**: All derivative works must remain under GPLv3, preventing commercial proprietary exploitation

## Support

For issues or suggestions, please check the browser console for error messages and ensure you're using a supported browser version then submit an issue in the GitHub repo.

---

> The Second Amendment is not about hunting. It is not about sport. It is about the absolute necessity of an armed citizenry for a free state.
> 
> *“A well regulated militia, being necessary to the security of a free State, the right of the People to keep and bear arms, shall not be infringed.”*
