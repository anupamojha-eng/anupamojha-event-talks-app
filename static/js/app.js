// Application State
let appState = {
    updates: [],
    filteredUpdates: [],
    activeCategory: 'all',
    searchQuery: '',
    lastChecked: null
};

// DOM Elements
const btnRefresh = document.getElementById('btn-refresh');
const btnRetry = document.getElementById('btn-retry');
const feedLoader = document.getElementById('feed-loader');
const feedEmpty = document.getElementById('feed-empty');
const feedError = document.getElementById('feed-error');
const errorMessage = document.getElementById('error-message');
const timelineFlow = document.getElementById('timeline-flow');
const searchInput = document.getElementById('search-input');
const categoryPills = document.querySelectorAll('.filter-pill');
const statusIndicator = document.getElementById('connection-status');
const lastUpdatedText = document.getElementById('last-updated-time');
const visibleCountText = document.getElementById('visible-count');
const tweetPopover = document.getElementById('tweet-popover');
const btnTweetSelection = document.getElementById('btn-tweet-selection');
const toastContainer = document.getElementById('toast-container');

// Category Pill Count Elements
const counts = {
    all: document.getElementById('count-all'),
    Feature: document.getElementById('count-feature'),
    Announcement: document.getElementById('count-announcement'),
    Issue: document.getElementById('count-issue'),
    Change: document.getElementById('count-change'),
    Deprecation: document.getElementById('count-deprecation')
};

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    fetchUpdates();
    setupEventListeners();
});

// Event Listeners Configuration
function setupEventListeners() {
    btnRefresh.addEventListener('click', fetchUpdates);
    btnRetry.addEventListener('click', fetchUpdates);

    // Search Input keyup/input handler
    searchInput.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.toLowerCase().trim();
        filterAndRender();
    });

    // Category Pill Filters
    categoryPills.forEach(pill => {
        pill.addEventListener('click', () => {
            categoryPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            appState.activeCategory = pill.dataset.category;
            filterAndRender();
        });
    });

    // Selection tweet popover event listeners
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('keyup', handleTextSelection);

    // Clicking anywhere outside the selection popover hides it
    document.addEventListener('mousedown', (e) => {
        if (!tweetPopover.contains(e.target)) {
            // Delay slightly so click events on the button can fire before hiding
            setTimeout(() => {
                tweetPopover.classList.add('hidden');
            }, 100);
        }
    });

    // Handle selection tweet button click
    btnTweetSelection.addEventListener('click', () => {
        const text = tweetPopover.dataset.selectedText;
        const link = tweetPopover.dataset.cardLink;
        if (text) {
            shareSelectionOnTwitter(text, link);
        }
        tweetPopover.classList.add('hidden');
        window.getSelection().removeAllRanges();
    });
}

