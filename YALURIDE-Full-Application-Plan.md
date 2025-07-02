# YALURIDE - Full Application Plan & Roadmap

**Project Vision:** To create YALURIDE, Sri Lanka's premier ride-sharing platform focused on pre-planned, long-distance journeys. YALURIDE will operate as a transparent marketplace where passengers can find rides and drivers can post their availability, with a unique bidding system that ensures fair pricing for everyone.

**Unique Value Proposition:** Unlike on-demand urban taxi services, YALURIDE specializes in inter-city travel, connecting passengers and drivers for planned trips. Its core differentiators are the driver-initiated route postings, a passenger-driven bidding system, and features specifically tailored for the Sri Lankan local and tourist markets.

---

## 1. Core Concepts

### For Drivers:
1.  **Post Availability**: Announce planned routes with dates, available seats, and minimum acceptable prices (e.g., "Colombo to Jaffna, this Friday, 2 seats available").
2.  **Receive & Manage Bids**: View offers from passengers, see their profiles and trust scores, and accept the bids that best fit their schedule and price.
3.  **Maximize Earnings**: Fill empty seats on planned journeys, reduce empty return trips, and build a base of regular customers for recurring routes.

### For Passengers:
1.  **Find Journeys**: Search for drivers already heading to their destination, filtering by date, price, vehicle type, and driver rating.
2.  **Make Offers (Bid)**: Propose a price for a seat or an entire vehicle, creating a fair, market-driven pricing model.
3.  **Share & Save**: Join shared rides to reduce travel costs.
4.  **Book with Confidence**: Travel with verified drivers and utilize advanced safety features.

---

## 2. Full Feature Set

This section details the complete list of features to be implemented in the YALURIDE platform.

### Core Platform Features
-   **PWA First**: A fully responsive Progressive Web App for both passengers and drivers, ensuring accessibility on all devices.
-   **Multi-Lingual Support**: Full UI and voice command support for English, Sinhala, and Tamil.
-   **Offline Functionality**: Core features like viewing ride details and queuing actions will work without an internet connection.
-   **Map Caching**: Intelligent caching of map tiles for reliable navigation in areas with poor connectivity.
-   **Admin Dashboard**: A comprehensive back-office for platform management, user support, and analytics.

### Authentication & Onboarding
-   **Onboarding Carousel**: A skippable intro for new users highlighting key features.
-   **Social & Phone Authentication**: Secure sign-up and login using Phone OTP, Google, Apple, and Facebook.
-   **Guided Profile Completion**: A step-by-step process for new users to fill out their profiles.

### Passenger Features
-   **Smart Journey Search**: Filter journeys by route, date, price, vehicle type, driver rating, and tourist-friendly options.
-   **Bidding System**: Place bids on driver-posted journeys.
-   **Journey Posting**: Post a desired journey for drivers to bid on.
-   **Shared Rides**: Option to post or join sharable journeys to split costs.
-   **Wallet System**: In-app wallet for seamless payments.
-   **Promotions & Vouchers**: Apply promo codes for discounts.
-   **Ride History**: View past and upcoming trips.
-   **Driver Reviews & Ratings**: A two-way review system.
-   **Tipping**: Option to tip the driver after a completed ride.
-   **Mood Rating**: Quick emoji-based feedback after a ride.

### Driver Features
-   **Route Posting System**: Post available routes with details like stops, available seats, and minimum price.
-   **Recurring Trip Templates**: Save and reuse common journey plans.
-   **Bid Management**: View and accept bids from passengers.
-   **Driver Dashboard**: Track earnings, view route analytics, and manage availability.
-   **Fuel Cost Calculator**: A utility to help drivers estimate trip costs.

### Tourist-Specific Features
-   **Tour Packages**: Pre-defined, bookable tour packages for popular Sri Lankan destinations.
-   **Custom Tour Builder**: Allow tourists to build their own multi-day itineraries.
-   **Certified Guide Filter**: Filter for drivers with official tour guide certifications.
-   **Language Matching**: Filter drivers by spoken languages.

### Safety & Trust Features
-   **Enhanced Driver Verification**: Multi-step verification including National ID, Driver's License, and Police Clearance Report.
-   **Trust Score Engine**: An algorithmically calculated score for both drivers and passengers based on ratings, verifications, and platform history.
-   **In-App Communication**: Secure, anonymized chat, voice, and video calls (WebRTC) between passenger and driver.
-   **SOS Emergency Button**: A one-tap button to alert emergency contacts and the YALURIDE safety team.
-   **Share Trip Status**: Real-time location sharing with trusted contacts.
-   **Women-Only Ride Option**: A feature allowing female passengers to book with female drivers.

### Advanced & AI-Powered Features (Post-MVP)
-   **AI Bidding Suggestions**: Provide passengers with a suggested bid price based on demand, distance, and historical data.
-   **Route Optimization**: Suggest more efficient routes or popular pickup/dropoff points.
-   **Demand Heatmaps**: Show drivers areas with high passenger demand.
-   **Community Alerts**: Allow users to report real-time traffic or road hazards.

---

## 3. Architecture & Technology Stack

