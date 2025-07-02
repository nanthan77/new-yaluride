# YALURIDE - UI/UX Design Brief

This document outlines the design system, user interface (UI), and user experience (UX) guidelines for the YALURIDE Progressive Web App (PWA). The goal is to create a clean, intuitive, and accessible interface that caters to a diverse, multi-lingual user base in Sri Lanka.

## 1. Overall Design System & Branding

### Color Palette

The color scheme should evoke trust, efficiency, and a touch of Sri Lankan vibrancy.

-   **Primary (Deep Blue)**: `#0E2233` - Used for primary text, headers, and key structural elements. Conveys professionalism and stability.
-   **Accent (Teal)**: `#009688` - Used for primary buttons, active states, links, and key calls-to-action. It's a modern, energetic color.
-   **Highlight (Gold/Yellow)**: `#FFC107` - Used for secondary CTAs, special offers, warnings, and star ratings. Draws attention without being overwhelming.
-   **Backgrounds**:
    -   Light Mode: `#F5F5F5` (Off-white/Light Gray)
    -   Dark Mode: `#121212` (True Dark)
-   **Surface/Card**:
    -   Light Mode: `#FFFFFF` (White)
    -   Dark Mode: `#1E1E1E` (Dark Gray)
-   **Text**:
    -   Light Mode: Primary (`#0E2233`), Secondary (`#4A5568`)
    -   Dark Mode: Primary (`#E5E7EB`), Secondary (`#A0AEC0`)
-   **Status Colors**:
    -   Success: `#38A169` (Green)
    -   Error: `#E53E3E` (Red)
    -   Warning: `#DD6B20` (Orange)

### Typography

Fonts must have excellent readability and support for English, Sinhala, and Tamil scripts.

-   **Headings**: **Poppins** or **Inter** - A clean, modern sans-serif font that is highly legible.
-   **Body Text**: **Noto Sans** (or platform-native sans-serif) - Noto Sans has excellent multi-language support, including Noto Sans Sinhala and Noto Sans Tamil, ensuring consistency across languages.
-   **Font Sizing**: Use a responsive, type-scale system (e.g., based on Tailwind CSS defaults) to ensure readability on all screen sizes.

### Iconography

-   **Primary Icon Set**: **Lucide-React** - A clean, modern, and highly comprehensive icon library that is easy to integrate.
-   **Custom Icons**: For unique features like vehicle types (Tuk-Tuk, Van), custom SVG icons should be created to match the Lucide style.

## 2. Authentication Screens (AuthLayout)

The authentication flow should be simple, secure, and reassuring for new users.

### Login Page (`LoginPage.tsx`)

-   **Layout**: Centered, single-column form on a clean background.
-   **Components**:
    -   YALURIDE Logo at the top.
    -   **Phone Number Input**: With a country code selector defaulted to Sri Lanka (+94).
    -   **Password Input**: With a toggle to show/hide the password.
    -   **"Forgot Password?" Link**: Prominently placed below the password field.
    -   **Primary CTA Button**: "Login" (full-width, using Accent color).
    -   **Social Login Buttons**: "Continue with Google", "Continue with Apple". These should be visually distinct from the primary login button.
    -   **Signup Link**: "Don't have an account? **Sign Up**" at the bottom.

### Signup Page (`SignupPage.tsx`)

-   **Layout**: Similar to the Login page, possibly a multi-step form for clarity.
-   **Components**:
    -   YALURIDE Logo.
    -   **Full Name Input**.
    -   **Phone Number Input** (with OTP verification flow).
    -   **Password & Confirm Password Inputs**: With strength indicator.
    -   **Terms of Service Checkbox**: Required, with a link to the terms page.
    -   **Primary CTA Button**: "Sign Up" or "Send OTP".

### OTP Verification Page

-   **Layout**: Highly focused, centered component.
-   **Components**:
    -   Clear instruction text: "Enter the 6-digit code sent to [user's phone number]".
    -   **OTP Input**: A set of 6 individual input boxes that auto-focus to the next box.
    -   **"Resend Code" Button**: Initially disabled, with a visible countdown timer (e.g., 60 seconds).
    -   **Primary CTA Button**: "Verify & Continue".

## 3. Main Application Screens (MainLayout)

The main layout will feature a persistent bottom navigation bar for core actions.

### Dashboard (Passenger & Driver)

