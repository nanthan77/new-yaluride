/// <reference types="cypress" />

describe('Tourist User Actions - Tour Packages', () => {
  // Use a session to log in once for all tests in this spec file
  beforeEach(() => {
    cy.session('touristUser', () => {
      cy.visit('/login');

      // Mock the login API call for a tourist user
      cy.intercept('POST', '/api/auth/login', {
        statusCode: 200,
        body: {
          user: {
            id: 'tourist-uuid-12345',
            name: 'Test Tourist',
            role: 'passenger',
          },
          accessToken: 'fake-tourist-jwt-token',
        },
      }).as('loginRequest');

      // Perform login
      cy.get('[data-cy="email-input"]').type('tourist@yaluride.com');
      cy.get('[data-cy="password-input"]').type('password123');
      cy.get('form').submit();

      cy.wait('@loginRequest');
      cy.url().should('include', '/'); // Should redirect to home or dashboard
    });
  });

  it('should allow a tourist to browse, view details, and book a tour package', () => {
    // --- 1. Mock API Endpoints ---
    const mockTourId = 'tour-abc-123';
    const mockTourPackages = [
      {
        id: mockTourId,
        title: 'Explore the Hill Country',
        description: 'A 3-day tour through Nuwara Eliya and Ella.',
        duration_days: 3,
        price: 35000,
        currency: 'LKR',
        driver: { name: 'Saman Silva' },
      },
      {
        id: 'tour-def-456',
        title: 'Ancient Cities Discovery',
        description: 'Visit Anuradhapura and Polonnaruwa.',
        duration_days: 4,
        price: 45000,
        currency: 'LKR',
        driver: { name: 'Kamal Perera' },
      },
    ];

    const mockTourDetails = {
      ...mockTourPackages[0],
      itinerary: [
        { day_number: 1, title: 'Arrival in Kandy', description: 'Visit the Temple of the Tooth.' },
        { day_number: 2, title: 'Train to Ella', description: 'Experience the scenic train journey.' },
        { day_number: 3, title: 'Hike Little Adam\'s Peak', description: 'Enjoy the sunrise and depart.' },
      ],
    };

    const mockBookingId = 'booking-xyz-789';
    const mockNewBooking = {
      id: mockBookingId,
      tour_package_id: mockTourId,
      passenger_id: 'tourist-uuid-12345',
      start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      number_of_travelers: 2,
      status: 'pending_confirmation',
    };

    cy.intercept('GET', '/api/tours', { statusCode: 200, body: mockTourPackages }).as('getTours');
    cy.intercept('GET', `/api/tours/${mockTourId}`, { statusCode: 200, body: mockTourDetails }).as('getTourDetails');
    cy.intercept('POST', '/api/tours/bookings', { statusCode: 201, body: mockNewBooking }).as('createBooking');
    cy.intercept('GET', '/api/my-bookings/tours', { statusCode: 200, body: [mockNewBooking] }).as('getMyBookings');

    // --- 2. Browse Tour Packages ---
    cy.log('**Step 2: Browsing Tour Packages**');
    cy.visit('/tours');
    cy.wait('@getTours');

    cy.get('[data-cy="tour-package-card"]').should('have.length', mockTourPackages.length);
    cy.contains('Explore the Hill Country').should('be.visible');
    cy.contains('Ancient Cities Discovery').should('be.visible');

    // --- 3. View Tour Details ---
    cy.log('**Step 3: Viewing Tour Details**');
    cy.get(`[data-cy="tour-card-${mockTourId}"] [data-cy="view-details-button"]`).click();

    cy.url().should('include', `/tours/${mockTourId}`);
    cy.wait('@getTourDetails');

    cy.get('[data-cy="tour-detail-title"]').should('contain.text', 'Explore the Hill Country');
    cy.get('[data-cy="tour-detail-itinerary-item"]').should('have.length', 3);
    cy.contains('Train to Ella').should('be.visible');

    // --- 4. Book a Tour ---
    cy.log('**Step 4: Booking the Tour**');
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const dateString = nextWeek.toISOString().split('T')[0];

    cy.get('[data-cy="booking-start-date-input"]').type(dateString);
    cy.get('[data-cy="booking-travelers-input"]').clear().type('2');
    cy.get('[data-cy="book-now-button"]').click();

    cy.wait('@createBooking').its('request.body').should('deep.include', {
      tourPackageId: mockTourId,
      startDate: dateString,
      numberOfTravelers: 2,
    });

    // --- 5. Verify Booking ---
    cy.log('**Step 5: Verifying the Booking**');
    cy.get('[data-cy="booking-success-toast"]').should('be.visible').and('contain.text', 'Tour booked successfully!');
    
    // Navigate to the user's booking history page
    cy.get('[data-cy="navigate-to-my-bookings"]').click();
    cy.url().should('include', '/my-bookings');
    cy.wait('@getMyBookings');

    cy.get(`[data-cy="booking-card-${mockBookingId}"]`).within(() => {
      cy.contains('Explore the Hill Country').should('be.visible');
      cy.contains('Pending Confirmation').should('be.visible');
      cy.contains('Travelers: 2').should('be.visible');
    });
  });
});
