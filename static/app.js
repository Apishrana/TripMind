let currentPage = 'home';
let selectedFlight = null;
let selectedHotel = null;
let bookingTripDetails = null;
let toastCounter = 0;
let profileDropdownHideTimeout = null;

// ========== TOAST NOTIFICATION SYSTEM (XSS-Safe) ==========
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toastId = `toast-${toastCounter++}`;
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
    };
    
    // Create toast element safely using DOM methods
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = toastId;
    
    // Create icon element
    const iconEl = document.createElement('div');
    iconEl.className = 'toast-icon';
    iconEl.textContent = icons[type];
    
    // Create content container
    const contentEl = document.createElement('div');
    contentEl.className = 'toast-content';
    
    // Create title element
    const titleEl = document.createElement('div');
    titleEl.className = 'toast-title';
    titleEl.textContent = titles[type];
    
    // Create message element (safe from XSS)
    const messageEl = document.createElement('div');
    messageEl.className = 'toast-message';
    messageEl.textContent = message; // textContent prevents XSS
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => closeToast(toastId);
    
    // Assemble the toast
    contentEl.appendChild(titleEl);
    contentEl.appendChild(messageEl);
    toast.appendChild(iconEl);
    toast.appendChild(contentEl);
    toast.appendChild(closeBtn);
    
    container.appendChild(toast);
    
    if (duration > 0) {
        setTimeout(() => {
            closeToast(toastId);
        }, duration);
    }
    
    return toastId;
}

function closeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (!toast) return;
    
    toast.classList.add('toast-hiding');
    setTimeout(() => {
        toast.remove();
    }, 300);
}

function showSuccessToast(message, duration = 4000) {
    return showToast(message, 'success', duration);
}

function showErrorToast(message, duration = 6000) {
    return showToast(message, 'error', duration);
}

function showWarningToast(message, duration = 5000) {
    return showToast(message, 'warning', duration);
}

function showInfoToast(message, duration = 4000) {
    return showToast(message, 'info', duration);
}

// ========== THEME MANAGEMENT ==========
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    
    // Add smooth transition
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
}

function navigateTo(page) {
    // Add fade out animation
    const currentActivePage = document.querySelector('.page.active');
    if (currentActivePage) {
        currentActivePage.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            currentActivePage.classList.remove('active');
            currentActivePage.style.animation = '';
        }, 300);
    }
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    // Show/hide navbar based on page
    const navbar = document.getElementById('main-navbar');
    if (navbar) {
        if (page === 'welcome' || page === 'signin' || page === 'signup') {
            navbar.style.display = 'none';
        } else {
            navbar.style.display = 'block';
        }
    }
    
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) {
        setTimeout(() => {
            pageElement.classList.add('active');
            currentPage = page;
            
            const navLink = document.querySelector(`[data-page="${page}"]`);
            if (navLink) {
                navLink.classList.add('active');
            }
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            if (page === 'preferences') {
                loadPreferences();
            } else if (page === 'trips') {
                loadMyTrips();
            } else if (page === 'calendar') {
                loadCalendar();
            } else if (page === 'plan') {
                // Show welcome message if chat is empty
                setTimeout(() => showWelcomeMessage(), 100);
            } else if (page === 'booking') {
                // Show price summary footer on booking page
                const footer = document.getElementById("price-summary-footer");
                if (footer) {
                    footer.style.display = "block";
                }
                if (!bookingTripDetails) {
                    // If booking page opened without trip details, try to load from chat
                    openBookingPageFromChat();
                }
            } else {
                // Hide price summary footer on other pages
                const footer = document.getElementById("price-summary-footer");
                if (footer) {
                    footer.style.display = "none";
                }
            }
        }, currentActivePage ? 300 : 0);
    }
}

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-20px);
        }
    }
