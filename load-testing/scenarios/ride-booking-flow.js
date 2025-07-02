# YALURIDE - Cross-Platform Manual Testing Plan

## 1. Introduction

This document outlines the manual testing plan for ensuring the YALURIDE Progressive Web App (PWA) functions correctly and provides a consistent user experience across various browsers, operating systems, and devices. This is a critical step before launch to catch platform-specific bugs that automated tests might miss.

**Objective**: To identify and document any functional, visual, or performance issues on our target platforms, ensuring a high-quality experience for all users, regardless of their device.

**Scope**: This plan covers manual testing for both the **Passenger PWA** and the **Driver PWA**. It focuses on critical user flows and PWA-specific features.

---

## 2. Target Platforms & Browsers

The following platforms represent the primary target audience in Sri Lanka. Testing should be performed on physical devices where possible, supplemented by emulators/simulators for broader coverage.

**Priority Levels**:
*   **Critical**: Must pass all tests. Represents the vast majority of the target user base.
*   **High**: Should pass all critical-path tests. Minor cosmetic issues are acceptable.
*   **Medium**: Should pass core functionality tests. Focus is on usability, not pixel-perfection.

### Primary Targets (Critical Priority)
*   **Android (Versions 11+)**:
    *   **Browser**: Google Chrome (Latest)
    *   **Devices**: Samsung (Galaxy A/M series), Xiaomi (Redmi), Huawei (with GMS if applicable). Test on at least two different screen sizes.
*   **iOS (Versions 16+)**:
    *   **Browser**: Safari (Latest)
    *   **Devices**: iPhone 12 or newer, iPhone SE (to test smaller screens).

### Secondary Targets (High Priority)
*   **Desktop - Windows 10/11**:
    *   **Browser**: Google Chrome (Latest)
*   **Desktop - macOS (Latest)**:
    *   **Browser**: Safari (Latest)

### Tertiary Targets (Medium Priority)
*   **Desktop - All**: Firefox (Latest)
*   **Older Mobile OS**: Android 9-10, iOS 14-15

---

## 3. Manual Test Cases Checklist

Testers should execute these test cases on each target platform and record the results.

| **Section**                    | **Test Case ID** | **Test Description**                                                                                                                                | **Expected Result**                                                                                                                              |
| ------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **PWA Features**               | PWA-01           | **Add to Home Screen**: Use the browser's "Install App" or "Add to Home Screen" feature.                                                            | The app installs with its own icon. It launches in a standalone, fullscreen window without browser UI.                                           |
|                                | PWA-02           | **Offline Launch**: Enable airplane mode and launch the app from the home screen icon.                                                              | The app loads successfully from the service worker, showing a cached version of the UI.                                                          |
|                                | PWA-03           | **Offline Action**: While offline, attempt to book a ride.                                                                                          | The UI clearly indicates the app is offline. The booking action is queued, and a message confirms it will be processed when back online.          |
|                                | PWA-04           | **Push Notifications**: Trigger a push notification (e.g., driver accepts ride).                                                                    | The notification appears on the device's lock screen or notification tray, even if the app is in the background.                                |
| **UI & Responsiveness**        | UI-01            | **Layout Integrity**: Rotate the device from portrait to landscape on key pages (Map, Ride History, Profile). Resize browser window on desktop.     | The layout adapts gracefully without breaking, overlapping elements, or causing horizontal scrolling. Key elements remain accessible.              |
|                                | UI-02            | **Input Fields**: Interact with all text inputs, dropdowns, and date pickers.                                                                     | The native device keyboard (or date picker) appears correctly. Typing is smooth. No UI elements are obscured by the keyboard.                      |
| **Passenger Flow**             | PASS-01          | **Registration & Login**: Complete the sign-up process. Log out. Log back in.                                                                     | The user can register and log in successfully. The session is persisted after closing and reopening the app.                                     |
|                                | PASS-02          | **Ride Booking**: Enter pickup and destination. Select vehicle type. Confirm booking.                                                             | Fare estimate is shown. The ride request is sent, and the UI updates to a "searching" state.                                                       |
|                                | PASS-03          | **Live Tracking**: After driver acceptance, view the driver's location on the map in real-time.                                                     | The driver's icon moves smoothly on the map. The ETA updates correctly. Map interactions (pan, zoom) are fluid.                                  |
|                                | PASS-04          | **Voice Command**: Use the voice command feature to book a ride.                                                                                    | The browser prompts for mic permission. Speech is transcribed correctly, and the booking flow is initiated.                                      |
| **Driver Flow**                | DRIVER-01        | **Toggle Availability**: Tap the "Go Online" / "Go Offline" toggle.                                                                               | The UI state updates instantly. The backend call is made to update the driver's status.                                                          |
|                                | DRIVER-02        | **Accept Ride**: Receive a new ride request notification. Tap to accept.                                                                            | The notification is clear and provides essential details. Accepting the ride transitions the UI to the "navigate to pickup" state.               |
|                                | DRIVER-03        | **In-Ride Navigation**: Start the ride and follow the map to the destination. Complete the ride.                                                    | The map provides clear turn-by-turn directions. The "Complete Ride" button works and transitions the UI to the earnings summary.                  |

---

## 4. Testing Process & Bug Reporting

1.  **Preparation**:
    *   Assign testers to specific platforms.
    *   Ensure all testers have access to the staging environment URL and test accounts.
    *   Provide a link to the bug reporting tool (e.g., GitLab Issues, Jira).

2.  **Execution**:
    *   Testers perform each test case on their assigned platform.
    *   A shared spreadsheet or test management tool should be used to track the status (`Pass`, `Fail`, `N/A`) of each test case per platform.

3.  **Bug Reporting**:
    *   For any test case that fails, a detailed bug report must be created in GitLab Issues.
    *   **Bug Report Template**:
        *   **Title**: Clear and concise summary of the issue (e.g., "[iOS Safari] Booking button overlaps footer in landscape mode").
        *   **Platform**: OS Version, Browser Version, Device Model.
        *   **Test Case ID**: e.g., `UI-01`.
        *   **Steps to Reproduce**: A numbered list of steps.
        *   **Actual Result**: What actually happened.
        *   **Expected Result**: What should have happened.
        *   **Visuals**: **Screenshots or screen recordings are mandatory.**
        *   **Logs**: Any relevant console logs or error messages.

4.  **Triage & Fix**:
    *   The development team will triage new bug reports daily.
    *   Bugs will be prioritized based on severity and the priority of the platform they affect.

5.  **Verification**:
    *   Once a bug is fixed and deployed to staging, the original tester must re-test it on the same platform to confirm the fix.

---

## 5. Test Results Summary

*(This section will be filled out upon completion of the testing cycle.)*

**Testing Cycle Date**: YYYY-MM-DD

| Platform         | Pass Rate | Critical Issues | High Issues | Notes                               |
| ---------------- | --------- | --------------- | ----------- | ----------------------------------- |
| **Android/Chrome** | TBD       | TBD             | TBD         |                                     |
| **iOS/Safari**     | TBD       | TBD             | TBD         |                                     |
| **Desktop/Chrome** | TBD       | TBD             | TBD         |                                     |
| **Desktop/Safari** | TBD       | TBD             | TBD         |                                     |
| **Desktop/Firefox**| TBD       | TBD             | TBD         |                                     |
