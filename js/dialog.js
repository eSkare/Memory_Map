// js/dialog.js
// Assumes map instance and supportedMarkerColors are passed in or globally available (less ideal)
// Let's make it self-contained for better modularity.

let resolveDialogPromise;
let rejectDialogPromise;

const markerDialogOverlay = document.getElementById('markerDialogOverlay');
const dialogPromptText = document.getElementById('dialogPromptText');
const markerMessageInput = document.getElementById('markerMessageInput');
const colorOptionsContainer = document.getElementById('colorOptionsContainer');
const dialogOkButton = document.getElementById('dialogOkButton');
const dialogCancelButton = document.getElementById('dialogCancelButton');

// This will need to be passed in from the main script or defined here if fixed
const supportedMarkerColors = {
    'Blue': '#3498db',
    'Red': '#e74c3c',
    'Green': '#2ecc71',
    'Yellow': '#f1c40f',
    'Purple': '#9b59b6',
    'Orange': '#e67e22',
    'Gray': '#95a5a6'
};

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

        label.appendChild(swatch);
        label.appendChild(span);

        const wrapperDiv = document.createElement('div');
        wrapperDiv.classList.add('color-option-wrapper');
        wrapperDiv.appendChild(input);
        wrapperDiv.appendChild(label);

        colorOptionsContainer.appendChild(wrapperDiv);
    }
}

export function showMarkerDialog(lat, lng) {
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

// Event listeners for dialog buttons
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

// Initialize color options when the module is loaded
createColorOptions();