`;
document.head.appendChild(style);

window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

function showWelcomeMessage() {
    const messagesDiv = document.getElementById('chat-messages');
    if (!messagesDiv || messagesDiv.children.length > 0) return;
    
    messagesDiv.innerHTML = `
        <div class="welcome-message">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 1.5rem;">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="url(#gradient)"/>
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#764ba2;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#f093fb;stop-opacity:1" />
                    </linearGradient>
                </defs>
            </svg>
            <h2>Ready to Plan Your Dream Trip?</h2>
            <p>Tell me where you want to go, your budget, and dates. I'll handle everything from flights to accommodations to daily activities!</p>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-top: 2rem;">
                <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%); border-radius: 12px; max-width: 200px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" fill="url(#icon-grad)"/>
                        <defs><linearGradient id="icon-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#667eea" /><stop offset="100%" style="stop-color:#764ba2" /></linearGradient></defs>
                    </svg>
                    <div style="margin-top: 0.5rem; font-weight: 600; color: var(--primary);">Smart Scheduling</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%); border-radius: 12px; max-width: 200px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" fill="url(#budget-grad)"/>
                        <defs><linearGradient id="budget-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#764ba2" /><stop offset="100%" style="stop-color:#f093fb" /></linearGradient></defs>
                    </svg>
                    <div style="margin-top: 0.5rem; font-weight: 600; color: #a855f7;">Budget Friendly</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%); border-radius: 12px; max-width: 200px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z" fill="url(#activity-grad)"/>
                        <defs><linearGradient id="activity-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#ec4899" /><stop offset="100%" style="stop-color:#667eea" /></linearGradient></defs>
                    </svg>
                    <div style="margin-top: 0.5rem; font-weight: 600; color: #ec4899;">Personalized</div>
                </div>
            </div>
        </div>
    `;
}

function addMessage(role, content, isTyping = false, animate = true) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(20px) scale(0.95)';
    
    if (isTyping) {
        messageDiv.innerHTML = `
            <div class="message-content typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">
                ${formatMessage(content)}
            </div>
        `;
    }
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // Enhanced entrance animation with spring effect
    if (animate) {
        setTimeout(() => {
            messageDiv.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0) scale(1)';
        }, 10);
    } else {
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0) scale(1)';
    }
    
    // Add shimmer effect for AI messages
    if (role === 'assistant' && !isTyping) {
        setTimeout(() => {
            messageDiv.classList.add('message-highlight');
            setTimeout(() => {
                messageDiv.classList.remove('message-highlight');
            }, 1000);
        }, 200);
    }
}

function formatMessage(content) {
    // Convert markdown-style formatting
    content = content.replace(/\n/g, '<br>');
    content = content.replace(/```json\n([\s\S]*?)\n```/g, '<pre><code>$1</code></pre>');
    content = content.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    
    // Handle inline buttons
    content = content.replace(/<button class="btn-inline"/g, '<button class="btn-inline" style="margin: 0.5rem 0; padding: 0.5rem 1rem; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem;"');
    
    // Format code blocks
    content = content.replace(/<code>([^<]+)<\/code>/g, '<code style="background: rgba(0,0,0,0.1); padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace;">$1</code>');
    
    return content;
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const message = input.value.trim();
    
    if (!message) return;
    
    addMessage('user', message);
    input.value = '';
    
    // Add typing indicator
    const typingId = Date.now();
    addMessage('assistant', '', true);
    
    sendBtn.disabled = true;
    sendBtn.classList.add('spinning');
    sendBtn.innerHTML = '<span class="loading-spinner"></span> Planning...';
    
    try {
        const response = await fetch('/api/plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: message })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            let responseText = data.response || '';
            
            // Check if response contains booking information
            const bookingMatch = responseText.match(/booking[_\s]?id[:\s]+([A-Z0-9]+)/i);
            if (bookingMatch) {
                const bookingId = bookingMatch[1];
                responseText += `\n\n💳 <strong>Booking Created!</strong> Your booking ID is: <code>${bookingId}</code>\n\nWould you like to proceed to payment? <button class="btn-inline" onclick="navigateTo('trips'); setTimeout(() => loadMyTrips(), 500);">View My Bookings</button>`;
            }
            
            // Check for booking data in JSON format
            try {
                const jsonMatch = responseText.match(/\{[\s\S]*"booking_id"[\s\S]*\}/);
                if (jsonMatch) {
                    const bookingInfo = JSON.parse(jsonMatch[0]);
                    if (bookingInfo.booking_id) {
                        responseText = responseText.replace(jsonMatch[0], '');
                        responseText += `\n\n💳 <strong>Booking Created!</strong> Your booking ID is: <code>${bookingInfo.booking_id}</code>\n\n<button class="btn-inline" onclick="navigateTo('trips'); setTimeout(() => loadMyTrips(), 500);">View My Bookings</button>`;
                    }
                }
            } catch (e) {
                // Not JSON, continue
            }
            
            // Remove typing indicator
            const messagesDiv = document.getElementById('chat-messages');
            const typingIndicator = messagesDiv.querySelector('.typing-indicator');
            if (typingIndicator) {
                typingIndicator.closest('.message').remove();
            }
            
            addMessage('assistant', responseText);
            
            // Always try to extract trip details from AI response
            // This ensures booking buttons appear after ANY trip planning, not just when user says "book"
            setTimeout(() => {
                extractAndCreateBooking(responseText, message);
            }, 500);
        } else {
            // Remove typing indicator
            const messagesDiv = document.getElementById('chat-messages');
            const typingIndicator = messagesDiv.querySelector('.typing-indicator');
            if (typingIndicator) {
                typingIndicator.closest('.message').remove();
            }
            
            const errorMsg = data.error || 'Something went wrong';
            addMessage('assistant', '❌ Error: ' + errorMsg);
        }
    } catch (error) {
        console.error('Chat error:', error);
        
        // Remove typing indicator
        const messagesDiv = document.getElementById('chat-messages');
        const typingIndicator = messagesDiv.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.closest('.message').remove();
        }
        
        addMessage('assistant', '❌ Error connecting to server: ' + error.message + '\n\nPlease check if the server is running and try again.');
    } finally {
        sendBtn.disabled = false;
        sendBtn.classList.remove('spinning');
        sendBtn.innerHTML = '✈️ Send';
    }
}

async function extractAndCreateBooking(aiResponse, userMessage) {
    // Try to extract booking details from AI response
    try {
        // Check if we're waiting for origin from a previous trip detection
        if (window.partialTripDetails) {
            // User is responding with their origin city
            const originFromUser = userMessage.trim();
            
            // Validate it looks like a city name (basic check)
            if (originFromUser.length > 1 && /^[A-Za-z\s]+$/.test(originFromUser)) {
                // Complete the trip details with the provided origin
                window.lastTripDetails = {
                    ...window.partialTripDetails,
                    origin: originFromUser
                };
                
                const tripDetails = window.lastTripDetails;
                
                // Clear partial details
                delete window.partialTripDetails;
                
                // Calculate trip duration
                const durationDays = Math.ceil((new Date(tripDetails.end_date) - new Date(tripDetails.start_date)) / (1000 * 60 * 60 * 24)) || 1;
                const tripName = `Trip to ${tripDetails.destination}`;
                
                // Automatically save trip to My Trips and trigger booking
                setTimeout(async () => {
                    const summaryPrompt = `✨ <strong>Trip Plan Complete!</strong>\n\n📍 <strong>Destination:</strong> ${tripDetails.destination}\n✈️ <strong>Origin:</strong> ${tripDetails.origin}\n📅 <strong>Dates:</strong> ${tripDetails.start_date} to ${tripDetails.end_date}\n👥 <strong>Passengers:</strong> ${tripDetails.passengers}\n💰 <strong>Budget:</strong> $${tripDetails.budget.toFixed(2)}\n\n🔄 Saving to My Trips and opening booking...`;
                    addMessage('assistant', summaryPrompt);
                    
                    try {
                        // Save trip as itinerary
                        const itineraryResponse = await fetch('/api/itineraries', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                trip_name: tripName,
                                destination: tripDetails.destination,
                                start_date: tripDetails.start_date,
                                end_date: tripDetails.end_date,
                                duration_days: durationDays,
                                budget: tripDetails.budget,
                                description: `Trip from ${tripDetails.origin} to ${tripDetails.destination} for ${tripDetails.passengers} passenger(s)`,
                                itinerary_data: {
                                    origin: tripDetails.origin,
                                    passengers: tripDetails.passengers,
                                    ai_generated: true
                                }
                            })
                        });
                        
                        const itineraryData = await itineraryResponse.json();
                        
                        if (itineraryData.status === 'success') {
                            showToast('✅ Trip saved to My Trips!', 'success');
                            
                            // Automatically open booking modal
                            setTimeout(() => {
                                openBookingWithDetails();
                            }, 500);
                        } else {
                            showToast('⚠️ Trip details ready, but could not auto-save. You can still book!', 'warning');
                            // Still open booking even if save failed
                            setTimeout(() => {
                                openBookingWithDetails();
                            }, 500);
                        }
                    } catch (error) {
                        console.error('Error auto-saving trip:', error);
                        showToast('⚠️ Trip details ready, but could not auto-save. Opening booking...', 'warning');
                        // Still open booking even if save failed
                        setTimeout(() => {
                            openBookingWithDetails();
                        }, 500);
                    }
                }, 800);
                return;
            }
        }
        
        // Look for structured data in the response
        const destinationMatch = aiResponse.match(/destination[:\s]+([^\n,]+)/i) || 
                                 userMessage.match(/(?:to|in|visit|going to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i) ||
                                 aiResponse.match(/(?:trip to|visit|going to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
        
        // Only proceed if we have a clear destination
        if (!destinationMatch) {
            return; // No trip details found, silently exit
        }
        
        const dateMatch = aiResponse.match(/(\d{4}-\d{2}-\d{2})/g) || userMessage.match(/(\d{4}-\d{2}-\d{2})/g);
        const passengerMatch = aiResponse.match(/(\d+)\s*(?:passenger|person|people|guest)/i) || 
                              userMessage.match(/(\d+)\s*(?:passenger|person|people|guest)/i) ||
                              userMessage.match(/(?:for|with)\s+(\d+)/i);
        const budgetMatch = aiResponse.match(/budget[:\s]+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i) ||
                           userMessage.match(/budget[:\s]+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
        const originMatch = aiResponse.match(/(?:from|origin|starting from|departing from)[:\s]+([^\n,]+)/i) ||
                           userMessage.match(/(?:from|starting from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
        
        const destination = destinationMatch[1].trim().replace(/[^\w\s-]/g, '');
        
        // Use stored origin from previous trips, or ask user if not found
        let origin = null;
        if (originMatch) {
            origin = originMatch[1].trim().replace(/[^\w\s-]/g, '');
        } else if (window.lastTripDetails && window.lastTripDetails.origin) {
            origin = window.lastTripDetails.origin; // Reuse from previous trip
        }
        
        const startDate = dateMatch && dateMatch.length >= 1 ? dateMatch[0] : new Date().toISOString().split('T')[0];
        const endDate = dateMatch && dateMatch.length >= 2 ? dateMatch[1] : 
                       dateMatch && dateMatch.length >= 1 ? dateMatch[0] : 
                       new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const passengers = passengerMatch ? parseInt(passengerMatch[1]) : 1;
        const budget = budgetMatch ? parseFloat(budgetMatch[1].replace(/,/g, '')) : 1000.0;
        
        // If we don't have an origin, ask the user
        if (!origin) {
            setTimeout(() => {
                const originPrompt = `✨ <strong>Trip to ${destination} detected!</strong>\n\n📅 <strong>Dates:</strong> ${startDate} to ${endDate}\n👥 <strong>Passengers:</strong> ${passengers}\n\n⚠️ <strong>Where are you traveling from?</strong>\n\nPlease reply with your departure city (e.g., "New York", "London", "Tokyo")`;
                addMessage('assistant', originPrompt);
                
                // Store partial details to complete later
                window.partialTripDetails = {
                    destination: destination,
                    start_date: startDate,
                    end_date: endDate,
                    passengers: passengers,
                    budget: budget
                };
            }, 800);
            return;
        }
        
        // Store complete trip details for booking
        window.lastTripDetails = {
            destination: destination,
            origin: origin,
            start_date: startDate,
            end_date: endDate,
            passengers: passengers,
            budget: budget
        };
        
        // Calculate trip duration
        const durationDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) || 1;
        const tripName = `Trip to ${destination}`;
        
        // Automatically save trip to My Trips and trigger booking
        setTimeout(async () => {
            const summaryPrompt = `✨ <strong>Trip Plan Complete!</strong>\n\n📍 <strong>Destination:</strong> ${destination}\n✈️ <strong>Origin:</strong> ${origin}\n📅 <strong>Dates:</strong> ${startDate} to ${endDate}\n👥 <strong>Passengers:</strong> ${passengers}\n💰 <strong>Budget:</strong> $${budget.toFixed(2)}\n\n🔄 Saving to My Trips and opening booking...`;
            addMessage('assistant', summaryPrompt);
            
            try {
                // Save trip as itinerary
                const itineraryResponse = await fetch('/api/itineraries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        trip_name: tripName,
                        destination: destination,
                        start_date: startDate,
                        end_date: endDate,
                        duration_days: durationDays,
                        budget: budget,
                        description: `Trip from ${origin} to ${destination} for ${passengers} passenger(s)`,
                        itinerary_data: {
                            origin: origin,
                            passengers: passengers,
                            ai_generated: true
                        }
                    })
                });
                
                const itineraryData = await itineraryResponse.json();
                
                if (itineraryData.status === 'success') {
                    showToast('✅ Trip saved to My Trips!', 'success');
                    
                    // Automatically open booking modal
                    setTimeout(() => {
                        openBookingWithDetails();
                    }, 500);
                } else {
                    showToast('⚠️ Trip details ready, but could not auto-save. You can still book!', 'warning');
                    // Still open booking even if save failed
                    setTimeout(() => {
                        openBookingWithDetails();
                    }, 500);
                }
            } catch (error) {
                console.error('Error auto-saving trip:', error);
                showToast('⚠️ Trip details ready, but could not auto-save. Opening booking...', 'warning');
                // Still open booking even if save failed
                setTimeout(() => {
                    openBookingWithDetails();
                }, 500);
            }
        }, 1000);
    } catch (error) {
        console.error('Error extracting booking details:', error);
    }
}

function openBookingWithDetails() {
    // Open booking page with trip details from chat
    if (window.lastTripDetails) {
        console.log('Opening booking with trip details:', window.lastTripDetails);
        bookingTripDetails = window.lastTripDetails;
        selectedFlight = null;
        selectedHotel = null;
        
        // Fetch booking options with trip details
        fetch("/api/booking-options", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trip_details: window.lastTripDetails })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Booking options response:', data);
            if (data.status === "success") {
                bookingTripDetails = data.trip_details;
                navigateTo("booking");
                setTimeout(() => loadBookingOptions(data), 300);
            } else {
                const errorMsg = data.message || data.error || "Unknown error";
                console.error('Booking options error:', errorMsg);
                showToast(`Unable to load booking options: ${errorMsg}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error loading booking options:', error);
            showToast(`Error loading booking options: ${error.message}`, 'error');
        });
    } else {
        showToast("No trip details found. Please plan a trip first!", 'warning');
    }
}

