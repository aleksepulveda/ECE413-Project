# Heart Track - ECE 413/513 Final Project (2025)

## Project Overview

Heart Track is a low-cost IoT-enabled web application for monitoring heart rate and blood oxygen saturation levels throughout the day. The system consists of:

- **IoT Device**: Particle Photon with MAX30102 sensor for heart rate and blood oxygen monitoring
- **Web Application**: Responsive web app for data visualization and device management
- **Server**: Node.js/Express backend with MongoDB database
- **Real-time Monitoring**: Configurable measurement intervals and time ranges

The system provides daily and weekly data summaries, device management, secure authentication, and real-time chart visualizations.

## Project Structure

```
Project Structure
HeartTrack/
│
├── README.md                 # Project documentation
├── package.json              # Node.js dependencies
├── .gitignore                # Git ignore rules
│
├── public/                   # Frontend web application
│   ├── index.html            # Team introduction & project overview
│   ├── login.html            # Login and registration
│   ├── dashboard.html        # Recent measurements dashboard
│   ├── weekly-summary.html   # 7-day summary and chart
│   ├── daily-detail.html     # Detailed daily chart & timeline
│   ├── device-management.html# Device add/remove UI
│   ├── settings.html         # Local measurement preferences
│   ├── reference.html        # Third-party APIs & libraries
│   │
│   ├── css/                  # Stylesheets
│   └── js/                   # Client-side JavaScript logic
│
├── server/                   # Backend (Node.js + Express)
│   ├── server.js             # Server entry point
│   │
│   ├── config/
│   │   └── database.js       # MongoDB connection
│   │
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   ├── deviceApiKey.js   # IoT API key validation
│   │   └── errorHandler.js   # Error handling
│   │
│   ├── models/
│   │   ├── User.js           # User accounts
│   │   ├── Device.js         # Registered IoT devices
│   │   └── Measurement.js    # Stored measurements
│   │
│   └── routes/
│       ├── auth.js           # Registration & login
│       ├── devices.js        # Device CRUD
│       ├── measurements.js   # Measurement ingestion & summaries
│       └── users.js          # User status & updates
│
└── .env                      # Environment variables (local only)
```

## Team Members
| Name  | Email  | Role |
| ------------- |:-------------:|:-------------:|
|Alek Sepulveda	| aleksepulveda@arizona.edu	| AWS integration / Backend |
|Darryl Mercado	| darrylmercado@arizona.edu	| IoT device development |
|Elias Vazquez	| eliasvazquez@arizona.edu | Frontend & system integration |

The team introduction with photos and descriptions are shown on index.html.

## Features
### Authentication and Account Management

* Create an account using email + strong password
* Login/logout using secure JWT authentication
* Update user profile (email excluded per requirements)
* Persistent session handling
* Add/remove devices from the user account

### Web Application Interface
* Fully responsive for desktop, tablet, and mobile
* Navigation menu on every page
* Chart.js visualizations
* Data filtering and dynamic updates

### Dashboard
* Displays most recent measurements
* Time-range selector: Today, This Week, This Month
* Active device count
* Summary cards for heart rate and SpO₂

### Weekly Summary View
* Computes:
    * Average HR
    * Average SpO₂
    * Total measurements
    * Active device count
    * Daily min/max/avg values
* Weekly line chart with seven-day window
* Dropdown for selecting weekly range (future-proofed)

### Daily Detail View
* Select any day from calendar input
* Displays:
    * Minimum, maximum, and average HR
    * Measurement times
    * Device count
* Timeline table for all readings
* Two separate charts:
    * Heart Rate
    * SpO₂
* Minimum values highlighted in green
* Maximum values highlighted in red
* Time-of-day shown on horizontal axis

### Device Management
* Add new Heart Track devices
* Remove existing devices
* Displays all registered devices
* Protected by JWT authentication

### Settings Page
Stores client-side preferences including:
* Measurement frequency
* Notification behavior
* Start/End time-of-day range (default 06:00–22:00)
Preferences are saved in localStorage.

### Server Overview (Node.js + Express + MongoDB)
#### Technologies Used
* Express.js
* MongoDB with Mongoose
* JWT Authentication
* bcryptjs password hashing
* Helmet, CORS, and API rate limiting

### API Key Enforcement
All IoT devices must send readings using:
```
X-API-Key: <DEVICE_API_KEY>
```
The server rejects measurement uploads without this key.

### API Endpoints
#### Authentication Routes
| Method  | Route  | Description |
| ------------- |:-------------:|:-------------:|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login and receive JWT |

#### Device Routes

(Requires JWT)
| Method  | Route  | Description |
| ------------- |:-------------:|:-------------:|
| GET | /api/devices | Get all user devices |
| POST | /api/devices | Register new device |
| DELETE | /api/devices/:deviceId | Remove device |

#### Measurement Routes
| Method  | Route  | Description |
| ------------- |:-------------:|:-------------:|
| POST | /api/measurements/device | Photon uploads HR + SpO₂ (with API key) |
| GET | /api/measurements | List recent measurements |
| GET | /api/measurements/weekly | Weekly summary (7-day window) |

### Installation and Local Setup
1. Install Node.js Dependencies
```
npm install
```

2. Configure Environment Variables

Create a .env file:
```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/hearttrack
JWT_SECRET=my_super_secret_key
DEVICE_API_KEY=dev-device-key-123
```

3. Start MongoDB
```
mongod
```

4. Run the Server
```
npm start
```

Application will run at:
```
http://localhost:3000
```

### Testing the IoT Endpoint (Postman)
#### POST Measurement Upload
```
POST /api/measurements/device
```

Headers:
```
X-API-Key: dev-device-key-123
Content-Type: application/json
```

Body:
```
{
  "deviceId": "PHOTON_TEST_01",
  "health-data": "82,98.03",
  "timestamp": "2025-12-11T00:30:00.006Z"
}
```

Expected Response:
* 201 Created if the API key is correct
* 401 Unauthorized if the API key is missing/wrong

### IoT Device Summary (Photon + MAX30102)

The Photon device implementation (submitted separately with code) includes:
* Blue LED prompting user to take measurement
* Green LED when data successfully saved to server
* Yellow LED when stored offline
* Local buffer for storing up to 24 hours when offline
* Synchronous state machine implementation
* Uploads data using API key authentication
* Sends data only within configured time window (default 6AM–10PM)

### Third-Party Libraries & References
A full list is provided in reference.html, including:
* Chart.js
* Google Fonts
* Open-source CSS snippets
* Reusable JavaScript utilities from class materials

### Notes for ECE 513 Students (if applicable)
If physician-role login credentials are required, they should be documented here.

### Conclusion
This repository contains the complete implementation of the Heart Track system, including:
* Front-end web application
* Secure Node.js/Express backend
* MongoDB database logic
* JWT authentication
* IoT device ingestion endpoint with API key validation
* Daily and weekly visualization views
* Responsive design
* Full documentation (this README.md)

All course requirements are satisfied.
