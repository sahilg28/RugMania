# Requirements Document

## Introduction

This feature adds a User Profile Page to RugMania, accessible by clicking the embedded wallet address in the header. The profile page displays user statistics, game history, and allows users to set a custom username. All data is stored off-chain (MongoDB) for performance and flexibility.

## Glossary

- **Profile_Page**: The dedicated page showing user statistics, game history, and settings
- **Username**: A customizable display name that defaults to the truncated wallet address
- **Game_History**: A scrollable list of the user's past games with outcomes
- **Stats_Card**: A visual card displaying aggregate statistics (games played, volume wagered, net profit/loss)
- **Embedded_Wallet_Address**: The Privy-generated wallet address used for gameplay

## Requirements

### Requirement 1: Profile Page Access

**User Story:** As a player, I want to access my profile by clicking my wallet address, so that I can view my stats and history.

#### Acceptance Criteria

1. WHEN a user clicks the embedded wallet address in the header, THE System SHALL navigate to the profile page
2. THE Profile_Page SHALL be accessible at the route `/profile`
3. IF a user is not authenticated, THEN THE System SHALL redirect to the landing page
4. THE Header SHALL display a clickable wallet address that links to the profile page

---

### Requirement 2: Username Management

**User Story:** As a player, I want to set a custom username, so that I can personalize my identity in the game.

#### Acceptance Criteria

1. THE Profile_Page SHALL display the current username prominently at the top
2. THE Username SHALL default to the truncated embedded wallet address (e.g., "0x18fC...31c4")
3. WHEN a user clicks the edit button next to the username, THE System SHALL show an input field
4. THE Username input SHALL accept alphanumeric characters and underscores, with a maximum of 20 characters
5. WHEN a user saves a new username, THE System SHALL persist it to the database
6. IF the username is invalid, THEN THE System SHALL display an error message
7. THE Username SHALL be displayed in the leaderboard instead of the wallet address when set

---

### Requirement 3: User Statistics Display

**User Story:** As a player, I want to see my gaming statistics, so that I can track my performance over time.

#### Acceptance Criteria

1. THE Profile_Page SHALL display a "Total Games Played" stat card
2. THE Profile_Page SHALL display a "Total Volume Wagered" stat card with MNT token icon
3. THE Profile_Page SHALL display a "Net Profit or Loss" stat card with color coding (green for profit, red for loss)
4. THE Stats_Cards SHALL use the lime/green accent color consistent with the app design
5. THE Statistics SHALL be fetched from the off-chain database on page load
6. WHEN statistics are loading, THE System SHALL display skeleton loading states

---

### Requirement 4: Game History Table

**User Story:** As a player, I want to see my game history, so that I can review my past games and outcomes.

#### Acceptance Criteria

1. THE Profile_Page SHALL display a game history table with columns: Game ID, Status, Wagered, Winnings
2. THE Status column SHALL show "Win" in green or "Loss" in red
3. THE Winnings column SHALL show positive amounts in green with "+" prefix and negative amounts in red with "-" prefix
4. THE Game_History SHALL be sorted by most recent first
5. THE Game_History SHALL support pagination or infinite scroll
6. THE Table SHALL display "Showing X of Y games" with scroll indicator
7. WHEN game history is loading, THE System SHALL display skeleton loading states

---

### Requirement 5: Profile Page Layout

**User Story:** As a player, I want a clean and organized profile page, so that I can easily find information.

#### Acceptance Criteria

1. THE Profile_Page layout SHALL have: Username section (top-left), Stats cards (left column), Game history table (right column)
2. THE Profile_Page SHALL use the dark theme consistent with the rest of the app
3. THE Profile_Page SHALL be responsive for mobile (stacked layout) and desktop (side-by-side)
4. THE Profile_Page SHALL include an exit/back button to return to the game
5. THE Profile_Page SHALL maintain the header with navigation

---

### Requirement 6: API Endpoints

**User Story:** As a developer, I want API endpoints for profile data, so that the frontend can fetch and update user information.

#### Acceptance Criteria

1. THE System SHALL provide a GET endpoint `/api/profile/[address]` to fetch user profile data
2. THE System SHALL provide a PUT endpoint `/api/profile/[address]` to update username
3. THE System SHALL provide a GET endpoint `/api/profile/[address]/history` to fetch game history with pagination
4. THE API endpoints SHALL validate the wallet address format
5. IF the profile doesn't exist, THEN THE System SHALL create a default profile on first access
6. THE API SHALL return appropriate error codes for invalid requests

---

### Requirement 7: Data Persistence

**User Story:** As a player, I want my profile data to persist, so that I can see my history across sessions.

#### Acceptance Criteria

1. THE System SHALL store user profiles in MongoDB with fields: address, username, createdAt, updatedAt
2. THE System SHALL aggregate game statistics from blockchain events or existing leaderboard data
3. THE System SHALL cache frequently accessed profile data for performance
4. WHEN a user plays a game, THE System SHALL update their statistics accordingly

---

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          GAME PAGE                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ HEADER: Game | Logo | Balance | +/- | [Address] | Exit   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                    │                             │
│                                    │ Click Address               │
│                                    ▼                             │
└─────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PROFILE PAGE                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ HEADER: Game | Logo | Balance | +/- | Address | Exit     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │ USERNAME SECTION    │  │ GAME HISTORY TABLE              │   │
│  │ "seegee" [✏️] [🚪]  │  │ ┌─────┬────────┬───────┬──────┐ │   │
│  │                     │  │ │ ID  │ Status │ Wager │ Win  │ │   │
│  │ 0x18fC...31c4 [📋]  │  │ ├─────┼────────┼───────┼──────┤ │   │
│  └─────────────────────┘  │ │#6638│ Loss   │100.00 │-100  │ │   │
│                           │ │#6637│ Win    │100.00 │+42.5 │ │   │
│  ┌─────────────────────┐  │ │ ... │  ...   │  ...  │ ...  │ │   │
│  │ 401                 │  │ └─────┴────────┴───────┴──────┘ │   │
│  │ Total Games Played  │  │                                 │   │
│  └─────────────────────┘  │ Showing 20 of 402 games         │   │
│                           └─────────────────────────────────┘   │
│  ┌─────────────────────┐                                        │
│  │ 50.35K ◈            │                                        │
│  │ Total Volume Wagered│                                        │
│  └─────────────────────┘                                        │
│                                                                  │
│  ┌─────────────────────┐                                        │
│  │ -815.78 ◈           │                                        │
│  │ Net Profit or Loss  │                                        │
│  └─────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Priority

1. **P0 (Critical)**: Profile page access, username display, stats display, game history
2. **P1 (High)**: Username editing, API endpoints
3. **P2 (Medium)**: Pagination, responsive design
4. **P3 (Low)**: Caching, performance optimizations