async function createQuickBooking(destination, startDate, endDate, passengers, budget) {
    // Quick booking without selecting flights/hotels
    try {
        const tripName = `Trip to ${destination}`;
        const tripId = `chat-booking-${destination.toLowerCase().replace(/\s+/g, '-')}`;
        
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                trip_id: tripId,
                trip_name: tripName,
                destination: destination,
                start_date: startDate,
                end_date: endDate,
                total_price: budget,
                passengers: passengers,
                flight_details: {},
                hotel_details: {}
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            addMessage('assistant', `✅ <strong>Quick Booking Created!</strong>\n\nBooking ID: <code>${data.booking_id}</code>\n\nYou can view and manage your booking in "My Trips" or proceed to payment.\n\n<button class="btn-inline" onclick="navigateTo('trips'); setTimeout(() => loadMyTrips(), 500);">View My Trips</button>`);
        } else {
            addMessage('assistant', '❌ Error creating booking: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        addMessage('assistant', '❌ Error creating booking: ' + error.message);
    }
}

async function createBookingFromChat(destination, startDate, endDate, passengers, basePrice) {
    try {
        const tripName = `Trip to ${destination}`;
        const tripId = `chat-booking-${destination.toLowerCase().replace(/\s+/g, '-')}`;
        
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                trip_id: tripId,
                trip_name: tripName,
                destination: destination,
                start_date: startDate,
                end_date: endDate,
                total_price: basePrice * passengers,
                passengers: passengers,
                flight_details: {},
                hotel_details: {}
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            addMessage('assistant', `✅ Booking created successfully! Booking ID: <strong>${data.booking_id}</strong>\n\nYou can now proceed to payment from the "My Trips" page.`);
            setTimeout(() => {
                navigateTo('trips');
                loadMyTrips();
            }, 2000);
        } else {
            addMessage('assistant', '❌ Error creating booking: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        addMessage('assistant', '❌ Error creating booking: ' + error.message);
    }
}

async function clearChat() {
    if (confirm('Clear conversation history?')) {
        const messagesDiv = document.getElementById('chat-messages');
        messagesDiv.innerHTML = '';
        
        try {
            await fetch('/api/reset', { method: 'POST' });
        } catch (error) {
            console.error('Error resetting memory:', error);
        }
        
        addMessage('assistant', 
            '👋 Chat cleared! Ready to help you plan your next adventure. Where would you like to go? 🌍'
        );
    }
}

function setQuickExample(text) {
    document.getElementById('chat-input').value = text;
    navigateTo('plan');
    setTimeout(() => {
        document.getElementById('chat-input').focus();
    }, 100);
}

async function loadPreferences() {
    try {
        const response = await fetch('/api/preferences');
        const data = await response.json();
        
        const prefsDiv = document.getElementById('saved-preferences');
        if (data.preferences && Object.keys(data.preferences).length > 0) {
            let html = '<div class="preferences-card"><h3>Your Saved Preferences</h3>';
            for (const [key, value] of Object.entries(data.preferences)) {
                html += `<p><strong>${key}:</strong> ${JSON.stringify(value)}</p>`;
            }
            html += '</div>';
            prefsDiv.innerHTML = html;
        } else {
            prefsDiv.innerHTML = '<div class="preferences-card"><p>No preferences saved yet. Chat with the AI to save your preferences!</p></div>';
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

async function savePreferencesForm() {
    const budget = document.getElementById('pref-budget').value;
    const style = document.getElementById('pref-style').value;
    const activities = document.getElementById('pref-activities').value;
    
    const message = `Save my preferences: budget style is ${budget}, I prefer ${style} accommodations, and I enjoy ${activities}`;
    
    navigateTo('plan');
    document.getElementById('chat-input').value = message;
    await sendMessage();
}

async function openBookingModal(tripId, tripName, destination, startDate, endDate, price) {
    const modal = document.getElementById('booking-modal');
    const modalBody = document.querySelector('#booking-modal .modal-body');
    
    const tripImages = {
        'goa-beach': '🏖️',
        'paris-family': '🗼',
        'manali-adventure': '⛰️'
    };
    
    const tripIcon = tripImages[tripId] || '✈️';
    
    modalBody.innerHTML = `
        <div class="booking-hero">
            <div class="booking-hero-icon">${tripIcon}</div>
            <div class="booking-hero-content">
                <h3 class="booking-destination">${destination}</h3>
                <p class="booking-subtitle">${tripName}</p>
            </div>
        </div>
        
        <div class="booking-summary-card">
            <div class="booking-row">
                <div class="booking-detail">
                    <div class="booking-icon">📅</div>
                    <div>
                        <div class="detail-label">Travel Dates</div>
                        <div class="detail-value">${startDate} to ${endDate}</div>
                    </div>
                </div>
            </div>
            
            <div class="booking-row">
                <div class="booking-detail">
                    <div class="booking-icon">👥</div>
                    <div>
                        <div class="detail-label">Passengers</div>
                        <div class="passenger-controls">
                            <button class="passenger-btn" onclick="updatePassengers(-1, ${price})" type="button">
                                <span>−</span>
                            </button>
                            <input type="number" id="passengers" min="1" max="10" value="1" readonly>
                            <button class="passenger-btn" onclick="updatePassengers(1, ${price})" type="button">
                                <span>+</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="price-breakdown-card">
            <h4 style="margin-bottom: 1rem; color: var(--dark); font-size: 1.1rem;">💰 Price Breakdown</h4>
            <div class="price-row">
                <span>Base price per person</span>
                <span id="base-price">$${price.toFixed(2)}</span>
            </div>
            <div class="price-row">
                <span>Number of passengers</span>
                <span id="passenger-count">1</span>
            </div>
            <div class="price-divider"></div>
            <div class="price-row total-row">
                <span><strong>Total Amount</strong></span>
                <span id="total-price" class="total-price">$${price.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="trust-badges">
            <div class="trust-badge">
                <span>🔒</span>
                <span>Secure Payment</span>
            </div>
            <div class="trust-badge">
                <span>✓</span>
                <span>Instant Confirmation</span>
            </div>
            <div class="trust-badge">
                <span>🛡️</span>
                <span>Protected Booking</span>
            </div>
        </div>
        
        <div class="booking-form">
            <div class="form-group-modern">
                <label class="form-label-modern">
                    <span class="label-icon">✉️</span>
                    <span>Contact Email</span>
                </label>
                <input type="email" id="booking-email" class="form-input-modern" placeholder="your@email.com" required>
            </div>
            
            <div class="form-group-modern">
                <label class="form-label-modern">
                    <span class="label-icon">📝</span>
                    <span>Special Requests (Optional)</span>
                </label>
                <textarea id="special-requests" class="form-input-modern" rows="3" placeholder="Dietary restrictions, accessibility needs, room preferences..."></textarea>
            </div>
        </div>
        
        <button class="btn-booking-cta" onclick="processBooking('${tripId}', '${tripName}', '${destination}', '${startDate}', '${endDate}', ${price})">
            <span class="cta-text">Proceed to Secure Payment</span>
            <span class="cta-icon">💳</span>
        </button>
        
        <div class="booking-footer-note">
            <p>🔐 Your payment is processed securely through Stripe. You'll be redirected to complete your booking.</p>
        </div>
    `;
    
    modal.classList.add('active');
}

function updatePassengers(change, basePrice) {
    const input = document.getElementById('passengers');
    let current = parseInt(input.value) || 1;
    current = Math.max(1, Math.min(10, current + change));
    input.value = current;
    
    const total = basePrice * current;
    document.getElementById('total-price').textContent = `$${total.toFixed(2)}`;
    document.getElementById('passenger-count').textContent = current;
    
    const totalElement = document.getElementById('total-price');
    totalElement.style.transform = 'scale(1.1)';
    setTimeout(() => {
        totalElement.style.transform = 'scale(1)';
    }, 200);
}

async function processBooking(tripId, tripName, destination, startDate, endDate, basePrice) {
    const email = document.getElementById('booking-email').value;
    const passengers = parseInt(document.getElementById('passengers').value) || 1;
    const specialRequests = document.getElementById('special-requests').value;
    const totalPrice = basePrice * passengers;
    
    if (!email) {
        alert('Please enter your email address');
        return;
    }
    
    try {
        const bookingResponse = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                trip_id: tripId,
                trip_name: tripName,
                destination: destination,
                start_date: startDate,
                end_date: endDate,
                total_price: totalPrice,
                passengers: passengers,
                flight_details: { email, special_requests: specialRequests },
                hotel_details: {}
            })
        });
        
        const bookingData = await bookingResponse.json();
        
        if (bookingData.status === 'success') {
            const paymentResponse = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    booking_id: bookingData.booking_id,
                    amount: totalPrice
                })
            });
            
            const paymentData = await paymentResponse.json();
            
            if (paymentData.status === 'success') {
                window.location.href = paymentData.checkout_url;
            } else {
                alert('Error creating payment session: ' + (paymentData.error || 'Unknown error'));
            }
        }
    } catch (error) {
        alert('Error processing booking: ' + error.message);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
}

let calendar = null;
let currentEditingEvent = null;

async function loadCalendar() {
    const calendarEl = document.getElementById('calendar-container');
    if (!calendarEl) return;
    
    // Initialize FullCalendar if not already done
    if (!calendar) {
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: ''
            },
            editable: true,
            droppable: false,
            selectable: true,
            selectMirror: true,
            dayMaxEvents: true,
            weekends: true,
            navLinks: true,
            eventClick: function(info) {
                openEventModalForEdit(info.event);
            },
            dateClick: function(info) {
                openEventModalForDate(info.dateStr);
            },
            eventDrop: function(info) {
                updateEventDates(info.event);
            },
            eventResize: function(info) {
                updateEventDates(info.event);
            },
            events: async function(fetchInfo, successCallback, failureCallback) {
                try {
                    const response = await fetch(`/api/calendar/events?start=${fetchInfo.startStr}&end=${fetchInfo.endStr}`);
                    if (!response.ok) {
                        console.error('HTTP error loading events:', response.status, response.statusText);
                        failureCallback();
                        return;
                    }
                    const data = await response.json();
                    console.log('Events loaded:', data);
                    if (data.status === 'success' && Array.isArray(data.events)) {
                        console.log(`Loaded ${data.events.length} events`);
                        successCallback(data.events);
                    } else {
                        console.error('Invalid response format:', data);
                        failureCallback();
                    }
                } catch (error) {
                    console.error('Error loading events:', error);
                    failureCallback();
                }
            },
            eventContent: function(info) {
                const event = info.event;
                const props = event.extendedProps || {};
                const title = event.title || 'Untitled Event';
                
                let icon = '';
                if (props.is_booking) {
                    icon = '✈️';
                } else if (props.event_type === 'reminder') {
                    icon = '🔔';
                } else if (props.event_type === 'trip') {
                    icon = '🗺️';
                } else if (props.event_type === 'personal') {
                    icon = '📌';
                } else {
                    icon = '📅';
                }
                
                const html = `
                    <div style="
                        padding: 4px 6px;
                        font-size: 0.85rem;
                        font-weight: 600;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    ">
                        <span>${icon}</span>
                        <span>${title}</span>
                    </div>
                `;
                
                return { html: html };
            },
            eventDidMount: function(info) {
                // Add hover tooltip with description
                if (info.event.extendedProps && info.event.extendedProps.description) {
                    info.el.setAttribute('title', info.event.extendedProps.description);
                }
            },
            height: 'auto',
            contentHeight: 'auto',
            aspectRatio: 1.8,
            loading: function(isLoading) {
                if (isLoading) {
                    calendarEl.classList.add('loading');
                } else {
                    calendarEl.classList.remove('loading');
                    updateCalendarStats();
                }
            }
        });
        
        calendar.render();
        
        // Hide loading state after render
        setTimeout(() => {
            calendarEl.classList.remove('loading');
            updateCalendarStats();
        }, 500);
    } else {
        // Refresh events
        calendar.refetchEvents();
        setTimeout(() => {
            calendarEl.classList.remove('loading');
            updateCalendarStats();
        }, 500);
    }
}

