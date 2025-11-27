/**
 * Nautilus Word Report Generator (Browser Version)
 * Generates .docx research reports directly in the browser
 */

import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType, BorderStyle, HeadingLevel, ShadingType } from 'https://esm.sh/docx@9.5.1';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ISLAND_LOCALITY_CONFIG = {
    'TENERIFE': ['SAN JUAN', 'TAJAO', 'LOS CRISTIANOS', 'BOCA CANGREJO', 'LAS TERESITAS'],
    'LANZAROTE': [],
    'FUERTEVENTURA': [],
    'LA PALMA': []
};

const ALL_ISLANDS = Object.keys(ISLAND_LOCALITY_CONFIG);

// Color palette for document design (professional, accessible colors)
const COLORS = {
    // Status colors (background shading for table cells)
    status: {
        'todo': 'E5E7EB',       // Gray 200 - Neutral
        'progress': 'FEF3C7',   // Amber 100 - In Progress
        'review': 'DBEAFE',     // Blue 100 - Under Review
        'done': 'D1FAE5'        // Green 100 - Completed
    },
    // Priority colors (for visual hierarchy)
    priority: {
        'low': '9CA3AF',        // Gray 400
        'medium': 'F59E0B',     // Amber 500
        'high': 'EF4444'        // Red 500
    },
    // Accent colors
    primary: '0284C7',          // Sky 600
    secondary: '6366F1',        // Indigo 500
    success: '10B981',          // Green 500
    headerBg: 'F3F4F6'          // Gray 100
};

// Emojis for visual hierarchy
const EMOJIS = {
    priority: {
        'low': '🔵',
        'medium': '🟡',
        'high': '🔴'
    },
    status: {
        'todo': '⚪',
        'progress': '🟡',
        'review': '🔵',
        'done': '🟢'
    },
    sections: {
        project: '📁',
        island: '🏝️',
        locality: '📍',
        summary: '📊',
        tasks: '📋',
        metrics: '📈'
    }
};

// ============================================================================
// DATA PROCESSING
// ============================================================================

function calculateGlobalInsights(projects, tasks) {
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

function calculateProjectMetrics(project, tasks) {
    const projectTasks = tasks.filter(task => task.projectId === project.id);
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(task => task.status === 'done').length;
    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = projectTasks.filter(task =>
        task.status !== 'done' &&
        task.endDate &&
        task.endDate < today
    ).length;

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

function getTaskTags(task) {
    return (task.tags || []).map(tag => tag.toUpperCase());
}

function getProjectTags(project) {
    return (project.tags || []).map(tag => tag.toUpperCase());
}

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

function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;

        if (a.startDate !== b.startDate) {
            return a.startDate.localeCompare(b.startDate);
        }

        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;

        return a.endDate.localeCompare(b.endDate);
    });
}

// ============================================================================
// DOCUMENT GENERATION
// ============================================================================

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
            text: '🌊 REPORTE NAUTILUS',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: 'Sistema de Gestión de Investigación Marina',
                    italics: true,
                    size: 20,
                    color: '6B7280'
                })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '📅 ', size: 20 }),
                new TextRun({ text: dateStr, size: 20 })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        }),
        new Paragraph({
            text: '',
            border: {
                bottom: {
                    color: COLORS.primary,
                    space: 1,
                    style: BorderStyle.SINGLE,
                    size: 6
                }
            },
            spacing: { after: 400 }
        })
    ];
}

function createGlobalSummary(insights) {
    return [
        new Paragraph({
            children: [
                new TextRun({ text: `${EMOJIS.sections.summary} `, size: 32 }),
                new TextRun({ text: 'Resumen Ejecutivo', size: 32, bold: true })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 300 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '📁 Proyectos Activos: ', bold: true, size: 24 }),
                new TextRun({
                    text: insights.activeProjectsCount.toString(),
                    size: 24,
                    color: COLORS.primary,
                    bold: true
                })
            ],
            spacing: { after: 150 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: `${EMOJIS.sections.tasks} Tareas Completadas: `, bold: true, size: 24 }),
                new TextRun({
                    text: `${insights.completedTasks}/${insights.totalTasks}`,
                    size: 24,
                    color: COLORS.success,
                    bold: true
                })
            ],
            spacing: { after: 150 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: `${EMOJIS.sections.metrics} Progreso Global: `, bold: true, size: 24 }),
                new TextRun({
                    text: `${insights.completionPercent}%`,
                    size: 24,
                    color: insights.completionPercent >= 75 ? COLORS.success :
                           insights.completionPercent >= 50 ? COLORS.priority.medium : COLORS.priority.high,
                    bold: true
                })
            ],
            spacing: { after: 400 }
        })
    ];
}

