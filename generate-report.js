/**
 * Nautilus Research Report Generator
 * Generates a Word (.docx) report with dynamic calculations
 * No hardcoded numbers or locations - everything computed from data
 */

import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType, BorderStyle, HeadingLevel, ShadingType } from 'docx';
import fs from 'fs';

// ============================================================================
// CONFIGURATION - Island and Locality Mapping
// ============================================================================

const ISLAND_LOCALITY_CONFIG = {
    'TENERIFE': ['TAJAO', 'LOS CRISTIANOS', 'LAS TERESITAS', 'EL MÉDANO', 'SAN JUAN', 'BOCA CANGREJO'],
    'LA PALMA': ['LOS CANCAJOS', 'LA BOMBILLA', 'RÍO MUERTO'],
    'LANZAROTE': ['ÓRZOLA'],
    'FUERTEVENTURA': ['TONELES', 'JACOMAR', 'LOBOS', 'MORRO JABLE']
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
// UTILITY FUNCTIONS
// ============================================================================

// Color codes (matching browser version)
const COLORS = {
    status: {
        'todo': 'E5E7EB',
        'progress': 'FEF3C7',
        'review': 'DBEAFE',
        'done': 'D1FAE5'
    },
    priority: {
        'low': '9CA3AF',
        'medium': 'F59E0B',
        'high': 'EF4444'
    },
    primary: '0284C7',
    success: '10B981'
};

/**
 * Get color for completion percentage
 */
function getProgressColor(percent) {
    if (percent >= 75) return COLORS.success;
    if (percent >= 50) return COLORS.primary;
    if (percent >= 25) return COLORS.priority.medium;
    return COLORS.priority.high;
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
            children: [
                new TextRun({ text: 'REPORTE NAUTILUS', size: 36, bold: true })
            ],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 150 }
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: 'Sistema de Gestión de Investigación Marina',
                    size: 20,
                    color: '6B7280'
                })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: dateStr, size: 18, color: '9CA3AF' })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
        }),
        new Paragraph({
            text: '',
            border: {
                bottom: {
                    color: 'D1D5DB',
                    space: 1,
                    style: BorderStyle.SINGLE,
                    size: 3
                }
            },
            spacing: { after: 400 }
        })
    ];
}

/**
 * Create global summary section with dashboard-style tables
 */