// Switch calendar view
function switchCalendarView(viewName) {
    if (calendar) {
        calendar.changeView(viewName);
        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const viewMap = {
            'dayGridMonth': 'month',
            'timeGridWeek': 'week',
            'timeGridDay': 'day',
            'listWeek': 'list'
        };
        const activeBtn = document.querySelector(`.view-btn[data-view="${viewMap[viewName]}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }
}

// Go to today
function goToToday() {
    if (calendar) {
        calendar.today();
        calendar.refetchEvents();
    }
}

// Update calendar statistics
async function updateCalendarStats() {
    try {
        const response = await fetch('/api/calendar/events');
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.status === 'success' && Array.isArray(data.events)) {
            const events = data.events;
            const now = new Date();
            
            // Total events
            const totalEl = document.getElementById('total-events-count');
            if (totalEl) {
                animateValue(totalEl, 0, events.length, 500);
            }
            
            // Booking events
            const bookingCount = events.filter(e => e.extendedProps?.is_booking).length;
            const bookingEl = document.getElementById('booking-events-count');
            if (bookingEl) {
                animateValue(bookingEl, 0, bookingCount, 500);
            }
            
            // Upcoming events (within next 7 days)
            const upcomingCount = events.filter(e => {
                const startDate = new Date(e.start);
                return startDate >= now && startDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            }).length;
            const upcomingEl = document.getElementById('upcoming-events-count');
            if (upcomingEl) {
                animateValue(upcomingEl, 0, upcomingCount, 500);
            }
        }
    } catch (error) {
        console.error('Error updating calendar stats:', error);
    }
}

// Animate number counter
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        element.textContent = current;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.textContent = end;
        }
    };
    window.requestAnimationFrame(step);
}

function openEventModal() {
    currentEditingEvent = null;
    document.getElementById('event-modal-title').textContent = '➕ Create New Event';
    document.getElementById('event-form').reset();
    document.getElementById('event-all-day').checked = true;
    document.getElementById('event-time-fields').style.display = 'none';
    document.getElementById('event-reminder').checked = false;
    document.getElementById('reminder-options').style.display = 'none';
    document.getElementById('event-delete-btn').style.display = 'none';
    document.getElementById('event-color').value = '#6366f1';
    document.getElementById('event-color-text').value = '#6366f1';
    
    // Set default dates to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('event-start-date').value = today;
    document.getElementById('event-end-date').value = today;
    
    document.getElementById('event-modal').classList.add('active');
}

function openEventModalForDate(dateStr) {
    openEventModal();
    document.getElementById('event-start-date').value = dateStr;
    document.getElementById('event-end-date').value = dateStr;
}

function openEventModalForEdit(event) {
    currentEditingEvent = event;
    const props = event.extendedProps;
    
    // Only allow editing of manual events, not bookings
    if (props.is_booking) {
        alert('This is a booking event. Please edit it from the "My Trips" page.');
        return;
    }
    
    document.getElementById('event-modal-title').textContent = '✏️ Edit Event';
    document.getElementById('event-title').value = event.title;
    document.getElementById('event-description').value = event.extendedProps.description || '';
    
    const startDate = event.start;
    const endDate = event.end || event.start;
    
    document.getElementById('event-start-date').value = startDate.toISOString().split('T')[0];
    document.getElementById('event-end-date').value = endDate.toISOString().split('T')[0];
    
    const allDay = event.allDay;
    document.getElementById('event-all-day').checked = allDay;
    toggleEventTime();
    
    if (!allDay && startDate instanceof Date) {
        const startTime = startDate.toTimeString().slice(0, 5);
        const endTime = endDate.toTimeString().slice(0, 5);
        document.getElementById('event-start-time').value = startTime;
        document.getElementById('event-end-time').value = endTime;
    }
    
    document.getElementById('event-type').value = props.event_type || 'personal';
    document.getElementById('event-tags').value = (props.tags || []).join(', ');
    document.getElementById('event-color').value = event.backgroundColor || '#6366f1';
    document.getElementById('event-color-text').value = event.backgroundColor || '#6366f1';
    
    const reminderEnabled = props.reminder_enabled === true || props.reminder_enabled === 'true';
    document.getElementById('event-reminder').checked = reminderEnabled;
    if (reminderEnabled) {
        document.getElementById('reminder-options').style.display = 'block';
        document.getElementById('event-reminder-time').value = props.reminder_time || '1 day before';
    }
    
    document.getElementById('event-delete-btn').style.display = 'block';
    document.getElementById('event-modal').classList.add('active');
}

function toggleEventTime() {
    const allDay = document.getElementById('event-all-day').checked;
    const timeFields = document.getElementById('event-time-fields');
    const startTimeInput = document.getElementById('event-start-time');
    const endTimeInput = document.getElementById('event-end-time');
    
    timeFields.style.display = allDay ? 'none' : 'grid';
    
    // Make time fields required when not all-day
    if (startTimeInput && endTimeInput) {
        if (allDay) {
            startTimeInput.removeAttribute('required');
            endTimeInput.removeAttribute('required');
        } else {
            startTimeInput.setAttribute('required', 'required');
            endTimeInput.setAttribute('required', 'required');
        }
    }
}

function updateEventColor() {
    const eventType = document.getElementById('event-type').value;
    const colorMap = {
        'personal': '#6366f1',
        'trip': '#10b981',
        'booking': '#3b82f6',
        'reminder': '#f59e0b'
    };
    const color = colorMap[eventType] || '#6366f1';
    document.getElementById('event-color').value = color;
    document.getElementById('event-color-text').value = color;
}

async function saveEvent(e) {
    e.preventDefault();
    
    const title = document.getElementById('event-title').value;
    const description = document.getElementById('event-description').value;
    const startDate = document.getElementById('event-start-date').value;
    const endDate = document.getElementById('event-end-date').value;
    const allDay = document.getElementById('event-all-day').checked;
    const startTimeInput = document.getElementById('event-start-time').value;
    const endTimeInput = document.getElementById('event-end-time').value;
    const eventType = document.getElementById('event-type').value;
    const tags = document.getElementById('event-tags').value.split(',').map(t => t.trim()).filter(t => t);
    const color = document.getElementById('event-color-text').value;
    const reminderEnabled = document.getElementById('event-reminder').checked;
    const reminderTime = reminderEnabled ? document.getElementById('event-reminder-time').value : null;
    
    // Validation: if not all-day, require times
    let startTime = null;
    let endTime = null;
    if (!allDay) {
        if (!startTimeInput || !endTimeInput) {
            showErrorToast('Please enter both start and end times for timed events');
            return;
        }
        startTime = startTimeInput;
        endTime = endTimeInput;
        
        // Validate that end time is after start time on the same day
        if (startDate === endDate) {
            const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
            const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
            if (endMinutes <= startMinutes) {
                showErrorToast('End time must be after start time');
                return;
            }
        }
    }
    
    // Validate dates
    if (new Date(endDate) < new Date(startDate)) {
        showErrorToast('End date must be on or after start date');
        return;
    }
    
    // Add loading state to save button
    const saveBtn = document.querySelector('#event-form button[type="submit"]');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '⏳ Saving...';
    }
    
    const eventData = {
        title: title,
        description: description,
        start_date: startDate,
        end_date: endDate,
        start_time: startTime,
        end_time: endTime,
        all_day: allDay ? "true" : "false",
        event_type: eventType,
        tags: tags,
        color: color,
        reminder_enabled: reminderEnabled ? "true" : "false",
        reminder_time: reminderTime
    };
    
    try {
        let response;
        if (currentEditingEvent && currentEditingEvent.extendedProps.database_id) {
            // Update existing event
            response = await fetch(`/api/calendar/events/${currentEditingEvent.extendedProps.database_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });
        } else {
            // Create new event
            response = await fetch('/api/calendar/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('HTTP error saving event:', response.status, errorText);
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText || `HTTP ${response.status} error` };
            }
            alert('Error saving event: ' + (errorData.error || errorData.detail || `HTTP ${response.status} error`));
            return;
        }
        
        const data = await response.json();
        console.log('Event save response:', data);
        if (data.status === 'success') {
            showSuccessMessage('✅ Event saved successfully!');
            closeEventModal();
            // Force calendar refresh with animation
            if (calendar) {
                setTimeout(() => {
                    calendar.refetchEvents();
                    updateCalendarStats();
                    
                    // Add a subtle flash animation to the calendar
                    const calendarWrapper = document.querySelector('.calendar-wrapper');
                    if (calendarWrapper) {
                        calendarWrapper.style.animation = 'none';
                        setTimeout(() => {
                            calendarWrapper.style.animation = 'messageHighlight 0.8s ease-out';
                        }, 10);
                    }
                }, 100);
            }
        } else {
            const errorMsg = data.error || data.detail || 'Unknown error occurred';
            console.error('Error saving event:', errorMsg, data);
            alert('Error saving event: ' + errorMsg);
        }
    } catch (error) {
        console.error('Error saving event:', error);
        alert('Error saving event: ' + (error.message || 'Network error. Please check your connection.'));
    } finally {
        // Restore button state
        const saveBtn = document.querySelector('#event-form button[type="submit"]');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '💾 Save Event';
        }
    }
}

