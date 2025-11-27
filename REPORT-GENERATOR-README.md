# Nautilus Word Report Generator

Generates comprehensive research reports in Word (.docx) format from your Nautilus task and project data.

## Features

✅ **100% Dynamic Calculations** - No hardcoded numbers or locations
✅ **Global Insights** - Active projects, task completion, overall progress
✅ **Project Breakdown** - Per-project metrics and task tables
✅ **Island/Locality Grouping** - Automatic grouping by geographic tags
✅ **Professional Formatting** - Clean, structured Word documents

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Export Your Data

Open Nautilus in your browser, then open the Developer Console (F12) and run:

```javascript
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
```

This will download `nautilus-data.json`. Move it to your Nautilus project directory.

### 3. Generate Report

```bash
npm run generate-report
```

This creates: `Reporte-Nautilus-YYYY-MM-DD.docx`

## Report Structure

### Global Summary
- **Active Projects**: Projects with at least one non-Done task
- **Tasks Completed**: X/Y tasks completed
- **Overall Progress**: Global completion percentage

### Per Project
Each project includes:
- Project name and summary (completion stats, overdue tasks, tasks without dates)
- Complete task table with: Tarea, Priority, Status, Start Date, End Date
- Tasks sorted by start date, then end date

### Island and Locality Breakdown
If tasks have island/locality tags, automatically creates:
- **🏝️ ISLA** sections for each island (TENERIFE, LANZAROTE, FUERTEVENTURA, LA PALMA)
- **LOCALIDAD** subsections for each locality within that island
- Separate tables for each locality
- "Otras ubicaciones" for island-tagged tasks without specific localities

## Island/Locality Configuration

Currently configured:

```javascript
{
    'TENERIFE': ['SAN JUAN', 'TAJAO', 'LOS CRISTIANOS', 'BOCA CANGREJO', 'LAS TERESITAS'],
    'LANZAROTE': [],
    'FUERTEVENTURA': [],
    'LA PALMA': []
}
```

To add more localities or islands, edit [generate-report.js](generate-report.js):15-20

## Tag Requirements

For island/locality grouping to work:

1. **Tasks must have tags** in the format: `["TENERIFE", "SAN JUAN", "other-tag"]`
2. **Island names** must match exactly: `TENERIFE`, `LANZAROTE`, `FUERTEVENTURA`, `LA PALMA`
3. **Locality names** must match configured localities (case-insensitive)
4. Tags are automatically normalized to UPPERCASE for comparison

Example:
```javascript
{
    "id": 1,
    "title": "Coral monitoring",
    "tags": ["TENERIFE", "SAN JUAN", "coral", "research"],
    // ... other fields
}
```

This task will appear:
- In the main project task table
- In the "🏝️ ISLA - TENERIFE" section
- Under "LOCALIDAD - SAN JUAN"

## Testing

### Run Automated Tests

```bash
node test-report-generator.js
```

Tests include:
- ✅ Global insights calculations (7 tests)
- ✅ Project metrics calculations (7 tests)
- ✅ Island and locality detection (7 tests)
- ✅ Task sorting logic (5 tests)
- ✅ Tag processing (5 tests)
- ✅ Edge cases and data integrity (5 tests)
- ✅ Integration tests (6 tests)

**Total: 42 automated tests**

### Generate Test Report

```bash
npm run generate-report
```

Uses `test-data-sample.json` if `nautilus-data.json` doesn't exist.

## Files

| File | Purpose |
|------|---------|
| [generate-report.js](generate-report.js) | Main report generator |
| [export-data.js](export-data.js) | Instructions for exporting data |
| [test-report-generator.js](test-report-generator.js) | Comprehensive test suite (42 tests) |
| [test-data-sample.json](test-data-sample.json) | Sample data for testing |
| `nautilus-data.json` | Your exported data (you create this) |
| `Reporte-Nautilus-YYYY-MM-DD.docx` | Generated report (output) |

## How It Works

### Data Flow

```
Browser (Nautilus)
  → Export to nautilus-data.json
    → generate-report.js processes data
      → Calculates all metrics dynamically
        → Generates Word document
          → Reporte-Nautilus-YYYY-MM-DD.docx
```

### Calculations (Always Dynamic)

**Global Insights:**
```javascript
activeProjects = count(projects where any task.status != 'done')
completedTasks = count(tasks where status == 'done')
completionPercent = (completedTasks / totalTasks) * 100
```

