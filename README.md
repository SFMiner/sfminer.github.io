# 🔬 Science Simulations

A collection of interactive educational simulations built with Godot 4.5 and hosted on GitHub Pages. These simulations are designed to run in web browsers on any device, including Chromebooks.

## 🌐 Live Site

Visit the simulations at: `https://sfminer.github.io`

## 📚 Available Simulations

- **Antibiotic Resistance Simulation** - Description coming soon
- **Evolution Resistance Simulation** - Description coming soon


## 🎮 For Students

All simulations run directly in your web browser. Simply click on a simulation card from the main page to launch it. No downloads or installations required!

### System Requirements
- Any modern web browser (Chrome, Firefox, Safari, Edge)
- Works on Windows, Mac, Linux, Chromebooks, tablets, and phones
- Internet connection required

## 🛠️ For Developers/Teachers

### Adding a New Simulation

1. **Export from Godot 4.5:**
   - Open your project in Godot
   - Go to `Project → Export`
   - Select `HTML5` preset (create one if needed)
   - Export the project as `index.html`
   - This creates multiple files: `index.html`, `.wasm`, `.pck`, etc.

2. **Create a folder in this repository:**
   - Create a new folder with a descriptive name (e.g., `gravity-simulator/`)
   - Use lowercase and hyphens (not spaces)

3. **Upload all exported files:**
   - Copy ALL files from the Godot export into the new folder
   - Make sure `index.html` is directly in the folder

4. **Update the landing page:**
   - Edit `index.html` in the root directory
   - Add a new card linking to your simulation:
   ```html
   <a href="./your-simulation-name/" class="sim-card">
       <h2>Your Simulation Title</h2>
       <p>Brief description of what the simulation does.</p>
   </a>
   ```

5. **Commit and push:**
   - Commit your changes
   - Push to GitHub
   - Wait 1-2 minutes for deployment

### Repository Structure

```
yourusername.github.io/
├── README.md                 # This file
├── index.html               # Landing page
├── simulation1/             # First simulation
│   ├── index.html
│   ├── simulation1.wasm
│   ├── simulation1.pck
│   └── ...
├── simulation2/             # Second simulation
│   ├── index.html
│   └── ...
└── simulation3/             # Third simulation
    ├── index.html
    └── ...
```

### Godot Export Settings

For best results with HTML5 export:

1. **Project Settings:**
   - Enable `SharedArrayBuffer` support if using threads
   - Set appropriate canvas size for your target devices

2. **Export Template:**
   - Use the official Godot 4.5 HTML5 export template
   - Export as `index.html` (not a custom name)

3. **Testing Locally:**
   - Use `python -m http.server` or similar
   - Don't test by opening `index.html` directly (CORS issues)

### Troubleshooting

**Simulation doesn't load:**
- Check browser console for errors (F12)
- Ensure ALL exported files are uploaded (especially .wasm and .pck)
- Wait a few minutes after uploading for GitHub Pages to rebuild

**"SharedArrayBuffer" errors:**
- This is a Godot/browser compatibility issue
- Try exporting without threading enabled
- Some browsers require special headers (GitHub Pages provides these)

**File too large:**
- GitHub has a 100MB file size limit
- Optimize assets (compress textures, audio)
- Each repository has a 1GB total limit

## 📝 License

These educational simulations are provided for student use. Please contact the repository owner for usage rights and permissions.

## 🤝 Contributing

This repository is primarily for educational use. If you're a student or colleague with suggestions, please open an issue or contact me directly.

## 📧 Contact

For questions or issues with the simulations, please contact sfminer@gmail.com

---

**Built with:** Godot 4.5 | **Hosted on:** GitHub Pages | **Updated:** 102025-10-19