async function deleteEvent() {
    if (!currentEditingEvent || !currentEditingEvent.extendedProps.database_id) {
        alert('Cannot delete this event');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this event?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/calendar/events/${currentEditingEvent.extendedProps.database_id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            showSuccessMessage('✅ Event deleted successfully!');
            closeEventModal();
            if (calendar) {
                setTimeout(() => {
                    calendar.refetchEvents();
                    updateCalendarStats();
                }, 100);
            }
        } else {
            const errorMsg = data.error || data.detail || 'Unknown error occurred';
            console.error('Error deleting event:', errorMsg, data);
            alert('Error deleting event: ' + errorMsg);
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event: ' + (error.message || 'Network error. Please check your connection.'));
    }
}

async function updateEventDates(event) {
    // Only update manual events, not bookings
    if (event.extendedProps.is_booking || !event.extendedProps.database_id) {
        calendar.refetchEvents(); // Revert the change
        return;
    }
    
    const start = event.start;
    const end = event.end || event.start;
    
    const eventData = {
        title: event.title,
        description: event.extendedProps.description || '',
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        start_time: event.allDay ? null : start.toTimeString().slice(0, 5),
        end_time: event.allDay ? null : (end.toTimeString().slice(0, 5)),
        all_day: event.allDay ? "true" : "false",
        event_type: event.extendedProps.event_type || 'personal',
        tags: event.extendedProps.tags || [],
        color: event.backgroundColor,
        reminder_enabled: event.extendedProps.reminder_enabled ? "true" : "false",
        reminder_time: event.extendedProps.reminder_time
    };
    
    try {
        const response = await fetch(`/api/calendar/events/${event.extendedProps.database_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });
        
        const data = await response.json();
        if (data.status !== 'success') {
            calendar.refetchEvents(); // Revert on error
        }
    } catch (error) {
        console.error('Error updating event:', error);
        calendar.refetchEvents(); // Revert on error
    }
}

function closeEventModal() {
    document.getElementById('event-modal').classList.remove('active');
    currentEditingEvent = null;
}

// Moved to main DOMContentLoaded listener below

async function viewItinerary(id) {
    try {
        const response = await fetch(`/api/itineraries/${id}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            const itin = data.itinerary;
            const passengers = prompt(`Trip: ${itin.trip_name}\nDestination: ${itin.destination}\nDates: ${itin.start_date} to ${itin.end_date}\nDuration: ${itin.duration_days} days\nBudget: $${itin.budget || 'N/A'}\n\n${itin.description || ''}\n\nWould you like to book this trip? Enter number of passengers (1-10):`, '1');
            
            if (passengers && !isNaN(passengers) && parseInt(passengers) >= 1 && parseInt(passengers) <= 10) {
                const bookingResponse = await fetch(`/api/bookings/from-itinerary/${id}?passengers=${parseInt(passengers)}`, {
                    method: 'POST'
                });
                
                const bookingData = await bookingResponse.json();
                
                if (bookingData.status === 'success') {
                    showSuccessMessage(`✅ Booking created! Booking ID: ${bookingData.booking_id}. Redirecting to payment...`);
                    setTimeout(() => {
                        navigateTo('trips');
                        loadMyTrips();
                    }, 2000);
                } else {
                    alert('Error creating booking: ' + (bookingData.error || 'Unknown error'));
                }
            }
        }
    } catch (error) {
        alert('Error loading itinerary: ' + error.message);
    }
}

async function bookFromItinerary(id) {
    const passengers = prompt('Enter number of passengers (1-10):', '1');
    
    if (!passengers || isNaN(passengers) || parseInt(passengers) < 1 || parseInt(passengers) > 10) {
        alert('Please enter a valid number of passengers between 1 and 10');
        return;
    }
    
    try {
        const response = await fetch(`/api/bookings/from-itinerary/${id}?passengers=${parseInt(passengers)}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showSuccessMessage(`✅ Booking created! Booking ID: ${data.booking_id}`);
            navigateTo('trips');
            setTimeout(() => {
                loadMyTrips();
            }, 500);
        } else {
            alert('Error creating booking: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Error creating booking: ' + error.message);
    }
}

async function deleteItinerary(id) {
    if (!confirm('Are you sure you want to delete this itinerary?')) return;
    
    try {
        const response = await fetch(`/api/itineraries/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showSuccessMessage('✅ Itinerary deleted successfully!');
            loadCalendar();
        } else {
            alert('Error deleting itinerary');
        }
    } catch (error) {
        alert('Error deleting itinerary: ' + error.message);
    }
}

async function loadMyTrips() {
    const tripsGrid = document.querySelector('#trips-page .trips-grid');
    
    if (!tripsGrid) {
        console.error('Trips grid element not found');
        return;
    }
    
    tripsGrid.innerHTML = '<div class="loading-container"><div class="loading-spinner-large"></div><p>Loading your trips...</p></div>';
    
    try {
        const response = await fetch('/api/bookings');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success' && data.bookings && data.bookings.length > 0) {
            let html = '';
            
            data.bookings.forEach(booking => {
                const statusBadge = booking.status === 'confirmed' 
                    ? '<span class="badge badge-success">✓ Confirmed</span>'
                    : booking.status === 'cancelled'
                    ? '<span class="badge" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">Cancelled</span>'
                    : '<span class="badge badge-primary">Pending</span>';
                
                html += `
                    <div class="trip-card" onclick="handleTripClick('${booking.id}', '${booking.payment_status}')" style="cursor: pointer; transition: all 0.3s ease;">
                        <div class="trip-image">✈️</div>
                        <div class="trip-content">
                            <h3 class="trip-title">${booking.trip_name}</h3>
                            <div class="trip-meta">📅 ${booking.start_date} to ${booking.end_date} • 💰 $${(booking.total_price || 0).toFixed(2)} • 👥 ${booking.passengers || 1} passenger(s)</div>
                            <p class="feature-desc">${booking.destination}</p>
                            <div style="margin-top: 1rem;">
                                ${statusBadge}
                                ${booking.payment_status === 'paid' ? '<span class="badge badge-success">💳 Paid</span>' : '<span class="badge badge-warning">💳 Unpaid</span>'}
                            </div>
                            <div style="margin-top: 1rem;">
                                <small style="color: var(--gray);">Booking ID: ${booking.id}</small>
                            </div>
                            <div style="margin-top: 0.5rem;">
                                <button class="btn-small btn-view" onclick="event.stopPropagation(); viewBookingDetailsModal('${booking.id}')" style="margin-right: 0.5rem;">📋 View Details</button>
                                ${booking.status !== 'cancelled' && booking.payment_status !== 'paid' ? 
                                    `<button class="btn-small btn-primary" onclick="event.stopPropagation(); proceedToPayment('${booking.id}', ${booking.total_price})">💳 Complete Payment</button>
                                    <button class="btn-small btn-delete" onclick="event.stopPropagation(); cancelBooking('${booking.id}')" style="margin-left: 0.5rem;">❌ Cancel</button>` : 
                                    ''}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                <div class="trip-card" style="border: 2px dashed var(--primary); background: rgba(99, 102, 241, 0.05);">
                    <div class="trip-image" style="background: rgba(99, 102, 241, 0.1); color: var(--primary);">➕</div>
                    <div class="trip-content" style="text-align: center;">
                        <h3 class="trip-title" style="color: var(--primary);">Plan New Trip</h3>
                        <p class="feature-desc" style="margin: 1rem 0;">Ready for your next adventure? Let our AI help you plan the perfect trip!</p>
                        <button class="btn btn-primary" onclick="navigateTo('plan')">🚀 Start Planning</button>
                    </div>
                </div>
            `;
            
            tripsGrid.innerHTML = html;
        } else {
            // Show empty state when no bookings
            tripsGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">✈️</div>
                    <h3>No trips booked yet</h3>
                    <p>Start planning your next adventure and your bookings will appear here!</p>
                    <button class="btn btn-primary" onclick="navigateTo('plan')">🚀 Plan Your First Trip</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading trips:', error);
        tripsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❌</div>
                <h3>Error loading trips</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadMyTrips()">🔄 Try Again</button>
            </div>
        `;
    }
}

function checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const bookingId = urlParams.get('booking_id');
    
    if (paymentStatus === 'success' && bookingId) {
        fetch(`/api/bookings/${bookingId}/confirm`, { method: 'POST' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(() => {
                navigateTo('trips');
                setTimeout(() => {
                    showSuccessMessage('🎉 Payment Successful! Your trip is confirmed!');
                    loadMyTrips();
                }, 500);
            })
            .catch(error => {
                console.error('Error confirming booking:', error);
                showSuccessMessage('⚠️ Payment was successful but there was an error confirming your booking. Please contact support.', 'warning');
            });
        
        window.history.replaceState({}, document.title, '/');
    } else if (paymentStatus === 'cancelled') {
        showSuccessMessage('❌ Payment was cancelled. You can try again from My Trips.', 'warning');
        window.history.replaceState({}, document.title, '/');
    }
}

// Handle trip card click
function handleTripClick(bookingId, paymentStatus) {
    if (paymentStatus === 'paid') {
        // Show full booking details in modal
        viewBookingDetailsModal(bookingId);
    } else {
        // Show booking details and offer to complete payment
        viewBookingDetailsModal(bookingId);
    }
}

// View booking details in a beautiful modal
async function viewBookingDetailsModal(bookingId) {
    try {
        const response = await fetch(`/api/bookings/${bookingId}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            const booking = data.booking;
            
            const statusBadge = booking.status === 'confirmed' 
                ? '<span class="badge badge-success">✓ Confirmed</span>'
                : booking.status === 'cancelled'
                ? '<span class="badge" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">Cancelled</span>'
                : '<span class="badge badge-primary">Pending</span>';
            
            const paymentBadge = booking.payment_status === 'paid' 
                ? '<span class="badge badge-success">💳 Paid</span>' 
                : '<span class="badge badge-warning">💳 Unpaid</span>';
            
            const modalHTML = `
                <div class="modal-backdrop" onclick="closeBookingModal()">
                    <div class="modal-content booking-details-modal" onclick="event.stopPropagation()">
                        <div class="modal-header">
                            <h2>✈️ ${booking.trip_name}</h2>
                            <button class="close-btn" onclick="closeBookingModal()">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="booking-status-badges">
                                ${statusBadge}
                                ${paymentBadge}
                            </div>
                            
                            <div class="booking-detail-section">
                                <h3>📍 Trip Information</h3>
                                <div class="detail-row">
                                    <span class="detail-label">Destination:</span>
                                    <span class="detail-value">${booking.destination}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Travel Dates:</span>
                                    <span class="detail-value">${booking.start_date} to ${booking.end_date}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Passengers:</span>
                                    <span class="detail-value">${booking.passengers} person(s)</span>
                                </div>
                            </div>
                            
                            <div class="booking-detail-section">
                                <h3>💰 Pricing Details</h3>
                                <div class="detail-row">
                                    <span class="detail-label">Base Price:</span>
                                    <span class="detail-value">$${(booking.base_price || 0).toFixed(2)}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Total Amount:</span>
                                    <span class="detail-value" style="font-weight: 700; font-size: 1.2em; color: var(--primary);">$${(booking.total_price || 0).toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <div class="booking-detail-section">
                                <h3>📋 Booking Information</h3>
                                <div class="detail-row">
                                    <span class="detail-label">Booking ID:</span>
                                    <span class="detail-value"><code>${booking.booking_id}</code></span>
                                </div>
                                ${booking.email ? `
                                <div class="detail-row">
                                    <span class="detail-label">Email:</span>
                                    <span class="detail-value">${booking.email}</span>
                                </div>
                                ` : ''}
                                <div class="detail-row">
                                    <span class="detail-label">Created:</span>
                                    <span class="detail-value">${booking.created_at ? new Date(booking.created_at).toLocaleString() : 'N/A'}</span>
                                </div>
                                ${booking.confirmed_at ? `
                                <div class="detail-row">
                                    <span class="detail-label">Confirmed:</span>
                                    <span class="detail-value">${new Date(booking.confirmed_at).toLocaleString()}</span>
                                </div>
                                ` : ''}
                                ${booking.cancelled_at ? `
                                <div class="detail-row">
                                    <span class="detail-label">Cancelled:</span>
                                    <span class="detail-value">${new Date(booking.cancelled_at).toLocaleString()}</span>
                                </div>
                                ` : ''}
                                ${booking.special_requests ? `
                                <div class="detail-row">
                                    <span class="detail-label">Special Requests:</span>
                                    <span class="detail-value">${booking.special_requests}</span>
                                </div>
                                ` : ''}
                            </div>
                            
                            <div class="modal-actions">
                                ${booking.payment_status !== 'paid' && booking.status !== 'cancelled' ? 
                                    `<button class="btn btn-primary" onclick="proceedToPayment('${booking.id}', ${booking.total_price})">💳 Complete Payment</button>` 
                                    : ''}
                                ${booking.status !== 'cancelled' && booking.payment_status !== 'paid' ? 
                                    `<button class="btn btn-secondary" onclick="cancelBooking('${booking.id}'); closeBookingModal();">❌ Cancel Booking</button>` 
                                    : ''}
                                <button class="btn btn-secondary" onclick="closeBookingModal()">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    } catch (error) {
        alert('Error loading booking details: ' + error.message);
    }
}

function closeBookingModal() {
    const modal = document.querySelector('.modal-backdrop');
    if (modal) {
        modal.remove();
    }
}

// Proceed to payment for unpaid bookings
async function proceedToPayment(bookingId, totalPrice) {
    try {
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                booking_id: bookingId,
                amount: totalPrice
            })
        });
        
        const data = await response.json();
        
        if (data.url) {
            window.location.href = data.url;
        } else {
            alert('Error creating payment session. Please try again.');
        }
    } catch (error) {
        alert('Error processing payment: ' + error.message);
    }
}

async function viewBookingDetails(bookingId) {
    // Redirect to the modal version
    viewBookingDetailsModal(bookingId);
}

async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
        const response = await fetch(`/api/bookings/${bookingId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showSuccessMessage('✅ Booking cancelled successfully!');
            loadMyTrips();
        } else {
            alert('Error cancelling booking: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Error cancelling booking: ' + error.message);
    }
}

function showSuccessMessage(message, type = 'success') {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-warning';
    const alert = document.createElement('div');
    alert.className = `alert ${alertClass} success-toast`;
    alert.style.position = 'fixed';
    alert.style.top = '100px';
    alert.style.right = '20px';
    alert.style.zIndex = '3000';
    alert.style.minWidth = '300px';
    alert.innerHTML = message;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.style.transition = 'opacity 0.3s';
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}


async function openBookingPageFromChat() {
    try {
        // First check if we have stored trip details from chat
        if (window.lastTripDetails) {
            openBookingWithDetails();
            return;
        }
        
        // Otherwise try to extract from conversation history
        const response = await fetch("/api/booking-options", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
        });
        const data = await response.json();
        if (data.status === "success") {
            bookingTripDetails = data.trip_details;
            selectedFlight = null;
            selectedHotel = null;
            navigateTo("booking");
            setTimeout(() => loadBookingOptions(data), 300);
        } else {
            // Show helpful message
            const helpMessage = `
                <div style="text-align: center; padding: 2rem;">
                    <h3>📋 No Trip Details Found</h3>
                    <p style="color: var(--gray); margin: 1rem 0;">
                        To create a booking, please plan a trip first using the AI chat.
                    </p>
                    <p style="color: var(--gray); margin: 1rem 0;">
                        Try saying: <strong>"I want to book a trip to Paris for 2 people from December 1-7"</strong>
                    </p>
                    <button class="btn-inline" onclick="navigateTo('plan')" style="margin-top: 1rem;">
                        🚀 Go to Plan Trip
                    </button>
                </div>
            `;
            
            // Show as modal or message
            const modal = document.createElement('div');
            modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); z-index: 10000; max-width: 500px;';
            modal.innerHTML = helpMessage;
            
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999;';
            overlay.onclick = () => { modal.remove(); overlay.remove(); };
            
            document.body.appendChild(overlay);
            document.body.appendChild(modal);
            
            setTimeout(() => { modal.remove(); overlay.remove(); }, 5000);
        }
    } catch (error) {
        alert("Error: " + error.message + "\n\nPlease plan a trip in the chat first!");
    }
}

function loadBookingOptions(data) {
    const summaryCard = document.getElementById("booking-details-card");
    const summaryContent = document.getElementById("booking-summary-content");
    const summaryText = document.getElementById("booking-summary");
    if (data.trip_details) {
        const trip = data.trip_details;
        summaryContent.innerHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;"><div><strong>📍 Destination:</strong> ${trip.destination}</div><div><strong>✈️ Origin:</strong> ${trip.origin}</div><div><strong>📅 Dates:</strong> ${trip.start_date} to ${trip.end_date}</div><div><strong>💰 Budget:</strong> $${trip.budget.toFixed(2)}</div><div><strong>👥 Passengers:</strong> ${trip.passengers}</div></div>`;
        summaryCard.style.display = "block";
        summaryText.textContent = `Select flights and hotel for ${trip.destination}`;
        
        // Set default nights and passengers from trip details
        const numNights = Math.ceil((new Date(trip.end_date) - new Date(trip.start_date)) / (1000 * 60 * 60 * 24));
        const nightsSelect = document.getElementById("nights-select");
        const passengersSelect = document.getElementById("passengers-select");
        if (nightsSelect) nightsSelect.value = numNights || 1;
        if (passengersSelect) passengersSelect.value = trip.passengers || 1;
    }
    
    // Populate flight dropdown
    const flightSelect = document.getElementById("flight-select");
    if (flightSelect && data.flights?.length > 0) {
        flightSelect.innerHTML = '<option value="">Select Flight</option>' + 
            data.flights.map((flight, index) => 
                `<option value="${index}" data-price="${flight.price}">${flight.airline} ${flight.flight_number} - $${flight.price.toFixed(2)} (${flight.departure_time} - ${flight.arrival_time})</option>`
            ).join("");
    }
    
    // Populate hotel dropdown
    const hotelSelect = document.getElementById("hotel-select");
    if (hotelSelect && data.hotels?.length > 0) {
        hotelSelect.innerHTML = '<option value="">Select Hotel</option>' + 
            data.hotels.map((hotel, index) => 
                `<option value="${index}" data-price="${hotel.price_per_night}">${hotel.name} - $${hotel.price_per_night.toFixed(2)}/night (${hotel.rating.toFixed(1)}⭐)</option>`
            ).join("");
    }
    
    // Store flights and hotels data globally for later use
    window.bookingFlights = data.flights || [];
    window.bookingHotels = data.hotels || [];
    
    const flightsContainer = document.getElementById("flights-container");
    if (data.flights?.length > 0) {
        flightsContainer.innerHTML = data.flights.map((flight, index) => `<div class="flight-option ${selectedFlight === index ? "selected" : ""}" onclick="selectFlight(${index}, ${flight.price})"><div class="flight-header"><div class="flight-airline"><strong>${flight.airline}</strong><span class="flight-number">${flight.flight_number}</span></div><div class="flight-price">$${flight.price.toFixed(2)}</div></div><div class="flight-details"><div class="flight-time"><div><strong>${flight.departure_time}</strong><span class="flight-city">${data.trip_details?.origin || "Mumbai"}</span></div><div class="flight-duration">${flight.duration}</div><div><strong>${flight.arrival_time}</strong><span class="flight-city">${data.trip_details?.destination || "Destination"}</span></div></div><div class="flight-info"><span class="badge badge-primary">${flight.class}</span><span class="badge badge-secondary">${flight.stops === 0 ? "Non-stop" : flight.stops + " stop(s)"}</span></div></div></div>`).join("");
    } else {
        flightsContainer.innerHTML = "<p style=\"text-align: center; color: var(--gray); padding: 2rem;\">No flights available.</p>";
    }
    const hotelsContainer = document.getElementById("hotels-container");
    if (data.hotels?.length > 0) {
        const numNights = data.trip_details ? Math.ceil((new Date(data.trip_details.end_date) - new Date(data.trip_details.start_date)) / (1000 * 60 * 60 * 24)) : 1;
        hotelsContainer.innerHTML = data.hotels.map((hotel, index) => { const totalPrice = hotel.price_per_night * numNights; return `<div class="hotel-option ${selectedHotel === index ? "selected" : ""}" onclick="selectHotel(${index}, ${hotel.price_per_night}, ${numNights})"><div class="hotel-header"><div><h4 class="hotel-name">${hotel.name}</h4><div class="hotel-rating">${"⭐".repeat(Math.floor(hotel.rating))} ${hotel.rating.toFixed(1)} <span class="hotel-reviews">(${hotel.reviews} reviews)</span></div></div><div class="hotel-price"><div class="price-per-night">$${hotel.price_per_night.toFixed(2)}/night</div><div class="price-total">$${totalPrice.toFixed(2)} total</div></div></div><div class="hotel-details"><div class="hotel-location">📍 ${hotel.location}</div><div class="hotel-amenities">${hotel.amenities.map(a => `<span class="amenity-badge">${a}</span>`).join("")}</div><div class="hotel-style"><span class="badge badge-${hotel.style === "luxury" ? "primary" : hotel.style === "mid-range" ? "success" : "warning"}">${hotel.style}</span></div></div></div>`; }).join("");
    } else {
        hotelsContainer.innerHTML = "<p style=\"text-align: center; color: var(--gray); padding: 2rem;\">No hotels available.</p>";
    }
    updateTotalPrice();
}

function updateFlightPrice() {
    const flightSelect = document.getElementById("flight-select");
    if (flightSelect && flightSelect.value !== "") {
        const index = parseInt(flightSelect.value);
        const price = parseFloat(flightSelect.options[flightSelect.selectedIndex].dataset.price);
        selectedFlight = index;
        document.getElementById("flight-price").textContent = `$${price.toFixed(2)}`;
        // Update visual selection
        document.querySelectorAll(".flight-option").forEach((f, i) => f.classList.toggle("selected", i === index));
    } else {
        selectedFlight = null;
        document.getElementById("flight-price").textContent = "$0.00";
        document.querySelectorAll(".flight-option").forEach(f => f.classList.remove("selected"));
    }
    updateTotalPrice();
}

function updateHotelPrice() {
    const hotelSelect = document.getElementById("hotel-select");
    if (hotelSelect && hotelSelect.value !== "") {
        const index = parseInt(hotelSelect.value);
        const price = parseFloat(hotelSelect.options[hotelSelect.selectedIndex].dataset.price);
        selectedHotel = index;
        document.getElementById("hotel-price").textContent = `$${price.toFixed(2)}`;
        // Update visual selection
        document.querySelectorAll(".hotel-option").forEach((h, i) => h.classList.toggle("selected", i === index));
    } else {
        selectedHotel = null;
        document.getElementById("hotel-price").textContent = "$0.00";
        document.querySelectorAll(".hotel-option").forEach(h => h.classList.remove("selected"));
    }
    updateTotalPrice();
}

function selectFlight(index, price) {
    selectedFlight = index;
    document.querySelectorAll(".flight-option").forEach((f, i) => f.classList.toggle("selected", i === index));
    const flightSelect = document.getElementById("flight-select");
    if (flightSelect) flightSelect.value = index;
    updateTotalPrice();
}

function selectHotel(index, pricePerNight, nights) {
    selectedHotel = index;
    document.querySelectorAll(".hotel-option").forEach((h, i) => h.classList.toggle("selected", i === index));
    const hotelSelect = document.getElementById("hotel-select");
    if (hotelSelect) hotelSelect.value = index;
    updateTotalPrice();
}
function togglePriceSummary() {
    const footer = document.getElementById("price-summary-footer");
    if (footer) {
        footer.classList.toggle("expanded");
    }
}

function updateTotalPrice() {
    const flightPriceEl = document.getElementById("flight-price");
    const hotelPriceEl = document.getElementById("hotel-price");
    const nightsCountEl = document.getElementById("nights-count");
    const passengersCountEl = document.getElementById("passengers-count");
    const totalPriceEl = document.getElementById("total-price");
    const footerTotalEl = document.getElementById("footer-total-price");
    const proceedBtn = document.getElementById("proceed-booking-btn");
    
    if (!flightPriceEl || !hotelPriceEl || !totalPriceEl) return;
    
    let flightPrice = 0, hotelPricePerNight = 0, nights = 1, passengers = 1;
    
    // Get flight price from dropdown or selection
    const flightSelect = document.getElementById("flight-select");
    if (flightSelect && flightSelect.value !== "") {
        flightPrice = parseFloat(flightSelect.options[flightSelect.selectedIndex].dataset.price || 0);
    } else if (selectedFlight !== null && window.bookingFlights) {
        flightPrice = window.bookingFlights[selectedFlight]?.price || 0;
    }
    
    // Get hotel price from dropdown or selection
    const hotelSelect = document.getElementById("hotel-select");
    if (hotelSelect && hotelSelect.value !== "") {
        hotelPricePerNight = parseFloat(hotelSelect.options[hotelSelect.selectedIndex].dataset.price || 0);
    } else if (selectedHotel !== null && window.bookingHotels) {
        hotelPricePerNight = window.bookingHotels[selectedHotel]?.price_per_night || 0;
    }
    
    // Get nights from dropdown
    const nightsSelect = document.getElementById("nights-select");
    if (nightsSelect) {
        nights = parseInt(nightsSelect.value || 1);
    } else if (bookingTripDetails) {
        nights = Math.ceil((new Date(bookingTripDetails.end_date) - new Date(bookingTripDetails.start_date)) / (1000 * 60 * 60 * 24));
    }
    
    // Get passengers from dropdown
    const passengersSelect = document.getElementById("passengers-select");
    if (passengersSelect) {
        passengers = parseInt(passengersSelect.value || 1);
    } else {
        const passengerInput = document.getElementById("passenger-count");
        if (passengerInput) passengers = parseInt(passengerInput.value || 1);
    }
    
    const total = (flightPrice * passengers) + (hotelPricePerNight * nights);
    
    flightPriceEl.textContent = `$${flightPrice.toFixed(2)}`;
    hotelPriceEl.textContent = `$${hotelPricePerNight.toFixed(2)}`;
    if (nightsCountEl) nightsCountEl.textContent = nights;
    if (passengersCountEl) passengersCountEl.textContent = passengers;
    totalPriceEl.innerHTML = `<strong>$${total.toFixed(2)}</strong>`;
    
    // Update footer total
    if (footerTotalEl) {
        footerTotalEl.textContent = `Total: $${total.toFixed(2)}`;
    }
    
    // Enable proceed button only if both flight and hotel are selected
    if (proceedBtn) {
        const hasFlight = (flightSelect && flightSelect.value !== "") || selectedFlight !== null;
        const hasHotel = (hotelSelect && hotelSelect.value !== "") || selectedHotel !== null;
        proceedBtn.disabled = !(hasFlight && hasHotel);
    }
}
async function proceedToBooking() {
    if (selectedFlight === null || selectedHotel === null) {
        alert("Please select both flight and hotel.");
        return;
    }
    
    const email = document.getElementById("passenger-email")?.value;
    if (!email || !email.includes('@')) {
        alert("Please enter a valid email address.");
        document.getElementById("passenger-email")?.focus();
        return;
    }
    
    try {
        const flights = document.querySelectorAll(".flight-option");
        const hotels = document.querySelectorAll(".hotel-option");
        
        const flightText = flights[selectedFlight].textContent;
        const flightMatch = flightText.match(/([A-Za-z\s]+)\s+([A-Z0-9]+)/);
        const flightDetails = {
            airline: flightMatch?.[1].trim() || "Unknown",
            flight_number: flightMatch?.[2] || "N/A",
            price: parseFloat(flightText.match(/\$([\d.]+)/)?.[1] || 0)
        };
        
        const hotelName = hotels[selectedHotel].querySelector(".hotel-name")?.textContent || "Unknown";
        const hotelPriceMatch = hotels[selectedHotel].textContent.match(/\$([\d.]+)\/night/);
        const hotelDetails = {
            name: hotelName,
            price_per_night: parseFloat(hotelPriceMatch?.[1] || 0)
        };
        
        const passengersSelect = document.getElementById("passengers-select");
        const passengers = passengersSelect ? parseInt(passengersSelect.value) : parseInt(document.getElementById("passenger-count")?.value || 1);
        const specialRequests = document.getElementById("special-requests")?.value;
        
        const nightsSelect = document.getElementById("nights-select");
        const nights = nightsSelect ? parseInt(nightsSelect.value) : Math.ceil((new Date(bookingTripDetails.end_date) - new Date(bookingTripDetails.start_date)) / (1000 * 60 * 60 * 24));
        
        const totalPrice = (flightDetails.price * passengers) + (hotelDetails.price_per_night * nights);
        
        const proceedBtn = document.getElementById("proceed-booking-btn");
        if (proceedBtn) {
            proceedBtn.disabled = true;
            proceedBtn.innerHTML = '<div class="loading-spinner-small" style="margin: 0 auto;"></div> Processing...';
        }
        
        const bookingResponse = await fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                trip_id: `booking-${Date.now()}`,
                trip_name: `Trip to ${bookingTripDetails.destination}`,
                destination: bookingTripDetails.destination,
                start_date: bookingTripDetails.start_date,
                end_date: bookingTripDetails.end_date,
                total_price: totalPrice,
                passengers: passengers,
                email: email,
                flight_details: flightDetails,
                hotel_details: hotelDetails,
                special_requests: specialRequests || undefined
            })
        });
        
        const bookingData = await bookingResponse.json();
        
        if (bookingData.status === "success") {
            const checkoutResponse = await fetch("/api/create-checkout-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    booking_id: bookingData.booking_id
                })
            });
            
            const checkoutData = await checkoutResponse.json();
            
            if (checkoutData.status === "success" && checkoutData.checkout_url) {
                window.location.href = checkoutData.checkout_url;
            } else {
                throw new Error(checkoutData.error || "Failed to create payment session");
            }
        } else {
            throw new Error(bookingData.error || "Failed to create booking");
        }
    } catch (error) {
        alert("Error: " + error.message);
        const proceedBtn = document.getElementById("proceed-booking-btn");
        if (proceedBtn) {
            proceedBtn.disabled = false;
            proceedBtn.innerHTML = '💳 Proceed to Payment';
        }
    }
}

