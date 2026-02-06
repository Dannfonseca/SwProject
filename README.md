# Summoners War Siege Planner

A comprehensive web application for managing and analyzing Siege Defenses in Summoners War.

## Features

- **Monster Gallery:** Explore the full game database with element filters.
- **Siege Defenses:** View and register meta defenses with stats and win rates.
- **AI Analyzer:** Upload screenshots to automatically detect monsters and save defenses (powered by Gemini Vision).
- **Mobile-First Design:** Fully responsive UI/UX for desktop and mobile.
- **Google Auth:** Integrated authentication for user contributions.

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Bun, Express/Elysia (Microservices)
- **Database:** PostgreSQL (Supabase)
- **AI:** Google Gemini Vision API

## Getting Started

### Prerequisites

- Node.js & Yarn/Bun
- PostgreSQL Database

### Installation

1.  **Clone the repo:**
    ```bash
    git clone https://github.com/Dannfonseca/SwSiegeProject.git
    cd SwSiegeProject
    ```

2.  **Install Dependencies:**
    ```bash
    # Root
    yarn install

    # Backend
    cd backend
    bun install
    ```

3.  **Environment Setup:**
    Create a `.env` file in `backend/` based on `.env.example` (or your own configuration).

4.  **Run the App:**
    ```bash
    # Frontend (from root)
    yarn dev

    # Backend (from backend/)
    bun run src/index.ts
    ```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
