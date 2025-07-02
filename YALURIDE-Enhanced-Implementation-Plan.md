# YALURIDE - Enhanced Implementation Plan

## 1. Executive Summary

This document serves as an update to the original GamanGo Technical Project Plan. Following a review of the successful UI/UX patterns in the "GoRide" application, this enhanced plan integrates several new, user-centric features into the YALURIDE platform. The goal is to improve user onboarding, engagement, and satisfaction, ensuring YALURIDE is not only technically robust but also highly competitive and intuitive from launch.

This plan outlines the integration of features such as a guided onboarding experience, a promotions system, driver tipping, and enhanced communication options including in-app video calls. It details the necessary modifications to the database schema, backend microservices, and frontend components, and provides a revised project timeline to accommodate this new scope.

## 2. New Feature Integration

The following features, inspired by the GoRide application design, will be integrated into the YALURIDE platform.

### 2.1. Onboarding Carousel
A multi-step, skippable onboarding carousel will be displayed to new users upon first launch. It will highlight key value propositions such as:
-   Welcome & Core Mission ("Your Journey, Your Way")
-   Ride-Hailing & Vehicle Options
-   Secure Payments & Wallet Functionality

### 2.2. Promotions & Vouchers
A system for creating, managing, and applying promo codes and vouchers to rides.
-   Users can enter promo codes during the booking process.
-   A dedicated "Promos / Vouchers" screen will list available and used vouchers.
-   The backend will manage voucher validation, usage counts, and expiry dates.

### 2.3. Driver Tipping
After a ride is successfully completed, passengers will be presented with an option to add a tip for their driver.
-   The UI will offer predefined amounts and a custom amount option.
-   Tips will be processed through the user's selected payment method (e.g., GamanGo Wallet).
-   100% of the tip will be allocated to the driver.

### 2.4. Mood Rating
A simple, quick feedback mechanism post-ride where users can select an emoji (e.g., happy, neutral, sad) to represent their overall feeling about the trip. This provides a low-friction way to gather general sentiment data.

### 2.5. Enhanced User Profiles
The user profile will be expanded to include optional fields for:
-   **Gender**: To be used for future safety features or user preferences.
-   **Date of Birth**: For demographic analysis and potential birthday promotions.

### 2.6. In-App Voice & Video Calls
To enhance communication and safety, the in-app communication feature will be extended to support not only text chat but also secure, anonymized Voice over IP (VoIP) and video calls between the passenger and the driver. This will use WebRTC technology.

### 2.7. Cancellation Reasons
When a user (passenger or driver) cancels a ride, they will be prompted to select a reason from a predefined list (e.g., "Change in plans," "Waiting for long time," "Unable to contact driver"). This data is crucial for platform improvement and resolving disputes.

---

## 3. Updated Implementation Plan

### 3.1. Database Schema Changes

The following changes and additions will be made to the PostgreSQL database schema.

**1. `users` Table:**
-   Add `gender` column: `gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'))`
-   Add `date_of_birth` column: `date_of_birth DATE`