// ========== AUTHENTICATION ==========
async function handleSignIn(event) {
    event.preventDefault();
    
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    const submitBtn = event.target.querySelector('.btn-submit');
    const btnText = submitBtn.querySelector('span');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    
    // Show loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'block';
    
    try {
        const response = await fetch('/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, remember_me: rememberMe })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Store user session
            localStorage.setItem('user', JSON.stringify(data.user));
            if (rememberMe) {
                localStorage.setItem('auth_token', data.token);
            } else {
                sessionStorage.setItem('auth_token', data.token);
            }
            
            // Load user profile
            loadUserProfile();
            
            // Show success message
            showSuccessMessage('✅ Welcome back! Redirecting to home...');
            
            // Navigate to home
            setTimeout(() => {
                navigateTo('home');
            }, 1000);
        } else {
            showErrorToast(data.message || 'Sign in failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Sign in error:', error);
        showErrorToast('An error occurred during sign in. Please try again.');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        btnText.style.display = 'block';
        btnSpinner.style.display = 'none';
    }
}

async function handleSignUp(event) {
    event.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const termsAgree = document.getElementById('terms-agree').checked;
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showErrorToast('Passwords do not match!');
        return;
    }
    
    // Validate password strength
    if (password.length < 8) {
        showErrorToast('Password must be at least 8 characters long!');
        return;
    }
    
    // Validate terms agreement
    if (!termsAgree) {
        showWarningToast('Please agree to the Terms of Service and Privacy Policy!');
        return;
    }
    
    const submitBtn = event.target.querySelector('.btn-submit');
    const btnText = submitBtn.querySelector('span');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    
    // Show loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'block';
    
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Store user session
            localStorage.setItem('user', JSON.stringify(data.user));
            sessionStorage.setItem('auth_token', data.token);
            
            // Load user profile
            loadUserProfile();
            
            // Show success message
            showSuccessMessage('✅ Account created successfully! Welcome aboard!');
            
            // Navigate to home
            setTimeout(() => {
                navigateTo('home');
            }, 1000);
        } else {
            showErrorToast(data.message || 'Sign up failed. Please try again.');
        }
    } catch (error) {
        console.error('Sign up error:', error);
        showErrorToast('An error occurred during sign up. Please try again.');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        btnText.style.display = 'block';
        btnSpinner.style.display = 'none';
    }
}