function createTaskTable(tasks) {
    // Header row with styled background
    const headerRow = new TableRow({
        tableHeader: true,
        children: [
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text: 'Tarea', bold: true, size: 20 })],
                    alignment: AlignmentType.LEFT
                })],
                width: { size: 35, type: WidthType.PERCENTAGE },
                shading: {
                    type: ShadingType.CLEAR,
                    fill: COLORS.headerBg
                }
            }),
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text: 'Prioridad', bold: true, size: 20 })],
                    alignment: AlignmentType.CENTER
                })],
                width: { size: 13, type: WidthType.PERCENTAGE },
                shading: {
                    type: ShadingType.CLEAR,
                    fill: COLORS.headerBg
                }
            }),
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text: 'Estado', bold: true, size: 20 })],
                    alignment: AlignmentType.CENTER
                })],
                width: { size: 17, type: WidthType.PERCENTAGE },
                shading: {
                    type: ShadingType.CLEAR,
                    fill: COLORS.headerBg
                }
            }),
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text: 'Inicio', bold: true, size: 20 })],
                    alignment: AlignmentType.CENTER
                })],
                width: { size: 17, type: WidthType.PERCENTAGE },
                shading: {
                    type: ShadingType.CLEAR,
                    fill: COLORS.headerBg
                }
            }),
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text: 'Fin', bold: true, size: 20 })],
                    alignment: AlignmentType.CENTER
                })],
                width: { size: 18, type: WidthType.PERCENTAGE },
                shading: {
                    type: ShadingType.CLEAR,
                    fill: COLORS.headerBg
                }
            })
        ]
    });

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

    const dataRows = tasks.map(task => {
        const statusColor = COLORS.status[task.status] || 'FFFFFF';
        const priorityEmoji = EMOJIS.priority[task.priority] || '';
        const statusEmoji = EMOJIS.status[task.status] || '';

        return new TableRow({
            children: [
                // Task title cell
                new TableCell({
                    children: [new Paragraph({
                        text: task.title || 'Sin título',
                        spacing: { before: 100, after: 100 }
                    })]
                }),
                // Priority cell with emoji
                new TableCell({
                    children: [new Paragraph({
                        children: [
                            new TextRun({ text: `${priorityEmoji} ` }),
                            new TextRun({ text: priorityMap[task.priority] || task.priority || '-' })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 100, after: 100 }
                    })]
                }),
                // Status cell with color and emoji
                new TableCell({
                    children: [new Paragraph({
                        children: [
                            new TextRun({ text: `${statusEmoji} ` }),
                            new TextRun({
                                text: statusMap[task.status] || task.status || '-',
                                bold: task.status === 'done'
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 100, after: 100 }
                    })],
                    shading: {
                        type: ShadingType.CLEAR,
                        fill: statusColor
                    }
                }),
                // Start date cell
                new TableCell({
                    children: [new Paragraph({
                        text: task.startDate || '-',
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 100, after: 100 }
                    })]
                }),
                // End date cell
                new TableCell({
                    children: [new Paragraph({
                        text: task.endDate || '-',
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 100, after: 100 }
                    })]
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

function createProjectSection(project, metrics, allTasks) {
    const sections = [];

    // Project title with emoji
    sections.push(
        new Paragraph({
            children: [
                new TextRun({ text: `${EMOJIS.sections.project} `, size: 28 }),
                new TextRun({ text: project.name, size: 28, bold: true })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 600, after: 150 }
        })
    );

    // Project metrics summary with visual indicators
    const progressEmoji = metrics.completionPercent >= 75 ? '🟢' :
                         metrics.completionPercent >= 50 ? '🟡' : '🔴';

    sections.push(
        new Paragraph({
            children: [
                new TextRun({ text: '✅ ', size: 22 }),
                new TextRun({
                    text: `${metrics.completedTasks}/${metrics.totalTasks} tareas`,
                    size: 22
                }),
                new TextRun({ text: '  •  ', size: 22, color: 'D1D5DB' }),
                new TextRun({ text: `${progressEmoji} `, size: 22 }),
                new TextRun({
                    text: `${metrics.completionPercent}% completado`,
                    size: 22,
                    bold: true,
                    color: metrics.completionPercent >= 75 ? COLORS.success :
                           metrics.completionPercent >= 50 ? COLORS.priority.medium : COLORS.priority.high
                })
            ],
            spacing: { after: 100 }
        })
    );

    // Additional metrics (overdue, missing dates)
    const additionalMetrics = [];
    if (metrics.overdueTasks > 0) {
        additionalMetrics.push(
            new Paragraph({
                children: [
                    new TextRun({ text: '⚠️ ', size: 20 }),
                    new TextRun({
                        text: `${metrics.overdueTasks} tareas vencidas`,
                        size: 20,
                        color: COLORS.priority.high
                    })
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
                    new TextRun({
                        text: `${metrics.tasksWithoutDates} tareas sin fechas`,
                        size: 20,
                        color: '6B7280'
                    })
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
            spacing: { after: 200 }
        })
    );

    const sortedTasks = sortTasks(metrics.tasks);
    if (sortedTasks.length > 0) {
        sections.push(createTaskTable(sortedTasks));
    }

    const islandGroups = groupTasksByIslandAndLocality(project, allTasks);

    if (Object.keys(islandGroups).length > 0) {
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({ text: `${EMOJIS.sections.island} `, size: 26 }),
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
                        new TextRun({ text: `${EMOJIS.sections.island} `, size: 24 }),
                        new TextRun({ text: island, size: 24, bold: true, color: COLORS.primary })
                    ],
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 350, after: 200 }
                })
            );

            const localities = Object.keys(islandData.localities).sort();
            for (const locality of localities) {
                const localityTasks = sortTasks(islandData.localities[locality]);

                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: `${EMOJIS.sections.locality} `, size: 22 }),
                            new TextRun({ text: locality, size: 22, bold: true })
                        ],
                        heading: HeadingLevel.HEADING_4,
                        spacing: { before: 250, after: 150 }
                    })
                );

                sections.push(createTaskTable(localityTasks));
                sections.push(new Paragraph({ text: '', spacing: { after: 250 } }));
            }

            if (islandData.otherTasks.length > 0) {
                const otherTasks = sortTasks(islandData.otherTasks);

                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: '📍 ', size: 22 }),
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