// Fetch Release Notes from Flask API
async function fetchUpdates() {
    // UI state loading
    setLoadingState(true);
    
    try {
        const response = await fetch('/api/releases');
        const data = await response.json();
        
        if (data.success && data.updates) {
            appState.updates = data.updates;
            appState.lastChecked = new Date();
            
            // Set online status and store in local state
            setConnectionStatus('online');
            updateSidebarStats();
            filterAndRender();
            
            showToast('Feed successfully updated!', 'success');
        } else {
            throw new Error(data.error || 'Server returned unsuccessful payload');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        setConnectionStatus('offline');
        showErrorState(error.message);
        showToast('Error syncing with BigQuery Feed.', 'error');
    } finally {
        setLoadingState(false);
    }
}

// Set UI status state (Online, Offline, Loading)
function setConnectionStatus(status) {
    statusIndicator.className = 'status-indicator';
    const dot = statusIndicator.querySelector('.status-dot');
    const text = statusIndicator.querySelector('.status-text');
    
    if (status === 'online') {
        statusIndicator.classList.add('online');
        text.textContent = 'Connected';
    } else if (status === 'offline') {
        statusIndicator.classList.add('offline');
        text.textContent = 'Offline';
    } else if (status === 'loading') {
        statusIndicator.classList.add('loading');
        text.textContent = 'Refreshing...';
    }
}

// Set UI state for loading indicators
function setLoadingState(isLoading) {
    const spinner = btnRefresh.querySelector('.icon-spinner');
    if (isLoading) {
        setConnectionStatus('loading');
        btnRefresh.disabled = true;
        spinner.classList.add('spinning');
        feedLoader.classList.remove('hidden');
        timelineFlow.classList.add('hidden');
        feedEmpty.classList.add('hidden');
        feedError.classList.add('hidden');
    } else {
        btnRefresh.disabled = false;
        spinner.classList.remove('spinning');
        feedLoader.classList.add('hidden');
    }
}

// Show Error UI Card
function showErrorState(msg) {
    errorMessage.textContent = msg;
    feedError.classList.remove('hidden');
    timelineFlow.classList.add('hidden');
    feedEmpty.classList.add('hidden');
}

// Update Counts and Insights in Sidebar
function updateSidebarStats() {
    // Update counts
    const stats = {
        all: appState.updates.length,
        Feature: 0,
        Announcement: 0,
        Issue: 0,
        Change: 0,
        Deprecation: 0
    };
    
    appState.updates.forEach(u => {
        // Map any unrecognized categories to Issue, Change, or Update if needed
        // E.g., Fix counts as Issue, Deprecation counts as Deprecation, etc.
        const cat = u.category;
        if (cat in stats) {
            stats[cat]++;
        } else if (cat.toLowerCase().includes('fix') || cat.toLowerCase().includes('bug')) {
            stats.Issue++;
        } else if (cat.toLowerCase().includes('deprecat')) {
            stats.Deprecation++;
        } else if (cat.toLowerCase().includes('chang')) {
            stats.Change++;
        }
    });

    // Populate UI pill badges
    Object.keys(counts).forEach(key => {
        if (counts[key]) {
            counts[key].textContent = stats[key];
        }
    });

    // Last Updated text
    if (appState.lastChecked) {
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
        lastUpdatedText.textContent = appState.lastChecked.toLocaleTimeString([], timeOptions);
    }
}

// Filter release notes according to search text and active category
function filterAndRender() {
    const category = appState.activeCategory;
    const query = appState.searchQuery;

    appState.filteredUpdates = appState.updates.filter(item => {
        // Category Filter
        let matchesCategory = true;
        if (category !== 'all') {
            if (category === 'Issue') {
                // Combine Issue and Fix tags
                matchesCategory = (item.category === 'Issue' || item.category.toLowerCase().includes('fix') || item.category.toLowerCase().includes('bug'));
            } else {
                matchesCategory = (item.category === category);
            }
        }

        // Search Filter
        let matchesSearch = true;
        if (query) {
            const searchContent = `${item.date} ${item.category} ${stripHtml(item.content)}`.toLowerCase();
            matchesSearch = searchContent.includes(query);
        }

        return matchesCategory && matchesSearch;
    });

    // Update visibility count label
    visibleCountText.textContent = appState.filteredUpdates.length;

    renderTimeline();
}

// Render filtered items onto Timeline grid
function renderTimeline() {
    timelineFlow.innerHTML = '';

    if (appState.filteredUpdates.length === 0) {
        timelineFlow.classList.add('hidden');
        feedEmpty.classList.remove('hidden');
        return;
    }

    feedEmpty.classList.add('hidden');
    timelineFlow.classList.remove('hidden');

    appState.filteredUpdates.forEach(item => {
        const card = document.createElement('article');
        // Standardize category identifier for class styles
        let normalizedCat = 'Update';
        if (['Feature', 'Announcement', 'Issue', 'Change', 'Deprecation'].includes(item.category)) {
            normalizedCat = item.category;
        } else if (item.category.toLowerCase().includes('fix') || item.category.toLowerCase().includes('bug')) {
            normalizedCat = 'Issue';
        }
        
        card.className = `timeline-card glass-card cat-${normalizedCat}`;
        card.dataset.id = item.id;
        card.dataset.link = item.link;

        // Create Badge markup
        const badgeClass = `cat-badge-${normalizedCat.toLowerCase()}`;
        
        card.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="card-header">
                <div class="card-meta">
                    <span class="card-date">${item.date}</span>
                    <span class="card-tag ${badgeClass}">${item.category}</span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-tweet" onclick="tweetCard('${item.id}')" title="Tweet this update">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Tweet</span>
                    </button>
                    ${item.link ? `
                        <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="btn-link" title="Open Release Notes source">
                            <span>Source</span>
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                            </svg>
                        </a>
                    ` : ''}
                </div>
            </div>
            <div class="update-content">
                ${item.content}
            </div>
        `;

        timelineFlow.appendChild(card);
    });
}

// Strip HTML tags from strings for clean plain text (useful for Tweet limits)
function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}

// Tweet full card handler
window.tweetCard = function(updateId) {
    const update = appState.updates.find(u => u.id === updateId);
    if (!update) return;

    const plainContent = stripHtml(update.content).trim();
    // Shorten descriptions to fit nicely inside tweets
    const summaryMaxLength = 140;
    let summary = plainContent;
    if (plainContent.length > summaryMaxLength) {
        summary = plainContent.substring(0, summaryMaxLength - 3) + '...';
    }

    const tweetText = `BigQuery ${update.category} (${update.date}):\n"${summary}"`;
    const shareUrl = update.link || 'https://cloud.google.com/bigquery';
    const hashtags = 'BigQuery,GoogleCloud';

    // Construct standard web intent share
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent(hashtags)}`;
    window.open(intentUrl, '_blank', 'width=550,height=420');
};

// Text Selection Event Listener Handler
function handleTextSelection(event) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    // Verify if selection is inside timeline container
    if (selectedText.length > 0 && timelineFlow.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Show selection popover directly centered above the highlighted text coordinates
        tweetPopover.style.left = `${rect.left + rect.width / 2}px`;
        tweetPopover.style.top = `${rect.top + window.scrollY}px`;
        
        // Save selected text & closest card metadata onto popover dataset
        tweetPopover.dataset.selectedText = selectedText;
        
        const card = selection.anchorNode.parentElement.closest('.timeline-card');
        tweetPopover.dataset.cardLink = card ? card.dataset.link : 'https://cloud.google.com/bigquery';

        tweetPopover.classList.remove('hidden');
    } else {
        // If selection is empty, hide popover
        // Verify target to make sure we don't hide popover when trying to click the tweet popover button
        if (!event.target.closest('#tweet-popover')) {
            tweetPopover.classList.add('hidden');
        }
    }
}

// Share custom highlighted text selections directly
function shareSelectionOnTwitter(text, link) {
    const cleanText = text.trim();
    // Limit text character size to prevent intent URL overflow
    const maxSelectionLength = 170;
    let snippet = cleanText;
    if (cleanText.length > maxSelectionLength) {
        snippet = cleanText.substring(0, maxSelectionLength - 3) + '...';
    }

    const tweetText = `BigQuery update highlight:\n"${snippet}"`;
    const shareUrl = link || 'https://cloud.google.com/bigquery';
    const hashtags = 'BigQuery,GoogleCloud';

    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent(hashtags)}`;
    window.open(intentUrl, '_blank', 'width=550,height=420');
}

// Show Alert Toasts
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Choose icon base on type
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    
    // Auto dismiss toast after 4s
    setTimeout(() => {
        toast.classList.add('fade-out');
        // Remove from DOM when fade transition ends
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}