function logout() {
    // Close profile menu if open
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown && dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        dropdown.style.display = 'none';
    }
    
    // Clear user data
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    
    // Show notification and redirect
    showInfoToast('You have been signed out successfully');
    setTimeout(() => {
        navigateTo('welcome');
    }, 500);
}

function switchAccount() {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    showInfoToast('Switching account...');
    setTimeout(() => {
        navigateTo('signin');
    }, 500);
}

function showAccountSettings() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        showErrorToast('Please sign in to view account settings');
        return;
    }
    
    const user = JSON.parse(userStr);
    
    showInfoToast('Account Settings:\n• Name: ' + user.name + '\n• Email: ' + user.email);
}

function showMyBookings() {
    navigateTo('calendar');
    setTimeout(() => {
        showInfoToast('Viewing your bookings in Calendar');
    }, 500);
}

// ========== PROFILE MENU ==========
function toggleProfileMenu(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('profile-dropdown');
    const isOpen = dropdown.classList.contains('show');
    
    // Clear any pending hide timeout
    if (profileDropdownHideTimeout) {
        clearTimeout(profileDropdownHideTimeout);
        profileDropdownHideTimeout = null;
    }
    
    if (!isOpen) {
        // Opening the dropdown
        dropdown.style.display = 'block';
        // Trigger animation
        requestAnimationFrame(() => {
            dropdown.classList.add('show');
        });
        // Add click listener to close when clicking outside
        setTimeout(() => {
            document.addEventListener('click', closeProfileMenuOnClickOutside);
        }, 0);
    } else {
        // Closing the dropdown
        dropdown.classList.remove('show');
        // Wait for animation before hiding
        profileDropdownHideTimeout = setTimeout(() => {
            dropdown.style.display = 'none';
            profileDropdownHideTimeout = null;
        }, 300);
        document.removeEventListener('click', closeProfileMenuOnClickOutside);
    }
}

