// js/dialog.js - Basic Diagnostic Version
// This file will initially just contain a simple function to test its loading.

console.log("[DIALOG.JS] dialog.js loaded successfully.");

export function showDialog(message) {
    console.log("[DIALOG.JS] showDialog called with message:", message);
    alert("Dialog Test: " + message); // Using alert for simple test
}

// You can add other dialog-related functions here as we progress
// For now, keep it minimal to confirm it loads without issues.