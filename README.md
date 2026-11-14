# 🚀 MARSCOPE – Martian Exploration & Mission Planner

### NASA Space Apps Challenge 2026
**Challenge:** Interplanetary Survival Guide: Martian Map

MARSCOPE is an interactive web-based Martian exploration and mission-planning platform designed to support future human exploration of Mars. It focuses on Gale Crater and Mount Sharp, combining planetary scientific data, geospatial visualization, and mission-planning capabilities.

The platform aims to help users explore Martian terrain, examine scientific datasets, plan exploration routes, and understand potential mission risks.

## 🌌 Key Features

- **Mars Explorer:** Interactive Martian map for exploring selected regions.
- **Scientific Data Center:** Access and visualize different categories of Mars scientific datasets.
- **Mission Planner:** Add waypoints, calculate route distance, and estimate mission duration.
- **Terrain Exploration:** Support for examining elevation and surface characteristics.
- **Mission Intelligence:** Planned decision-support capabilities for evaluating routes and exploration conditions.
- **Gemini AI Assistant:** Google Gemini-powered assistant for answering Mars exploration and scientific questions.
- **Mission Reports:** Planned export of mission-planning information.

> Note: Features marked as planned or under development are not necessarily available in the current prototype.

## 🛰️ Technology Stack

### Frontend
- React.js
- Vite
- JavaScript
- React Leaflet
- Leaflet
- Lucide React

### Backend and AI
- Node.js
- Google Gemini API
- Google GenAI SDK

### Deployment
- Vercel (frontend and compatible serverless API routes)
- A separate backend hosting service may be used if the Gemini server runs independently.

## 🗺️ Scientific Data Sources

MARSCOPE is designed to work with publicly available planetary science datasets, including:

- **MOLA:** Mars Orbiter Laser Altimeter elevation data.
- **THEMIS:** Thermal emission imaging data.
- **CTX:** Context Camera imagery.
- **HiRISE:** High-resolution Martian surface imagery.
- **CRISM:** Spectral and mineralogical observations.
- **RAD:** Radiation measurements collected by the Curiosity rover.

Data availability, spatial coverage, resolution, and processing requirements vary by dataset.

## 🏗️ Application Architecture

```text
             USER
               |
               v
       React + Vite Frontend
               |
       ---------------------
       |                   |
       v                   v
  Mars Explorer       Mission Planner
       |                   |
       v                   v
 Scientific Data      Route Analysis
       |                   |
       ------- API --------
               |
               v
        Backend Server
               |
               v
        Google GenAI API
               |
               v
        Gemini AI Response
```

The Gemini API key must remain on the backend. It must not be exposed in frontend JavaScript or committed to GitHub.

## 💻 Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/MARSCOPE-Martian-Mission-Planner.git
```

### 2. Open the project directory

```bash
cd MARSCOPE-Martian-Mission-Planner
```

If the application is inside a subfolder:

```bash
cd marscope-prototype
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the appropriate backend directory.

Example:

```env
GEMINI_API_KEY=your_google_gemini_api_key
```

If the frontend communicates with a separately hosted backend, configure its API base URL using the environment variable expected by your application.

**Important:** Never commit `.env` files or API keys to GitHub.

### 5. Start the development server

```bash
npm run dev
```

### 6. Build the application

```bash
npm run build
```

## ☁️ Deployment

The React and Vite frontend can be deployed using Vercel.

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Configure the correct project root directory.
4. Set the build command to `npm run build`.
5. Set the output directory to `dist`.
6. Deploy the application.

If the Gemini backend is separate, deploy it to a suitable Node.js hosting service and configure its environment variables securely.

If using Vercel API routes, configure the backend routes and environment variables in the Vercel project.

## 🎯 Project Objectives

- Make Martian scientific information easier to explore.
- Combine multiple types of planetary data.
- Support interactive exploration of Martian surface regions.
- Provide waypoint-based mission planning.
- Explore AI-assisted scientific interpretation.
- Support future astronaut mobility and mission-safety research.

## ⚠️ Limitations

MARSCOPE is a prototype developed for the NASA Space Apps Challenge 2026.

- Not all scientific datasets may be available at every location.
- Some features may use demonstration or simulated data.
- Historical rover measurements must not be interpreted as live global measurements.
- Route distance and estimated duration do not establish astronaut safety.
- Further scientific validation and higher-resolution terrain analysis are required before real mission use.

## 👥 Team

**Project:** MARSCOPE  
**Challenge:** NASA Space Apps Challenge 2026  
**Domain:** Space Exploration | Planetary Science | Artificial Intelligence

## 📄 License

Add an appropriate open-source license before distributing the project.
