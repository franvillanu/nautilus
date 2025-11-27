/**
 * Data Export Helper for Nautilus
 *
 * This script helps you export your Nautilus data from the browser
 * to use with the report generator.
 *
 * USAGE:
 * 1. Open your Nautilus app in the browser
 * 2. Open the browser console (F12)
 * 3. Copy and paste the code below into the console
 * 4. The data will be downloaded as nautilus-data.json
 * 5. Place the file in the Nautilus root directory
 * 6. Run: npm run generate-report
 */

console.log(`
═══════════════════════════════════════════════════════════
  NAUTILUS DATA EXPORT HELPER
═══════════════════════════════════════════════════════════

To export your data:

1. Open Nautilus in your browser
2. Open Developer Console (F12)
3. Copy and paste this code:

─────────────────────────────────────────────────────────

// Export Nautilus data to JSON file
(function exportNautilusData() {
    const data = {
        projects: projects,
        tasks: tasks,
        exportedAt: new Date().toISOString()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'nautilus-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ Data exported successfully!');
    console.log('📊 Projects:', projects.length);
    console.log('📋 Tasks:', tasks.length);
})();

─────────────────────────────────────────────────────────

4. The file will be downloaded automatically
5. Move it to your Nautilus project directory
6. Run: npm run generate-report

═══════════════════════════════════════════════════════════
`);
