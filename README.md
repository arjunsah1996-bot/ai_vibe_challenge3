# EcoSphere — Carbon Footprint Tracker

EcoSphere is an interactive and immersive carbon footprint tracking application built for the Hack2Skill AI Vibe Challenge 3. It goes beyond standard dashboards by visualizing your environmental impact as a living, breathing 3D ecosystem.

## 🌍 Chosen Vertical
**Environment & Sustainability** (Carbon Footprint Tracking & Gamification)

## 🧠 Approach and Logic
Our approach was to solve the problem of "sustainability fatigue." Most carbon trackers feel like accounting software. To keep users engaged and motivated, we gamified the experience by creating a direct, visual link between their daily actions and environmental health.

**The Logic:**
1. **Data Collection:** Users log daily activities across categories (Household Energy, Transport, Food, Waste, etc.).
2. **Standardized Calculation:** The backend multiplies activity quantities by standardized Emission Factors (kg CO₂e per unit) to calculate precise carbon outputs.
3. **Budgeting & Streaks:** The system compares daily usage against a personalized baseline and monthly budget, tracking "under-budget" streaks.
4. **World State Mapping:** An Insights Engine transforms these metrics into a "World State." For example:
   - High emissions = High haze density (smog), darker skies.
   - Good streaks = Higher foliage density (more trees), clearer rivers.
   - Low impact = Thriving wildlife (fireflies).

## ⚙️ How the Solution Works
EcoSphere is a full-stack application:
- **Backend (FastAPI, Python, SQLAlchemy):** Handles user authentication (JWT), activity logging, goal setting, and insights generation. It exposes a REST API for the frontend.
- **Frontend (React, Vite, TypeScript):** A sleek, glassmorphism-styled web app.
- **3D Visualization (React Three Fiber / Three.js):** Renders the user's "EcoSphere" in real-time behind the dashboard UI. As data changes, the 3D scene smoothly interpolates to the new state.

**Key Features:**
- **Dashboard:** View daily emission trends, category breakdowns, and overall ecosystem health.
- **Activity Logging:** Quick-add activities with smart, auto-calculating forms.
- **Settings & Master Activities:** Manage user profile, tweak monthly carbon budgets, and seamlessly Add/Edit/Delete global master emission factors directly from the UI.
- **Optimized Rendering:** The 3D scene features dynamic context-loss recovery and is optimized for stable performance across devices.

## 📝 Assumptions Made
1. **Emission Factors:** We assume standard, global average emission factors for activities. While the database supports regional factors, the prototype defaults to simplified, generalized values for ease of demonstration.
2. **WebGL Support:** We assume the user's device and browser support WebGL. We have implemented an optimized low-power rendering mode to accommodate constrained GPUs without crashing.
3. **Master Activity Management:** For the sake of this prototype, any authenticated user can add, edit, or delete Master Activities (emission factors). In a production environment, this would be restricted to an Admin role.
4. **Baseline Computation:** If a user is new and lacks sufficient historical data, the system assumes a standard fallback baseline to power the visualizations until enough data is collected.

## 🚀 Running the App Locally

**1. Start the Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

**2. Start the Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:5173/` in your browser. Use the demo credentials (e.g., `demo@ecosphere.app` / `demo1234`) or register a new account.
