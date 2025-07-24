// script.js

// Define the latitude and longitude for Bergen, Norway (your initial view)
const bergenLat = 60.39;
const bergenLng = 5.32;
const initialZoom = 13; // A good starting zoom level for a city

// 1. Initialize the map and set its view
var map = L.map('map').setView([bergenLat, bergenLng], initialZoom);

// 2. Add the OpenStreetMap tiles layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Array of supported colors for the marker (must match CSS swatch classes)
const supportedMarkerColors = {
    'Blue': '#3498db',
    'Red': '#e74c3c',
    'Green': '#2ecc71',
    'Yellow': '#f1c40f',
    'Purple': '#9b59b6',
    'Orange': '#e67e22',
    'Gray': '#95a5a6'
};

// Function to create an L.divIcon with the specified color
function createColoredDivIcon(colorName) {
    const colorHex = supportedMarkerColors[colorName.charAt(0).toUpperCase() + colorName.slice(1)];

    const svgPinPath = `M12 0 C6.48 0 2 4.48 2 10.0 C2 16 12 25 12 25 C12 25 22 16 22 10.0 C22 4.48 17.52 0 12 0 Z`;
    // const innerIconHtml = `<i class="fa fa-map-marker inner-fa-icon"></i>`; // REMOVED OR COMMENTED OUT

    return L.divIcon({
        className: 'custom-svg-icon',
        html: `
            <div class="marker-shadow-blob"></div>
            <svg class="marker-svg-shape" width="25" height="41" viewBox="0 0 24 40" xmlns="http://www.w3.org/2000/svg">
                <path d="${svgPinPath}" fill="${colorHex}" stroke="#666" stroke-width="0.5"/>
                <circle cx="12" cy="10" r="3" fill="white" />
            </svg>
            `,
        iconSize: [25, 41],
        iconAnchor: [12, 42],
        popupAnchor: [1, -34]
    });
}

// 3. --- MODIFIED: Add the initial marker using your custom icon function ---
// Create the icon for the initial marker (e.g., default to 'Blue')
const initialMarkerIcon = createColoredDivIcon('Blue'); // Or choose any other default color

L.marker([bergenLat, bergenLng], { icon: initialMarkerIcon }).addTo(map)
    .bindPopup('A charming spot in Bergen, Norway!')
    .openPopup(); // Opens the popup automatically on load


// --- REST OF THE SCRIPT (CUSTOM DIALOG AND CLICK HANDLER) REMAINS THE SAME ---

// CUSTOM DIALOG ELEMENTS
const markerDialogOverlay = document.getElementById('markerDialogOverlay');
const dialogPromptText = document.getElementById('dialogPromptText');
const markerMessageInput = document.getElementById('markerMessageInput');
const colorOptionsContainer = document.getElementById('colorOptionsContainer');
const dialogOkButton = document.getElementById('dialogOkButton');
const dialogCancelButton = document.getElementById('dialogCancelButton');

let resolveDialogPromise;
let rejectDialogPromise;

function createColorOptions() {
    colorOptionsContainer.innerHTML = '';
    let isFirst = true;

    for (const colorName in supportedMarkerColors) {
        const colorValue = supportedMarkerColors[colorName];
        const inputId = `color-${colorName.toLowerCase()}`;

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'markerColor';
        input.value = colorName.toLowerCase();
        input.id = inputId;
        input.classList.add('color-option');
        if (isFirst) {
            input.checked = true;
            isFirst = false;
        }

        const label = document.createElement('label');
        label.htmlFor = inputId;
        label.classList.add('color-label');

        const swatch = document.createElement('div');
        swatch.classList.add('color-swatch', `swatch-${colorName.toLowerCase()}`);
        swatch.style.backgroundColor = colorValue;

        const span = document.createElement('span');
        span.textContent = colorName;

        label.appendChild(swatch); // Swatch and span inside label
        label.appendChild(span);

        const wrapperDiv = document.createElement('div');
        wrapperDiv.classList.add('color-option-wrapper');
        wrapperDiv.appendChild(input); // Input is sibling to label
        wrapperDiv.appendChild(label);

        colorOptionsContainer.appendChild(wrapperDiv);
    }
}

createColorOptions();

function showMarkerDialog(lat, lng) {
    markerMessageInput.value = '';
    const firstColorRadio = colorOptionsContainer.querySelector('input[name="markerColor"]');
    if (firstColorRadio) {
        firstColorRadio.checked = true;
    }

    dialogPromptText.textContent = `New Marker at Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}\nEnter message and select color:`;

    markerDialogOverlay.style.display = 'flex';
    markerMessageInput.focus();

    return new Promise((resolve, reject) => {
        resolveDialogPromise = resolve;
        rejectDialogPromise = reject;
    });
}

dialogOkButton.addEventListener('click', () => {
    const message = markerMessageInput.value;
    const selectedColorRadio = colorOptionsContainer.querySelector('input[name="markerColor"]:checked');
    const color = selectedColorRadio ? selectedColorRadio.value : 'blue';

    markerDialogOverlay.style.display = 'none';
    resolveDialogPromise({ message, color });
});

dialogCancelButton.addEventListener('click', () => {
    markerDialogOverlay.style.display = 'none';
    rejectDialogPromise(new Error('Marker creation cancelled by user.'));
});

markerMessageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        dialogOkButton.click();
    } else if (e.key === 'Escape') {
        dialogCancelButton.click();
    }
});
// Remove or comment out the following if markerColorInput is completely gone:
// markerColorInput.addEventListener('keydown', (e) => {
//     if (e.key === 'Enter') {
//         e.preventDefault();
//         dialogOkButton.click();
//     } else if (e.key === 'Escape') {
//         dialogCancelButton.click();
//     }
// });


map.on('click', async function(e) {
    const clickedLat = e.latlng.lat;
    const clickedLng = e.latlng.lng;

    try {
        const userInput = await showMarkerDialog(clickedLat, clickedLng);

        let popupMessage = userInput.message;
        let markerColor = userInput.color;

        const newMarkerIcon = createColoredDivIcon(markerColor);

        const newMarker = L.marker([clickedLat, clickedLng], { icon: newMarkerIcon }).addTo(map);

        if (popupMessage.trim() !== '') {
            newMarker.bindPopup(popupMessage).openPopup();
        } else {
            newMarker.bindPopup(`New Marker at Lat: ${clickedLat.toFixed(4)}, Lng: ${clickedLng.toFixed(4)} (${markerColor})`).openPopup();
        }

        console.log(`New marker added at Lat: ${clickedLat}, Lng: ${clickedLng}, Color: ${markerColor}`);

    } catch (error) {
        console.log(error.message);
    }
});