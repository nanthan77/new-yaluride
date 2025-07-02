/// <reference types="cypress" />

describe('Shared Rides (Pool) End-to-End User Flow', () => {
  // --- Test Data and Mocks ---
  const journeyId = 'journey-pool-123';
  const rideId = 'ride-pool-456';
  const passengerA = { id: 'passenger-a-uuid', name: 'Passenger A', email: 'passengera@yaluride.com' };
  const passengerB = { id: 'passenger-b-uuid', name: 'Passenger B', email: 'passengerb@yaluride.com' };
  const driver = { id: 'driver-c-uuid', name: 'Driver C', email: 'driverc@yaluride.com' };

  const journeyDetails = {
    id: journeyId,
    origin_address: 'Galle Face Green, Colombo',
    destination_address: 'Unawatuna Beach, Galle',
    departure_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    available_seats: 3,
    price_per_seat: 1200,
    allow_shared: true,
    status: 'OPEN',
    passengers: [],
  };

  const login = (user: { email: string, name: string, id: string, role: string }) => {
    cy.session(user.email, () => {
      cy.visit('/login');
      cy.intercept('POST', '/api/auth/login', {
        statusCode: 200,
        body: { user, accessToken: `fake-jwt-for-${user.id}` },
      }).as(`login${user.name.replace(' ', '')}`);
      cy.get('[data-cy="email-input"]').type(user.email);
      cy.get('[data-cy="password-input"]').type('password123');
      cy.get('form').submit();
      cy.wait(`@login${user.name.replace(' ', '')}`);
      cy.url().should('not.include', '/login');
    });
  };

  it('should handle the full lifecycle of a shared ride', () => {
    // --- Step 1: Passenger A posts a shareable journey ---
    cy.log('**Step 1: Passenger A posts a shareable journey**');
    login({ ...passengerA, role: 'passenger' });
    cy.visit('/journeys/post');

    cy.intercept('POST', '/api/journeys', { statusCode: 201, body: journeyDetails }).as('postJourney');
    cy.intercept('GET', `/api/journeys/my`, { statusCode: 200, body: [journeyDetails] }).as('getMyJourneysA');

    cy.get('[data-cy="origin-input"]').type(journeyDetails.origin_address);
    cy.get('[data-cy="destination-input"]').type(journeyDetails.destination_address);
    cy.get('[data-cy="seats-input"]').clear().type(journeyDetails.available_seats.toString());
    cy.get('[data-cy="price-input"]').clear().type(journeyDetails.price_per_seat.toString());
    cy.get('[data-cy="allow-shared-ride-checkbox"]').check();
    cy.get('[data-cy="submit-journey-button"]').click();

    cy.wait('@postJourney').its('request.body').should('deep.include', {
      origin_address: journeyDetails.origin_address,
      allow_shared: true,
    });
    cy.url().should('include', '/journeys/my');
    cy.wait('@getMyJourneysA');
    cy.get(`[data-cy="my-journey-card-${journeyId}"]`).should('contain.text', 'Shared Ride Enabled');

    // --- Step 2: Passenger B finds and joins the journey ---
    cy.log('**Step 2: Passenger B finds and joins the journey**');
    login({ ...passengerB, role: 'passenger' });
    cy.visit('/journeys/find');

    const journeyWithOnePassenger = { ...journeyDetails, available_seats: 2, passengers: [{ id: passengerA.id, name: passengerA.name }] };
    const journeyWithTwoPassengers = { ...journeyDetails, available_seats: 1, passengers: [...journeyWithOnePassenger.passengers, { id: passengerB.id, name: passengerB.name }] };
    
    cy.intercept('GET', '/api/journeys/search*', { statusCode: 200, body: [journeyWithOnePassenger] }).as('searchJourneys');
    cy.intercept('POST', '/api/journeys/book', { statusCode: 201, body: { success: true, journey: journeyWithTwoPassengers } }).as('bookSeat');

    cy.get('[data-cy="find-journey-origin-input"]').type('Colombo');
    cy.get('[data-cy="find-journey-destination-input"]').type('Galle');
    cy.get('[data-cy="find-journey-search-button"]').click();
    cy.wait('@searchJourneys');

    cy.get(`[data-cy="journey-result-card-${journeyId}"]`).as('journeyCard').should('be.visible');
    cy.get('@journeyCard').find('[data-cy="available-seats"]').should('contain.text', '2 seats left');
    cy.get('@journeyCard').find('[data-cy="book-seat-button"]').click();

    cy.wait('@bookSeat').its('request.body').should('deep.equal', {
      journeyId: journeyId,
      seatCount: 1,
    });
    cy.get('[data-cy="booking-success-toast"]').should('be.visible');

    // --- Step 3: Driver accepts the multi-passenger journey ---
    cy.log('**Step 3: Driver accepts the journey**');
    login({ ...driver, role: 'driver' });
    cy.visit('/driver/dashboard');

    const rideWithTwoPassengers = {
      id: rideId,
      status: 'ACCEPTED',
      driver_id: driver.id,
      passengers: [
        { ...passengerA, pickup_address: journeyDetails.origin_address },
        { ...passengerB, pickup_address: 'Wellawatte, Colombo' } // Assume B has a different pickup
      ],
      stops: [
        { type: 'PICKUP', passengerId: passengerA.id, address: journeyDetails.origin_address, status: 'PENDING' },
        { type: 'PICKUP', passengerId: passengerB.id, address: 'Wellawatte, Colombo', status: 'PENDING' },
        { type: 'DROPOFF', passengerId: passengerA.id, address: journeyDetails.destination_address, status: 'PENDING' },
        { type: 'DROPOFF', passengerId: passengerB.id, address: journeyDetails.destination_address, status: 'PENDING' },
      ]
    };

    cy.intercept('GET', '/api/journeys/available', { statusCode: 200, body: [journeyWithTwoPassengers] }).as('getAvailableJourneys');
    cy.intercept('POST', `/api/journeys/${journeyId}/accept`, { statusCode: 200, body: rideWithTwoPassengers }).as('acceptJourney');

    cy.wait('@getAvailableJourneys');
    cy.get(`[data-cy="available-journey-card-${journeyId}"]`).as('driverJourneyCard');
    cy.get('@driverJourneyCard').find('[data-cy="passenger-count"]').should('contain.text', '2 Passengers');
    cy.get('@driverJourneyCard').find('[data-cy="accept-journey-button"]').click();

    cy.wait('@acceptJourney');
    cy.url().should('include', `/driver/ride/${rideId}`);

    // --- Step 4: Driver completes the ride lifecycle ---
    cy.log('**Step 4: Driver completes the ride lifecycle**');
    cy.intercept('PATCH', `/api/rides/${rideId}/start`, { statusCode: 200, body: { ...rideWithTwoPassengers, status: 'ONGOING' } }).as('startRide');
    cy.intercept('PATCH', `/api/rides/${rideId}/pickup`, { statusCode: 200, body: { success: true } }).as('pickupPassenger');
    cy.intercept('PATCH', `/api/rides/${rideId}/complete`, { statusCode: 200, body: { success: true, status: 'COMPLETED' } }).as('completeRide');

    cy.get('[data-cy="active-ride-title"]').should('contain.text', 'Shared Ride');
    cy.get('[data-cy="ride-stop-list-item"]').should('have.length', 4);

    // Start trip
    cy.get('[data-cy="start-trip-button"]').click();
    cy.wait('@startRide');
    cy.get('[data-cy="ride-status-header"]').should('contain.text', 'Trip in Progress');

    // Pick up Passenger A
    cy.get(`[data-cy="pickup-button-${passengerA.id}"]`).click();
    cy.wait('@pickupPassenger').its('request.body').should('deep.equal', { passengerId: passengerA.id });
    cy.get(`[data-cy="pickup-button-${passengerA.id}"]`).should('be.disabled').and('contain.text', 'Picked Up');

    // Pick up Passenger B
    cy.get(`[data-cy="pickup-button-${passengerB.id}"]`).click();
    cy.wait('@pickupPassenger').its('request.body').should('deep.equal', { passengerId: passengerB.id });
    cy.get(`[data-cy="pickup-button-${passengerB.id}"]`).should('be.disabled').and('contain.text', 'Picked Up');

    // Complete Ride
    cy.get('[data-cy="complete-ride-button"]').should('not.be.disabled').click();
    cy.wait('@completeRide');
    cy.get('[data-cy="ride-summary-modal"]').should('be.visible');
    cy.get('[data-cy="ride-summary-passengers"]').should('contain.text', '2');

    // --- Step 5: Final Verification ---
    cy.log('**Step 5: Passengers verify ride completion**');
    login({ ...passengerA, role: 'passenger' });
    cy.visit('/rides/history');
    cy.intercept('GET', '/api/rides/history', { statusCode: 200, body: [{ id: rideId, status: 'COMPLETED', ...journeyDetails }] }).as('getHistoryA');
    cy.wait('@getHistoryA');
    cy.get(`[data-cy="ride-history-item-${rideId}"]`).should('contain.text', 'Completed');
  });
});
