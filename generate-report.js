/**
 * Nautilus Research Report Generator
 * Generates a Word (.docx) report with dynamic calculations
 * No hardcoded numbers or locations - everything computed from data
 */

import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType, BorderStyle, HeadingLevel } from 'docx';
import fs from 'fs';

// ============================================================================
// CONFIGURATION - Island and Locality Mapping
// ============================================================================

const ISLAND_LOCALITY_CONFIG = {
    'TENERIFE': ['SAN JUAN', 'TAJAO', 'LOS CRISTIANOS', 'BOCA CANGREJO', 'LAS TERESITAS'],
    'LANZAROTE': [],
    'FUERTEVENTURA': [],
    'LA PALMA': []
};

const ALL_ISLANDS = Object.keys(ISLAND_LOCALITY_CONFIG);

// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Load Nautilus data from JSON file
 * In production, this would read from localStorage export or KV storage
 */
function loadNautilusData() {
    try {
        const data = JSON.parse(fs.readFileSync('nautilus-data.json', 'utf8'));
        return {
            projects: data.projects || [],
            tasks: data.tasks || []
        };
    } catch (error) {
        console.error('Error loading data:', error.message);
        console.log('Please export your Nautilus data to nautilus-data.json');
        console.log('You can do this from the browser console:');
        console.log('  const data = { projects, tasks };');
        console.log('  console.log(JSON.stringify(data, null, 2));');
        process.exit(1);
    }
}

// ============================================================================
// DATA PROCESSING & CALCULATIONS
// ============================================================================

/**
 * Calculate global insights from all tasks
 */
function calculateGlobalInsights(projects, tasks) {
    // Active projects = projects with at least one non-Done task
    const activeProjectIds = new Set(
        tasks
            .filter(task => task.status !== 'done')
            .map(task => task.projectId)
            .filter(id => id !== null)
    );

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'done').length;
    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
        activeProjectsCount: activeProjectIds.size,
        totalTasks,
        completedTasks,
        completionPercent
    };
}

/**
 * Calculate project-specific metrics
 */
function calculateProjectMetrics(project, tasks) {
    const projectTasks = tasks.filter(task => task.projectId === project.id);
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(task => task.status === 'done').length;
    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Count overdue tasks (endDate < today and status != done)
    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = projectTasks.filter(task =>
        task.status !== 'done' &&
        task.endDate &&
        task.endDate < today
    ).length;

    // Count tasks without dates
    const tasksWithoutDates = projectTasks.filter(task =>
        !task.startDate || !task.endDate
    ).length;

    return {
        totalTasks,
        completedTasks,
        completionPercent,
        overdueTasks,
        tasksWithoutDates,
        tasks: projectTasks
    };
}

/**
 * Get all tags from a task (normalize to uppercase for comparison)
 */
function getTaskTags(task) {
    return (task.tags || []).map(tag => tag.toUpperCase());
}

/**
 * Get all tags from a project (if projects have tags, otherwise empty array)
 */
function getProjectTags(project) {
    return (project.tags || []).map(tag => tag.toUpperCase());
}

/**
 * Check if a task or project belongs to an island
 */
function getTaskIsland(task, project) {
    const taskTags = getTaskTags(task);
    const projectTags = getProjectTags(project);
    const allTags = [...taskTags, ...projectTags];

    for (const island of ALL_ISLANDS) {
        if (allTags.includes(island)) {
            return island;
        }
    }
    return null;
}

/**
 * Get the locality for a task (if any)
 */
function getTaskLocality(task, island) {
    if (!island) return null;

    const taskTags = getTaskTags(task);
    const localities = ISLAND_LOCALITY_CONFIG[island];

    for (const locality of localities) {
        if (taskTags.includes(locality)) {
            return locality;
        }
    }
    return null;
}

/**
 * Group project tasks by island and locality
 */
