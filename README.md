# Electron Ground Station

A cross-platform ground control station built with Electron, designed for remote vehicle monitoring and control.

## Features & Roadmap

### Real-time Monitoring & Control
- [x] Real-time vehicle telemetry display
- [x] Interactive 3D attitude indicator and heading display
- [x] Modular dashboard with collapsible panels
- [x] Responsive design and resizable panels
- [ ] Gamepad/joystick support for intuitive vehicle control
- [ ] Advanced HUD (Heads-Up Display) with comprehensive flight data
- [ ] Serial communication (ERLS) support for direct vehicle connectivity

### Video & Visualization
- [x] Live video streaming via WebRTC
- [ ] Multiple video source options with seamless switching
- [ ] Enhanced video stream quality and performance
- [ ] Multi-camera view support

### Map & Navigation
- [x] Interactive map with multiple map sources
  - [x] OpenStreetMap
  - [x] Google Satellite
  - [ ] Amap (GCJ02)
- [ ] Real-time coordinate display
- [x] Click-to-mark functionality
- [ ] Offline map resource support
- [ ] Mission planning with waypoint navigation
- [ ] Flight path optimization and validation
- [ ] Geofencing and safety zone configuration

### Connectivity & Debugging
- [x] SSH terminal for remote command execution
- [x] UDP data stream monitoring
- [x] Quick SSH connection panel

### Automation & Intelligence
- [ ] Automated flight control scripting
- [ ] Custom flight maneuver programming
- [ ] LLM (Large Language Model) integration via MCP
- [ ] AI-assisted mission planning and execution
- [ ] Autonomous emergency procedures

## Requirements

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Electron_Ground_Station
```

2. Install dependencies:
```bash
npm install
```

## Development

Start the application in development mode:
```bash
npm run dev
```

## Building and Distribution

### Building

Build the application for production:
```bash
npm run build
```

### Creating Distribution Packages

To create platform-specific distribution packages:

```bash
# Build for current platform
npm run dist

# Build for specific platforms
npm run dist:win   # Windows (.exe installer and portable)
npm run dist:mac   # macOS (.dmg)
npm run dist:linux # Linux (.AppImage, .deb, .rpm)
```

The distribution packages will be created in the `dist` directory.

#### Windows
- NSIS Installer (.exe)
- Portable version (.exe)

#### macOS
- DMG disk image (.dmg)

#### Linux
- AppImage (.AppImage)
- Debian package (.deb)
- RPM package (.rpm)

### Notes
- Building for macOS requires a macOS system
- Building for Windows on non-Windows platforms requires Wine
- All build outputs will be placed in the `dist` directory

## Usage

### Main Interface

The application consists of three main sections:

1. **Main View**
   - Live video feed
   - Attitude indicator
   - Heading display
   - Collapsible instrument dashboard

2. **Map View**
   - Multiple map sources
   - Real-time coordinate display
   - Click-to-mark functionality
   - Quick SSH connection panel

3. **Debug View**
   - SSH terminal
   - UDP data monitor
   - WebRTC configuration
   - Connection status display

### Controls

- Keyboard controls for testing attitude indicators:
  - Arrow Left/Right: Adjust heading
  - Arrow Up/Down: Adjust pitch
  - Q/E: Adjust roll

### Configuration

#### SSH Connection
- Host: Remote system address
- Username: SSH username
- Password: SSH password
- Port: SSH port (default: 22)

#### UDP Monitoring
- Port: UDP port to monitor (default: 14550)

#### WebRTC Video
- Signaling URL: WebRTC signaling server address
- Stream ID: Unique stream identifier
- STUN/TURN: ICE server configuration

## License

MIT