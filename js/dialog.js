// js/dialog.js - Enhanced to support custom forms/prompts

console.log("[DIALOG.JS] dialog.js loaded successfully.");

let dialogInstance = null;
let currentResolve = null; // Stores the resolve function for the current dialog promise

// Function to create the dialog HTML structure if it doesn't exist
function createDialogHTML() {
    const dialogDiv = document.createElement('div');
    dialogDiv.id = 'custom-dialog';
    dialogDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #fefefe;
        padding: 20px;
        border: 1px solid #888;
        box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2), 0 6px 20px 0 rgba(0,0,0,0.19);
        z-index: 1000;
        min-width: 350px; /* Slightly wider for better form layout */
        max-width: 90%;
        border-radius: 8px;
        display: none; /* Hidden by default */
        flex-direction: column;
        gap: 15px;
        box-sizing: border-box;
    `;

    dialogDiv.innerHTML = `
        <h3 id="dialog-title" style="margin-top: 0; text-align: center; color: #333;"></h3>
        <p id="dialog-message" style="text-align: center; color: #555;"></p>
        <div id="dialog-content-area" style="display: flex; flex-direction: column; gap: 10px;"></div>
        <div id="dialog-buttons" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;"></div>
    `;
    document.body.appendChild(dialogDiv);
    return dialogDiv;
}

// Get or create the dialog element (singleton pattern)
function getDialogElement() {
    if (!dialogInstance) {
        dialogInstance = document.getElementById('custom-dialog');
        if (!dialogInstance) {
            dialogInstance = createDialogHTML();
        }
    }
    return dialogInstance;
}

/**
 * Shows a custom dialog for various purposes (alert, confirm, prompt, form).
 * @param {string} title - The title of the dialog.
 * @param {string} [message=''] - The main message/text.
 * @param {object} [options={}] - Configuration options for the dialog.
 * @param {string} [options.type='alert'] - Type of dialog: 'alert', 'confirm', 'prompt', 'form'.
 * @param {Array<object>} [options.fields] - Array of field definitions for 'form' type.
 * Each field: { id: string, label: string, type: string, value?: any, options?: Array<object> (for select), min?: number, max?: number }
 * Example field types: 'text', 'textarea', 'number', 'color', 'select'
 * @returns {Promise<any>} Resolves with true for confirm, input value for prompt, object of field values for form, or true for alert. Resolves with false/null on cancel.
 */
export function showDialog(title, message = '', options = {}) {
    return new Promise(resolve => {
        const dialog = getDialogElement();
        const titleEl = dialog.querySelector('#dialog-title');
        const messageEl = dialog.querySelector('#dialog-message');
        const contentArea = dialog.querySelector('#dialog-content-area');
        const buttonsArea = dialog.querySelector('#dialog-buttons');

        titleEl.textContent = title;
        messageEl.textContent = message;
        contentArea.innerHTML = ''; // Clear previous content
        buttonsArea.innerHTML = ''; // Clear previous buttons

        const dialogType = options.type || 'alert';

        currentResolve = resolve;

        // --- Add Content based on Type ---
        if (dialogType === 'prompt') {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'dialog-prompt-input';
            input.style.cssText = `
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                width: calc(100% - 18px); /* Adjust for padding/border */
                box-sizing: border-box;
            `;
            if (options.value) input.value = options.value;
            contentArea.appendChild(input);
            input.focus(); // Focus the input
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    confirmAction(input.value);
                }
            });
        } else if (dialogType === 'form' && options.fields) {
            options.fields.forEach(field => {
                const fieldContainer = document.createElement('div');
                fieldContainer.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                `;

                const label = document.createElement('label');
                label.textContent = field.label;
                label.htmlFor = `dialog-field-${field.id}`;
                label.style.fontWeight = 'bold';
                label.style.color = '#333';

                let inputElement;
                if (field.type === 'select') {
                    inputElement = document.createElement('select');
                    if (field.options) {
                        field.options.forEach(option => {
                            const optEl = document.createElement('option');
                            optEl.value = option.value;
                            optEl.textContent = option.text;
                            if (option.value === field.value) { // Set initial selected value
                                optEl.selected = true;
                            }
                            inputElement.appendChild(optEl);
                        });
                    }
                } else if (field.type === 'textarea') {
                    inputElement = document.createElement('textarea');
                    inputElement.rows = 4;
                } else {
                    inputElement = document.createElement('input');
                    inputElement.type = field.type;
                    if (field.value !== undefined) inputElement.value = field.value;
                    if (field.min !== undefined) inputElement.min = field.min;
                    if (field.max !== undefined) inputElement.max = field.max;
                }
                inputElement.id = `dialog-field-${field.id}`;
                inputElement.dataset.fieldId = field.id; // Store original ID for easy retrieval
                inputElement.style.cssText = `
                    padding: 8px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    width: 100%;
                    box-sizing: border-box;
                `;
                if (field.type === 'textarea') {
                    inputElement.style.resize = 'vertical';
                }

                fieldContainer.appendChild(label);
                fieldContainer.appendChild(inputElement);
                contentArea.appendChild(fieldContainer);
            });
            // Focus on the first input field if it exists
            const firstInputField = contentArea.querySelector('input, select, textarea');
            if (firstInputField) {
                firstInputField.focus();
            }
        }

        // --- Add Buttons ---
        const okBtn = document.createElement('button');
        okBtn.textContent = 'OK';
        okBtn.style.cssText = `
            padding: 8px 15px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            transition: background-color 0.2s;
        `;
        okBtn.onmouseover = () => okBtn.style.backgroundColor = '#0056b3';
        okBtn.onmouseout = () => okBtn.style.backgroundColor = '#007bff';

        okBtn.addEventListener('click', () => {
            if (dialogType === 'prompt') {
                const input = dialog.querySelector('#dialog-prompt-input');
                confirmAction(input ? input.value : '');
            } else if (dialogType === 'form') {
                const fieldValues = {};
                contentArea.querySelectorAll('[data-field-id]').forEach(input => {
                    fieldValues[input.dataset.fieldId] = input.value;
                });
                confirmAction(fieldValues);
            } else {
                confirmAction(true);
            }
        });
        buttonsArea.appendChild(okBtn);

        if (dialogType === 'confirm' || dialogType === 'prompt' || dialogType === 'form') {
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText = `
                padding: 8px 15px;
                background-color: #6c757d;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 1rem;
                transition: background-color 0.2s;
            `;
            cancelBtn.onmouseover = () => cancelBtn.style.backgroundColor = '#5a6268';
            cancelBtn.onmouseout = () => cancelBtn.style.backgroundColor = '#6c757d';

            cancelBtn.addEventListener('click', () => confirmAction(null)); // Resolve with null on cancel
            buttonsArea.appendChild(cancelBtn);
        }

        dialog.style.display = 'flex'; // Show the dialog

        // Function to close dialog and resolve promise
        function confirmAction(result) {
            dialog.style.display = 'none';
            if (currentResolve) {
                currentResolve(result);
                currentResolve = null; // Clear resolve to prevent multiple calls
            }
        }
    });
}
/*
// js/dialog.js - Basic Diagnostic Version
// This file will initially just contain a simple function to test its loading.

console.log("[DIALOG.JS] dialog.js loaded successfully.");

export function showDialog(message) {
    console.log("[DIALOG.JS] showDialog called with message:", message);
    alert("Dialog Test: " + message); // Using alert for simple test
}

// You can add other dialog-related functions here as we progress
// For now, keep it minimal to confirm it loads without issues.
*/