function groupTasksByIslandAndLocality(project, tasks) {
    const projectTasks = tasks.filter(task => task.projectId === project.id);
    const islandGroups = {};

    for (const task of projectTasks) {
        const island = getTaskIsland(task, project);
        if (!island) continue;

        if (!islandGroups[island]) {
            islandGroups[island] = {
                localities: {},
                otherTasks: []
            };
        }

        const locality = getTaskLocality(task, island);
        if (locality) {
            if (!islandGroups[island].localities[locality]) {
                islandGroups[island].localities[locality] = [];
            }
            islandGroups[island].localities[locality].push(task);
        } else {
            islandGroups[island].otherTasks.push(task);
        }
    }

    return islandGroups;
}

/**
 * Sort tasks by start date, then end date
 */
function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
        // Tasks without dates go to the end
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;

        // Sort by start date
        if (a.startDate !== b.startDate) {
            return a.startDate.localeCompare(b.startDate);
        }

        // If start dates are equal, sort by end date
        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;

        return a.endDate.localeCompare(b.endDate);
    });
}

// ============================================================================
// WORD DOCUMENT GENERATION
// ============================================================================

/**
 * Create the document header
 */
function createHeader() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return [
        new Paragraph({
            text: 'REPORTE NAUTILUS',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        }),
        new Paragraph({
            text: dateStr,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        })
    ];
}

/**
 * Create global summary section
 */
function createGlobalSummary(insights) {
    return [
        new Paragraph({
            text: 'Resumen Global',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '• Proyectos Activos: ', bold: true }),
                new TextRun({ text: insights.activeProjectsCount.toString() })
            ],
            spacing: { after: 100 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '• Tareas Completadas: ', bold: true }),
                new TextRun({ text: `${insights.completedTasks}/${insights.totalTasks}` })
            ],
            spacing: { after: 100 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '• Progreso Global: ', bold: true }),
                new TextRun({ text: `${insights.completionPercent}%` })
            ],
            spacing: { after: 400 }
        })
    ];
}

/**
 * Create a task table
 */
