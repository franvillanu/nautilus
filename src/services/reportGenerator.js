/**
 * Nautilus Word Report Generator (Browser Version)
 * Generates .docx research reports directly in the browser
 */

import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType, BorderStyle, HeadingLevel } from 'https://esm.sh/docx@9.5.1';

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

function createProjectSection(project, metrics, allTasks) {
    const sections = [];

    sections.push(
        new Paragraph({
            text: project.name,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 600, after: 200 }
        })
    );

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

    const sortedTasks = sortTasks(metrics.tasks);
    if (sortedTasks.length > 0) {
        sections.push(createTaskTable(sortedTasks));
    }

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

// ============================================================================
// PUBLIC API
// ============================================================================

export async function generateWordReport(projects, tasks) {
    try {
        const globalInsights = calculateGlobalInsights(projects, tasks);

        const sections = [];

        sections.push(...createHeader());
        sections.push(...createGlobalSummary(globalInsights));

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