The platform will be built on a modern, scalable microservices architecture.

### Architecture Diagram
```plaintext
┌─────────────────────────────────────────────────────────────┐
│                        API Gateway                           │
│                 (NestJS - GraphQL & REST)                    │
└─────────────────────┬───────────────────┬───────────────────┘
                      │                   │
        ┌─────────────┴─────────┐ ┌──────┴──────────┐
        │   Service Discovery   │ │  WebSocket Hub   │
        │      (RabbitMQ)       │ │  (Real-time)     │
        └─────────────┬─────────┘ └──────┬──────────┘
                      │                   │
┌─────────────────────┴───────────────────┴─────────────────────┐
│                      Service Mesh (Optional: Istio)            │
├────────────┬────────────┬────────────┬────────────┬──────────┤
│   User     │   Driver   │  Matching  │  Payment   │ Location │
│  Service   │  Service   │  Service   │  Service   │ Service  │
├────────────┼────────────┼────────────┼────────────┼──────────┤
│   Ride     │  Pricing   │   Admin    │ Analytics  │  Voice   │
│  Service   │  Service   │  Service   │  Service   │ Service  │
└────────────┴────────────┴────────────┴────────────┴──────────┘
```

### Technology Stack
-   **Frontend (Phase 1)**: React 18+ PWA with TypeScript, Redux Toolkit, Tailwind CSS, Workbox.
-   **Frontend (Phase 3)**: React Native for native iOS and Android apps.
-   **Backend**: NestJS microservices with TypeScript.
-   **API**: GraphQL (Apollo Federation) for primary data fetching, REST for webhooks and simple endpoints.
-   **Database**: PostgreSQL 15 with PostGIS extension.
-   **Cache**: Redis 7 for session management and response caching.
-   **Search**: Elasticsearch for location and journey search.
-   **Time-Series Data**: TimescaleDB for GPS location history.
-   **Messaging**: RabbitMQ for asynchronous inter-service communication.
-   **Real-time**: WebSockets (managed by a dedicated NestJS gateway) for live tracking and notifications.
-   **Infrastructure**: AWS, Kubernetes (EKS), Docker.
-   **CI/CD**: GitLab CI + ArgoCD (GitOps).

---

## 4. Phased Development Timeline

### Phase 1: MVP - Core Marketplace Functionality (Months 1-4)
*   **Goal**: Launch a functional bidding marketplace for pre-planned journeys.
*   **Features**:
    *   User Authentication (Phone, Google, Apple) & Profile Management.
    *   Driver & Vehicle Verification (Manual Admin Approval).
    *   **Passenger**: Post Journeys, Search Journeys, Place Bids.
    *   **Driver**: Post Routes, View & Accept Bids.
    *   Basic Ride Lifecycle (Scheduled -> Ongoing -> Completed).
    *   Two-Way Rating System.
    *   Wallet & Basic Payment Integration (PayHere).
    *   In-App Chat & Push Notifications.
*   **Deliverable**: A functional PWA for passengers and drivers on the Colombo-Kandy-Galle triangle.

### Phase 2: Expansion & Trust Features (Months 5-8)
*   **Goal**: Enhance user trust, improve the user experience, and introduce key differentiators.
*   **Features**:
    *   **Shared Rides**: Implement logic for passengers to join existing sharable journeys.
    *   **Tourist Packages**: Introduce pre-defined and custom tour creation.
    *   **Enhanced Safety**: SOS Button, Share Trip Status, Women-Only option.
    *   **Advanced UI/UX**: Implement the full UI/UX design brief, including onboarding, tipping, and mood ratings.
    *   **Vouchers & Promotions System**.
    *   **In-App Voice/Video Calls** (WebRTC).
    *   **Comprehensive Admin Dashboard**.
*   **Deliverable**: A feature-rich, polished application ready for a wider public launch across major Sri Lankan cities.

### Phase 3: Scale & Intelligence (Months 9-12+)
*   **Goal**: Optimize the platform with data-driven features and expand to native mobile apps.
*   **Features**:
    *   **React Native Apps**: Develop and launch native iOS and Android applications.
    *   **AI-Powered Features**: Implement smart bidding suggestions and demand heatmaps.
    *   **Corporate Accounts**: A portal for businesses to manage employee travel.
    *   **Loyalty & Rewards Program**.
    *   **Community Alerts System**.
    *   **API for Partnerships**: Open up an API for hotels and travel agencies to integrate with.
*   **Deliverable**: A scalable, intelligent platform with native mobile apps, ready for market leadership and partnerships.

---

## 5. Success Metrics & KPIs

| Metric                | 3 Months (MVP Launch) | 6 Months (Expansion) | 1 Year (Scale) |
| :-------------------- | :-------------------: | :------------------: | :------------: |
| Active Drivers        |          500          |        2,000         |     10,000     |
| Monthly Bookings      |         1,000         |        10,000        |     50,000     |
| Routes Covered        |          10           |          50          |      200       |
| User Retention        |          40%          |         60%          |      75%       |
| Average Bid Success   |          60%          |         70%          |      80%       |
| App Store Rating      |          N/A          |         N/A          |      4.5+      |