// ============================================================================
// PUBLIC API
// ============================================================================

export async function generateWordReport(projects, tasks) {
    try {
        const globalInsights = calculateGlobalInsights(projects, tasks);

        const sections = [];

        sections.push(...createHeader());
        sections.push(...createGlobalSummary(globalInsights));

        // Sort projects alphabetically by name
        const sortedProjects = [...projects].sort((a, b) =>
            a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
        );

        sections.push(
            new Paragraph({
                children: [
                    new TextRun({ text: '📁 ', size: 32 }),
                    new TextRun({ text: 'Proyectos', size: 32, bold: true })
                ],
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 600, after: 400 }
            })
        );

        for (const project of sortedProjects) {
            const metrics = calculateProjectMetrics(project, tasks);
            sections.push(...createProjectSection(project, metrics, tasks));
        }

        // Add legend/reference section at the end
        sections.push(
            new Paragraph({
                text: '',
                spacing: { before: 600 }
            })
        );

        sections.push(
            new Paragraph({
                text: '',
                border: {
                    top: {
                        color: 'D1D5DB',
                        space: 1,
                        style: BorderStyle.SINGLE,
                        size: 6
                    }
                },
                spacing: { after: 300 }
            })
        );

        sections.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'ℹ️ ', size: 24 }),
                    new TextRun({ text: 'Referencia de Estados y Prioridades', size: 24, bold: true })
                ],
                spacing: { after: 200 }
            })
        );

        sections.push(
            new Paragraph({
                children: [
                    new TextRun({ text: '📊 Estados: ', bold: true, size: 20 }),
                    new TextRun({ text: '⚪ Por Hacer  •  🟡 En Progreso  •  🔵 En Revisión  •  🟢 Completada', size: 20 })
                ],
                spacing: { after: 100 }
            })
        );

        sections.push(
            new Paragraph({
                children: [
                    new TextRun({ text: '🎯 Prioridades: ', bold: true, size: 20 }),
                    new TextRun({ text: '🔵 Baja  •  🟡 Media  •  🔴 Alta', size: 20 })
                ],
                spacing: { after: 200 }
            })
        );

        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'Los colores de fondo en las celdas de estado facilitan la identificación visual del progreso de las tareas.',
                        size: 18,
                        italics: true,
                        color: '6B7280'
                    })
                ]
            })
        );

        const doc = new Document({
            sections: [{
                properties: {},
                children: sections
            }]
        });

        const blob = await Packer.toBlob(doc);

        const url = URL.createObjectURL(blob);
        const filename = `Reporte-Nautilus-${new Date().toISOString().split('T')[0]}.docx`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return {
            success: true,
            filename,
            insights: globalInsights
        };
    } catch (error) {
        console.error('Error generating report:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