function closeProfileMenuOnClickOutside(event) {
    const dropdown = document.getElementById('profile-dropdown');
    const profileContainer = document.querySelector('.profile-menu-container');
    
    if (!profileContainer.contains(event.target)) {
        // Clear any pending hide timeout
        if (profileDropdownHideTimeout) {
            clearTimeout(profileDropdownHideTimeout);
            profileDropdownHideTimeout = null;
        }
        
        dropdown.classList.remove('show');
        profileDropdownHideTimeout = setTimeout(() => {
            dropdown.style.display = 'none';
            profileDropdownHideTimeout = null;
        }, 300);
        document.removeEventListener('click', closeProfileMenuOnClickOutside);
    }
}

function loadUserProfile() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            
            // Update profile name and email
            const profileName = document.getElementById('profile-name');
            const profileEmail = document.getElementById('profile-email');
            
            if (profileName) profileName.textContent = user.name || 'User Name';
            if (profileEmail) profileEmail.textContent = user.email || 'user@example.com';
            
            // Update initials in avatar
            const initials = getInitials(user.name || 'User');
            const profileInitials = document.getElementById('profile-initials');
            const profileInitialsLarge = document.getElementById('profile-initials-large');
            
            if (profileInitials) profileInitials.textContent = initials;
            if (profileInitialsLarge) profileInitialsLarge.textContent = initials;
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }
}

function getInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

// ========== FEATURE EXPLANATIONS ==========
function showFeatureExplanation(feature) {
    const tooltip = document.getElementById('feature-tooltip');
    const title = document.getElementById('tooltip-title');
    const description = document.getElementById('tooltip-description');
    
    const features = {
        'ai': {
            title: '🤖 AI-Powered Planning',
            description: 'Our advanced AI assistant analyzes your preferences, budget, and travel dates to create personalized itineraries. Simply chat with our AI and it will search flights, hotels, activities, and create a complete day-by-day travel plan tailored just for you.'
        },
        'booking': {
            title: '✈️ Smart Booking',
            description: 'Seamlessly book your entire trip with secure Stripe payment integration. Choose from AI-recommended flights and hotels, or manually select your preferences. Track all your bookings in one place with real-time status updates and payment management.'
        },
        'budget': {
            title: '💰 Budget Optimization',
            description: 'Get the best value for your money with intelligent budget analysis. Our AI compares flight and hotel prices, suggests cost-effective alternatives, and provides detailed breakdowns of all expenses to help you stay within budget without compromising on quality.'
        }
    };
    
    const featureData = features[feature];
    title.textContent = featureData.title;
    description.textContent = featureData.description;
    
    tooltip.classList.add('active');
}

function hideFeatureExplanation() {
    const tooltip = document.getElementById('feature-tooltip');
    tooltip.classList.remove('active');
}

function checkAuth() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    return user && token;
}

// ========== CUSTOM CURSOR ==========
function initCustomCursor() {
    // Create cursor elements
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);
    
    const cursorDot = document.createElement('div');
    cursorDot.className = 'custom-cursor-dot';
    document.body.appendChild(cursorDot);
    
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    let dotX = 0, dotY = 0;
    
    // Track mouse movement
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Show cursors on first movement
        cursor.classList.add('active');
        cursorDot.classList.add('active');
        
        // Instant dot positioning
        dotX = mouseX - 3;
        dotY = mouseY - 3;
    });
    
    // Smooth cursor animation
    function animateCursor() {
        // Smooth follow effect for outer circle
        cursorX += (mouseX - cursorX - 10) * 0.15;
        cursorY += (mouseY - cursorY - 10) * 0.15;
        
        cursor.style.left = cursorX + 'px';
        cursor.style.top = cursorY + 'px';
        cursorDot.style.left = dotX + 'px';
        cursorDot.style.top = dotY + 'px';
        
        requestAnimationFrame(animateCursor);
    }
    animateCursor();
    
    // Click effect
    document.addEventListener('mousedown', () => {
        cursor.classList.add('clicked');
        cursorDot.classList.add('clicked');
    });
    
    document.addEventListener('mouseup', () => {
        cursor.classList.remove('clicked');
        cursorDot.classList.remove('clicked');
    });
    
    // Hover effect for interactive elements
    const interactiveElements = 'a, button, input, textarea, select, .btn, .card, .feature-card, .nav-link, .message-option, .flight-option, .hotel-option';
    
    document.addEventListener('mouseover', (e) => {
        if (e.target.matches(interactiveElements) || e.target.closest(interactiveElements)) {
            cursor.classList.add('hovering');
            cursorDot.classList.add('hovering');
        }
    });
    
    document.addEventListener('mouseout', (e) => {
        if (e.target.matches(interactiveElements) || e.target.closest(interactiveElements)) {
            cursor.classList.remove('hovering');
            cursorDot.classList.remove('hovering');
        }
    });
    
    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => {
        cursor.classList.remove('active');
        cursorDot.classList.remove('active');
    });
    
    document.addEventListener('mouseenter', () => {
        cursor.classList.add('active');
        cursorDot.classList.add('active');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme FIRST before any visual elements
    initTheme();
    
    // Initialize custom cursor
    initCustomCursor();
    
    // Initialize reminder checkbox
    const reminderCheckbox = document.getElementById('event-reminder');
    if (reminderCheckbox) {
        reminderCheckbox.addEventListener('change', function() {
            document.getElementById('reminder-options').style.display = this.checked ? 'block' : 'none';
        });
    }
    
    // Sync color picker with text input
    const colorPicker = document.getElementById('event-color');
    const colorText = document.getElementById('event-color-text');
    if (colorPicker && colorText) {
        colorPicker.addEventListener('input', function() {
            colorText.value = this.value;
        });
        colorText.addEventListener('input', function() {
            if (/^#[0-9A-F]{6}$/i.test(this.value)) {
                colorPicker.value = this.value;
            }
        });
    }
    
    // Initialize price summary footer - hidden by default
    const footer = document.getElementById("price-summary-footer");
    if (footer) {
        footer.style.display = "none";
    }
    
    // Check authentication and navigate accordingly
    if (checkAuth()) {
        navigateTo('home');
        loadUserProfile(); // Load user profile info
    } else {
        navigateTo('welcome');
    }
    
    checkPaymentStatus();
    
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Add welcome message with animation
    setTimeout(() => {
        if (checkAuth()) {
            addMessage('assistant', 
                '👋 Hello! I\'m your AI travel planning assistant. I can help you plan complete trips, find flights & hotels, create itineraries, manage budgets, and remember your preferences. I can also create bookings for you! Just tell me where you\'d like to go or say "I want to book a trip" to get started! 🚀'
            );
        }
    }, 500);
    
    // Add parallax effect on scroll
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        const hero = document.querySelector('.hero');
        if (hero) {
            hero.style.transform = `translateY(${currentScroll * 0.5}px)`;
        }
        lastScroll = currentScroll;
    });
});