**Project Metrics:**
```javascript
projectTasks = tasks.filter(task.projectId == project.id)
completedTasks = projectTasks.filter(status == 'done')
completionPercent = (completedTasks / projectTasks.length) * 100
overdueTasks = projectTasks.filter(endDate < today && status != 'done')
tasksWithoutDates = projectTasks.filter(!startDate || !endDate)
```

**Island/Locality Grouping:**
```javascript
for each task:
  if task.tags includes island name:
    if task.tags includes locality for that island:
      group task under island > locality
    else:
      group task under island > "Otras ubicaciones"
```

## Customization

### Add New Island/Localities

Edit [generate-report.js](generate-report.js):15-20:

```javascript
const ISLAND_LOCALITY_CONFIG = {
    'TENERIFE': ['SAN JUAN', 'TAJAO', 'LOS CRISTIANOS', 'BOCA CANGREJO', 'LAS TERESITAS'],
    'LANZAROTE': ['ARRECIFE', 'PLAYA BLANCA'],  // Add localities
    'FUERTEVENTURA': ['CORRALEJO'],              // Add localities
    'LA PALMA': ['SANTA CRUZ']                   // Add localities
};
```

### Change Date Format

Edit [generate-report.js](generate-report.js):154-159:

```javascript
const dateStr = now.toLocaleDateString('es-ES', {  // Change locale
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
});
```

### Modify Table Columns

Edit [generate-report.js](generate-report.js):219-250 to add/remove columns.

## Troubleshooting

### "Error loading data"
- Make sure `nautilus-data.json` exists in the project root
- Check the file is valid JSON
- Try using `test-data-sample.json` first

### "Module not found: docx"
```bash
npm install
```

### Report has no island/locality sections
- Check that tasks have tags with island names
- Island names must be EXACT: `TENERIFE`, `LANZAROTE`, `FUERTEVENTURA`, `LA PALMA`
- Tags are case-insensitive but must match configured names

### Wrong completion percentages
- All numbers are calculated dynamically
- Check your task statuses: only `status: 'done'` counts as completed
- Verify task `projectId` values match project `id` values

## QA Test Report

**✅ Comprehensive QA Completed**

- **Date**: 2025-11-27
- **Total Tests**: 42
- **Passed**: 42
- **Failed**: 0

**Test Coverage:**
- Global insights calculations (7 tests)
- Project metrics calculations (7 tests)
- Island and locality detection (7 tests)
- Task sorting logic (5 tests)
- Tag processing (5 tests)
- Edge cases and data integrity (5 tests)
- Integration tests (6 tests)

**Integration Points Verified:**
- ✅ Data loading from JSON
- ✅ Global insights calculation
- ✅ Project metrics calculation
- ✅ Island/locality grouping
- ✅ Task sorting
- ✅ Word document generation

**Test Results**: All calculations produce correct results, all edge cases handled gracefully.

## Manual Testing Checklist

After generating a report, verify:

### Document Structure
- [ ] Title: "REPORTE NAUTILUS"
- [ ] Date and time present
- [ ] Global summary section exists

### Global Insights
- [ ] Active projects count is correct
- [ ] Task completion numbers match your data
- [ ] Completion percentage is accurate (0-100%)

### Project Sections
- [ ] All projects appear
- [ ] Each project has summary line
- [ ] Task tables include all project tasks
- [ ] Tasks sorted by date (oldest first)

### Island/Locality Breakdown (if applicable)
- [ ] Island sections appear for tagged tasks
- [ ] Localities are alphabetically sorted
- [ ] Tasks appear in correct locality sections
- [ ] "Otras ubicaciones" appears for island-only tags

### Data Accuracy
- [ ] No hardcoded numbers (all calculated)
- [ ] Task counts match reality
- [ ] No duplicate tasks
- [ ] All tasks accounted for

## Support

For issues or questions:
1. Run tests: `node test-report-generator.js`
2. Check this README
3. Review sample data: [test-data-sample.json](test-data-sample.json)
4. Open an issue on GitHub

## Version History

**v1.0.0** (2025-11-27)
- Initial release
- 42 automated tests (100% passing)
- Comprehensive QA completed
- Support for 4 islands, configurable localities
- Dynamic calculation of all metrics
- Professional Word document formatting
