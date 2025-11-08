let currentPage = 'home';

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) {
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
        }
    }
}

window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

function addMessage(role, content) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    messageDiv.innerHTML = `
        <div class="message-bubble">
            ${formatMessage(content)}
        </div>
    `;
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function formatMessage(content) {
    content = content.replace(/\n/g, '<br>');
    content = content.replace(/```json\n([\s\S]*?)\n```/g, '<pre><code>$1</code></pre>');
    content = content.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    return content;
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const message = input.value.trim();
    
    if (!message) return;
    
    addMessage('user', message);
    input.value = '';
    
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="loading-spinner"></span>';
    
    try {
        const response = await fetch('/api/plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: message })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            addMessage('assistant', data.response);
        } else {
            addMessage('assistant', '❌ Error: ' + (data.error || 'Something went wrong'));
        }
    } catch (error) {
        addMessage('assistant', '❌ Error connecting to server: ' + error.message);
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '✈️ Send';
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
    
    modalBody.innerHTML = `
        <div class="booking-summary">
            <h3 style="margin-bottom: 1rem; color: var(--dark);">Trip Summary</h3>
            <div class="booking-item">
                <label>Destination:</label>
                <span>${destination}</span>
            </div>
            <div class="booking-item">
                <label>Trip Duration:</label>
                <span>${startDate} to ${endDate}</span>
            </div>
            <div class="booking-item">
                <label>Passengers:</label>
                <span><input type="number" id="passengers" min="1" max="10" value="1" style="width: 60px; padding: 0.25rem; border: 1px solid #e2e8f0; border-radius: 5px;"></span>
            </div>
            <div class="booking-item">
                <label>Total Price:</label>
                <span id="total-price">$${price.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="alert alert-info">
            💳 <strong>Secure Payment:</strong> You'll be redirected to Stripe's secure checkout page to complete your payment.
        </div>
        
        <div class="form-group">
            <label class="form-label">Contact Email</label>
            <input type="email" id="booking-email" class="form-input" placeholder="your@email.com" required>
        </div>
        
        <div class="form-group">
            <label class="form-label">Special Requests (Optional)</label>
            <input type="text" id="special-requests" class="form-input" placeholder="Dietary restrictions, accessibility needs, etc.">
        </div>
        
        <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" onclick="processBooking('${tripId}', '${tripName}', '${destination}', '${startDate}', '${endDate}', ${price})">
            💳 Proceed to Secure Payment
        </button>
    `;
    
    modal.classList.add('active');
    
    document.getElementById('passengers').addEventListener('change', (e) => {
        const passengers = parseInt(e.target.value) || 1;
        const newTotal = price * passengers;
        document.getElementById('total-price').textContent = `$${newTotal.toFixed(2)}`;
    });
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

async function loadMyTrips() {
    try {
        const response = await fetch('/api/bookings');
        const data = await response.json();
        
        const tripsGrid = document.querySelector('#trips-page .trips-grid');
        
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
                            <div class="trip-meta">📅 ${booking.start_date} to ${booking.end_date} • 💰 $${booking.total_price.toFixed(2)} • 👥 ${booking.passengers} passenger(s)</div>
                            <p class="feature-desc">${booking.destination}</p>
                            <div style="margin-top: 1rem;">
                                ${statusBadge}
                                ${booking.payment_status === 'paid' ? '<span class="badge badge-success">💳 Paid</span>' : '<span class="badge badge-warning">💳 Unpaid</span>'}
                            </div>
                            <div style="margin-top: 1rem;">
                                <small style="color: var(--gray);">Booking ID: ${booking.id}</small>
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
        }
    } catch (error) {
        console.error('Error loading trips:', error);
    }
}

function checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const bookingId = urlParams.get('booking_id');
    
    if (paymentStatus === 'success' && bookingId) {
        fetch(`/api/bookings/${bookingId}/confirm`, { method: 'POST' })
            .then(() => {
                navigateTo('trips');
                setTimeout(() => {
                    showSuccessMessage('🎉 Payment Successful! Your trip is confirmed!');
                    loadMyTrips();
                }, 500);
            });
        
        window.history.replaceState({}, document.title, '/');
    } else if (paymentStatus === 'cancelled') {
        showSuccessMessage('❌ Payment was cancelled. You can try again from My Trips.', 'warning');
        window.history.replaceState({}, document.title, '/');
    }
}

function showSuccessMessage(message, type = 'success') {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-warning';
    const alert = document.createElement('div');
    alert.className = `alert ${alertClass}`;
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
    
    addMessage('assistant', 
        '👋 Hello! I\'m your AI travel planning assistant. I can help you plan complete trips, find flights & hotels, create itineraries, manage budgets, and remember your preferences. Just tell me where you\'d like to go! 🚀'
    );
});
