import { cy, describe, it, beforeEach } from 'cypress';

// Using a custom command for login can clean up the test.
// This would be defined in cypress/support/commands.ts
// Cypress.Commands.add('loginAsDriver', () => { ... });

describe('Driver Actions and Full Ride Cycle', () => {
  beforeEach(() => {
    // --- Mock API Responses using cy.intercept() ---
    // This makes the test independent of the backend and ensures consistent results.

    // Mock login response
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: {
        accessToken: 'mock-driver-jwt-token',
        user: {
          id: 'driver-123',
          name: 'Test Driver',
          role: 'driver',
        },
      },
    }).as('driverLogin');

    // Mock toggling availability status
    cy.intercept('PATCH', '/api/drivers/me/status', {
      statusCode: 200,
      body: { status: 'ONLINE' },
    }).as('goOnline');

    // Mock the ride request notification/poll
    cy.intercept('GET', '/api/rides/offers', {
      statusCode: 200,
      body: {
        id: 'ride-abc-456',
        pickupLocation: '123 Main St, Colombo',
        destination: '456 Galle Rd, Colombo',
        estimatedFare: 1500,
        passenger: {
          name: 'Test Passenger',
          rating: 4.8,
        },
      },
    }).as('getRideOffer');

    // Mock accepting the ride
    cy.intercept('POST', '/api/rides/ride-abc-456/accept', {
      statusCode: 200,
      body: { success: true, rideId: 'ride-abc-456' },
    }).as('acceptRide');

    // Mock starting the ride
    cy.intercept('POST', '/api/rides/ride-abc-456/start', {
      statusCode: 200,
      body: { success: true },
    }).as('startRide');

    // Mock completing the ride
    cy.intercept('POST', '/api/rides/ride-abc-456/complete', {
      statusCode: 200,
      body: { success: true, finalFare: 1550 },
    }).as('completeRide');

    // Mock fetching earnings
    cy.intercept('GET', '/api/drivers/earnings', {
      statusCode: 200,
      body: {
        totalEarnings: 1550,
        rides: [
          {
            id: 'ride-abc-456',
            completedAt: new Date().toISOString(),
            fare: 1550,
            pickup: '123 Main St, Colombo',
            destination: '456 Galle Rd, Colombo',
          },
        ],
      },
    }).as('getEarnings');

    // --- Login Step ---
    // It's a best practice to handle login programmatically or via a custom command.
    cy.visit('/login');
    cy.get('[data-cy="phone-input"]').type(Cypress.env('DRIVER_PHONE') || '+94770000001');
    cy.get('[data-cy="password-input"]').type(Cypress.env('DRIVER_PASSWORD') || 'Password123!');
    cy.get('[data-cy="login-button"]').click();
    cy.wait('@driverLogin');
    cy.url().should('include', '/dashboard'); // Assert that login was successful
  });

  it('should allow a driver to go online, accept a ride, complete it, and view earnings', () => {
    // 1. Toggle Availability to go online
    cy.get('[data-cy="availability-toggle"]').should('be.visible').and('not.be.disabled');
    cy.get('[data-cy="availability-status-text"]').should('contain.text', 'You are Offline');
    
    cy.get('[data-cy="availability-toggle"]').click();
    cy.wait('@goOnline');
    
    cy.get('[data-cy="availability-status-text"]').should('contain.text', 'You are Online');
    cy.get('[data-cy="ride-request-notification"]').should('not.exist'); // Initially, no ride request

    // 2. Accept a Ride Request
    // The interceptor for '/api/rides/offers' will now return the mock ride.
    // The UI should update to show the notification.
    cy.wait('@getRideOffer'); // Wait for the app to poll for offers
    cy.get('[data-cy="ride-request-notification"]').should('be.visible');
    cy.get('[data-cy="ride-request-pickup"]').should('contain.text', '123 Main St, Colombo');
    cy.get('[data-cy="ride-request-fare"]').should('contain.text', '1500');
    
    cy.get('[data-cy="accept-ride-button"]').click();
    cy.wait('@acceptRide');

    // Assert that the notification is gone and the "in-ride" UI is visible
    cy.get('[data-cy="ride-request-notification"]').should('not.exist');
    cy.get('[data-cy="in-ride-view"]').should('be.visible');

    // 3. Navigate to Pickup and Start Ride
    cy.get('[data-cy="ride-status-header"]').should('contain.text', 'Navigate to Pickup');
    cy.get('[data-cy="ride-pickup-address"]').should('contain.text', '123 Main St, Colombo');
    
    // Simulate arriving at the pickup location
    cy.get('[data-cy="start-ride-button"]').should('be.visible').click();
    cy.wait('@startRide');

    // 4. Navigate to Destination
    cy.get('[data-cy="ride-status-header"]').should('contain.text', 'En Route to Destination');
    cy.get('[data-cy="ride-destination-address"]').should('contain.text', '456 Galle Rd, Colombo');

    // 5. Complete the Ride
    cy.get('[data-cy="complete-ride-button"]').should('be.visible').click();
    cy.wait('@completeRide');

    // Assert that the ride view is gone and we are back on the main dashboard
    cy.get('[data-cy="in-ride-view"]').should('not.exist');
    cy.get('[data-cy="availability-status-text"]').should('contain.text', 'You are Online'); // Should still be online
    cy.get('[data-cy="toast-notification-success"]').should('contain.text', 'Ride completed! Fare: LKR 1,550');

    // 6. View Earnings
    cy.get('[data-cy="nav-earnings"]').click();
    cy.url().should('include', '/earnings');
    cy.wait('@getEarnings');

    // Assert that the completed ride is visible in the earnings history
    cy.get('[data-cy="earnings-list"]').should('be.visible');
    cy.get('[data-cy="earnings-list-item-ride-abc-456"]').within(() => {
      cy.get('[data-cy="earning-amount"]').should('contain.text', '1,550');
      cy.get('[data-cy="earning-destination"]').should('contain.text', '456 Galle Rd, Colombo');
    });

    cy.get('[data-cy="total-earnings-display"]').should('contain.text', '1,550');
  });
});
