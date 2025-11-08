let currentPage = 'home';

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

function addMessage(role, content, isTyping = false) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    if (isTyping) {
        messageDiv.innerHTML = `
            <div class="message-bubble typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-bubble">
                ${formatMessage(content)}
            </div>
        `;
    }
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // Add entrance animation
    setTimeout(() => {
        messageDiv.style.opacity = '1';
    }, 10);
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
            
            // Auto-extract and create booking if user wants to book
            const lowerMessage = message.toLowerCase();
            if (lowerMessage.includes('book') || lowerMessage.includes('reserve') || lowerMessage.includes('i want to book')) {
                setTimeout(() => {
                    extractAndCreateBooking(responseText, message);
                }, 500);
            }
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
        // Look for structured data in the response
        const destinationMatch = aiResponse.match(/destination[:\s]+([^\n,]+)/i) || 
                                 userMessage.match(/(?:to|in|visit|going to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i) ||
                                 aiResponse.match(/(?:trip to|visit|going to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
        const dateMatch = aiResponse.match(/(\d{4}-\d{2}-\d{2})/g) || userMessage.match(/(\d{4}-\d{2}-\d{2})/g);
        const passengerMatch = aiResponse.match(/(\d+)\s*(?:passenger|person|people|guest)/i) || 
                              userMessage.match(/(\d+)\s*(?:passenger|person|people|guest)/i) ||
                              userMessage.match(/(?:for|with)\s+(\d+)/i);
        const priceMatch = aiResponse.match(/\$(\d+(?:\.\d{2})?)/g);
        
        if (destinationMatch) {
            const destination = destinationMatch[1].trim().replace(/[^\w\s-]/g, '');
            const startDate = dateMatch && dateMatch.length >= 1 ? dateMatch[0] : new Date().toISOString().split('T')[0];
            const endDate = dateMatch && dateMatch.length >= 2 ? dateMatch[1] : 
                           dateMatch && dateMatch.length >= 1 ? dateMatch[0] : 
                           new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const passengers = passengerMatch ? parseInt(passengerMatch[1]) : 1;
            const basePrice = priceMatch && priceMatch.length > 0 ? 
                            parseFloat(priceMatch[priceMatch.length - 1].replace('$', '')) / passengers : 200.0;
            
            // Show booking option
            setTimeout(() => {
                const bookingPrompt = `Would you like me to create a booking for:\n\n📍 Destination: ${destination}\n📅 Dates: ${startDate} to ${endDate}\n👥 Passengers: ${passengers}\n💰 Estimated Price: $${(basePrice * passengers).toFixed(2)}\n\n<button class="btn-inline" onclick="createBookingFromChat('${destination}', '${startDate}', '${endDate}', ${passengers}, ${basePrice})">Yes, Create Booking</button>`;
                addMessage('assistant', bookingPrompt);
            }, 1000);
        }
    } catch (error) {
        console.error('Error extracting booking details:', error);
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

async function loadCalendar() {
    const loadingDiv = document.getElementById('calendar-loading');
    const contentDiv = document.getElementById('calendar-content');
    
    loadingDiv.style.display = 'flex';
    contentDiv.innerHTML = '';
    
    try {
        const response = await fetch('/api/itineraries');
        const data = await response.json();
        
        loadingDiv.style.display = 'none';
        
        if (data.status === 'success' && data.itineraries && data.itineraries.length > 0) {
            let html = '<div class="calendar-grid">';
            
            data.itineraries.forEach(itin => {
                const startDate = new Date(itin.start_date);
                const endDate = new Date(itin.end_date);
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                
                html += `
                    <div class="calendar-card">
                        <div class="calendar-date">
                            <div class="date-month">${monthNames[startDate.getMonth()]}</div>
                            <div class="date-day">${startDate.getDate()}</div>
                            <div class="date-year">${startDate.getFullYear()}</div>
                        </div>
                        <div class="calendar-content">
                            <h3 class="trip-title">${itin.trip_name}</h3>
                            <p class="trip-destination">📍 ${itin.destination}</p>
                            <p class="trip-dates">📅 ${itin.start_date} to ${itin.end_date}</p>
                            <p class="trip-duration">⏱️ ${itin.duration_days} days</p>
                            ${itin.budget ? `<p class="trip-budget">💰 $${itin.budget.toFixed(2)}</p>` : ''}
                            ${itin.description ? `<p class="trip-description">${itin.description}</p>` : ''}
                            <div class="calendar-actions">
                                <button class="btn-small btn-view" onclick="viewItinerary(${itin.id})">👁️ View Details</button>
                                <button class="btn-small btn-primary" onclick="bookFromItinerary(${itin.id})" style="background: rgba(99, 102, 241, 0.1); color: var(--primary);">💳 Book Trip</button>
                                <button class="btn-small btn-delete" onclick="deleteItinerary(${itin.id})">🗑️ Delete</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            contentDiv.innerHTML = html;
        } else {
            contentDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📅</div>
                    <h3>No itineraries yet</h3>
                    <p>Start planning trips with our AI assistant and they'll appear here!</p>
                    <button class="btn btn-primary" onclick="navigateTo('plan')">🚀 Plan Your First Trip</button>
                </div>
            `;
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        contentDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❌</div>
                <h3>Error loading itineraries</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

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
                    <div class="trip-card">
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
                                <button class="btn-small btn-view" onclick="viewBookingDetails('${booking.id}')" style="margin-right: 0.5rem;">📋 View Details</button>
                                ${booking.status !== 'cancelled' && booking.payment_status !== 'paid' ? 
                                    `<button class="btn-small btn-delete" onclick="cancelBooking('${booking.id}')">❌ Cancel</button>` : 
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

async function viewBookingDetails(bookingId) {
    try {
        const response = await fetch(`/api/bookings/${bookingId}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            const booking = data.booking;
            const details = `
Booking Details:

Booking ID: ${booking.booking_id}
Trip: ${booking.trip_name}
Destination: ${booking.destination}
Dates: ${booking.start_date} to ${booking.end_date}
Passengers: ${booking.passengers}
Base Price: $${booking.base_price?.toFixed(2) || '0.00'}
Total Price: $${booking.total_price?.toFixed(2) || '0.00'}
Status: ${booking.status}
Payment Status: ${booking.payment_status}
${booking.email ? `Email: ${booking.email}` : ''}
${booking.special_requests ? `Special Requests: ${booking.special_requests}` : ''}
Created: ${booking.created_at ? new Date(booking.created_at).toLocaleString() : 'N/A'}
${booking.confirmed_at ? `Confirmed: ${new Date(booking.confirmed_at).toLocaleString()}` : ''}
${booking.cancelled_at ? `Cancelled: ${new Date(booking.cancelled_at).toLocaleString()}` : ''}
            `.trim();
            
            alert(details);
        }
    } catch (error) {
        alert('Error loading booking details: ' + error.message);
    }
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

document.addEventListener('DOMContentLoaded', () => {
    navigateTo('home');
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
        addMessage('assistant', 
            '👋 Hello! I\'m your AI travel planning assistant. I can help you plan complete trips, find flights & hotels, create itineraries, manage budgets, and remember your preferences. I can also create bookings for you! Just tell me where you\'d like to go or say "I want to book a trip" to get started! 🚀'
        );
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