-   **Layout**: A summary-oriented view with cards and quick links.
-   **Passenger Dashboard**:
    -   **Welcome Message**: "Good morning, [User Name]".
    -   **Primary CTA**: A large, prominent "Where to?" search bar/card to initiate the ride booking flow.
    -   **Saved Locations**: Cards for "Home" and "Work" for one-tap booking.
    -   **Recent Journeys**: A horizontally scrollable list of recent or upcoming rides.
-   **Driver Dashboard**:
    -   **Availability Toggle**: A large, prominent toggle switch to go "Online" or "Offline".
    -   **Earnings Summary**: Cards showing today's earnings and weekly earnings.
    -   **Incoming Requests**: A list or stack of incoming journey requests from the marketplace that match the driver's criteria.
    -   **Current Ride Info**: If a ride is active, this section is prominent, otherwise it's hidden.

### Ride Booking Flow

-   **Interface**: Map-centric, with a slidable bottom sheet for inputs.
-   **Step 1: Location Input**:
    -   Bottom sheet contains "Pickup Location" and "Destination" input fields.
    -   Tapping an input focuses the map and allows the user to drop a pin or search for an address.
-   **Step 2: Ride Options & Confirmation**:
    -   Once locations are set, the bottom sheet expands to show route on the map and ride options.
    -   Display vehicle types (Car, Van, Tuk-Tuk) with estimated fares and ETAs for each.
    -   Show a "Sharable" toggle option.
    -   **Primary CTA**: "Confirm Ride" or "Post to Marketplace".

### Journey Marketplace (`MarketplaceBrowsePage.tsx`)

-   **Layout**: A list of `JourneyCard` components with a sticky filter/sort bar at the top.
-   **JourneyCard Component**:
    -   Clearly display Pickup and Destination.
    -   Show scheduled time, passenger count, and any special icons (e.g., sharable, luggage).
    -   Display the passenger's max price if provided.
    -   Show the number of existing bids.
    -   **Primary CTA**: "Make an Offer".
-   **Filters**: A slide-over or expandable panel with options for location radius, date range, vehicle type, etc.

### Bidding Modal (`BidModal.tsx`)

-   **Layout**: A focused dialog/modal that overlays the marketplace view.
-   **Components**:
    -   Summary of the journey details (Pickup, Destination, Time).
    -   **Bid Amount Input**: A clear input for the driver to enter their price.
    -   **Optional Message Input**: A text area for a short message to the passenger.
    -   **Summary**: Show the driver's potential earnings after commission.
    -   **Primary CTA**: "Submit Bid".

### Active Ride Tracking Page

-   **Layout**: Full-screen map with an overlay card containing ride details.
-   **Map View**:
    -   Live icon of the driver's vehicle moving along the route.
    -   Clearly marked pickup and dropoff points.
    -   The route line should update if the driver deviates.
-   **Details Card**:
    -   **Driver Info**: A card showing the driver's name, photo, rating, vehicle model, and license plate.
    -   **Ride Status**: A clear, prominent status indicator (e.g., "Driver is arriving in 5 mins", "Ride in progress").
    -   **ETA**: Live updated ETA.
    -   **Actions**:
        -   Buttons to "Call" or "Message" the driver.
        -   A prominent **"SOS" / Emergency** button.

### Wallet Page

-   **Layout**: Simple, clean, and focused on financial information.
-   **Components**:
    -   **Balance Card**: A card showing the current wallet balance in a large, clear font.
    -   **Action Buttons**: "Add Funds" and "Withdraw" (for drivers).
    -   **Transactions List**: A list of recent transactions with date, description, and amount (credit/debit).

### Profile & Settings Page

-   **Layout**: Use a tabbed interface to organize content.
-   **Profile Tab**:
    -   An area for uploading/displaying a profile picture.
    -   Editable fields for user's name and contact information.
    -   A section for **Verification Status** (Phone, Email, GN Division, Driver's License) with clear visual indicators (e.g., checkmark for verified, warning icon for pending).
-   **Vehicles Tab (Drivers only)**:
    -   A list of the driver's registered vehicles.
    -   A clear "Add New Vehicle" button that opens a form/modal.
-   **Settings Tab**:
    -   **Theme Selector**: Buttons for Light, Dark, and System.
    -   **Language Selector**: A dropdown to switch between English, Sinhala, and Tamil.
    -   **Notification Preferences**: A list of toggles for different notification types (e.g., Push, SMS, Email for various events).
