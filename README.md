# BigQuery Release Pulse ⚡

A real-time developer dashboard that tracks, filters, and shares Google Cloud BigQuery release updates. Built using Python Flask and vanilla HTML, JavaScript, and CSS.

## 🚀 Key Features

* **Granular Release Cards**: Google groups daily updates together in its Atom feed. This dashboard parses them and splits them by `<h3>` tags to display clean, independent, color-coded updates based on their type (e.g. *Features*, *Announcements*, *Issues & Fixes*, *Changes*, *Deprecations*).
* **Double-Share tweeting mechanics**:
  * **Card Sharing**: Post an update directly using the `Tweet` action button on each card, which auto-formats a tweet containing the title, date, a clipped text snippet, tags, and documentation link.
  * **Highlight Selection Sharing**: Highlight any text inside a description block to summon a floating `🐦 Tweet selection` popover above the cursor coordinates.
* **Instant Filter & Search**: Click sidebar pills to filter by categories or search keywords globally inside descriptions in real time.
* **Glassmorphic Theme**: Dark slate dashboard with gradients, glowing timeline connectors, and floating cards.
* **Local Connection Tracking**: A header status monitor displaying network sync states (`Connected`, `Refreshing...`, `Offline`).

---

## 🛠️ Tech Stack

* **Backend**:
  * **Python / Flask**: Serves the application pages and JSON APIs.
  * **xml.etree.ElementTree**: Parsers for extracting raw XML nodes.
  * **re (Regex)**: Separates daily updates.
* **Frontend**:
  * **HTML5**: Layout templates.
  * **CSS3 (Vanilla)**: Variables, flexbox, grid, glassmorphism filters, scrollbars, and keyframed toasts.
  * **JavaScript (Vanilla)**: State controllers, text selection tracking (using HTML5 Selection APIs), and Twitter Intent encoders.

---

## 📁 File Structure

```text
├── app.py                 # Flask server & feed parsing engine
├── templates/
│   └── index.html         # Main dashboard layout
├── static/
│   ├── css/
│   │   └── style.css      # Dark neon themes & animations
│   └── js/
│       └── app.js         # State management & text highlight listener
├── .gitignore             # Python, macOS, and IDE ignore list
└── README.md              # Project documentation
```

---

## 💻 Setup & Installation

### Prerequisites
* Python 3.8 or higher.
* Git.

### 1. Clone the repository and navigate to the project directory
```bash
git clone https://github.com/anupamojha-eng/anupamojha-event-talks-app.git
cd anupamojha-event-talks-app
```

### 2. Create and activate a Virtual Environment
```bash
# Create virtual environment
python3 -m venv venv

# Activate it (macOS / Linux)
source venv/bin/activate

# Activate it (Windows)
venv\Scripts\activate
```

### 3. Install Flask
```bash
pip install Flask
```

### 4. Start the Application Server
```bash
python app.py
```

### 5. Access the App
Open your browser and navigate to: **[http://127.0.0.1:5001](http://127.0.0.1:5001)**

> **Note**: The app runs on port `5001` by default to prevent conflicts with standard macOS system features (AirPlay Receiver runs on port `5000`).

---

## 🔒 SSL Certificate Bypass
The backend uses Python's standard `urllib` library to fetch updates. To bypass certificate exceptions (like `[SSL: CERTIFICATE_VERIFY_FAILED]`) on localized environments (common in macOS setups lacking system root bindings), an unverified SSL context is initialized:
```python
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE
```
This guarantees the feed is successfully retrieved anywhere without manual environment configuration.
