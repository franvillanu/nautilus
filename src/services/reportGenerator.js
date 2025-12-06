/**
 * Nautilus Word Report Generator (Browser Version)
 * Generates .docx research reports directly in the browser
 */

import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType, BorderStyle, HeadingLevel, ShadingType } from 'https://esm.sh/docx@9.5.1';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ISLAND_LOCALITY_CONFIG = {
    'TENERIFE': ['TAJAO', 'LOS CRISTIANOS', 'LAS TERESITAS', 'EL MÉDANO', 'SAN JUAN', 'BOCA CANGREJO'],
    'LA PALMA': ['LOS CANCAJOS', 'LA BOMBILLA', 'RÍO MUERTO'],
    'LANZAROTE': ['ÓRZOLA'],
    'FUERTEVENTURA': ['TONELES', 'JACOMAR', 'LOBOS', 'MORRO JABLE']
};

const ALL_ISLANDS = Object.keys(ISLAND_LOCALITY_CONFIG);

// Color palette for document design (professional, accessible colors)
const COLORS = {
    // Status colors (background shading for table cells)
    status: {
        'todo': 'E5E7EB',       // Gray 200 - Neutral
        'progress': 'DBEAFE',   // Blue 100 - In Progress
        'review': 'FEF3C7',     // Amber 100 - Under Review
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
        'low': '🔵',      // Blue circle
        'medium': '🟠',   // Orange circle
        'high': '🔴'      // Red circle
    },
    status: {
        'todo': '⬜',     // White square
        'progress': '🟦', // Blue square
        'review': '🟨',   // Yellow square
        'done': '✅'      // Checkmark (done tasks will have strikethrough text)
    },
    sections: {
        project: '📁',
        island: '🏝️',
        locality: '📍',
        summary: '📊',
        tasks: '📋',
        metrics: '📈'
    },
    progress: {
        full: '🟩',       // Full block - completed
        high: '🟨',       // High progress
        medium: '🟧',     // Medium progress
        low: '🟥'         // Low progress
    }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

function createGlobalSummary(insights, tasks) {
    const statusCounts = {
        'done': tasks.filter(t => t.status === 'done').length,
        'progress': tasks.filter(t => t.status === 'progress').length,
        'review': tasks.filter(t => t.status === 'review').length,
        'todo': tasks.filter(t => t.status === 'todo').length
    };

    // Create metrics summary table (professional layout)
    const metricsTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' }
        },
        rows: [
            new TableRow({
                children: [
                    // Column 1: Proyectos Activos
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [new TextRun({ text: 'Proyectos Activos', size: 18, color: '6B7280' })],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 200, after: 100 }
                            }),
                            new Paragraph({
                                children: [new TextRun({ text: insights.activeProjectsCount.toString(), size: 48, bold: true, color: COLORS.primary })],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 200 }
                            })
                        ],
                        width: { size: 33.33, type: WidthType.PERCENTAGE },
                        shading: { fill: 'FAFAFA', type: ShadingType.CLEAR }
                    }),
                    // Column 2: Tareas Completadas
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [new TextRun({ text: 'Tareas Completadas', size: 18, color: '6B7280' })],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 200, after: 100 }
                            }),
                            new Paragraph({
                                children: [new TextRun({ text: `${insights.completedTasks}/${insights.totalTasks}`, size: 48, bold: true })],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 200 }
                            })
                        ],
                        width: { size: 33.33, type: WidthType.PERCENTAGE },
                        shading: { fill: 'FAFAFA', type: ShadingType.CLEAR }
                    }),
                    // Column 3: Progreso Global
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [new TextRun({ text: 'Progreso Global', size: 18, color: '6B7280' })],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 200, after: 100 }
                            }),
                            new Paragraph({
                                children: [new TextRun({
                                    text: `${insights.completionPercent}%`,
                                    size: 48,
                                    bold: true,
                                    color: getProgressColor(insights.completionPercent)
                                })],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 200 }
                            })
                        ],
                        width: { size: 33.33, type: WidthType.PERCENTAGE },
                        shading: { fill: 'FAFAFA', type: ShadingType.CLEAR }
                    })
                ]
            })
        ]
    });

    // Create status distribution table (reordered: Por Hacer first, Completadas last)
    const statusTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE }
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Por Hacer', size: 18, color: '6B7280' })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 150, after: 50 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: statusCounts.todo.toString(), size: 32, bold: true, color: '9CA3AF' })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 150 }
                            })
                        ],
                        width: { size: 25, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'En Progreso', size: 18, color: '6B7280' })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 150, after: 50 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: statusCounts.progress.toString(), size: 32, bold: true, color: COLORS.primary })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 150 }
                            })
                        ],
                        width: { size: 25, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'En Revisión', size: 18, color: '6B7280' })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 150, after: 50 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: statusCounts.review.toString(), size: 32, bold: true, color: COLORS.priority.medium })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 150 }
                            })
                        ],
                        width: { size: 25, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Completadas', size: 18, color: '6B7280' })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 150, after: 50 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: statusCounts.done.toString(), size: 32, bold: true, color: COLORS.success })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 150 }
                            })
                        ],
                        width: { size: 25, type: WidthType.PERCENTAGE }
                    })
                ]
            })
        ]
    });

    return [
        new Paragraph({
            children: [
                new TextRun({ text: 'Resumen Global', size: 32, bold: true })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 300 }
        }),
        metricsTable,
        new Paragraph({ text: '', spacing: { before: 300, after: 200 } }),
        new Paragraph({
            children: [
                new TextRun({ text: 'Distribución de Tareas', size: 22, bold: true })
            ],
            spacing: { after: 150 }
        }),
        statusTable,
        new Paragraph({ text: '', spacing: { after: 400 } })
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
                                strike: task.status === 'done'
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
    const summaryParts = [
        `${metrics.completedTasks}/${metrics.totalTasks} tareas`,
        new TextRun({
            text: `${metrics.completionPercent}%`,
            bold: true,
            color: getProgressColor(metrics.completionPercent)
        })
    ];

    // Modern metrics summary table
    const metricsRows = [];

    // Progress row (always shown)
    metricsRows.push(
        new TableRow({
            children: [
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: '📊 Progreso', size: 16, color: '4B5563' })] })],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F9FAFB' }
                }),
                new TableCell({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `${metrics.completionPercent}%`,
                                    size: 18,
                                    bold: true,
                                    color: getProgressColor(metrics.completionPercent)
                                }),
                                new TextRun({ text: `  (${metrics.completedTasks}/${metrics.totalTasks} tareas)`, size: 14, color: '6B7280' })
                            ]
                        })
                    ],
                    width: { size: 70, type: WidthType.PERCENTAGE }
                })
            ]
        })
    );

    // Overdue tasks row (conditional)
    if (metrics.overdueTasks > 0) {
        metricsRows.push(
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: '⚠️ Vencidas', size: 16, color: '4B5563' })] })],
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        shading: { fill: 'FEF2F2' }
                    }),
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: `${metrics.overdueTasks} tareas`, size: 16, color: COLORS.priority.high })] })],
                        width: { size: 70, type: WidthType.PERCENTAGE }
                    })
                ]
            })
        );
    }

    // Tasks without dates row (conditional)
    if (metrics.tasksWithoutDates > 0) {
        metricsRows.push(
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: '📅 Sin fechas', size: 16, color: '4B5563' })] })],
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        shading: { fill: 'FFFBEB' }
                    }),
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: `${metrics.tasksWithoutDates} tareas`, size: 16, color: '6B7280' })] })],
                        width: { size: 70, type: WidthType.PERCENTAGE }
                    })
                ]
            })
        );
    }

    const metricsTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' }
        },
        rows: metricsRows
    });

    sections.push(metricsTable);

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

            const localities = Object.keys(islandData.localities).sort();
            for (const locality of localities) {
                const localityTasks = sortTasks(islandData.localities[locality]);

                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: '📍 ', size: 22 }),
                            new TextRun({ text: locality, size: 22, bold: true, italics: false })
                        ],
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
                            new TextRun({ text: 'Otras Ubicaciones', size: 22, bold: true, italics: false })
                        ],
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
        sections.push(...createGlobalSummary(globalInsights, tasks));

        // Sort projects alphabetically by name
        const sortedProjects = [...projects].sort((a, b) =>
            a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
        );

        sections.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'Proyectos', size: 32, bold: true })
                ],
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