**2. New `vouchers` Table:**
```sql
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- e.g., 'PERCENTAGE', 'FIXED_AMOUNT'
  value DECIMAL(10, 2) NOT NULL,
  expiry_date TIMESTAMPTZ NOT NULL,
  usage_limit INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**3. New `user_vouchers` Table (Junction Table):**
```sql
CREATE TABLE public.user_vouchers (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL, -- To mark when it was used
  is_used BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, voucher_id)
);
```

**4. New `tips` Table:**
```sql
CREATE TABLE public.tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(user_id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**5. New `cancellation_reasons` Table:**
```sql
CREATE TABLE public.cancellation_reasons (
  id SERIAL PRIMARY KEY,
  reason_code TEXT UNIQUE NOT NULL,
  description_en TEXT NOT NULL,
  description_si TEXT,
  description_ta TEXT,
  cancelled_by_role user_role NOT NULL -- 'PASSENGER' or 'DRIVER'
);
```

**6. New `ride_cancellations` Table:**
```sql
CREATE TABLE public.ride_cancellations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  cancelled_by_user_id UUID NOT NULL REFERENCES public.users(id),
  reason_id INT REFERENCES public.cancellation_reasons(id),
  custom_reason TEXT,
  cancelled_at TIMESTAMPTZ DEFAULT NOW()
);
```

**7. New `ride_mood_ratings` Table:**
```sql
CREATE TABLE public.ride_mood_ratings (
  ride_id UUID PRIMARY KEY REFERENCES public.rides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  mood_score INT NOT NULL CHECK (mood_score BETWEEN 1 AND 5), -- e.g., 1=sad, 5=happy
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2. Backend Service Updates

-   **User Service**:
    -   Update `POST /register` and `PUT /profile` endpoints to handle `gender` and `date_of_birth`.
    -   Add logic to assign promotional vouchers to new users upon registration.
-   **Payment Service**:
    -   Create new endpoints for voucher management: `POST /vouchers/apply` and `GET /vouchers/my-vouchers`.
    -   Integrate voucher logic into the fare calculation process.
    -   Create new endpoints for tipping: `POST /tips` to add a tip to a completed ride.
    -   Integrate tip processing with the payment gateway.
-   **Ride Service**:
    -   Update the `POST /rides/:id/cancel` endpoint to accept a `reason_code` and `custom_reason`.
    -   Create a new endpoint `POST /rides/:id/mood` to store the user's mood rating after a ride.
-   **Real-time / Communication Service**:
    -   This service requires a significant enhancement to support WebRTC for voice/video calls.
    -   Implement a **signaling server** using WebSockets to manage WebRTC session negotiation (SDP offers/answers, ICE candidates) between peers.
    -   The existing WebSocket hub can be extended, or a dedicated signaling service can be created.
    -   Ensure authentication is in place to only allow passengers and drivers of the same active ride to initiate a call.

### 3.3. Frontend Component Plan

The following new React components will be created:

-   `OnboardingCarousel.tsx`: A full-screen, swipeable carousel component for the app's initial launch.
-   `ProfileGenderInput.tsx`: A custom input for selecting gender.
-   `ProfileDOBInput.tsx`: A date picker for date of birth.
-   `PromoCodeInput.tsx`: An input field on the ride confirmation screen to apply voucher codes.
-   `VoucherList.tsx`: A component to display available and used vouchers on a dedicated "Promos" page.
-   `TippingModal.tsx`: A modal that appears after a ride is completed, allowing the user to select a tip amount.
-   `MoodRatingSelector.tsx`: A simple UI with emojis for the post-ride mood rating.
-   `CancellationReasonList.tsx`: A modal or page that displays a list of reasons when a user cancels a ride.
-   `InAppCallView.tsx`: A full-screen or overlay component to handle the UI for active voice and video calls, including mute, speaker, and end call buttons.

---

## 4. Revised Development Timeline

The integration of these new features will extend the original project timeline. The phases are adjusted as follows:

### **Phase 1: MVP Development (Months 1-5)** - (Extended by 1 month)

-   **Month 1-3 (No Change)**: Foundation Setup, Core Features, Advanced Features (as per original plan).
-   **Month 4: PWA Enhancement & Initial New Features**:
    -   Implement `OnboardingCarousel.tsx`.
    -   Integrate `gender` and `date_of_birth` fields into the Signup and Edit Profile pages.
    -   Develop the `CancellationReasonList.tsx` UI and the backend logic in the Ride Service.
-   **Month 5: Vouchers & Tipping Foundation**:
    -   Implement backend logic for Vouchers and Tipping in the Payment Service.
    -   Create frontend components: `PromoCodeInput.tsx`, `VoucherList.tsx`, `TippingModal.tsx`, `MoodRatingSelector.tsx`.
    -   **Deliverables**: All original Phase 1 deliverables plus basic implementation of new profile fields and cancellation reasons.

### **Phase 2: Production Ready (Months 6-9)** - (Extended by 1 month)

-   **Month 6-7 (No Change)**: Safety & Trust Features.
-   **Month 8: Voice & Communication Enhancement**:
    -   Implement the WebRTC signaling server.
    -   Develop the `InAppCallView.tsx` component for voice and video calls.
    -   Thoroughly test the multi-lingual voice command integration.
-   **Month 9: Scale, Performance & Testing**:
    -   Load test all new endpoints (vouchers, tips, etc.).
    -   Conduct UAT for all new features.
    -   **Deliverables**: All original Phase 2 deliverables plus fully functional Vouchers, Tipping, Mood Rating, and In-App Communication features.

### **Phase 3: Native Mobile Apps & Advanced AI (Months 10-13)** - (Extended by 1 month)

-   **Month 10-11 (No Change)**: Mobile Development, Shared Rides, Corporate Accounts.
-   **Month 12-13: Expansion & Analytics**:
    -   Develop an admin dashboard to manage promotions and vouchers.
    -   Analyze cancellation reasons and mood rating data to generate insights.
    -   Refine AI/ML models using the new data points.
    -   **Deliverables**: All original Phase 3 deliverables plus a comprehensive, feature-rich platform ready for aggressive market expansion.