function createTaskTable(tasks) {
    const headerRow = new TableRow({
        tableHeader: true,
        children: [
            new TableCell({
                children: [new Paragraph({ text: 'Tarea', bold: true })],
                width: { size: 35, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
                children: [new Paragraph({ text: 'Prio', bold: true })],
                width: { size: 10, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
                children: [new Paragraph({ text: 'Estado', bold: true })],
                width: { size: 15, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
                children: [new Paragraph({ text: 'Fecha Inicio', bold: true })],
                width: { size: 20, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
                children: [new Paragraph({ text: 'Fecha Fin', bold: true })],
                width: { size: 20, type: WidthType.PERCENTAGE }
            })
        ]
    });

    const dataRows = tasks.map(task => {
        const priorityMap = {
            'low': 'Baja',
            'medium': 'Media',
            'high': 'Alta'
        };

        const statusMap = {
            'todo': 'Por Hacer',
            'progress': 'En Progreso',
            'review': 'En Revisión',
            'done': 'Completada'
        };

        return new TableRow({
            children: [
                new TableCell({
                    children: [new Paragraph(task.title || 'Sin título')]
                }),
                new TableCell({
                    children: [new Paragraph(priorityMap[task.priority] || task.priority || '-')]
                }),
                new TableCell({
                    children: [new Paragraph(statusMap[task.status] || task.status || '-')]
                }),
                new TableCell({
                    children: [new Paragraph(task.startDate || '-')]
                }),
                new TableCell({
                    children: [new Paragraph(task.endDate || '-')]
                })
            ]
        });
    });

    return new Table({
        rows: [headerRow, ...dataRows],
        width: {
            size: 100,
            type: WidthType.PERCENTAGE
        },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 }
        }
    });
}

/**
 * Create project section
 */
function createProjectSection(project, metrics, allTasks) {
    const sections = [];

    // Project title
    sections.push(
        new Paragraph({
            text: project.name,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 600, after: 200 }
        })
    );

    // Project summary
    const summaryParts = [
        `${metrics.completedTasks}/${metrics.totalTasks} tareas completadas`,
        `${metrics.completionPercent}% progreso`
    ];

    if (metrics.overdueTasks > 0) {
        summaryParts.push(`${metrics.overdueTasks} tareas vencidas`);
    }

    if (metrics.tasksWithoutDates > 0) {
        summaryParts.push(`${metrics.tasksWithoutDates} tareas sin fechas`);
    }

    sections.push(
        new Paragraph({
            text: summaryParts.join(' • '),
            italics: true,
            spacing: { after: 200 }
        })
    );

    // All project tasks table
    const sortedTasks = sortTasks(metrics.tasks);
    if (sortedTasks.length > 0) {
        sections.push(createTaskTable(sortedTasks));
    }

    // Island and locality breakdown
    const islandGroups = groupTasksByIslandAndLocality(project, allTasks);

    if (Object.keys(islandGroups).length > 0) {
        sections.push(
            new Paragraph({
                text: 'Desglose por Isla y Localidad',
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 }
            })
        );

        for (const island of Object.keys(islandGroups).sort()) {
            const islandData = islandGroups[island];

            sections.push(
                new Paragraph({
                    text: `🏝️ ISLA - ${island}`,
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 300, after: 200 }
                })
            );

            // Localities (alphabetically)
            const localities = Object.keys(islandData.localities).sort();
            for (const locality of localities) {
                const localityTasks = sortTasks(islandData.localities[locality]);

                sections.push(
                    new Paragraph({
                        text: `LOCALIDAD - ${locality}`,
                        heading: HeadingLevel.HEADING_4,
                        spacing: { before: 200, after: 100 }
                    })
                );

                sections.push(createTaskTable(localityTasks));
                sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
            }

            // Other tasks (island but no known locality)
            if (islandData.otherTasks.length > 0) {
                const otherTasks = sortTasks(islandData.otherTasks);

                sections.push(
                    new Paragraph({
                        text: 'LOCALIDAD - Otras ubicaciones',
                        heading: HeadingLevel.HEADING_4,
                        spacing: { before: 200, after: 100 }
                    })
                );

                sections.push(createTaskTable(otherTasks));
                sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
            }
        }
    }

    return sections;
}

/**
 * Generate the complete Word document
 */
async function generateReport(data) {
    const { projects, tasks } = data;

    // Calculate global insights
    const globalInsights = calculateGlobalInsights(projects, tasks);

    // Build document sections
    const sections = [];

    // Header
    sections.push(...createHeader());

    // Global summary
    sections.push(...createGlobalSummary(globalInsights));

    // Per-project sections
    sections.push(
        new Paragraph({
            text: 'Proyectos',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 600, after: 300 }
        })
    );

    for (const project of projects) {
        const metrics = calculateProjectMetrics(project, tasks);
        sections.push(...createProjectSection(project, metrics, tasks));
    }

    // Create document
    const doc = new Document({
        sections: [{
            properties: {},
            children: sections
        }]
    });

    // Generate and save
    const buffer = await Packer.toBuffer(doc);
    const filename = `Reporte-Nautilus-${new Date().toISOString().split('T')[0]}.docx`;
    fs.writeFileSync(filename, buffer);

    console.log(`\n✅ Reporte generado exitosamente: ${filename}`);
    console.log(`\nEstadísticas:`);
    console.log(`  • Proyectos activos: ${globalInsights.activeProjectsCount}`);
    console.log(`  • Tareas completadas: ${globalInsights.completedTasks}/${globalInsights.totalTasks}`);
    console.log(`  • Progreso global: ${globalInsights.completionPercent}%`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    console.log('🚀 Generador de Reportes Nautilus\n');

    const data = loadNautilusData();
    console.log(`📊 Datos cargados: ${data.projects.length} proyectos, ${data.tasks.length} tareas\n`);

    await generateReport(data);
}

main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