function createGlobalSummary(insights, tasks) {
    const statusCounts = {
        'done': tasks.filter(t => t.status === 'done').length,
        'progress': tasks.filter(t => t.status === 'progress').length,
        'review': tasks.filter(t => t.status === 'review').length,
        'todo': tasks.filter(t => t.status === 'todo').length
    };

    const sections = [];

    // Title
    sections.push(
        new Paragraph({
            children: [
                new TextRun({ text: 'Resumen Global', size: 32, bold: true })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 400 }
        })
    );

    // Dashboard-style metrics table (3 columns)
    const metricsTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' }
        },
        rows: [
            new TableRow({
                children: [
                    // Proyectos Activos
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: 'Proyectos Activos',
                                        size: 18,
                                        color: '6B7280'
                                    })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 120 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: insights.activeProjectsCount.toString(),
                                        size: 48,
                                        bold: true,
                                        color: COLORS.primary
                                    })
                                ],
                                alignment: AlignmentType.CENTER
                            })
                        ],
                        width: { size: 33.33, type: WidthType.PERCENTAGE },
                        shading: { fill: 'FAFAFA' }
                    }),
                    // Tareas Completadas
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: 'Tareas Completadas',
                                        size: 18,
                                        color: '6B7280'
                                    })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 120 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `${insights.completedTasks}/${insights.totalTasks}`,
                                        size: 48,
                                        bold: true
                                    })
                                ],
                                alignment: AlignmentType.CENTER
                            })
                        ],
                        width: { size: 33.33, type: WidthType.PERCENTAGE },
                        shading: { fill: 'FAFAFA' }
                    }),
                    // Progreso Global
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: 'Progreso Global',
                                        size: 18,
                                        color: '6B7280'
                                    })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 120 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `${insights.completionPercent}%`,
                                        size: 48,
                                        bold: true,
                                        color: getProgressColor(insights.completionPercent)
                                    })
                                ],
                                alignment: AlignmentType.CENTER
                            })
                        ],
                        width: { size: 33.33, type: WidthType.PERCENTAGE },
                        shading: { fill: 'FAFAFA' }
                    })
                ]
            })
        ]
    });

    sections.push(metricsTable);
    sections.push(new Paragraph({ text: '', spacing: { after: 400 } }));

    // Status distribution title
    sections.push(
        new Paragraph({
            children: [
                new TextRun({ text: 'Distribución por Estado', size: 24, bold: true })
            ],
            spacing: { before: 200, after: 300 }
        })
    );

    // Dashboard-style status table (4 columns) - Reordered: Por Hacer first, Completadas last
    const statusTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' }
        },
        rows: [
            new TableRow({
                children: [
                    // Por Hacer
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: 'Por Hacer',
                                        size: 16,
                                        color: '6B7280'
                                    })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 100 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: statusCounts.todo.toString(),
                                        size: 32,
                                        bold: true,
                                        color: '9CA3AF'
                                    })
                                ],
                                alignment: AlignmentType.CENTER
                            })
                        ],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        shading: { fill: 'F9FAFB' }
                    }),
                    // En Revisión
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: 'En Revisión',
                                        size: 16,
                                        color: '6B7280'
                                    })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 100 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: statusCounts.review.toString(),
                                        size: 32,
                                        bold: true,
                                        color: COLORS.primary
                                    })
                                ],
                                alignment: AlignmentType.CENTER
                            })
                        ],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        shading: { fill: 'EFF6FF' }
                    }),
                    // En Progreso
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: 'En Progreso',
                                        size: 16,
                                        color: '6B7280'
                                    })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 100 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: statusCounts.progress.toString(),
                                        size: 32,
                                        bold: true,
                                        color: COLORS.priority.medium
                                    })
                                ],
                                alignment: AlignmentType.CENTER
                            })
                        ],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        shading: { fill: 'FFFBEB' }
                    }),
                    // Completadas
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: 'Completadas',
                                        size: 16,
                                        color: '6B7280'
                                    })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 100 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: statusCounts.done.toString(),
                                        size: 32,
                                        bold: true,
                                        color: COLORS.success
                                    })
                                ],
                                alignment: AlignmentType.CENTER
                            })
                        ],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        shading: { fill: 'F0FDF4' }
                    })
                ]
            })
        ]
    });

    sections.push(statusTable);
    sections.push(new Paragraph({ text: '', spacing: { after: 400 } }));

    return sections;
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
            children: [
                new TextRun({ text: project.name, size: 28, bold: true })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 600, after: 200 }
        })
    );

    // Project metrics - clean summary line
    sections.push(
        new Paragraph({
            children: [
                new TextRun({ text: `${metrics.completedTasks}/${metrics.totalTasks} tareas  •  `, size: 20 }),
                new TextRun({
                    text: `${metrics.completionPercent}% completado`,
                    size: 20,
                    bold: true,
                    color: getProgressColor(metrics.completionPercent)
                })
            ],
            spacing: { after: 200 }
        })
    );

    // Additional metrics (overdue, missing dates)
    const additionalMetrics = [];
    if (metrics.overdueTasks > 0) {
        additionalMetrics.push(
            new Paragraph({
                children: [
                    new TextRun({ text: '⚠️ ', size: 20 }),
                    new TextRun({ text: `${metrics.overdueTasks} tareas vencidas`, size: 20 })
                ],
                spacing: { after: 80 }
            })
        );
    }

    if (metrics.tasksWithoutDates > 0) {
        additionalMetrics.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'ℹ️ ', size: 20 }),
                    new TextRun({ text: `${metrics.tasksWithoutDates} tareas sin fechas`, size: 20 })
                ],
                spacing: { after: 80 }
            })
        );
    }

    sections.push(...additionalMetrics);

    // Add spacing before table
    sections.push(
        new Paragraph({
            text: '',
            spacing: { after: 150 }
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
                children: [
                    new TextRun({ text: 'Desglose Geográfico', size: 26, bold: true })
                ],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 300 }
            })
        );

        for (const island of Object.keys(islandGroups).sort()) {
            const islandData = islandGroups[island];

            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: '🏝️ ', size: 24 }),
                        new TextRun({ text: island, size: 24, bold: true, color: COLORS.primary })
                    ],
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 350, after: 200 }
                })
            );

            // Localities (alphabetically)
            const localities = Object.keys(islandData.localities).sort();
            for (const locality of localities) {
                const localityTasks = sortTasks(islandData.localities[locality]);

                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: '📍 ', size: 22 }),
                            new TextRun({ text: locality, size: 22, bold: true })
                        ],
                        heading: HeadingLevel.HEADING_4,
                        spacing: { before: 250, after: 150 }
                    })
                );

                sections.push(createTaskTable(localityTasks));
                sections.push(new Paragraph({ text: '', spacing: { after: 250 } }));
            }

            // Other tasks (island but no known locality)
            if (islandData.otherTasks.length > 0) {
                const otherTasks = sortTasks(islandData.otherTasks);

                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Otras Ubicaciones', size: 22, italics: true, color: '6B7280' })
                        ],
                        heading: HeadingLevel.HEADING_4,
                        spacing: { before: 250, after: 150 }
                    })
                );

                sections.push(createTaskTable(otherTasks));
                sections.push(new Paragraph({ text: '', spacing: { after: 250 } }));
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
    sections.push(...createGlobalSummary(globalInsights, tasks));

    // Sort projects alphabetically by name
    const sortedProjects = [...projects].sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    );

    // Per-project sections
    sections.push(
        new Paragraph({
            text: 'Proyectos',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 600, after: 300 }
        })
    );

    // Create project summary table
    const projectCells = sortedProjects.map(project => {
        const metrics = calculateProjectMetrics(project, tasks);
        return new TableCell({
            children: [
                new Paragraph({
                    children: [
                        new TextRun({ text: project.name, size: 16, bold: true })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 150, after: 50 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `${metrics.completionPercent}%`,
                            size: 28,
                            bold: true,
                            color: getProgressColor(metrics.completionPercent)
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 50 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `${metrics.completedTasks}/${metrics.totalTasks} tareas`,
                            size: 14,
                            color: '6B7280'
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 150 }
                })
            ],
            width: { size: 100 / sortedProjects.length, type: WidthType.PERCENTAGE }
        });
    });

    const projectsTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' }
        },
        rows: [
            new TableRow({
                children: projectCells
            })
        ]
    });

    sections.push(projectsTable);
    sections.push(new Paragraph({ text: '', spacing: { after: 400 } }));

    for (const project of sortedProjects) {
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
