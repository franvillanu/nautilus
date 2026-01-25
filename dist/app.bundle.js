var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/services/reportGenerator.js
var reportGenerator_exports = {};
__export(reportGenerator_exports, {
  generateWordReport: () => generateWordReport
});
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType, BorderStyle, HeadingLevel, ShadingType } from "https://esm.sh/docx@9.5.1";
function getProgressColor(percent) {
  if (percent >= 75) return COLORS.success;
  if (percent >= 50) return COLORS.primary;
  if (percent >= 25) return COLORS.priority.medium;
  return COLORS.priority.high;
}
function calculateGlobalInsights(projects2, tasks2) {
  const activeProjectIds = new Set(
    tasks2.filter((task) => task.status !== "done").map((task) => task.projectId).filter((id) => id !== null)
  );
  const totalTasks = tasks2.length;
  const completedTasks = tasks2.filter((task) => task.status === "done").length;
  const completionPercent = totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0;
  return {
    activeProjectsCount: activeProjectIds.size,
    totalTasks,
    completedTasks,
    completionPercent
  };
}
function calculateProjectMetrics(project, tasks2) {
  const projectTasks = tasks2.filter((task) => task.projectId === project.id);
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter((task) => task.status === "done").length;
  const completionPercent = totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0;
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const overdueTasks = projectTasks.filter(
    (task) => task.status !== "done" && task.endDate && task.endDate < today
  ).length;
  const tasksWithoutDates = projectTasks.filter(
    (task) => !task.startDate || !task.endDate
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
  return (task.tags || []).map((tag) => tag.toUpperCase());
}
function getProjectTags(project) {
  return (project.tags || []).map((tag) => tag.toUpperCase());
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
function groupTasksByIslandAndLocality(project, tasks2) {
  const projectTasks = tasks2.filter((task) => task.projectId === project.id);
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
function sortTasks(tasks2) {
  return [...tasks2].sort((a, b) => {
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
function createHeader() {
  const now = /* @__PURE__ */ new Date();
  const dateStr = now.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  return [
    new Paragraph({
      children: [
        new TextRun({ text: "REPORTE NAUTILUS", size: 36, bold: true })
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 150 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Sistema de Gesti\xF3n de Investigaci\xF3n Marina",
          size: 20,
          color: "6B7280"
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: dateStr, size: 18, color: "9CA3AF" })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    }),
    new Paragraph({
      text: "",
      border: {
        bottom: {
          color: "D1D5DB",
          space: 1,
          style: BorderStyle.SINGLE,
          size: 3
        }
      },
      spacing: { after: 400 }
    })
  ];
}
function createGlobalSummary(insights, tasks2) {
  const statusCounts = {
    "done": tasks2.filter((t2) => t2.status === "done").length,
    "progress": tasks2.filter((t2) => t2.status === "progress").length,
    "review": tasks2.filter((t2) => t2.status === "review").length,
    "todo": tasks2.filter((t2) => t2.status === "todo").length
  };
  const metricsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" }
    },
    rows: [
      new TableRow({
        children: [
          // Column 1: Proyectos Activos
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Proyectos Activos", size: 18, color: "6B7280" })],
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
            shading: { fill: "FAFAFA", type: ShadingType.CLEAR }
          }),
          // Column 2: Tareas Completadas
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Tareas Completadas", size: 18, color: "6B7280" })],
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
            shading: { fill: "FAFAFA", type: ShadingType.CLEAR }
          }),
          // Column 3: Progreso Global
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Progreso Global", size: 18, color: "6B7280" })],
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
            shading: { fill: "FAFAFA", type: ShadingType.CLEAR }
          })
        ]
      })
    ]
  });
  const statusTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
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
                  new TextRun({ text: "Por Hacer", size: 18, color: "6B7280" })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 150, after: 50 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: statusCounts.todo.toString(), size: 32, bold: true, color: "9CA3AF" })
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
                  new TextRun({ text: "En Progreso", size: 18, color: "6B7280" })
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
                  new TextRun({ text: "En Revisi\xF3n", size: 18, color: "6B7280" })
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
                  new TextRun({ text: "Completadas", size: 18, color: "6B7280" })
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
        new TextRun({ text: "Resumen Global", size: 32, bold: true })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 300 }
    }),
    metricsTable,
    new Paragraph({ text: "", spacing: { before: 300, after: 200 } }),
    new Paragraph({
      children: [
        new TextRun({ text: "Distribuci\xF3n de Tareas", size: 22, bold: true })
      ],
      spacing: { after: 150 }
    }),
    statusTable,
    new Paragraph({ text: "", spacing: { after: 400 } })
  ];
}
function createTaskTable(tasks2) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "Tarea", bold: true, size: 20 })],
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
          children: [new TextRun({ text: "Prioridad", bold: true, size: 20 })],
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
          children: [new TextRun({ text: "Estado", bold: true, size: 20 })],
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
          children: [new TextRun({ text: "Inicio", bold: true, size: 20 })],
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
          children: [new TextRun({ text: "Fin", bold: true, size: 20 })],
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
    "low": "Baja",
    "medium": "Media",
    "high": "Alta"
  };
  const statusMap = {
    "todo": "Por Hacer",
    "progress": "En Progreso",
    "review": "En Revisi\xF3n",
    "done": "Completada"
  };
  const dataRows = tasks2.map((task) => {
    const statusColor = COLORS.status[task.status] || "FFFFFF";
    const priorityColor = COLORS.priority[task.priority] || "9CA3AF";
    const priorityEmoji = EMOJIS.priority[task.priority] || "";
    const statusEmoji = EMOJIS.status[task.status] || "";
    return new TableRow({
      children: [
        // Task title cell
        new TableCell({
          children: [new Paragraph({
            text: task.title || "Sin t\xEDtulo",
            spacing: { before: 100, after: 100 }
          })]
        }),
        // Priority cell with colored square
        new TableCell({
          children: [new Paragraph({
            children: [
              new TextRun({ text: `${priorityEmoji} `, color: priorityColor }),
              new TextRun({ text: priorityMap[task.priority] || task.priority || "-" })
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
                text: statusMap[task.status] || task.status || "-",
                strike: task.status === "done"
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
            text: task.startDate || "-",
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 100 }
          })]
        }),
        // End date cell
        new TableCell({
          children: [new Paragraph({
            text: task.endDate || "-",
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
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: project.name, size: 28, bold: true })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 600, after: 200 }
    })
  );
  const summaryParts = [
    `${metrics.completedTasks}/${metrics.totalTasks} tareas`,
    new TextRun({
      text: `${metrics.completionPercent}%`,
      bold: true,
      color: getProgressColor(metrics.completionPercent)
    })
  ];
  const metricsRows = [];
  metricsRows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "\u{1F4CA} Progreso", size: 16, color: "4B5563" })] })],
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: "F9FAFB" }
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
                new TextRun({ text: `  (${metrics.completedTasks}/${metrics.totalTasks} tareas)`, size: 14, color: "6B7280" })
              ]
            })
          ],
          width: { size: 70, type: WidthType.PERCENTAGE }
        })
      ]
    })
  );
  if (metrics.overdueTasks > 0) {
    metricsRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "\u26A0\uFE0F Vencidas", size: 16, color: "4B5563" })] })],
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "FEF2F2" }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${metrics.overdueTasks} tareas`, size: 16, color: COLORS.priority.high })] })],
            width: { size: 70, type: WidthType.PERCENTAGE }
          })
        ]
      })
    );
  }
  if (metrics.tasksWithoutDates > 0) {
    metricsRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "\u{1F4C5} Sin fechas", size: 16, color: "4B5563" })] })],
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "FFFBEB" }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${metrics.tasksWithoutDates} tareas`, size: 16, color: "6B7280" })] })],
            width: { size: 70, type: WidthType.PERCENTAGE }
          })
        ]
      })
    );
  }
  const metricsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" }
    },
    rows: metricsRows
  });
  sections.push(metricsTable);
  sections.push(
    new Paragraph({
      text: "",
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
          new TextRun({ text: "Desglose Geogr\xE1fico", size: 26, bold: true })
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
            new TextRun({ text: "\u{1F3DD}\uFE0F ", size: 24 }),
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
              new TextRun({ text: "\u{1F4CD} ", size: 22 }),
              new TextRun({ text: locality, size: 22, bold: true, italics: false })
            ],
            spacing: { before: 250, after: 150 }
          })
        );
        sections.push(createTaskTable(localityTasks));
        sections.push(new Paragraph({ text: "", spacing: { after: 250 } }));
      }
      if (islandData.otherTasks.length > 0) {
        const otherTasks = sortTasks(islandData.otherTasks);
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: "\u{1F4CD} ", size: 22 }),
              new TextRun({ text: "Otras Ubicaciones", size: 22, bold: true, italics: false })
            ],
            spacing: { before: 250, after: 150 }
          })
        );
        sections.push(createTaskTable(otherTasks));
        sections.push(new Paragraph({ text: "", spacing: { after: 250 } }));
      }
    }
  }
  return sections;
}
async function generateWordReport(projects2, tasks2) {
  try {
    const globalInsights = calculateGlobalInsights(projects2, tasks2);
    const sections = [];
    sections.push(...createHeader());
    sections.push(...createGlobalSummary(globalInsights, tasks2));
    const sortedProjects = [...projects2].sort(
      (a2, b) => a2.name.localeCompare(b.name, "es", { sensitivity: "base" })
    );
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Proyectos", size: 32, bold: true })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 600, after: 300 }
      })
    );
    const projectCells = sortedProjects.map((project) => {
      const metrics = calculateProjectMetrics(project, tasks2);
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
                color: "6B7280"
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
        top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" }
      },
      rows: [
        new TableRow({
          children: projectCells
        })
      ]
    });
    sections.push(projectsTable);
    sections.push(new Paragraph({ text: "", spacing: { after: 400 } }));
    for (const project of sortedProjects) {
      const metrics = calculateProjectMetrics(project, tasks2);
      sections.push(...createProjectSection(project, metrics, tasks2));
    }
    const doc = new Document({
      sections: [{
        properties: {},
        children: sections
      }]
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const filename = `Reporte-Nautilus-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.docx`;
    const a = document.createElement("a");
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
    console.error("Error generating report:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
var ISLAND_LOCALITY_CONFIG, ALL_ISLANDS, COLORS, EMOJIS;
var init_reportGenerator = __esm({
  "src/services/reportGenerator.js"() {
    ISLAND_LOCALITY_CONFIG = {
      "TENERIFE": ["TAJAO", "LOS CRISTIANOS", "LAS TERESITAS", "EL M\xC9DANO", "SAN JUAN", "BOCA CANGREJO"],
      "LA PALMA": ["LOS CANCAJOS", "LA BOMBILLA", "R\xCDO MUERTO"],
      "LANZAROTE": ["\xD3RZOLA"],
      "FUERTEVENTURA": ["TONELES", "JACOMAR", "LOBOS", "MORRO JABLE"]
    };
    ALL_ISLANDS = Object.keys(ISLAND_LOCALITY_CONFIG);
    COLORS = {
      // Status colors (background shading for table cells)
      status: {
        "todo": "E5E7EB",
        // Gray 200 - Neutral
        "progress": "DBEAFE",
        // Blue 100 - In Progress
        "review": "FEF3C7",
        // Amber 100 - Under Review
        "done": "D1FAE5"
        // Green 100 - Completed
      },
      // Priority background colors (for table cell shading)
      priorityBg: {
        "low": "F3F4F6",
        // Gray 100 - Light background
        "medium": "FEF3C7",
        // Amber 100 - Orange background
        "high": "FEE2E2"
        // Red 100 - Light red background
      },
      // Priority colors (for visual hierarchy)
      priority: {
        "low": "9CA3AF",
        // Gray 400
        "medium": "F59E0B",
        // Amber 500
        "high": "EF4444"
        // Red 500
      },
      // Accent colors
      primary: "0284C7",
      // Sky 600
      secondary: "6366F1",
      // Indigo 500
      success: "10B981",
      // Green 500
      headerBg: "F3F4F6"
      // Gray 100
    };
    EMOJIS = {
      priority: {
        "low": "\u25A0",
        // Black square (will be colored gray)
        "medium": "\u25A0",
        // Black square (will be colored orange)
        "high": "\u25A0"
        // Black square (will be colored red)
      },
      status: {
        "todo": "\u2B1C",
        // White square
        "progress": "\u{1F7E6}",
        // Blue square
        "review": "\u{1F7E8}",
        // Yellow square
        "done": "\u2705"
        // Checkmark (done tasks will have strikethrough text)
      },
      sections: {
        project: "\u{1F4C1}",
        island: "\u{1F3DD}\uFE0F",
        locality: "\u{1F4CD}",
        summary: "\u{1F4CA}",
        tasks: "\u{1F4CB}",
        metrics: "\u{1F4C8}"
      },
      progress: {
        full: "\u{1F7E9}",
        // Full block - completed
        high: "\u{1F7E8}",
        // High progress
        medium: "\u{1F7E7}",
        // Medium progress
        low: "\u{1F7E5}"
        // Low progress
      }
    };
  }
});

// src/config/i18n.js
var I18N_LOCALES = {
  en: "en-US",
  es: "es-ES"
};
var I18N = {
  en: {
    "boot.loading": "Loading Nautilus",
    "lock.welcome": "Welcome back",
    "lock.subtitle": "Enter the access password to continue.",
    "lock.sessionHint": "? Session stays signed-in for 24 hours.",
    "lock.passwordLabel": "Password",
    "lock.passwordPlaceholder": "Enter password",
    "lock.unlock": "Unlock",
    "auth.backToUserLogin": "Back to User Login",
    "auth.login.title": "Welcome to Nautilus",
    "auth.login.subtitle": "Login to access your workspace",
    "auth.login.identifierLabel": "Username or Email",
    "auth.login.identifierPlaceholder": "Enter username or email",
    "auth.login.pinLabel": "PIN (4 digits)",
    "auth.admin.title": "Admin Access",
    "auth.admin.subtitle": "Enter master PIN to access admin dashboard",
    "auth.admin.pinLabel": "Master PIN (4 digits)",
    "auth.setup.title": "Complete Your Setup",
    "auth.setup.subtitle": "Personalize your account",
    "auth.setup.usernameLabel": "Username",
    "auth.setup.usernamePlaceholder": "e.g., alex",
    "auth.setup.usernameHint": "3-20 characters, lowercase letters and numbers only",
    "auth.setup.displayNameLabel": "Display Name",
    "auth.setup.displayNamePlaceholder": "e.g., Alex Morgan",
    "auth.setup.emailLabel": "Email",
    "auth.setup.emailPlaceholder": "your.email@example.com",
    "auth.setup.emailHint": "Required for notifications",
    "auth.setup.newPinLabel": "New PIN (4 digits)",
    "auth.setup.confirmPinLabel": "Confirm PIN",
    "auth.setup.next": "Next",
    "auth.setup.submit": "Complete Setup",
    "admin.title": "User Management",
    "admin.signOut": "Sign Out",
    "admin.usersTitle": "Users",
    "admin.createUserTitle": "Create New User",
    "admin.usernameLabel": "Username",
    "admin.usernamePlaceholder": "e.g., jdoe",
    "admin.usernameHint": "3-20 characters, lowercase letters and numbers only",
    "admin.displayNameLabel": "Display Name",
    "admin.displayNamePlaceholder": "e.g., John Doe",
    "admin.tempPinLabel": "Temporary PIN (4 digits)",
    "admin.createUserButton": "Create User",
    "auth.admin.resetPinPrompt": "Enter new temporary PIN for {userName}:",
    "auth.admin.pinMustBe4Digits": "PIN must be exactly 4 digits",
    "auth.admin.resetPinFailed": "Failed to reset PIN",
    "auth.admin.resetPinSuccess": "PIN reset for {userName}. New temp PIN: {pin}",
    "auth.admin.deleteUserConfirm": 'Are you sure you want to delete user "{userName}"? This will also delete all their tasks and projects.',
    "auth.admin.deleteUserFailed": "Failed to delete user",
    "auth.admin.deleteUserSuccess": 'User "{userName}" deleted successfully',
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.continue": "Continue",
    "common.gotIt": "Got it",
    "common.close": "Close modal",
    "common.done": "Done",
    "common.nautilusLogoAlt": "Nautilus logo",
    "common.devBanner": "\u26A0\uFE0F LOCAL DEV - NOT PRODUCTION \u26A0\uFE0F",
    "common.datePlaceholder": "dd/mm/yyyy",
    "crop.title": "Crop Image to Square",
    "crop.instructions": "Drag to adjust the crop area. The image will be cropped to a square.",
    "crop.apply": "Crop & Apply",
    "crop.close": "Close crop modal",
    "dashboard.insights.productivityTitle": "Productivity Trend",
    "dashboard.insights.productivityDesc": "Task completion rate increased 23% compared to last month",
    "dashboard.insights.deadlineTitle": "Deadline Alert",
    "dashboard.insights.deadlineDesc": "3 milestones due within the next 7 days",
    "projects.title": "Projects",
    "projects.subtitle": "Manage your projects",
    "projects.searchPlaceholder": "\u{1F50D} Search projects (title or description)",
    "projects.filters.status": "Status",
    "projects.filters.statusTitle": "Project Status",
    "projects.status.backlog": "BACKLOG",
    "projects.status.planning": "PLANNING",
    "projects.status.active": "ACTIVE",
    "projects.status.completed": "COMPLETED",
    "projects.filters.updated": "Updated",
    "projects.filters.updatedTitle": "Recently Updated",
    "projects.filters.all": "All",
    "projects.filters.last5m": "Last 5 minutes",
    "projects.filters.last30m": "Last 30 minutes",
    "projects.filters.last24h": "Last 24 hours",
    "projects.filters.lastWeek": "Last week",
    "projects.filters.lastMonth": "Last month",
    "projects.filters.hasTasks": "Has tasks",
    "projects.filters.noTasks": "No tasks",
    "projects.filters.tags": "Tags",
    "projects.filters.tagsTitle": "Project Tags",
    "projects.filters.clear": "Clear Filters",
    "projects.noDescription": "No description",
    "projects.tasksBreakdown": "{total} tasks \xB7 {done} done",
    "tasks.card.description": "Description",
    "projects.card.tasksCount": "{count} tasks",
    "projects.card.percentDone": "{count}% done",
    "projects.sort.label": "Sort: Status",
    "projects.sort.status": "Status",
    "projects.sort.name": "Name",
    "projects.sort.newest": "Newest",
    "projects.sort.lastUpdated": "Last Updated",
    "projects.sort.mostTasks": "Most tasks",
    "projects.sort.percentCompleted": "% Completed",
    "projects.sort.prefix": "Sort: {label}",
    "projects.sort.help": "Click the same option again to switch Asc/Desc.",
    "projects.sort.statusLabel": "Status",
    "projects.sort.nameLabel": "Name",
    "projects.sort.newestLabel": "Newest",
    "projects.sort.lastUpdatedLabel": "Last Updated",
    "projects.sort.mostTasksLabel": "Most tasks",
    "projects.sort.percentCompletedLabel": "% Completed",
    "projects.newProjectButton": "+ New Project",
    "projects.openDetailsTitle": "View project details",
    "projects.empty.title": "No projects yet",
    "projects.empty.subtitle": "Create your first project",
    "projects.empty.searchTitle": "No projects found",
    "projects.empty.searchSubtitle": "Create a new project to get started",
    "projects.empty.filteredTitle": "No projects matched",
    "projects.modal.createTitle": "Create New Project",
    "projects.modal.nameLabel": "Project Name",
    "projects.modal.descriptionLabel": "Description",
    "projects.modal.startDateLabel": "Start Date",
    "projects.modal.endDateLabel": "End Date",
    "projects.modal.tagsLabel": "Tags",
    "projects.modal.addTagPlaceholder": "Add tag",
    "projects.modal.createButton": "Create Project",
    "projects.delete.title": "Delete Project",
    "projects.delete.body": "This action cannot be undone. To confirm deletion, type delete below:",
    "projects.delete.deleteTasksLabel": "Delete all tasks in this project",
    "projects.delete.deleteTasksHint": "If unchecked, tasks will be unassigned from the project",
    "projects.delete.inputPlaceholder": "Type delete here",
    "projects.delete.error": 'Type "delete" exactly to confirm',
    "projects.duplicate.title": "Duplicate Project",
    "projects.duplicate.description": "Create a copy of this project with all its settings.",
    "projects.duplicate.includeTasksLabel": "Include all tasks from this project",
    "projects.duplicate.taskNamingTitle": "Task naming:",
    "projects.duplicate.namingNone": "Keep original names",
    "projects.duplicate.namingPrefix": "Add prefix:",
    "projects.duplicate.namingSuffix": "Add suffix:",
    "projects.duplicate.prefixPlaceholder": "e.g., Copy - ",
    "projects.duplicate.suffixPlaceholder": "e.g., (Copy)",
    "projects.duplicate.confirm": "Duplicate Project",
    "projects.duplicate.success": 'Project "{name}" duplicated successfully',
    "projects.duplicate.successWithTasks": 'Project "{name}" and its tasks duplicated successfully',
    "projects.statusInfo.title": "Project Status Logic",
    "projects.statusInfo.subtitle": "Project status updates automatically based on task progress",
    "projects.statusInfo.backlogTitle": "\u2B1B Backlog",
    "projects.statusInfo.backlogDesc": 'All tasks are in "Backlog"',
    "projects.statusInfo.planningTitle": "\u2B1C Planning",
    "projects.statusInfo.planningDesc": 'All tasks are in "To Do"',
    "projects.statusInfo.activeTitle": "\u2705 Active",
    "projects.statusInfo.activeDesc": 'At least one task is "In Progress" or "In Review"',
    "projects.statusInfo.completedTitle": "? Completed",
    "projects.statusInfo.completedDesc": 'All tasks are marked as "Done"',
    "projects.backTo.dashboard": "\u2190 Back to Dashboard",
    "projects.backTo.calendar": "\u2190 Back to Calendar",
    "projects.backTo.projects": "\u2190 Back to Projects",
    "projects.details.tab.details": "Details",
    "projects.details.tab.history": "History",
    "projects.details.startDate": "Start Date",
    "projects.details.endDate": "End Date",
    "projects.details.duration": "Duration",
    "projects.details.durationDays": "{count} days",
    "projects.details.created": "Created",
    "projects.details.calendarColor": "Calendar Color",
    "projects.details.customColor": "Custom color",
    "projects.details.progressOverview": "Progress Overview",
    "projects.details.taskProgress": "Task Progress",
    "projects.details.tasksTitle": "Tasks ({count})",
    "projects.details.changeHistory": "Change History",
    "projects.details.noChanges": "No changes yet for this project",
    "projects.details.noTasksFound": "No tasks found",
    "projects.details.viewTodo": "View To Do tasks for this project",
    "projects.details.viewProgress": "View In Progress tasks for this project",
    "projects.details.viewReview": "View In Review tasks for this project",
    "projects.details.viewCompleted": "View Completed tasks for this project",
    "projects.details.viewBacklog": "View backlog tasks in List view",
    "projects.untitled": "Untitled Project",
    "tasks.title": "All Tasks",
    "tasks.subtitle": "Manage tasks across all projects",
    "tasks.searchPlaceholder": "\u{1F50D} Search tasks (title or description)",
    "tasks.filters.status": "Status",
    "tasks.filters.statusTitle": "Status",
    "tasks.status.backlog": "Backlog",
    "tasks.status.todo": "To Do",
    "tasks.status.progress": "In Progress",
    "tasks.status.review": "In Review",
    "tasks.status.done": "Done",
    "tasks.filters.tags": "Tags",
    "tasks.filters.tagsTitle": "Tags",
    "tasks.filters.priority": "Priority",
    "tasks.filters.priorityTitle": "Priority",
    "tasks.priority.high": "High",
    "tasks.priority.medium": "Medium",
    "tasks.priority.low": "Low",
    "tasks.filters.project": "Project",
    "tasks.filters.projectTitle": "Project",
    "tasks.filters.selectAll": "Select / Unselect All",
    "tasks.filters.date": "Date",
    "tasks.filters.endDate": "End Date",
    "tasks.filters.startDate": "Start Date",
    "tasks.filters.dateTitle": "Quick Date Filters",
    "tasks.filters.endDateTitle": "End Date Filters",
    "tasks.filters.noDate": "No End Date",
    "tasks.filters.overdue": "Overdue",
    "tasks.filters.endToday": "End Date Today",
    "tasks.filters.endTomorrow": "End Date Tomorrow",
    "tasks.filters.end7Days": "End Date in 7 Days",
    "tasks.filters.endThisWeek": "End Date This Week",
    "tasks.filters.endThisMonth": "End Date This Month",
    "tasks.filters.startDateTitle": "Start Date Filters",
    "tasks.filters.noStartDate": "No Start Date",
    "tasks.filters.alreadyStarted": "Already Started",
    "tasks.filters.startToday": "Start Date Today",
    "tasks.filters.startTomorrow": "Start Date Tomorrow",
    "tasks.filters.start7Days": "Start Date in 7 Days",
    "tasks.filters.startThisWeek": "Start Date This Week",
    "tasks.filters.startThisMonth": "Start Date This Month",
    "tasks.filters.updated": "Updated",
    "tasks.filters.updatedTitle": "Recently Updated",
    "tasks.filters.dateFrom": "Start date",
    "tasks.filters.dateTo": "End date",
    "tasks.filters.clear": "Clear Filters",
    "filters.noOtherProjects": "No other projects",
    "filters.noTags": "No Tags",
    "filters.noOtherTags": "No other tags",
    "filters.sheet.title": "Options",
    "filters.chip.search": "Search",
    "filters.chip.project": "Project",
    "filters.chip.tag": "Tag",
    "filters.chip.date": "Date",
    "filters.chip.updated": "Updated",
    "filters.chip.removeAria": "Remove {label} filter",
    "filters.dateRange.from": "From",
    "filters.dateRange.until": "Until",
    "filters.updated.week": "Week",
    "filters.updated.month": "Month",
    "tasks.kanban.tipLabel": "Tip:",
    "tasks.kanban.tipTextBefore": "In the Kanban Board hold ",
    "tasks.kanban.tipTextAfter": " (Cmd on Mac) and click to select multiple tasks. Shift-click selects a range, then drag to move them together",
    "tasks.view.kanban": "Kanban",
    "tasks.view.list": "List",
    "tasks.view.calendar": "Calendar",
    "tasks.sort.label": "Sort: Priority",
    "tasks.sort.orderByPriority": "Order by Priority",
    "tasks.kanban.showBacklog": "Show Backlog",
    "tasks.kanban.showProjects": "Show Projects",
    "tasks.kanban.showNoDate": 'Show "No Date"',
    "tasks.addButton": "+ Add Task",
    "tasks.noProject": "No Project",
    "tasks.projectIndicatorNone": "No Project - ",
    "tasks.project.selectPlaceholder": "Select a project",
    "tasks.tags.none": "No tags",
    "tasks.checklist.toggle": "Toggle checkbox",
    "tasks.untitled": "Untitled task",
    "tasks.startDatePrefix": "Start Date: ",
    "tasks.endDatePrefix": "End Date: ",
    "tasks.noDate": "No date",
    "tasks.noDatesSet": "No dates set",
    "tasks.noEndDate": "No End Date",
    "tasks.due.yesterday": "Yesterday",
    "tasks.due.daysOverdue": "{count} days overdue",
    "tasks.due.tomorrow": "Tomorrow",
    "tasks.openTaskDetails": "Open task details",
    "tasks.noTasksInProject": "No tasks in this project",
    "tasks.attachments.open": "Open",
    "tasks.attachments.none": "No attachments",
    "tasks.attachments.remove": "Remove attachment",
    "tasks.attachments.removeTitle": "Remove",
    "tasks.attachments.removeLink": "Remove link",
    "tasks.attachments.googleDoc": "Google Doc",
    "tasks.attachments.googleSheet": "Google Sheet",
    "tasks.attachments.googleSlides": "Google Slides",
    "tasks.attachments.googleDriveFile": "Google Drive File",
    "tasks.attachments.pdf": "PDF Document",
    "tasks.attachments.word": "Word Document",
    "tasks.attachments.excel": "Excel File",
    "tasks.attachments.powerpoint": "PowerPoint",
    "tasks.empty.epic": "No tasks yet. Create your first task for this epic.",
    "tasks.backlogQuickTitle": "Open Backlog tasks in List view",
    "tasks.backlogQuickLabel": "Backlog",
    "tasks.kanban.columnBacklog": "\u{1F9CA} Backlog",
    "tasks.kanban.columnTodo": "\u{1F4CB} To Do",
    "tasks.kanban.columnProgress": "\u{1F504} In Progress",
    "tasks.kanban.columnReview": "\u2611\uFE0F In Review",
    "tasks.kanban.columnDone": "\u2705 Done",
    "tasks.table.task": "Task",
    "tasks.table.priority": "Priority",
    "tasks.table.status": "Status",
    "tasks.table.tags": "Tags",
    "tasks.table.project": "Project",
    "tasks.table.startDate": "Start Date",
    "tasks.table.endDate": "End Date",
    "tasks.table.updated": "Updated",
    "tasks.list.count": "{count} results",
    "tasks.modal.editTitle": "Edit Task",
    "tasks.modal.duplicate": "\u{1F4C4} Duplicate Task",
    "tasks.modal.delete": "\u{1F5D1}\uFE0F Delete Task",
    "tasks.modal.tab.general": "General",
    "tasks.modal.tab.details": "Details",
    "tasks.modal.tab.history": "History",
    "tasks.modal.titleLabel": "Task Title",
    "tasks.modal.attachmentsLabel": "Attachments",
    "tasks.modal.attachmentsSupported": "Supported: Images (10MB), PDFs (20MB), Documents (10MB)",
    "tasks.modal.attachmentsDropzoneDefault": "Drag & drop or click to attach file",
    "tasks.modal.attachmentsDropzoneTap": "Click to attach file",
    "tasks.modal.linksLabel": "Links",
    "tasks.modal.attachmentNamePlaceholder": "Name (optional)",
    "tasks.modal.attachmentUrlPlaceholder": "URL",
    "tasks.modal.addLink": "Add Link",
    "tasks.modal.statusLabel": "Status",
    "tasks.modal.priorityLabel": "Priority",
    "tasks.modal.tagsLabel": "Tags",
    "tasks.modal.addTagPlaceholder": "Add tag",
    "tasks.modal.projectLabel": "Project",
    "tasks.modal.projectOpenTitle": "Open project details",
    "tasks.modal.projectSelect": "Select a project",
    "tasks.modal.submitCreate": "Create Task",
    "tasks.modal.listBulleted": "\u2022 List",
    "tasks.modal.listNumbered": "1. List",
    "tasks.modal.insertDivider": "Insert horizontal divider",
    "tasks.modal.insertCheckbox": "Insert checkbox",
    "tasks.history.emptyTitle": "No Changes Yet",
    "tasks.history.emptySubtitle": "Changes to this task will appear here",
    "calendar.title": "Calendar",
    "calendar.today": "Today",
    "calendar.prevMonth": "Previous month",
    "calendar.nextMonth": "Next month",
    "calendar.dayItemsTitle": "Items for {date}",
    "calendar.dayItemsProjects": "Projects",
    "calendar.dayItemsTasks": "Tasks",
    "calendar.dayItems.close": "Close day items",
    "calendar.dayItems.addTask": "+ Add Task",
    "feedback.title": "Feedback & Issues",
    "feedback.subtitle": "Report bugs and suggest features",
    "feedback.saveStatus.saved": "Saved",
    "feedback.saveStatus.saving": "Saving...",
    "feedback.saveStatus.error": "Save failed",
    "feedback.saveStatus.offline": "Offline",
    "feedback.type.bugLabel": "\u{1F41E} Bug",
    "feedback.type.title": "Feedback Type",
    "feedback.type.bugOption": "\u{1F41E} Bug",
    "feedback.type.improvementOption": "\u{1F4A1} Improvement",
    "feedback.descriptionPlaceholder": "Describe the issue or idea. You can paste an image directly into this field.",
    "feedback.descriptionPlaceholderShort": "Describe the issue or idea.",
    "feedback.screenshotAttachTitle": "Attach screenshot from device",
    "feedback.screenshotDropzoneTap": "\u{1F4F7} Tap to attach screenshot",
    "feedback.screenshotDropzoneDefault": "\u{1F4F7} Drag & drop or click to attach screenshot",
    "feedback.screenshotPreviewTitle": "Screenshot attached",
    "feedback.screenshotPreviewSubtitle": "Will be saved with this feedback",
    "feedback.screenshotRemove": "Remove",
    "feedback.screenshotPreviewAlt": "Feedback screenshot preview",
    "feedback.viewScreenshotTitle": "View screenshot",
    "feedback.pagination.first": "First page",
    "feedback.pagination.prev": "Previous page",
    "feedback.pagination.next": "Next page",
    "feedback.pagination.last": "Last page",
    "feedback.pagination.showing": "Showing {start}-{end} of {total}",
    "feedback.pagination.pageOf": "Page {current} of {total}",
    "feedback.addButton": "Add",
    "feedback.pendingTitle": "? Pending",
    "feedback.doneTitle": "? Done",
    "feedback.delete.title": "Delete Feedback",
    "feedback.delete.body": "Are you sure you want to delete this feedback?",
    "feedback.empty.pending": "No pending feedback",
    "feedback.empty.done": "No completed feedback",
    "export.title": "Export Data",
    "export.body": "This will download a complete backup of all your tasks, projects, and settings as a JSON file. Are you sure you want to export your data?",
    "export.confirm": "Export",
    "confirm.deleteTask.title": "Delete Task",
    "confirm.deleteTask.body": "This action cannot be undone. To confirm deletion, type delete below:",
    "confirm.deleteTask.inputPlaceholder": "Type delete here",
    "confirm.deleteTask.error": 'Type "delete" exactly to confirm',
    "confirm.unsaved.title": "Unsaved Changes",
    "confirm.unsaved.body": "You have unsaved changes. Are you sure you want to close and lose them?",
    "confirm.unsaved.discard": "Discard Changes",
    "confirm.review.title": 'Disable "In Review" Status',
    "error.saveDataFailed": "Failed to save data. Please try again.",
    "error.saveProjectsFailed": "Failed to save projects. Please try again.",
    "error.saveTasksFailed": "Failed to save tasks. Please try again.",
    "error.saveFeedbackFailed": "Failed to save feedback. Please try again.",
    "error.saveProjectColorsFailed": "Failed to save project colors.",
    "error.saveTaskFailed": "Failed to save task. Please try again.",
    "error.saveChangesFailed": "Failed to save changes. Please try again.",
    "error.saveTaskPositionFailed": "Failed to save task position. Please try again.",
    "error.saveProjectFailed": "Failed to save project. Please try again.",
    "error.notLoggedInResetPin": "You must be logged in to reset your PIN",
    "error.resetPinFailed": "Failed to reset PIN",
    "success.resetPin": "PIN reset successfully! You will need to re-login with your new PIN.",
    "error.resetPinError": "An error occurred while resetting your PIN",
    "error.userNameEmpty": "User name cannot be empty.",
    "error.saveDisplayNameFailed": "Could not save display name. Please try again.",
    "error.invalidEmail": "Please enter a valid email address.",
    "error.saveEmailFailed": "Could not save email. Please try again.",
    "error.saveAvatarFailed": "Could not save avatar. Please try again.",
    "success.settingsSaved": "Settings saved successfully!",
    "error.logoSelectFile": "Please select an image file for the workspace logo.",
    "error.logoTooLarge": "Please use an image smaller than 2MB for the workspace logo.",
    "error.imageReadFailed": "Could not read the selected image.",
    "error.imageLoadFailed": "Could not load the selected image.",
    "error.logoUploadFailed": "Error uploading logo: {message}",
    "error.cropInvalid": "Error: Crop state is invalid.",
    "error.cropTooLarge": "Cropped image is too large. Please select a smaller area or use a smaller source image.",
    "success.cropApplied": "Image cropped and applied successfully!",
    "success.logoCroppedApplied": "Workspace logo cropped and applied successfully!",
    "error.cropFailed": "Error cropping image: {message}",
    "error.avatarSelectFile": "Please select an image file for your avatar.",
    "error.avatarTooLarge": "Please use an image smaller than 2MB for your avatar.",
    "error.avatarUploadFailed": "Failed to upload avatar. Please try again.",
    "error.endDateBeforeStart": "End date cannot be before start date",
    "error.startDateAfterEnd": "Start date cannot be after end date",
    "error.feedbackAttachImage": "Please attach an image file.",
    "error.feedbackReadImage": "Could not read the image file. Please try again.",
    "error.feedbackStatusFailed": "Failed to update feedback status. Please try again.",
    "error.attachmentSaveFailed": "Failed to save attachment. Please try again.",
    "error.attachmentLoadFailed": "Failed to load image: {message}",
    "success.fileDownloaded": "File downloaded!",
    "error.fileDownloadFailed": "Failed to download file: {message}",
    "success.attachmentDeletedFromStorage": "{name} deleted from storage",
    "error.fileDeleteFailed": "Failed to delete file from storage",
    "success.attachmentRemoved": "Attachment removed",
    "error.fileSizeTooLarge": "File size must be less than {maxMB}MB. Please choose a smaller file.",
    "success.fileUploaded": "File uploaded successfully!",
    "error.fileUploadFailed": "Error uploading file: {message}",
    "error.selectFile": "Please select a file",
    "error.saveTagFailed": "Failed to save tag. Please try again.",
    "error.removeTagFailed": "Failed to remove tag. Please try again.",
    "error.openScreenshotFailed": "Could not open screenshot",
    "history.sort.newest": "\u2191 Newest First",
    "history.sort.oldest": "\u2193 Oldest First",
    "history.field.title": "Title",
    "history.field.name": "Name",
    "history.field.description": "Description",
    "history.field.status": "Status",
    "history.field.priority": "Priority",
    "history.field.category": "Category",
    "history.field.startDate": "Start Date",
    "history.field.endDate": "End Date",
    "history.field.link": "Link",
    "history.field.task": "Link",
    "history.field.projectId": "Project",
    "history.field.tags": "Tags",
    "history.field.attachments": "Attachments",
    "history.action.created": "Created",
    "history.action.deleted": "Deleted",
    "history.link.added": "Added",
    "history.link.removed": "Removed",
    "history.entity.task": "task",
    "history.value.empty": "empty",
    "history.value.none": "none",
    "history.change.beforeLabel": "Before:",
    "history.change.afterLabel": "After:",
    "history.change.notSet": "Not set",
    "history.change.removed": "Removed",
    "history.tags.none": "No tags",
    "history.attachments.none": "No attachments",
    "history.attachments.countSingle": "{count} file",
    "history.attachments.countPlural": "{count} files",
    "history.project.fallback": "Project #{id}",
    "history.change.arrow": "\u2192",
    "menu.openMenu": "Open menu",
    "menu.language": "Language",
    "menu.darkMode": "Dark mode",
    "menu.lightMode": "Light mode",
    "menu.settings": "Settings",
    "menu.help": "Help",
    "menu.signOut": "Sign out",
    "nav.overview": "Overview",
    "nav.dashboard": "Dashboard",
    "nav.updates": "Release notes",
    "nav.calendar": "Calendar",
    "nav.work": "Work",
    "nav.projects": "Projects",
    "nav.allTasks": "All Tasks",
    "nav.feedback": "Feedback",
    "updates.title": "Release notes",
    "updates.subtitle": "Latest change log for Nautilus",
    "updates.latestLabel": "Latest release",
    "updates.historyLabel": "Release log",
    "updates.sections.new": "New",
    "updates.sections.improvements": "Improvements",
    "updates.sections.fixes": "Fixes",
    "updates.empty": "No release notes yet.",
    "updates.sectionEmpty": "Nothing listed yet.",
    "updates.historyEmpty": "No previous releases yet.",
    "notifications.title": "Notifications",
    "notifications.toggle": "Notifications",
    "notifications.today": "Today",
    "notifications.yesterday": "Yesterday",
    "notifications.clearAll": "Clear all",
    "notifications.releaseTitle": "New release",
    "notifications.releaseCta": "View updates",
    "notifications.releaseMeta": "Released {date}",
    "notifications.dueTodayTitle": "Due today",
    "notifications.dueTodayCta": "View tasks",
    "notifications.dueTodayMetaOne": "{count} task due today",
    "notifications.dueTodayMetaMany": "{count} tasks due today",
    "notifications.dueTodayMore": "and {count} more tasks",
    "notifications.empty": "You are all caught up.",
    "settings.title": "Settings",
    "settings.subtitle": "Manage your preferences and application settings",
    "settings.section.profile": "Profile",
    "settings.displayName": "Display Name",
    "settings.displayNameHint": "This name is displayed throughout the application",
    "settings.placeholder.displayName": "Enter your display name",
    "settings.email": "Email",
    "settings.emailHint": "Used for your account and deadline notifications",
    "settings.placeholder.email": "Enter your email",
    "settings.avatar": "Avatar",
    "settings.avatarHint": "Upload an image for your avatar (max 2MB). It will be displayed as a circle.",
    "settings.avatarRemoveTitle": "Remove avatar",
    "settings.workspaceLogo": "Workspace Logo",
    "settings.workspaceLogoHint": "Upload a square image to replace the Nautilus logo (max 2MB).",
    "settings.workspaceLogoRemoveTitle": "Remove custom logo",
    "settings.section.application": "Application",
    "settings.enableReviewStatus": "Enable In Review status",
    "settings.enableReviewStatusHint": "Show or hide the IN REVIEW status column and filter option",
    "settings.enableReviewStatusHintPrefix": "Show or hide the",
    "settings.enableReviewStatusHintSuffix": "status column and filter option",
    "settings.calendarIncludeBacklog": "Show backlog in calendar",
    "settings.calendarIncludeBacklogHint": "Display backlog tasks in all calendar views",
    "settings.autoStartDate": "Auto-set start date",
    "settings.autoStartDateHint": 'Automatically set Start Date when task status changes to "In Progress" (if empty)',
    "settings.autoEndDate": "Auto-set end date",
    "settings.autoEndDateHint": 'Automatically set End Date when task status changes to "Done" (if empty)',
    "settings.debugLogs": "Enable debug logs",
    "settings.debugLogsHint": "Capture diagnostic logs in the browser console when enabled",
    "settings.historySortOrder": "History Sort Order",
    "settings.historySortOrderHint": "Default sort order for task and project history timelines",
    "settings.historySortNewest": "Newest First",
    "settings.historySortOldest": "Oldest First",
    "settings.language": "Language",
    "settings.languageHint": "Choose the application language",
    "settings.section.notifications": "Notifications",
    "settings.emailNotifications": "Email notifications",
    "settings.emailNotificationsHint": "Enable or disable deadline reminder emails",
    "settings.weekdaysOnly": "Weekdays only",
    "settings.weekdaysOnlyHint": "Skip emails on Saturday and Sunday",
    "settings.includeStartDates": "Notify when tasks start",
    "settings.includeStartDatesHint": "Send reminders when a task starts (e.g., today)",
    "settings.includeBacklog": "Include backlog tasks",
    "settings.includeBacklogHint": "Include backlog tasks in email and in-app notifications",
    "settings.sendTime": "Send time",
    "settings.sendTimeHint": "Daily time to send reminders (08:00-18:00, 30-minute increments)",
    "settings.timeZone": "Time zone",
    "settings.timeZoneHint": "Keeps the same local time year-round (DST-aware)",
    "settings.timeZone.option.argentina": "Argentina (Buenos Aires)",
    "settings.timeZone.option.canary": "Canary Islands (Atlantic/Canary)",
    "settings.timeZone.option.spain": "Spain mainland (Europe/Madrid)",
    "settings.timeZone.option.utc": "UTC",
    "settings.section.security": "Security",
    "settings.pinManagement": "PIN Management",
    "settings.pinManagementHint": "Reset your PIN to a new 4-digit code",
    "settings.resetPinButton": "Reset PIN",
    "settings.section.dataManagement": "Data Management",
    "settings.exportData": "Export Data",
    "settings.exportDataHint": "Download a complete backup of all your tasks, projects, and settings as a JSON file",
    "settings.exportButton": "Export",
    "settings.cancelButton": "Cancel",
    "settings.saveButton": "Save Settings",
    "settings.avatarUploadDefault": "Drag & drop or click to upload avatar",
    "settings.avatarUploadChange": "Change avatar",
    "settings.avatarUploadAriaUpload": "Upload avatar",
    "settings.avatarUploadAriaChange": "Change avatar",
    "settings.logoUploadDefault": "Drag & drop or click to upload logo",
    "settings.logoUploadChange": "Change logo",
    "settings.logoUploadAriaUpload": "Upload logo",
    "settings.logoUploadAriaChange": "Change logo",
    "dashboard.title": "Dashboard",
    "dashboard.hero.activeProjectsLabel": "Active Projects",
    "dashboard.hero.completionRateLabel": "Completion Rate",
    "dashboard.hero.projectsTrend": "\u{1F4C8} +2 this month",
    "dashboard.hero.completionTrend": "\u{1F3AF} Target: 80%",
    "dashboard.projectAnalytics": "\u{1F4CA} Project Analytics",
    "dashboard.period.week": "Week",
    "dashboard.period.month": "Month",
    "dashboard.period.quarter": "Quarter",
    "dashboard.stat.pendingTasks": "Pending Tasks",
    "dashboard.stat.inProgress": "In Progress",
    "dashboard.stat.highPriority": "High Priority",
    "dashboard.stat.overdue": "Overdue",
    "dashboard.stat.completed": "Completed",
    "dashboard.stat.projects": "Projects",
    "dashboard.highPriorityHint": "High priority tasks due within 7 days (or overdue)",
    "dashboard.projectProgress": "\u{1F30A} Project Progress",
    "dashboard.legend.todo": "To Do",
    "dashboard.legend.progress": "In Progress",
    "dashboard.legend.review": "In Review",
    "dashboard.legend.complete": "Complete",
    "dashboard.viewAll": "View All",
    "dashboard.quickActions": "\u26A1 Quick Actions",
    "dashboard.action.generateReport": "Generate Report",
    "dashboard.action.addTask": "Add Task",
    "dashboard.action.viewCalendar": "View Calendar",
    "dashboard.action.newProject": "New Project",
    "dashboard.recentActivity": "\u{1F504} Recent Activity",
    "dashboard.researchInsights": "\u{1F9E0} Insights",
    "dashboard.activity.emptyTitle": "Welcome to your Dashboard!",
    "dashboard.activity.emptySubtitle": "Start creating projects and tasks to see activity",
    "dashboard.activity.completed": 'Completed "{title}" {projectPart}',
    "dashboard.activity.createdProject": 'Created new project "{project}"',
    "dashboard.activity.addedTask": 'Added new task "{title}" {projectPart}',
    "dashboard.activity.inProject": "in {project}",
    "dashboard.activity.toProject": "to {project}",
    "dashboard.activity.recently": "Recently",
    "dashboard.activity.justNow": "Just now",
    "dashboard.activity.today": "Today",
    "dashboard.activity.yesterday": "Yesterday",
    "dashboard.activity.daysAgoShort": "{count}d ago",
    "dashboard.activity.minuteAgo": "{count} minute ago",
    "dashboard.activity.minutesAgo": "{count} minutes ago",
    "dashboard.activity.hourAgo": "{count} hour ago",
    "dashboard.activity.hoursAgo": "{count} hours ago",
    "dashboard.activity.dayAgo": "{count} day ago",
    "dashboard.activity.daysAgo": "{count} days ago",
    "dashboard.trend.thisWeek": "this week",
    "dashboard.trend.thisMonth": "this month",
    "dashboard.trend.thisQuarter": "this quarter",
    "dashboard.trend.dueTodayOne": "{count} due today",
    "dashboard.trend.dueTodayMany": "{count} due today",
    "dashboard.trend.onTrack": "On track",
    "dashboard.trend.needsAttention": "Needs attention",
    "dashboard.trend.allOnTrack": "All on track",
    "dashboard.trend.criticalOne": "{count} critical",
    "dashboard.trend.criticalMany": "{count} critical",
    "dashboard.trend.completedOne": "{count} completed",
    "dashboard.trend.completedMany": "{count} completed",
    "dashboard.trend.inProgress": "In progress",
    "dashboard.emptyProjects.title": "No projects yet",
    "dashboard.emptyProjects.subtitle": "Create your first project to see progress visualization",
    "dashboard.tasks": "tasks",
    "dashboard.activity.allTitle": "All Recent Activity",
    "dashboard.activity.allSubtitle": "Full history of your recent work",
    "dashboard.activity.backToDashboard": "\u2190 Back to Dashboard",
    "dashboard.insights.excellentTitle": "Excellent Progress",
    "dashboard.insights.excellentDesc": "{percent}% completion rate exceeds target. Great momentum!",
    "dashboard.insights.goodTitle": "Good Progress",
    "dashboard.insights.goodDesc": "{percent}% completion rate is solid. Consider pushing to reach 80% target.",
    "dashboard.insights.opportunityTitle": "Progress Opportunity",
    "dashboard.insights.opportunityDesc": "{percent}% completion rate. Focus on completing current tasks to build momentum.",
    "dashboard.insights.actionTitle": "Action Needed",
    "dashboard.insights.actionDesc": "{percent}% completion rate is low. Break down large tasks and tackle smaller ones first.",
    "dashboard.insights.todayTitle": "Today's Focus",
    "dashboard.insights.todayDescOne": "{count} task is due today. Prioritize it for maximum impact.",
    "dashboard.insights.todayDescMany": "{count} tasks are due today. Prioritize them for maximum impact.",
    "dashboard.insights.overdueTitle": "Overdue Items",
    "dashboard.insights.overdueDescOne": "{count} overdue task needs attention. Address it to prevent delays.",
    "dashboard.insights.overdueDescMany": "{count} overdue tasks need attention. Address these to prevent delays.",
    "dashboard.insights.highPriorityTitle": "High Priority Focus",
    "dashboard.insights.highPriorityDescOne": "{count} high-priority task needs immediate attention.",
    "dashboard.insights.highPriorityDescMany": "{count} high-priority tasks need immediate attention.",
    "dashboard.insights.emptyProjectsTitle": "Empty Projects",
    "dashboard.insights.emptyProjectsDescOne": "{count} project has no tasks yet. Add tasks to track progress.",
    "dashboard.insights.emptyProjectsDescMany": "{count} projects have no tasks yet. Add tasks to track progress.",
    "dashboard.insights.momentumTitle": "Strong Momentum",
    "dashboard.insights.momentumDescOne": "{count} task completed this week. You're in a productive flow!",
    "dashboard.insights.momentumDescMany": "{count} tasks completed this week. You're in a productive flow!",
    "dashboard.insights.readyTitle": "Ready to Start",
    "dashboard.insights.readyDesc": "Create your first project and add some tasks to begin tracking your progress.",
    "dashboard.insights.caughtUpTitle": "All Caught Up",
    "dashboard.insights.caughtUpDesc": "Great work! No urgent items detected. Consider planning your next milestones."
  },
  es: {
    "boot.loading": "Cargando Nautilus",
    "lock.welcome": "Bienvenido de nuevo",
    "lock.subtitle": "Ingresa la contrase\xF1a de acceso para continuar.",
    "lock.sessionHint": "? La sesi\xF3n permanece iniciada por 24 horas.",
    "lock.passwordLabel": "Contrase\xF1a",
    "lock.passwordPlaceholder": "Ingresa la contrase\xF1a",
    "lock.unlock": "Desbloquear",
    "auth.backToUserLogin": "Volver al inicio de sesi\xF3n",
    "auth.login.title": "Bienvenido a Nautilus",
    "auth.login.subtitle": "Inicia sesi\xF3n para acceder a tu espacio",
    "auth.login.identifierLabel": "Usuario o correo",
    "auth.login.identifierPlaceholder": "Ingresa usuario o correo",
    "auth.login.pinLabel": "PIN (4 d\xEDgitos)",
    "auth.admin.title": "Acceso de administraci\xF3n",
    "auth.admin.subtitle": "Ingresa el PIN maestro para acceder al panel de administraci\xF3n",
    "auth.admin.pinLabel": "PIN maestro (4 d\xEDgitos)",
    "auth.setup.title": "Completa tu configuraci\xF3n",
    "auth.setup.subtitle": "Personaliza tu cuenta",
    "auth.setup.usernameLabel": "Usuario",
    "auth.setup.usernamePlaceholder": "p. ej., alex",
    "auth.setup.usernameHint": "3-20 caracteres, solo letras min\xFAsculas y n\xFAmeros",
    "auth.setup.displayNameLabel": "Nombre visible",
    "auth.setup.displayNamePlaceholder": "p. ej., Alex Morgan",
    "auth.setup.emailLabel": "Correo electr\xF3nico",
    "auth.setup.emailPlaceholder": "tu.correo@ejemplo.com",
    "auth.setup.emailHint": "Necesario para notificaciones",
    "auth.setup.newPinLabel": "Nuevo PIN (4 d\xEDgitos)",
    "auth.setup.confirmPinLabel": "Confirmar PIN",
    "auth.setup.next": "Siguiente",
    "auth.setup.submit": "Completar configuraci\xF3n",
    "admin.title": "Gesti\xF3n de usuarios",
    "admin.signOut": "Cerrar sesi\xF3n",
    "admin.usersTitle": "Usuarios",
    "admin.createUserTitle": "Crear nuevo usuario",
    "admin.usernameLabel": "Usuario",
    "admin.usernamePlaceholder": "p. ej., jdoe",
    "admin.usernameHint": "3-20 caracteres, solo letras min\xFAsculas y n\xFAmeros",
    "admin.displayNameLabel": "Nombre visible",
    "admin.displayNamePlaceholder": "p. ej., John Doe",
    "admin.tempPinLabel": "PIN temporal (4 d\xEDgitos)",
    "admin.createUserButton": "Crear usuario",
    "auth.admin.resetPinPrompt": "Ingresa un nuevo PIN temporal para {userName}:",
    "auth.admin.pinMustBe4Digits": "El PIN debe tener exactamente 4 d\xEDgitos",
    "auth.admin.resetPinFailed": "No se pudo restablecer el PIN",
    "auth.admin.resetPinSuccess": "PIN restablecido para {userName}. Nuevo PIN temporal: {pin}",
    "auth.admin.deleteUserConfirm": '\xBFSeguro que deseas eliminar al usuario "{userName}"? Esto tambi\xE9n eliminar\xE1 todas sus tareas y proyectos.',
    "auth.admin.deleteUserFailed": "No se pudo eliminar el usuario",
    "auth.admin.deleteUserSuccess": 'Usuario "{userName}" eliminado correctamente',
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.continue": "Continuar",
    "common.gotIt": "Entendido",
    "common.close": "Cerrar modal",
    "common.done": "Listo",
    "common.nautilusLogoAlt": "Logo de Nautilus",
    "common.devBanner": "\u26A0\uFE0F DESARROLLO LOCAL - NO PRODUCCI\xD3N \u26A0\uFE0F",
    "common.datePlaceholder": "dd/mm/yyyy",
    "crop.title": "Recortar imagen a cuadrado",
    "crop.instructions": "Arrastra para ajustar el \xE1rea de recorte. La imagen se recortar\xE1 a un cuadrado.",
    "crop.apply": "Recortar y aplicar",
    "crop.close": "Cerrar recorte",
    "dashboard.insights.productivityTitle": "Tendencia de productividad",
    "dashboard.insights.productivityDesc": "La tasa de finalizaci\xF3n de tareas aument\xF3 un 23% respecto al mes pasado",
    "dashboard.insights.deadlineTitle": "Alerta de plazos",
    "dashboard.insights.deadlineDesc": "3 hitos vencen en los pr\xF3ximos 7 d\xEDas",
    "projects.title": "Proyectos",
    "projects.subtitle": "Gestiona tus proyectos",
    "projects.searchPlaceholder": "\u{1F50D} Buscar proyectos (t\xEDtulo o descripci\xF3n)",
    "projects.filters.status": "Estado",
    "projects.filters.statusTitle": "Estado del proyecto",
    "projects.status.backlog": "BACKLOG",
    "projects.status.planning": "PLANIFICACI\xD3N",
    "projects.status.active": "ACTIVO",
    "projects.status.completed": "COMPLETADO",
    "projects.filters.updated": "Actualizado",
    "projects.filters.updatedTitle": "Actualizados recientemente",
    "projects.filters.all": "Todos",
    "projects.filters.last5m": "\xDAltimos 5 minutos",
    "projects.filters.last30m": "\xDAltimos 30 minutos",
    "projects.filters.last24h": "\xDAltimas 24 horas",
    "projects.filters.lastWeek": "\xDAltima semana",
    "projects.filters.lastMonth": "\xDAltimo mes",
    "projects.filters.hasTasks": "Con tareas",
    "projects.filters.noTasks": "Sin tareas",
    "projects.filters.tags": "Etiquetas",
    "projects.filters.tagsTitle": "Etiquetas de proyectos",
    "projects.filters.clear": "Limpiar filtros",
    "projects.noDescription": "Sin descripcion",
    "projects.tasksBreakdown": "{total} tareas \xB7 {done} hechas",
    "tasks.card.description": "Descripcion",
    "projects.card.tasksCount": "{count} tareas",
    "projects.card.percentDone": "{count}% hecho",
    "projects.sort.label": "Ordenar: Estado",
    "projects.sort.status": "Estado",
    "projects.sort.name": "Nombre",
    "projects.sort.newest": "M\xE1s reciente",
    "projects.sort.lastUpdated": "\xDAltima actualizaci\xF3n",
    "projects.sort.mostTasks": "M\xE1s tareas",
    "projects.sort.percentCompleted": "% completado",
    "projects.sort.prefix": "Ordenar: {label}",
    "projects.sort.help": "Repite la misma opci\xF3n para alternar Asc/Desc.",
    "projects.sort.statusLabel": "Estado",
    "projects.sort.nameLabel": "Nombre",
    "projects.sort.newestLabel": "M\xE1s reciente",
    "projects.sort.lastUpdatedLabel": "\xDAltima actualizaci\xF3n",
    "projects.sort.mostTasksLabel": "M\xE1s tareas",
    "projects.sort.percentCompletedLabel": "% completado",
    "projects.newProjectButton": "+ Nuevo proyecto",
    "projects.openDetailsTitle": "Ver detalles del proyecto",
    "projects.empty.title": "A\xFAn no hay proyectos",
    "projects.empty.subtitle": "Crea tu primer proyecto",
    "projects.empty.searchTitle": "No se encontraron proyectos",
    "projects.empty.searchSubtitle": "Crea un nuevo proyecto para empezar",
    "projects.empty.filteredTitle": "No hubo coincidencias de proyectos",
    "projects.modal.createTitle": "Crear nuevo proyecto",
    "projects.modal.nameLabel": "Nombre del proyecto",
    "projects.modal.descriptionLabel": "Descripci\xF3n",
    "projects.modal.startDateLabel": "Fecha de inicio",
    "projects.modal.endDateLabel": "Fecha de fin",
    "projects.modal.tagsLabel": "Etiquetas",
    "projects.modal.addTagPlaceholder": "A\xF1adir etiqueta",
    "projects.modal.createButton": "Crear proyecto",
    "projects.delete.title": "Eliminar proyecto",
    "projects.delete.body": "Esta acci\xF3n no se puede deshacer. Para confirmar, escribe delete abajo:",
    "projects.delete.deleteTasksLabel": "Eliminar todas las tareas de este proyecto",
    "projects.delete.deleteTasksHint": "Si no se marca, las tareas se desasignar\xE1n del proyecto",
    "projects.delete.inputPlaceholder": "Escribe delete aqu\xED",
    "projects.delete.error": 'Escribe "delete" exactamente para confirmar',
    "projects.duplicate.title": "Duplicar proyecto",
    "projects.duplicate.description": "Crear una copia de este proyecto con toda su configuraci\xF3n.",
    "projects.duplicate.includeTasksLabel": "Incluir todas las tareas de este proyecto",
    "projects.duplicate.taskNamingTitle": "Nomenclatura de tareas:",
    "projects.duplicate.namingNone": "Mantener nombres originales",
    "projects.duplicate.namingPrefix": "Agregar prefijo:",
    "projects.duplicate.namingSuffix": "Agregar sufijo:",
    "projects.duplicate.prefixPlaceholder": "ej., Copia - ",
    "projects.duplicate.suffixPlaceholder": "ej., (Copia)",
    "projects.duplicate.confirm": "Duplicar proyecto",
    "projects.duplicate.success": 'Proyecto "{name}" duplicado exitosamente',
    "projects.duplicate.successWithTasks": 'Proyecto "{name}" y sus tareas duplicados exitosamente',
    "projects.statusInfo.title": "L\xF3gica del estado del proyecto",
    "projects.statusInfo.subtitle": "El estado del proyecto se actualiza autom\xE1ticamente seg\xFAn el progreso de las tareas",
    "projects.statusInfo.backlogTitle": "\u2B1B Backlog",
    "projects.statusInfo.backlogDesc": 'Todas las tareas est\xE1n en "Backlog"',
    "projects.statusInfo.planningTitle": "\u2B1C Planificaci\xF3n",
    "projects.statusInfo.planningDesc": 'Todas las tareas est\xE1n en "Por hacer"',
    "projects.statusInfo.activeTitle": "\u2705 Activo",
    "projects.statusInfo.activeDesc": 'Al menos una tarea est\xE1 en "En progreso" o "En revisi\xF3n"',
    "projects.statusInfo.completedTitle": "? Completado",
    "projects.statusInfo.completedDesc": 'Todas las tareas est\xE1n marcadas como "Hecho"',
    "projects.backTo.dashboard": "\u2190 Volver al panel",
    "projects.backTo.calendar": "\u2190 Volver al calendario",
    "projects.backTo.projects": "\u2190 Volver a proyectos",
    "projects.details.tab.details": "Detalles",
    "projects.details.tab.history": "Historial",
    "projects.details.startDate": "Fecha de inicio",
    "projects.details.endDate": "Fecha de fin",
    "projects.details.duration": "Duraci\xF3n",
    "projects.details.durationDays": "{count} d\xEDas",
    "projects.details.created": "Creado",
    "projects.details.calendarColor": "Color del calendario",
    "projects.details.customColor": "Color personalizado",
    "projects.details.progressOverview": "Resumen de progreso",
    "projects.details.taskProgress": "Progreso de tareas",
    "projects.details.tasksTitle": "Tareas ({count})",
    "projects.details.changeHistory": "Historial de cambios",
    "projects.details.noChanges": "A\xFAn no hay cambios para este proyecto",
    "projects.details.noTasksFound": "No se encontraron tareas",
    "projects.details.viewTodo": "Ver tareas Por hacer de este proyecto",
    "projects.details.viewProgress": "Ver tareas En progreso de este proyecto",
    "projects.details.viewReview": "Ver tareas En revisi\xF3n de este proyecto",
    "projects.details.viewCompleted": "Ver tareas Completadas de este proyecto",
    "projects.details.viewBacklog": "Ver tareas de backlog en vista de lista",
    "projects.untitled": "Proyecto sin t\xEDtulo",
    "tasks.title": "Todas las tareas",
    "tasks.subtitle": "Gestiona tareas de todos los proyectos",
    "tasks.searchPlaceholder": "\u{1F50D} Buscar tareas (t\xEDtulo o descripci\xF3n)",
    "tasks.filters.status": "Estado",
    "tasks.filters.statusTitle": "Estado",
    "tasks.status.backlog": "Backlog",
    "tasks.status.todo": "Por hacer",
    "tasks.status.progress": "En progreso",
    "tasks.status.review": "En revisi\xF3n",
    "tasks.status.done": "Hecho",
    "tasks.filters.tags": "Etiquetas",
    "tasks.filters.tagsTitle": "Etiquetas",
    "tasks.filters.priority": "Prioridad",
    "tasks.filters.priorityTitle": "Prioridad",
    "tasks.priority.high": "Alta",
    "tasks.priority.medium": "Media",
    "tasks.priority.low": "Baja",
    "tasks.filters.project": "Proyecto",
    "tasks.filters.projectTitle": "Proyecto",
    "tasks.filters.selectAll": "Seleccionar / deseleccionar todo",
    "tasks.filters.date": "Fecha",
    "tasks.filters.endDate": "Fecha de Fin",
    "tasks.filters.startDate": "Fecha de Inicio",
    "tasks.filters.dateTitle": "Filtros r\xE1pidos por fecha",
    "tasks.filters.endDateTitle": "Filtros de Fecha de Fin",
    "tasks.filters.noDate": "Sin fecha de fin",
    "tasks.filters.overdue": "Vencidas",
    "tasks.filters.endToday": "Fecha de fin hoy",
    "tasks.filters.endTomorrow": "Fecha de fin ma\xF1ana",
    "tasks.filters.end7Days": "Fecha de fin en 7 d\xEDas",
    "tasks.filters.endThisWeek": "Fecha de fin esta semana",
    "tasks.filters.endThisMonth": "Fecha de fin este mes",
    "tasks.filters.startDateTitle": "Filtros de Fecha de Inicio",
    "tasks.filters.noStartDate": "Sin fecha de inicio",
    "tasks.filters.alreadyStarted": "Ya comenz\xF3",
    "tasks.filters.startToday": "Fecha de inicio hoy",
    "tasks.filters.startTomorrow": "Fecha de inicio ma\xF1ana",
    "tasks.filters.start7Days": "Fecha de inicio en 7 d\xEDas",
    "tasks.filters.startThisWeek": "Fecha de inicio esta semana",
    "tasks.filters.startThisMonth": "Fecha de inicio este mes",
    "tasks.filters.updated": "Actualizado",
    "tasks.filters.updatedTitle": "Actualizados recientemente",
    "tasks.filters.dateFrom": "Fecha de inicio",
    "tasks.filters.dateTo": "Fecha de fin",
    "tasks.filters.clear": "Limpiar filtros",
    "filters.noOtherProjects": "No hay otros proyectos",
    "filters.noTags": "Sin etiquetas",
    "filters.noOtherTags": "No hay otras etiquetas",
    "filters.sheet.title": "Opciones",
    "filters.chip.search": "B\xFAsqueda",
    "filters.chip.project": "Proyecto",
    "filters.chip.tag": "Etiqueta",
    "filters.chip.date": "Fecha",
    "filters.chip.updated": "Actualizado",
    "filters.chip.removeAria": "Quitar filtro {label}",
    "filters.dateRange.from": "Desde",
    "filters.dateRange.until": "Hasta",
    "filters.updated.week": "Semana",
    "filters.updated.month": "Mes",
    "tasks.kanban.tipLabel": "Consejo:",
    "tasks.kanban.tipTextBefore": "En el tablero Kanban manten ",
    "tasks.kanban.tipTextAfter": " (Cmd en Mac) y haz clic para seleccionar varias tareas. Shift + clic selecciona un rango, luego arrastra para moverlas juntas",
    "tasks.view.kanban": "Kanban",
    "tasks.view.list": "Lista",
    "tasks.view.calendar": "Calendario",
    "tasks.sort.label": "Ordenar: Prioridad",
    "tasks.sort.orderByPriority": "Ordenar por prioridad",
    "tasks.kanban.showBacklog": "Mostrar backlog",
    "tasks.kanban.showProjects": "Mostrar proyectos",
    "tasks.kanban.showNoDate": 'Mostrar "Sin fecha"',
    "tasks.addButton": "+ A\xF1adir tarea",
    "tasks.noProject": "Sin proyecto",
    "tasks.projectIndicatorNone": "Sin proyecto - ",
    "tasks.project.selectPlaceholder": "Selecciona un proyecto",
    "tasks.tags.none": "Sin etiquetas",
    "tasks.checklist.toggle": "Alternar casilla",
    "tasks.untitled": "Tarea sin t\xEDtulo",
    "tasks.startDatePrefix": "Fecha de inicio: ",
    "tasks.endDatePrefix": "Fecha de fin: ",
    "tasks.noDate": "Sin fecha",
    "tasks.noDatesSet": "Sin fechas",
    "tasks.noEndDate": "Sin fecha de fin",
    "tasks.due.yesterday": "Ayer",
    "tasks.due.daysOverdue": "{count} d\xEDas de atraso",
    "tasks.due.tomorrow": "Ma\xF1ana",
    "tasks.openTaskDetails": "Abrir detalles de la tarea",
    "tasks.noTasksInProject": "No hay tareas en este proyecto",
    "tasks.attachments.open": "Abrir",
    "tasks.attachments.none": "Sin archivos adjuntos",
    "tasks.attachments.remove": "Quitar archivo adjunto",
    "tasks.attachments.removeTitle": "Quitar",
    "tasks.attachments.removeLink": "Quitar enlace",
    "tasks.attachments.googleDoc": "Documento de Google",
    "tasks.attachments.googleSheet": "Hoja de c\xE1lculo de Google",
    "tasks.attachments.googleSlides": "Presentaci\xF3n de Google",
    "tasks.attachments.googleDriveFile": "Archivo de Google Drive",
    "tasks.attachments.pdf": "Documento PDF",
    "tasks.attachments.word": "Documento de Word",
    "tasks.attachments.excel": "Archivo de Excel",
    "tasks.attachments.powerpoint": "PowerPoint",
    "tasks.empty.epic": "A\xFAn no hay tareas. Crea tu primera tarea para este \xE9pico.",
    "tasks.backlogQuickTitle": "Abrir tareas de backlog en vista de lista",
    "tasks.backlogQuickLabel": "Backlog",
    "tasks.kanban.columnBacklog": "\u{1F9CA} Backlog",
    "tasks.kanban.columnTodo": "\u{1F4CB} Por hacer",
    "tasks.kanban.columnProgress": "\u{1F504} En progreso",
    "tasks.kanban.columnReview": "\u2611\uFE0F En revisi\xF3n",
    "tasks.kanban.columnDone": "\u2705 Hecho",
    "tasks.table.task": "Tarea",
    "tasks.table.priority": "Prioridad",
    "tasks.table.status": "Estado",
    "tasks.table.tags": "Etiquetas",
    "tasks.table.project": "Proyecto",
    "tasks.table.startDate": "Fecha de inicio",
    "tasks.table.endDate": "Fecha de fin",
    "tasks.table.updated": "Actualizado",
    "tasks.list.count": "{count} resultados",
    "tasks.modal.editTitle": "Editar tarea",
    "tasks.modal.duplicate": "\u{1F4C4} Duplicar tarea",
    "tasks.modal.delete": "\u{1F5D1}\uFE0F Eliminar tarea",
    "tasks.modal.tab.general": "General",
    "tasks.modal.tab.details": "Detalles",
    "tasks.modal.tab.history": "Historial",
    "tasks.modal.titleLabel": "T\xEDtulo de la tarea",
    "tasks.modal.attachmentsLabel": "Adjuntos",
    "tasks.modal.attachmentsSupported": "Compatible: Im\xE1genes (10MB), PDF (20MB), Documentos (10MB)",
    "tasks.modal.attachmentsDropzoneDefault": "Arrastra y suelta o haz clic para adjuntar",
    "tasks.modal.attachmentsDropzoneTap": "Haz clic para adjuntar",
    "tasks.modal.linksLabel": "Enlaces",
    "tasks.modal.attachmentNamePlaceholder": "Nombre (opcional)",
    "tasks.modal.attachmentUrlPlaceholder": "URL",
    "tasks.modal.addLink": "Agregar enlace",
    "tasks.modal.statusLabel": "Estado",
    "tasks.modal.priorityLabel": "Prioridad",
    "tasks.modal.tagsLabel": "Etiquetas",
    "tasks.modal.addTagPlaceholder": "A\xF1adir etiqueta",
    "tasks.modal.projectLabel": "Proyecto",
    "tasks.modal.projectOpenTitle": "Abrir detalles del proyecto",
    "tasks.modal.projectSelect": "Selecciona un proyecto",
    "tasks.modal.submitCreate": "Crear tarea",
    "tasks.modal.listBulleted": "\u2022 Lista",
    "tasks.modal.listNumbered": "1. Lista",
    "tasks.modal.insertDivider": "Insertar separador horizontal",
    "tasks.modal.insertCheckbox": "Insertar casilla",
    "tasks.history.emptyTitle": "A\xFAn no hay cambios",
    "tasks.history.emptySubtitle": "Los cambios en esta tarea aparecer\xE1n aqu\xED",
    "calendar.title": "Calendario",
    "calendar.today": "Hoy",
    "calendar.prevMonth": "Mes anterior",
    "calendar.nextMonth": "Mes siguiente",
    "calendar.dayItemsTitle": "Elementos para {date}",
    "calendar.dayItemsProjects": "Proyectos",
    "calendar.dayItemsTasks": "Tareas",
    "calendar.dayItems.close": "Cerrar tareas del d\xEDa",
    "calendar.dayItems.addTask": "+ Agregar Tarea",
    "feedback.title": "Comentarios e incidencias",
    "feedback.subtitle": "Reporta errores y sugiere funciones",
    "feedback.saveStatus.saved": "Guardado",
    "feedback.saveStatus.saving": "Guardando...",
    "feedback.saveStatus.error": "No se pudo guardar",
    "feedback.saveStatus.offline": "Sin conexion",
    "feedback.type.bugLabel": "\u{1F41E} Error",
    "feedback.type.title": "Tipo de comentario",
    "feedback.type.bugOption": "\u{1F41E} Error",
    "feedback.type.improvementOption": "\u{1F4A1} Mejora",
    "feedback.descriptionPlaceholder": "Describe el problema o la idea. Puedes pegar una imagen directamente en este campo.",
    "feedback.descriptionPlaceholderShort": "Describe el problema o la idea.",
    "feedback.screenshotAttachTitle": "Adjuntar captura desde el dispositivo",
    "feedback.screenshotDropzoneTap": "\u{1F4F7} Adjuntar captura",
    "feedback.screenshotDropzoneDefault": "\u{1F4F7} Arrastra o haz clic para adjuntar",
    "feedback.screenshotPreviewTitle": "Captura adjunta",
    "feedback.screenshotPreviewSubtitle": "Se guardar\xE1 con este comentario",
    "feedback.screenshotRemove": "Eliminar",
    "feedback.screenshotPreviewAlt": "Vista previa de la captura",
    "feedback.viewScreenshotTitle": "Ver captura",
    "feedback.pagination.first": "Primera p\xE1gina",
    "feedback.pagination.prev": "P\xE1gina anterior",
    "feedback.pagination.next": "P\xE1gina siguiente",
    "feedback.pagination.last": "\xDAltima p\xE1gina",
    "feedback.pagination.showing": "Mostrando {start}-{end} de {total}",
    "feedback.pagination.pageOf": "P\xE1gina {current} de {total}",
    "feedback.addButton": "Agregar",
    "feedback.pendingTitle": "? Pendiente",
    "feedback.doneTitle": "? Hecho",
    "feedback.delete.title": "Eliminar comentario",
    "feedback.delete.body": "\xBFSeguro que deseas eliminar este comentario?",
    "feedback.empty.pending": "No hay feedback pendiente",
    "feedback.empty.done": "No hay feedback completado",
    "export.title": "Exportar datos",
    "export.body": "Esto descargar\xE1 una copia completa de todas tus tareas, proyectos y ajustes como un archivo JSON. \xBFSeguro que deseas exportar tus datos?",
    "export.confirm": "Exportar",
    "confirm.deleteTask.title": "Eliminar tarea",
    "confirm.deleteTask.body": "Esta acci\xF3n no se puede deshacer. Para confirmar, escribe delete abajo:",
    "confirm.deleteTask.inputPlaceholder": "Escribe delete aqu\xED",
    "confirm.deleteTask.error": 'Escribe "delete" exactamente para confirmar',
    "confirm.unsaved.title": "Cambios sin guardar",
    "confirm.unsaved.body": "Tienes cambios sin guardar. \xBFSeguro que quieres cerrar y perderlos?",
    "confirm.unsaved.discard": "Descartar cambios",
    "confirm.review.title": 'Desactivar estado "En revisi\xF3n"',
    "error.saveDataFailed": "No se pudieron guardar los datos. Int\xE9ntalo de nuevo.",
    "error.saveProjectsFailed": "No se pudieron guardar los proyectos. Int\xE9ntalo de nuevo.",
    "error.saveTasksFailed": "No se pudieron guardar las tareas. Int\xE9ntalo de nuevo.",
    "error.saveFeedbackFailed": "No se pudo guardar el feedback. Int\xE9ntalo de nuevo.",
    "error.saveProjectColorsFailed": "No se pudieron guardar los colores del proyecto.",
    "error.saveTaskFailed": "No se pudo guardar la tarea. Int\xE9ntalo de nuevo.",
    "error.saveChangesFailed": "No se pudieron guardar los cambios. Int\xE9ntalo de nuevo.",
    "error.saveTaskPositionFailed": "No se pudo guardar la posici\xF3n de la tarea. Int\xE9ntalo de nuevo.",
    "error.saveProjectFailed": "No se pudo guardar el proyecto. Int\xE9ntalo de nuevo.",
    "error.notLoggedInResetPin": "Debes iniciar sesi\xF3n para restablecer tu PIN",
    "error.resetPinFailed": "No se pudo restablecer el PIN",
    "success.resetPin": "\xA1PIN restablecido con \xE9xito! Tendr\xE1s que iniciar sesi\xF3n de nuevo con tu nuevo PIN.",
    "error.resetPinError": "Ocurri\xF3 un error al restablecer el PIN",
    "error.userNameEmpty": "El nombre de usuario no puede estar vac\xEDo.",
    "error.saveDisplayNameFailed": "No se pudo guardar el nombre visible. Int\xE9ntalo de nuevo.",
    "error.invalidEmail": "Por favor, introduce un correo v\xE1lido.",
    "error.saveEmailFailed": "No se pudo guardar el correo. Int\xE9ntalo de nuevo.",
    "error.saveAvatarFailed": "No se pudo guardar el avatar. Int\xE9ntalo de nuevo.",
    "success.settingsSaved": "\xA1Ajustes guardados correctamente!",
    "error.logoSelectFile": "Selecciona un archivo de imagen para el logo del espacio de trabajo.",
    "error.logoTooLarge": "Usa una imagen menor de 2 MB para el logo del espacio de trabajo.",
    "error.imageReadFailed": "No se pudo leer la imagen seleccionada.",
    "error.imageLoadFailed": "No se pudo cargar la imagen seleccionada.",
    "error.logoUploadFailed": "Error al subir el logo: {message}",
    "error.cropInvalid": "Error: el estado del recorte no es v\xE1lido.",
    "error.cropTooLarge": "La imagen recortada es demasiado grande. Selecciona un \xE1rea m\xE1s peque\xF1a o usa una imagen m\xE1s peque\xF1a.",
    "success.cropApplied": "\xA1Imagen recortada y aplicada correctamente!",
    "success.logoCroppedApplied": "\xA1Logo del espacio de trabajo recortado y aplicado correctamente!",
    "error.cropFailed": "Error al recortar la imagen: {message}",
    "error.avatarSelectFile": "Selecciona un archivo de imagen para tu avatar.",
    "error.avatarTooLarge": "Usa una imagen menor de 2 MB para tu avatar.",
    "error.avatarUploadFailed": "No se pudo subir el avatar. Int\xE9ntalo de nuevo.",
    "error.endDateBeforeStart": "La fecha de fin no puede ser anterior a la fecha de inicio",
    "error.startDateAfterEnd": "La fecha de inicio no puede ser posterior a la fecha de fin",
    "error.feedbackAttachImage": "Adjunta un archivo de imagen.",
    "error.feedbackReadImage": "No se pudo leer la imagen. Int\xE9ntalo de nuevo.",
    "error.feedbackStatusFailed": "No se pudo actualizar el estado del feedback. Int\xE9ntalo de nuevo.",
    "error.attachmentSaveFailed": "No se pudo guardar el adjunto. Int\xE9ntalo de nuevo.",
    "error.attachmentLoadFailed": "No se pudo cargar la imagen: {message}",
    "success.fileDownloaded": "\xA1Archivo descargado!",
    "error.fileDownloadFailed": "No se pudo descargar el archivo: {message}",
    "success.attachmentDeletedFromStorage": "{name} eliminado del almacenamiento",
    "error.fileDeleteFailed": "No se pudo eliminar el archivo del almacenamiento",
    "success.attachmentRemoved": "Adjunto eliminado",
    "error.fileSizeTooLarge": "El tama\xF1o del archivo debe ser menor de {maxMB} MB. Elige uno m\xE1s peque\xF1o.",
    "success.fileUploaded": "\xA1Archivo subido correctamente!",
    "error.fileUploadFailed": "Error al subir el archivo: {message}",
    "error.selectFile": "Selecciona un archivo",
    "error.saveTagFailed": "No se pudo guardar la etiqueta. Int\xE9ntalo de nuevo.",
    "error.removeTagFailed": "No se pudo eliminar la etiqueta. Int\xE9ntalo de nuevo.",
    "error.openScreenshotFailed": "No se pudo abrir la captura",
    "history.sort.newest": "\u2191 M\xE1s recientes primero",
    "history.sort.oldest": "\u2193 M\xE1s antiguos primero",
    "history.field.title": "T\xEDtulo",
    "history.field.name": "Nombre",
    "history.field.description": "Descripci\xF3n",
    "history.field.status": "Estado",
    "history.field.priority": "Prioridad",
    "history.field.category": "Categor\xEDa",
    "history.field.startDate": "Fecha de inicio",
    "history.field.endDate": "Fecha de fin",
    "history.field.link": "Enlace",
    "history.field.task": "Enlace",
    "history.field.projectId": "Proyecto",
    "history.field.tags": "Etiquetas",
    "history.field.attachments": "Adjuntos",
    "history.action.created": "Creado",
    "history.action.deleted": "Eliminado",
    "history.link.added": "Agregado",
    "history.link.removed": "Eliminado",
    "history.entity.task": "tarea",
    "history.value.empty": "vac\xEDo",
    "history.value.none": "ninguno",
    "history.change.beforeLabel": "Antes:",
    "history.change.afterLabel": "Despu\xE9s:",
    "history.change.notSet": "Sin establecer",
    "history.change.removed": "Eliminado",
    "history.tags.none": "Sin etiquetas",
    "history.attachments.none": "Sin archivos adjuntos",
    "history.attachments.countSingle": "{count} archivo",
    "history.attachments.countPlural": "{count} archivos",
    "history.project.fallback": "Proyecto #{id}",
    "history.change.arrow": "\u2192",
    "menu.openMenu": "Abrir men\xFA",
    "menu.language": "Idioma",
    "menu.darkMode": "Modo oscuro",
    "menu.lightMode": "Modo claro",
    "menu.settings": "Configuraci\xF3n",
    "menu.help": "Ayuda",
    "menu.signOut": "Cerrar sesi\xF3n",
    "nav.overview": "Resumen",
    "nav.dashboard": "Panel",
    "nav.updates": "Notas de versi\xF3n",
    "nav.calendar": "Calendario",
    "nav.work": "Trabajo",
    "nav.projects": "Proyectos",
    "nav.allTasks": "Todas las tareas",
    "nav.feedback": "Comentarios",
    "updates.title": "Notas de versi\xF3n",
    "updates.subtitle": "\xDAltimo registro de cambios en Nautilus",
    "updates.latestLabel": "Ultima version",
    "updates.historyLabel": "Registro de versiones",
    "updates.sections.new": "Novedades",
    "updates.sections.improvements": "Mejoras",
    "updates.sections.fixes": "Correcciones",
    "updates.empty": "Todavia no hay notas de version.",
    "updates.sectionEmpty": "Todav\xEDa no hay entradas.",
    "updates.historyEmpty": "Sin versiones anteriores.",
    "notifications.title": "Notificaciones",
    "notifications.toggle": "Notificaciones",
    "notifications.today": "Hoy",
    "notifications.yesterday": "Ayer",
    "notifications.clearAll": "Limpiar todo",
    "notifications.releaseTitle": "Nueva versi\xF3n",
    "notifications.releaseCta": "Ver actualizaciones",
    "notifications.releaseMeta": "Publicado {date}",
    "notifications.dueTodayTitle": "Vence hoy",
    "notifications.dueTodayCta": "Ver tareas",
    "notifications.dueTodayMetaOne": "{count} tarea vence hoy",
    "notifications.dueTodayMetaMany": "{count} tareas vencen hoy",
    "notifications.dueTodayMore": "y {count} tareas m\xE1s",
    "notifications.empty": "Todo al d\xEDa.",
    "settings.title": "Configuraci\xF3n",
    "settings.subtitle": "Administra tus preferencias y la configuraci\xF3n de la aplicaci\xF3n",
    "settings.section.profile": "Perfil",
    "settings.displayName": "Nombre para mostrar",
    "settings.displayNameHint": "Este nombre se muestra en toda la aplicaci\xF3n",
    "settings.placeholder.displayName": "Escribe tu nombre para mostrar",
    "settings.email": "Correo electr\xF3nico",
    "settings.emailHint": "Se usa para tu cuenta y notificaciones de vencimiento",
    "settings.placeholder.email": "Escribe tu correo",
    "settings.avatar": "Avatar",
    "settings.avatarHint": "Sube una imagen para tu avatar (m\xE1x. 2 MB). Se mostrar\xE1 en forma circular.",
    "settings.avatarRemoveTitle": "Eliminar avatar",
    "settings.workspaceLogo": "Logo del espacio de trabajo",
    "settings.workspaceLogoHint": "Sube una imagen cuadrada para reemplazar el logo de Nautilus (m\xE1x. 2 MB).",
    "settings.workspaceLogoRemoveTitle": "Eliminar logo personalizado",
    "settings.section.application": "Aplicaci\xF3n",
    "settings.enableReviewStatus": "Habilitar estado En revisi\xF3n",
    "settings.enableReviewStatusHint": "Muestra u oculta la columna y el filtro de estado EN REVISI\xD3N",
    "settings.enableReviewStatusHintPrefix": "Muestra u oculta la columna y el filtro del estado",
    "settings.enableReviewStatusHintSuffix": "en la vista de tareas",
    "settings.calendarIncludeBacklog": "Mostrar backlog en calendario",
    "settings.calendarIncludeBacklogHint": "Muestra tareas en backlog en todas las vistas de calendario",
    "settings.autoStartDate": "Autocompletar fecha de inicio",
    "settings.autoStartDateHint": 'Establece autom\xE1ticamente la fecha de inicio cuando la tarea pasa a "En progreso" (si est\xE1 vac\xEDa)',
    "settings.autoEndDate": "Autocompletar fecha de fin",
    "settings.autoEndDateHint": 'Establece autom\xE1ticamente la fecha de fin cuando la tarea pasa a "Hecho" (si est\xE1 vac\xEDa)',
    "settings.debugLogs": "Habilitar logs de depuracion",
    "settings.debugLogsHint": "Guarda logs de diagnostico en la consola del navegador al activarlo",
    "settings.historySortOrder": "Orden de historial",
    "settings.historySortOrderHint": "Orden predeterminado para los historiales de tareas y proyectos",
    "settings.historySortNewest": "M\xE1s reciente primero",
    "settings.historySortOldest": "M\xE1s antiguo primero",
    "settings.language": "Idioma",
    "settings.languageHint": "Elige el idioma de la aplicaci\xF3n",
    "settings.section.notifications": "Notificaciones",
    "settings.emailNotifications": "Notificaciones por correo",
    "settings.emailNotificationsHint": "Activa o desactiva los correos de recordatorio de vencimientos",
    "settings.weekdaysOnly": "Solo d\xEDas laborables",
    "settings.weekdaysOnlyHint": "Omitir correos s\xE1bado y domingo",
    "settings.includeStartDates": "Notificar cuando las tareas comienzan",
    "settings.includeStartDatesHint": "Enviar recordatorios cuando una tarea comienza (ej., hoy)",
    "settings.includeBacklog": "Incluir tareas en backlog",
    "settings.includeBacklogHint": "Incluir tareas en backlog en notificaciones por correo y en la app",
    "settings.sendTime": "Hora de env\xEDo",
    "settings.sendTimeHint": "Hora diaria de env\xEDo (08:00-18:00, intervalos de 30 minutos)",
    "settings.timeZone": "Zona horaria",
    "settings.timeZoneHint": "Mantiene la misma hora local todo el a\xF1o (con horario de verano)",
    "settings.timeZone.option.argentina": "Argentina (Buenos Aires)",
    "settings.timeZone.option.canary": "Islas Canarias (Atlantic/Canary)",
    "settings.timeZone.option.spain": "Espa\xF1a peninsular (Europe/Madrid)",
    "settings.timeZone.option.utc": "UTC",
    "settings.section.security": "Seguridad",
    "settings.pinManagement": "Gesti\xF3n de PIN",
    "settings.pinManagementHint": "Restablece tu PIN a un nuevo c\xF3digo de 4 d\xEDgitos",
    "settings.resetPinButton": "Restablecer PIN",
    "settings.section.dataManagement": "Gesti\xF3n de datos",
    "settings.exportData": "Exportar datos",
    "settings.exportDataHint": "Descarga una copia de seguridad completa de tus tareas, proyectos y configuraci\xF3n en un archivo JSON",
    "settings.exportButton": "Exportar",
    "settings.cancelButton": "Cancelar",
    "settings.saveButton": "Guardar configuraci\xF3n",
    "settings.avatarUploadDefault": "Arrastra y suelta o haz clic para subir un avatar",
    "settings.avatarUploadChange": "Cambiar avatar",
    "settings.avatarUploadAriaUpload": "Subir avatar",
    "settings.avatarUploadAriaChange": "Cambiar avatar",
    "settings.logoUploadDefault": "Arrastra y suelta o haz clic para subir un logo",
    "settings.logoUploadChange": "Cambiar logo",
    "settings.logoUploadAriaUpload": "Subir logo",
    "settings.logoUploadAriaChange": "Cambiar logo",
    "dashboard.title": "Panel",
    "dashboard.hero.activeProjectsLabel": "Proyectos activos",
    "dashboard.hero.completionRateLabel": "Tasa de finalizaci\xF3n",
    "dashboard.hero.projectsTrend": "\u{1F4C8} +2 este mes",
    "dashboard.hero.completionTrend": "\u{1F3AF} Objetivo: 80%",
    "dashboard.projectAnalytics": "\u{1F4CA} Anal\xEDtica de proyectos",
    "dashboard.period.week": "Semana",
    "dashboard.period.month": "Mes",
    "dashboard.period.quarter": "Trimestre",
    "dashboard.stat.pendingTasks": "Tareas pendientes",
    "dashboard.stat.inProgress": "En progreso",
    "dashboard.stat.highPriority": "Alta prioridad",
    "dashboard.stat.overdue": "Vencidas",
    "dashboard.stat.completed": "Completadas",
    "dashboard.stat.projects": "Proyectos",
    "dashboard.highPriorityHint": "Tareas de alta prioridad con vencimiento en 7 d\xEDas (o vencidas)",
    "dashboard.projectProgress": "\u{1F30A} Progreso del proyecto",
    "dashboard.legend.todo": "Por hacer",
    "dashboard.legend.progress": "En progreso",
    "dashboard.legend.review": "En revisi\xF3n",
    "dashboard.legend.complete": "Completo",
    "dashboard.viewAll": "Ver todo",
    "dashboard.quickActions": "\u26A1 Acciones r\xE1pidas",
    "dashboard.action.generateReport": "Generar informe",
    "dashboard.action.addTask": "Agregar tarea",
    "dashboard.action.viewCalendar": "Ver calendario",
    "dashboard.action.newProject": "Nuevo proyecto",
    "dashboard.recentActivity": "\u{1F504} Actividad reciente",
    "dashboard.researchInsights": "\u{1F9E0} Perspectivas",
    "dashboard.activity.emptyTitle": "Bienvenido a tu panel",
    "dashboard.activity.emptySubtitle": "Empieza a crear proyectos y tareas para ver actividad",
    "dashboard.activity.completed": 'Completaste "{title}" {projectPart}',
    "dashboard.activity.createdProject": 'Creaste el nuevo proyecto "{project}"',
    "dashboard.activity.addedTask": 'Agregaste la nueva tarea "{title}" {projectPart}',
    "dashboard.activity.inProject": "en {project}",
    "dashboard.activity.toProject": "a {project}",
    "dashboard.activity.recently": "Recientemente",
    "dashboard.activity.justNow": "Justo ahora",
    "dashboard.activity.today": "Hoy",
    "dashboard.activity.yesterday": "Ayer",
    "dashboard.activity.daysAgoShort": "hace {count}d",
    "dashboard.activity.minuteAgo": "hace {count} minuto",
    "dashboard.activity.minutesAgo": "hace {count} minutos",
    "dashboard.activity.hourAgo": "hace {count} hora",
    "dashboard.activity.hoursAgo": "hace {count} horas",
    "dashboard.activity.dayAgo": "hace {count} d\xEDa",
    "dashboard.activity.daysAgo": "hace {count} d\xEDas",
    "dashboard.trend.thisWeek": "esta semana",
    "dashboard.trend.thisMonth": "este mes",
    "dashboard.trend.thisQuarter": "este trimestre",
    "dashboard.trend.dueTodayOne": "{count} vence hoy",
    "dashboard.trend.dueTodayMany": "{count} vencen hoy",
    "dashboard.trend.onTrack": "En buen camino",
    "dashboard.trend.needsAttention": "Necesita atenci\xF3n",
    "dashboard.trend.allOnTrack": "Todo en buen camino",
    "dashboard.trend.criticalOne": "{count} cr\xEDtica",
    "dashboard.trend.criticalMany": "{count} cr\xEDticas",
    "dashboard.trend.completedOne": "{count} completada",
    "dashboard.trend.completedMany": "{count} completadas",
    "dashboard.trend.inProgress": "En progreso",
    "dashboard.emptyProjects.title": "A\xFAn no hay proyectos",
    "dashboard.emptyProjects.subtitle": "Crea tu primer proyecto para ver la visualizaci\xF3n de progreso",
    "dashboard.tasks": "tareas",
    "dashboard.activity.allTitle": "Toda la actividad reciente",
    "dashboard.activity.allSubtitle": "Historial completo de tu trabajo reciente",
    "dashboard.activity.backToDashboard": "\u2190 Volver al panel",
    "dashboard.insights.excellentTitle": "Progreso excelente",
    "dashboard.insights.excellentDesc": "{percent}% de finalizaci\xF3n supera el objetivo. Gran impulso.",
    "dashboard.insights.goodTitle": "Buen progreso",
    "dashboard.insights.goodDesc": "{percent}% de finalizaci\xF3n es s\xF3lido. Intenta llegar al objetivo de 80%.",
    "dashboard.insights.opportunityTitle": "Oportunidad de progreso",
    "dashboard.insights.opportunityDesc": "{percent}% de finalizaci\xF3n. Enf\xF3cate en completar tareas actuales para ganar impulso.",
    "dashboard.insights.actionTitle": "Acci\xF3n necesaria",
    "dashboard.insights.actionDesc": "{percent}% de finalizaci\xF3n es bajo. Divide tareas grandes y empieza con las peque\xF1as.",
    "dashboard.insights.todayTitle": "Enfoque de hoy",
    "dashboard.insights.todayDescOne": "{count} tarea vence hoy. Prior\xEDzala para mayor impacto.",
    "dashboard.insights.todayDescMany": "{count} tareas vencen hoy. Prior\xEDzalas para mayor impacto.",
    "dashboard.insights.overdueTitle": "Elementos vencidos",
    "dashboard.insights.overdueDescOne": "{count} tarea vencida necesita atenci\xF3n. Ati\xE9ndela para evitar retrasos.",
    "dashboard.insights.overdueDescMany": "{count} tareas vencidas necesitan atenci\xF3n. Ati\xE9ndelas para evitar retrasos.",
    "dashboard.insights.highPriorityTitle": "Enfoque de alta prioridad",
    "dashboard.insights.highPriorityDescOne": "{count} tarea de alta prioridad necesita atenci\xF3n inmediata.",
    "dashboard.insights.highPriorityDescMany": "{count} tareas de alta prioridad necesitan atenci\xF3n inmediata.",
    "dashboard.insights.emptyProjectsTitle": "Proyectos sin tareas",
    "dashboard.insights.emptyProjectsDescOne": "{count} proyecto no tiene tareas a\xFAn. Agrega tareas para seguir el progreso.",
    "dashboard.insights.emptyProjectsDescMany": "{count} proyectos no tienen tareas a\xFAn. Agrega tareas para seguir el progreso.",
    "dashboard.insights.momentumTitle": "Buen impulso",
    "dashboard.insights.momentumDescOne": "{count} tarea completada esta semana. Vas en buen ritmo.",
    "dashboard.insights.momentumDescMany": "{count} tareas completadas esta semana. Vas en buen ritmo.",
    "dashboard.insights.readyTitle": "Listo para empezar",
    "dashboard.insights.readyDesc": "Crea tu primer proyecto y agrega tareas para comenzar a seguir tu progreso.",
    "dashboard.insights.caughtUpTitle": "Todo al d\xEDa",
    "dashboard.insights.caughtUpDesc": "Buen trabajo. No hay urgencias. Considera planificar tus pr\xF3ximos hitos."
  }
};

// storage-client.js
function getAuthToken() {
  return localStorage.getItem("authToken");
}
function getAuthHeaders() {
  const token = getAuthToken();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}
var DEFAULT_TIMEOUT_MS = 2e4;
var DEBUG_LOG_LOCALSTORAGE_KEY = "debugLogsEnabled";
function isDebugLogsEnabled() {
  try {
    return localStorage.getItem(DEBUG_LOG_LOCALSTORAGE_KEY) === "true";
  } catch (e) {
    return false;
  }
}
function logFeedbackDebug(message, meta) {
  if (!isDebugLogsEnabled()) return;
  if (meta) {
    console.log(`[feedback-debug] ${message}`, meta);
  } else {
    console.log(`[feedback-debug] ${message}`);
  }
}
async function fetchWithTimeout(resource, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}
async function saveData(key, value) {
  try {
    const response = await fetchWithTimeout(`/api/storage?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(value)
    });
    if (!response.ok) {
      if (response.status === 401) {
        window.location.hash = "#login";
        throw new Error("Unauthorized - please login");
      }
      throw new Error(`Failed to save data: ${response.status} ${response.statusText}`);
    }
    return true;
  } catch (error) {
    console.error(`Error saving data for key "${key}":`, error);
    throw error;
  }
}
async function loadData(key) {
  try {
    const res = await fetchWithTimeout(`/api/storage?key=${encodeURIComponent(key)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.hash = "#login";
        return null;
      }
      if (res.status === 404) {
        return null;
      }
      throw new Error(`Failed to load data: ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    return text && text !== "null" ? JSON.parse(text) : null;
  } catch (error) {
    console.error(`Error loading data for key "${key}":`, error);
    return null;
  }
}
async function loadManyData(keys) {
  try {
    const list = Array.isArray(keys) ? keys : [];
    const qs = encodeURIComponent(list.join(","));
    const res = await fetchWithTimeout(`/api/storage/batch?keys=${qs}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.hash = "#login";
        return null;
      }
      return null;
    }
    const data = await res.json();
    return data && typeof data === "object" ? data : null;
  } catch (error) {
    console.error("Error batch loading data:", error);
    return null;
  }
}
async function loadFeedbackIndex() {
  return loadData("feedback:index");
}
async function saveFeedbackIndex(ids) {
  return saveData("feedback:index", ids);
}
async function loadFeedbackItem(id) {
  return loadData(`feedback:item:${id}`);
}
async function saveFeedbackItem(item) {
  return saveData(`feedback:item:${item.id}`, item);
}
async function batchFeedbackOperations(operations, timeoutMs = DEFAULT_TIMEOUT_MS) {
  try {
    const debugEnabled = isDebugLogsEnabled();
    const requestId = `fb-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const startedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    let payloadBytes = null;
    if (debugEnabled) {
      try {
        payloadBytes = JSON.stringify({ operations }).length;
      } catch (e) {
      }
    }
    const headers = getAuthHeaders();
    if (debugEnabled) {
      headers["X-Debug-Logs"] = "1";
      headers["X-Request-Id"] = requestId;
      logFeedbackDebug("batch-feedback:request", {
        requestId,
        operationCount: Array.isArray(operations) ? operations.length : 0,
        payloadBytes,
        timeoutMs
      });
    }
    const response = await fetchWithTimeout(`/api/batch-feedback`, {
      method: "POST",
      headers,
      body: JSON.stringify({ operations })
    }, timeoutMs);
    if (!response.ok) {
      if (response.status === 401) {
        window.location.hash = "#login";
        throw new Error("Unauthorized - please login");
      }
      throw new Error(`Failed to batch process feedback: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (debugEnabled) {
      const endedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      logFeedbackDebug("batch-feedback:response", {
        requestId,
        durationMs: Math.round(endedAt - startedAt),
        success: data && data.success,
        processed: data && data.processed,
        total: data && data.total
      });
    }
    return data;
  } catch (error) {
    console.error("Error batch processing feedback:", error);
    throw error;
  }
}

// src/services/storage.js?v=20260125-cache-first-optimistic
async function saveTasks(tasks2) {
  const previousCache = loadArrayCache(TASKS_CACHE_KEY);
  if (Array.isArray(tasks2)) persistArrayCache(TASKS_CACHE_KEY, tasks2);
  try {
    await saveData("tasks", tasks2);
  } catch (error) {
    persistArrayCache(TASKS_CACHE_KEY, previousCache);
    console.error("Error saving tasks:", error);
    throw error;
  }
}
async function saveProjects(projects2) {
  const previousCache = loadArrayCache(PROJECTS_CACHE_KEY);
  if (Array.isArray(projects2)) persistArrayCache(PROJECTS_CACHE_KEY, projects2);
  try {
    await saveData("projects", projects2);
  } catch (error) {
    persistArrayCache(PROJECTS_CACHE_KEY, previousCache);
    console.error("Error saving projects:", error);
    throw error;
  }
}
async function saveProjectColors(projectColorMap2) {
  try {
    await saveData("projectColors", projectColorMap2);
  } catch (error) {
    console.error("Error saving project colors:", error);
    throw error;
  }
}
async function saveSortState(sortMode2, manualTaskOrder2) {
  try {
    await Promise.all([
      saveData("sortMode", sortMode2),
      saveData("manualTaskOrder", manualTaskOrder2)
    ]);
  } catch (error) {
    console.error("Error saving sort state:", error);
    throw error;
  }
}
async function loadAll(options = {}) {
  const preferCache = !!options.preferCache;
  const feedbackOptions = options.feedback || {};
  try {
    const cachedTasks = preferCache ? loadArrayCache(TASKS_CACHE_KEY) : [];
    const cachedProjects = preferCache ? loadArrayCache(PROJECTS_CACHE_KEY) : [];
    const feedbackPreferCache = feedbackOptions.preferCache ?? preferCache;
    const cachedFeedback = await loadFeedbackItemsFromIndex({
      ...feedbackOptions,
      preferCache: feedbackPreferCache
    });
    const hasCached = cachedTasks && cachedTasks.length > 0 || cachedProjects && cachedProjects.length > 0;
    if (preferCache && hasCached) {
      const onRefresh = typeof options.onRefresh === "function" ? options.onRefresh : null;
      const refreshOptions = {
        ...options,
        preferCache: false,
        feedback: { ...feedbackOptions, preferCache: false }
      };
      void loadAllNetwork(refreshOptions).then((fresh) => {
        if (onRefresh) onRefresh(fresh);
      });
      return {
        tasks: cachedTasks || [],
        projects: cachedProjects || [],
        feedbackItems: cachedFeedback || []
      };
    }
    return await loadAllNetwork({
      ...options,
      feedback: { ...feedbackOptions, preferCache: feedbackPreferCache }
    });
  } catch (error) {
    console.error("Error loading all data:", error);
    return {
      tasks: [],
      projects: [],
      feedbackItems: []
    };
  }
}
var FEEDBACK_CACHE_KEY = "feedbackItemsCache:v1";
var TASKS_CACHE_KEY = "tasksCache:v1";
var PROJECTS_CACHE_KEY = "projectsCache:v1";
function getScopedCacheKey(baseKey) {
  try {
    const token = localStorage.getItem("authToken");
    return token ? `${baseKey}:${token}` : baseKey;
  } catch (e) {
    return baseKey;
  }
}
function loadArrayCache(baseKey) {
  try {
    const raw = localStorage.getItem(getScopedCacheKey(baseKey));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function persistArrayCache(baseKey, items) {
  try {
    localStorage.setItem(getScopedCacheKey(baseKey), JSON.stringify(items || []));
  } catch (e) {
  }
}
function loadFeedbackCache(cacheKey) {
  const key = cacheKey || FEEDBACK_CACHE_KEY;
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function persistFeedbackCache(cacheKey, items) {
  const key = cacheKey || FEEDBACK_CACHE_KEY;
  try {
    localStorage.setItem(key, JSON.stringify(items || []));
  } catch (e) {
  }
}
async function loadAllNetwork(options = {}) {
  const feedbackOptions = options.feedback || {};
  const batch = await loadManyData(["tasks", "projects", "feedbackItems"]);
  const [tasks2, projects2, feedbackItems2] = await Promise.all([
    batch ? Promise.resolve(batch.tasks) : loadData("tasks"),
    batch ? Promise.resolve(batch.projects) : loadData("projects"),
    loadFeedbackItemsFromIndex(feedbackOptions)
  ]);
  if (Array.isArray(tasks2)) persistArrayCache(TASKS_CACHE_KEY, tasks2);
  if (Array.isArray(projects2)) persistArrayCache(PROJECTS_CACHE_KEY, projects2);
  return {
    tasks: tasks2 || [],
    projects: projects2 || [],
    feedbackItems: feedbackItems2 || []
  };
}
function mergeFeedbackItems(baseItems, updates) {
  const base = Array.isArray(baseItems) ? baseItems : [];
  const incoming = Array.isArray(updates) ? updates : [];
  if (base.length === 0) return incoming.filter(Boolean);
  const baseIds = /* @__PURE__ */ new Set();
  const mergedBase = [];
  const updateMap = /* @__PURE__ */ new Map();
  for (const item of incoming) {
    if (item && item.id != null) {
      updateMap.set(item.id, item);
    }
  }
  for (const item of base) {
    if (!item || item.id == null) continue;
    baseIds.add(item.id);
    mergedBase.push(updateMap.get(item.id) || item);
  }
  const newItems = [];
  for (const item of incoming) {
    if (item && item.id != null && !baseIds.has(item.id)) {
      newItems.push(item);
    }
  }
  return [...newItems, ...mergedBase];
}
async function loadFeedbackItemsByStatus(index, limitPending, limitDone) {
  const pendingLimit = Number.isInteger(limitPending) ? limitPending : null;
  const doneLimit = Number.isInteger(limitDone) ? limitDone : null;
  const allItems = await Promise.all(index.map((id) => loadFeedbackItem(id)));
  const pending = [];
  const done = [];
  for (const item of allItems) {
    if (!item) continue;
    const status = item.status === "done" ? "done" : "open";
    if (status === "done") {
      done.push(item);
    } else {
      pending.push(item);
    }
  }
  const limitedPending = pendingLimit !== null ? pending.slice(0, pendingLimit) : pending;
  const limitedDone = doneLimit !== null ? done.slice(0, doneLimit) : done;
  return [...limitedPending, ...limitedDone];
}
async function refreshFeedbackItemsFromIndex(options) {
  const limitPending = options.limitPending;
  const limitDone = options.limitDone;
  const cacheKey = options.cacheKey || FEEDBACK_CACHE_KEY;
  const cached = Array.isArray(options.cached) ? options.cached : [];
  const onRefresh = typeof options.onRefresh === "function" ? options.onRefresh : null;
  try {
    const index = await loadFeedbackIndex();
    if (Array.isArray(index) && index.length > 0) {
      let items = [];
      if (Number.isInteger(limitPending) || Number.isInteger(limitDone)) {
        items = await loadFeedbackItemsByStatus(index, limitPending, limitDone);
      } else {
        items = await Promise.all(index.map((id) => loadFeedbackItem(id)));
      }
      const merged = mergeFeedbackItems(cached, items.filter(Boolean));
      persistFeedbackCache(cacheKey, merged);
      if (onRefresh) onRefresh(merged);
    }
  } catch (error) {
    console.error("Error refreshing feedback items:", error);
  }
}
async function loadFeedbackItemsFromIndex(options = {}) {
  let cached = [];
  try {
    const limitPending = options.limitPending;
    const limitDone = options.limitDone;
    const cacheKey = options.cacheKey || FEEDBACK_CACHE_KEY;
    cached = options.useCache === false ? [] : loadFeedbackCache(cacheKey);
    const preferCache = !!(options.preferCache && cached.length > 0);
    if (preferCache) {
      void refreshFeedbackItemsFromIndex({ limitPending, limitDone, cacheKey, cached, onRefresh: options.onRefresh });
      return cached;
    }
    const index = await loadFeedbackIndex();
    if (Array.isArray(index) && index.length > 0) {
      let items = [];
      if (Number.isInteger(limitPending) || Number.isInteger(limitDone)) {
        items = await loadFeedbackItemsByStatus(index, limitPending, limitDone);
      } else {
        items = await Promise.all(index.map((id) => loadFeedbackItem(id)));
      }
      const merged = mergeFeedbackItems(cached, items.filter(Boolean));
      persistFeedbackCache(cacheKey, merged);
      return merged;
    }
    const legacy = await loadData("feedbackItems");
    if (Array.isArray(legacy) && legacy.length > 0) {
      try {
        const ids = legacy.map((item) => item && item.id).filter((id) => id != null);
        await Promise.all(legacy.map((item) => saveFeedbackItem(item)));
        await saveFeedbackIndex(ids);
      } catch (e) {
        console.error("Error migrating legacy feedback items:", e);
      }
      persistFeedbackCache(cacheKey, legacy);
      return legacy;
    }
  } catch (error) {
    console.error("Error loading feedback items:", error);
  }
  return cached || [];
}
async function loadSortState() {
  try {
    const [sortMode2, manualTaskOrder2] = await Promise.all([
      loadData("sortMode"),
      loadData("manualTaskOrder")
    ]);
    return {
      // Back-compat: older versions used 'auto' to mean priority ordering
      sortMode: sortMode2 === "auto" || !sortMode2 ? "priority" : sortMode2,
      manualTaskOrder: manualTaskOrder2 || { todo: [], progress: [], review: [], done: [] }
    };
  } catch (error) {
    console.error("Error loading sort state:", error);
    return {
      sortMode: "priority",
      manualTaskOrder: { todo: [], progress: [], review: [], done: [] }
    };
  }
}
async function loadProjectColors() {
  try {
    const colors = await loadData("projectColors");
    return colors || {};
  } catch (error) {
    console.error("Error loading project colors:", error);
    return {};
  }
}
async function saveSettings(settings2) {
  try {
    await saveData("settings", settings2);
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
}
async function loadSettings() {
  try {
    const loaded = await loadData("settings");
    return loaded || {};
  } catch (error) {
    console.error("Error loading settings:", error);
    return {};
  }
}

// src/utils/string.js
function capitalizeFirst(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// src/utils/date.js
function looksLikeDMY(s) {
  return typeof s === "string" && /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(s.trim());
}
function looksLikeISO(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}
function toISOFromDMY(s) {
  if (!looksLikeDMY(s)) return s || "";
  const parts = s.trim().split(/[\/\-]/);
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  if (!d || !m || !y || d > 31 || m > 12) return "";
  const dd = String(d).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}
function toDMYFromISO(s) {
  if (!looksLikeISO(s)) return s || "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}
function formatDate(s) {
  if (!s) return "No date";
  if (looksLikeDMY(s)) {
    return s.replace(/-/g, "/");
  }
  if (looksLikeISO(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  return "No date";
}
function formatDatePretty(s, locale = void 0) {
  if (!s) return "No date";
  try {
    if (looksLikeISO(s)) {
      const [y, m, d] = s.split("-");
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
    }
    if (looksLikeDMY(s)) {
      const parts = s.split(/[\/\-]/);
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
    }
  } catch (e) {
  }
  return "No date";
}
function getCalendarDayNames(locale) {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const baseDate = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, idx) => {
    const label = formatter.format(new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + idx));
    return capitalizeFirst(label);
  });
}
function formatCalendarMonthYear(locale, year, month) {
  const formatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  return capitalizeFirst(formatter.format(new Date(year, month, 1)));
}

// src/services/taskService.js
function createTask(taskData, tasks2, taskCounter2, tempAttachments2 = []) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const startDate = taskData.startDate || "";
  const endDate = taskData.endDate || "";
  const newTask = {
    id: taskCounter2,
    title: taskData.title || "",
    description: taskData.description || "",
    projectId: taskData.projectId ? parseInt(taskData.projectId, 10) : null,
    startDate,
    endDate,
    startDateWasEverSet: typeof startDate === "string" && startDate.trim() !== "",
    endDateWasEverSet: typeof endDate === "string" && endDate.trim() !== "",
    priority: taskData.priority || "medium",
    status: taskData.status || "todo",
    tags: taskData.tags || [],
    attachments: tempAttachments2.length > 0 ? [...tempAttachments2] : [],
    createdAt: now,
    updatedAt: now
  };
  const updatedTasks = [...tasks2, newTask];
  const updatedCounter = taskCounter2 + 1;
  return {
    task: newTask,
    tasks: updatedTasks,
    taskCounter: updatedCounter
  };
}
function updateTask(taskId, taskData, tasks2) {
  const taskIndex = tasks2.findIndex((t2) => t2.id === parseInt(taskId, 10));
  if (taskIndex === -1) {
    return { task: null, tasks: tasks2, oldProjectId: null };
  }
  const oldTask = tasks2[taskIndex];
  const oldProjectId = oldTask.projectId;
  const nextProjectId = taskData.projectId !== void 0 ? taskData.projectId ? parseInt(taskData.projectId, 10) : null : oldTask.projectId;
  const updatedTask = {
    ...oldTask,
    title: taskData.title !== void 0 ? taskData.title : oldTask.title,
    description: taskData.description !== void 0 ? taskData.description : oldTask.description,
    projectId: nextProjectId,
    startDate: taskData.startDate !== void 0 ? taskData.startDate : oldTask.startDate,
    endDate: taskData.endDate !== void 0 ? taskData.endDate : oldTask.endDate,
    priority: taskData.priority !== void 0 ? taskData.priority : oldTask.priority,
    status: taskData.status !== void 0 ? taskData.status : oldTask.status
  };
  if (taskData.startDate !== void 0 && typeof updatedTask.startDate === "string" && updatedTask.startDate.trim() !== "") {
    updatedTask.startDateWasEverSet = true;
  }
  if (taskData.endDate !== void 0 && typeof updatedTask.endDate === "string" && updatedTask.endDate.trim() !== "") {
    updatedTask.endDateWasEverSet = true;
  }
  const changed = updatedTask.title !== oldTask.title || updatedTask.description !== oldTask.description || updatedTask.projectId !== oldTask.projectId || updatedTask.startDate !== oldTask.startDate || updatedTask.endDate !== oldTask.endDate || updatedTask.priority !== oldTask.priority || updatedTask.status !== oldTask.status;
  if (!changed) {
    return {
      task: oldTask,
      tasks: tasks2,
      oldProjectId
    };
  }
  updatedTask.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const updatedTasks = [...tasks2];
  updatedTasks[taskIndex] = updatedTask;
  return {
    task: updatedTask,
    tasks: updatedTasks,
    oldProjectId
  };
}
function updateTaskField(taskId, field, value, tasks2, settings2 = {
  autoSetStartDateOnStatusChange: false,
  autoSetEndDateOnStatusChange: false
}) {
  const taskIndex = tasks2.findIndex((t2) => t2.id === parseInt(taskId, 10));
  if (taskIndex === -1) {
    return { task: null, tasks: tasks2, oldProjectId: null };
  }
  const oldTask = tasks2[taskIndex];
  const oldProjectId = oldTask.projectId;
  const updatedTask = { ...oldTask };
  const prevStartDate = oldTask.startDate;
  const prevEndDate = oldTask.endDate;
  const prevCompletedDate = oldTask.completedDate;
  if (field === "startDate" || field === "endDate") {
    const iso = looksLikeDMY(value) ? toISOFromDMY(value) : looksLikeISO(value) ? value : "";
    updatedTask[field] = iso;
    if (iso) {
      if (field === "startDate") updatedTask.startDateWasEverSet = true;
      if (field === "endDate") updatedTask.endDateWasEverSet = true;
    }
  } else if (field === "projectId") {
    updatedTask.projectId = value ? parseInt(value, 10) : null;
  } else {
    updatedTask[field] = value;
  }
  if (field === "status" && (settings2.autoSetStartDateOnStatusChange || settings2.autoSetEndDateOnStatusChange)) {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    if (settings2.autoSetStartDateOnStatusChange && value === "progress" && !updatedTask.startDate) {
      updatedTask.startDate = today;
      updatedTask.startDateWasEverSet = true;
    }
    if (settings2.autoSetEndDateOnStatusChange && value === "done" && !updatedTask.endDate) {
      updatedTask.endDate = today;
      updatedTask.endDateWasEverSet = true;
    }
  }
  if (field === "status" && value === "done" && !updatedTask.completedDate) {
    updatedTask.completedDate = (/* @__PURE__ */ new Date()).toISOString();
  }
  let changed;
  if (field === "projectId") {
    changed = updatedTask.projectId !== oldTask.projectId;
  } else {
    changed = updatedTask[field] !== oldTask[field];
  }
  if (field === "status") {
    if (updatedTask.startDate !== prevStartDate) changed = true;
    if (updatedTask.endDate !== prevEndDate) changed = true;
    if (updatedTask.completedDate !== prevCompletedDate) changed = true;
  }
  if (!changed) {
    return {
      task: oldTask,
      tasks: tasks2,
      oldProjectId
    };
  }
  updatedTask.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const updatedTasks = [...tasks2];
  updatedTasks[taskIndex] = updatedTask;
  return {
    task: updatedTask,
    tasks: updatedTasks,
    oldProjectId
  };
}
function deleteTask(taskId, tasks2) {
  const task = tasks2.find((t2) => t2.id === parseInt(taskId, 10));
  if (!task) {
    return { task: null, tasks: tasks2, projectId: null };
  }
  const projectId = task.projectId;
  const updatedTasks = tasks2.filter((t2) => t2.id !== parseInt(taskId, 10));
  return {
    task,
    tasks: updatedTasks,
    projectId
  };
}
function duplicateTask(taskId, tasks2, taskCounter2) {
  const original = tasks2.find((t2) => t2.id === parseInt(taskId, 10));
  if (!original) {
    return { task: null, tasks: tasks2, taskCounter: taskCounter2 };
  }
  const baseTitle = original.title || "Untitled";
  const newTitle = baseTitle.startsWith("Copy ") ? baseTitle : `Copy ${baseTitle}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const cloned = {
    id: taskCounter2,
    title: newTitle,
    description: original.description || "",
    projectId: original.projectId ?? null,
    startDate: original.startDate || "",
    endDate: original.endDate || "",
    startDateWasEverSet: !!original.startDateWasEverSet || !!original.startDate && String(original.startDate).trim() !== "",
    endDateWasEverSet: !!original.endDateWasEverSet || !!original.endDate && String(original.endDate).trim() !== "",
    priority: original.priority || "medium",
    status: original.status || "todo",
    tags: Array.isArray(original.tags) ? [...original.tags] : [],
    attachments: Array.isArray(original.attachments) ? original.attachments.map((a) => ({ ...a })) : [],
    createdAt: now,
    updatedAt: now
  };
  const updatedTasks = [...tasks2, cloned];
  const updatedCounter = taskCounter2 + 1;
  return {
    task: cloned,
    tasks: updatedTasks,
    taskCounter: updatedCounter
  };
}

// src/services/projectService.js
function createProject(projectData, projects2, projectCounter2) {
  const newProject = {
    id: projectCounter2,
    name: projectData.name || "",
    description: projectData.description || "",
    startDate: projectData.startDate || "",
    endDate: projectData.endDate || "",
    tags: projectData.tags || [],
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const updatedProjects = [...projects2, newProject];
  const updatedCounter = projectCounter2 + 1;
  return {
    project: newProject,
    projects: updatedProjects,
    projectCounter: updatedCounter
  };
}
function updateProjectField(projectId, field, value, projects2) {
  const projectIndex = projects2.findIndex((p) => p.id === parseInt(projectId, 10));
  if (projectIndex === -1) {
    return { project: null, projects: projects2 };
  }
  const oldProject = projects2[projectIndex];
  const updatedProject = { ...oldProject };
  if (field === "startDate" || field === "endDate") {
    const iso = looksLikeDMY(value) ? toISOFromDMY(value) : looksLikeISO(value) ? value : "";
    updatedProject[field] = iso;
  } else {
    updatedProject[field] = value;
  }
  const updatedProjects = [...projects2];
  updatedProjects[projectIndex] = updatedProject;
  return {
    project: updatedProject,
    projects: updatedProjects
  };
}
function deleteProject(projectId, projects2, tasks2 = null, clearTaskAssociations = false) {
  const project = projects2.find((p) => p.id === parseInt(projectId, 10));
  if (!project) {
    return { project: null, projects: projects2, tasks: tasks2 };
  }
  const updatedProjects = projects2.filter((p) => p.id !== parseInt(projectId, 10));
  let updatedTasks = tasks2;
  if (tasks2 && clearTaskAssociations) {
    updatedTasks = tasks2.map((t2) => {
      if (t2.projectId === parseInt(projectId, 10)) {
        return { ...t2, projectId: null };
      }
      return t2;
    });
  }
  return {
    project,
    projects: updatedProjects,
    tasks: updatedTasks
  };
}

// src/utils/html.js
function escapeHtml(str) {
  return (str || "").replace(
    /[&<>"']/g,
    (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[m]
  );
}

// src/utils/colors.js
var TAG_COLORS = [
  // Darker, high-contrast colors for reliable white text legibility
  "#dc2626",
  // red-600
  "#ea580c",
  // orange-600
  "#b45309",
  // amber-700
  "#ca8a04",
  // yellow-700 (darker)
  "#16a34a",
  // green-600
  "#059669",
  // emerald-600
  "#0ea5a4",
  // teal-500
  "#0284c7",
  // blue-600
  "#0369a1",
  // sky-700
  "#4338ca",
  // indigo-700
  "#7c3aed",
  // violet-600
  "#6b21a8",
  // purple-800
  "#be185d",
  // pink-600
  "#e11d48",
  // rose-600
  "#065f46",
  // emerald-800 (deep)
  "#334155"
  // slate-700 neutral
];
var PROJECT_COLORS = [
  "#6C5CE7",
  // Purple - good contrast
  "#3742FA",
  // Indigo - good contrast
  "#E84393",
  // Pink - good contrast
  "#00B894",
  // Teal - good contrast
  "#74B9FF",
  // Light blue - replaced with darker blue
  "#0984E3",
  // Blue - better contrast than light blue
  "#0891b2",
  // Cyan-600 - darker cyan for better tag readability
  "#E17055",
  // Orange - good contrast
  "#9B59B6",
  // Purple variant - good contrast
  "#2F3542",
  // Dark gray - good contrast
  "#FF3838",
  // Red - good contrast
  "#6C5B7B",
  // Mauve - good contrast
  "#C44569",
  // Berry - good contrast
  "#F8B500",
  // Amber - good contrast
  "#5758BB"
  // Deep purple - good contrast
];

// src/config/constants.js
var STATUS_LABELS = {
  backlog: "Backlog",
  todo: "To Do",
  progress: "In Progress",
  review: "In Review",
  done: "Done"
};
var PRIORITY_ORDER = {
  high: 3,
  medium: 2,
  low: 1
};
var STATUS_ORDER = {
  done: 1,
  progress: 2,
  review: 3,
  todo: 4,
  backlog: 5
};
var PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" }
];
var PRIORITY_COLORS = {
  high: "var(--accent-red)",
  medium: "var(--accent-amber)",
  low: "var(--accent-green)"
};

// src/config/release-notes.js
var RELEASE_NOTES = [
  {
    id: "2026.01.06",
    version: "2.7.0",
    title: {
      en: "Signal and Flow",
      es: "Se\xF1al y flujo"
    },
    date: "2026-01-06",
    summary: {
      en: "A focused release that makes changes visible and deadlines clearer.",
      es: "Una versi\xF3n enfocada que hace visibles los cambios y aclara los plazos."
    },
    sections: {
      new: [
        {
          en: "Release Notes page with a clean breakdown of changes.",
          es: "P\xE1gina de notas de versi\xF3n con un desglose claro de cambios."
        },
        {
          en: "Top bar notification bell for new releases.",
          es: "Campana de notificaciones en la barra superior para nuevas versiones."
        },
        {
          en: "Due today reminders with quick navigation.",
          es: "Recordatorios de vencimiento hoy con navegaci\xF3n r\xE1pida."
        }
      ],
      improvements: [
        {
          en: "Updates page tuned for fast scanning.",
          es: "P\xE1gina de novedades ajustada para lectura r\xE1pida."
        },
        {
          en: "Notification badge aggregates releases and due today tasks.",
          es: "La insignia de notificaciones agrupa versiones y tareas que vencen hoy."
        },
        {
          en: "Release dates formatted per locale.",
          es: "Fechas de versi\xF3n formateadas seg\xFAn la configuraci\xF3n regional."
        }
      ],
      fixes: [
        {
          en: "Notifications now stay focused on tasks due today.",
          es: "Las notificaciones ahora se enfocan en tareas que vencen hoy."
        },
        {
          en: "Release history stays consistent across sessions.",
          es: "El historial de versiones se mantiene consistente entre sesiones."
        }
      ]
    }
  },
  {
    id: "2025.12.20",
    version: "2.6.1",
    title: {
      en: "Stability Pass",
      es: "Pase de estabilidad"
    },
    date: "2025-12-20",
    summary: {
      en: "Polish across projects, tasks, and reporting.",
      es: "Pulido en proyectos, tareas y reportes."
    },
    sections: {
      new: [
        {
          en: "Task sorting refinements in list view.",
          es: "Mejoras en el ordenamiento de tareas en vista de lista."
        },
        {
          en: "Improved history timeline labels.",
          es: "Etiquetas mejoradas en la l\xEDnea de tiempo del historial."
        }
      ],
      improvements: [
        {
          en: "Cleaner spacing for project detail views.",
          es: "Espaciado m\xE1s limpio en vistas de detalle de proyecto."
        },
        {
          en: "Faster dashboard rendering on large datasets.",
          es: "Renderizado del panel m\xE1s r\xE1pido con datos grandes."
        }
      ],
      fixes: [
        {
          en: "Resolved occasional drag reorder glitches.",
          es: "Corregidos fallos ocasionales al reordenar arrastrando."
        },
        {
          en: "Fixed missing labels in calendar tooltips.",
          es: "Corregidas etiquetas faltantes en los tooltips del calendario."
        }
      ]
    }
  },
  {
    id: "2025.12.04",
    version: "2.6.0",
    title: {
      en: "Project Clarity",
      es: "Claridad de proyecto"
    },
    date: "2025-12-04",
    summary: {
      en: "Better project visibility and smarter filters.",
      es: "Mejor visibilidad de proyectos y filtros m\xE1s inteligentes."
    },
    sections: {
      new: [
        {
          en: "Enhanced project filters for recency.",
          es: "Filtros de proyectos mejorados por recencia."
        },
        {
          en: "Quick access backlog button in Kanban.",
          es: "Bot\xF3n de acceso r\xE1pido al backlog en Kanban."
        }
      ],
      improvements: [
        {
          en: "Refined status badges for contrast.",
          es: "Insignias de estado refinadas para mejor contraste."
        },
        {
          en: "Clearer labels across filters and chips.",
          es: "Etiquetas m\xE1s claras en filtros y chips."
        }
      ],
      fixes: [
        {
          en: "Fixed filter chips not clearing on reset.",
          es: "Corregido que los chips de filtros no se limpiaban al restablecer."
        },
        {
          en: "Resolved layout shifts in mobile task list.",
          es: "Corregidos saltos de dise\xF1o en la lista de tareas m\xF3vil."
        }
      ]
    }
  }
];

// src/utils/debug.js
var DEBUG_LOG_LOCALSTORAGE_KEY2 = "debugLogsEnabled";
var debugTimers = /* @__PURE__ */ new Map();
var PAGE_LOAD_START = typeof window !== "undefined" && typeof window.__pageLoadStart === "number" ? window.__pageLoadStart : typeof performance !== "undefined" ? performance.now() : Date.now();
function getTimeSincePageLoad() {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  return Math.round(now - PAGE_LOAD_START);
}
function logPerformanceMilestone(milestone, meta) {
  if (!isDebugLogsEnabled2()) return;
  const timeSinceLoad = getTimeSincePageLoad();
  console.log(`[perf] ${milestone} @ ${timeSinceLoad}ms`, meta || "");
}
function applyDebugLogSetting(enabled) {
  const next = !!enabled;
  window.debugLogsEnabled = next;
  try {
    localStorage.setItem(DEBUG_LOG_LOCALSTORAGE_KEY2, String(next));
  } catch (e) {
  }
}
function isDebugLogsEnabled2() {
  if (typeof window.debugLogsEnabled === "boolean") return window.debugLogsEnabled;
  try {
    return localStorage.getItem(DEBUG_LOG_LOCALSTORAGE_KEY2) === "true";
  } catch (e) {
    return false;
  }
}
function logDebug(scope, message, meta) {
  if (!isDebugLogsEnabled2()) return;
  if (meta) {
    console.log(`[debug:${scope}] ${message}`, meta);
  } else {
    console.log(`[debug:${scope}] ${message}`);
  }
}
function debugTimeStart(scope, label, meta) {
  if (!isDebugLogsEnabled2()) return;
  const key = `${scope}:${label}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
  debugTimers.set(key, typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());
  logDebug(scope, `${label}:start`, meta);
  return key;
}
function debugTimeEnd(scope, key, meta) {
  if (!isDebugLogsEnabled2()) return;
  const startedAt = debugTimers.get(key);
  if (startedAt == null) return;
  debugTimers.delete(key);
  const endedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  logDebug(scope, "duration", { durationMs: Math.round(endedAt - startedAt), ...meta });
}

// src/ui/notification.js
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 16px 24px;
        background: ${type === "error" ? "var(--accent-red)" : type === "success" ? "var(--accent-green)" : "var(--accent-blue)"};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        font-size: 14px;
        font-weight: 500;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => notification.remove(), 300);
  }, 4e3);
}
function showErrorNotification(message) {
  showNotification(message, "error");
}
function showSuccessNotification(message) {
  showNotification(message, "success");
}

// src/utils/file.js
function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
async function uploadFile(fileKey, base64Data) {
  const response = await fetch(`/api/files?key=${encodeURIComponent(fileKey)}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: base64Data
  });
  if (!response.ok) {
    let errorMessage = `Failed to upload file: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
      if (errorData.troubleshooting) {
        errorMessage += "\n\nTroubleshooting: " + errorData.troubleshooting;
      }
    } catch (e) {
    }
    throw new Error(errorMessage);
  }
}
async function downloadFile(fileKey) {
  const response = await fetch(`/api/files?key=${encodeURIComponent(fileKey)}`);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}
async function deleteFile(fileKey) {
  const response = await fetch(`/api/files?key=${encodeURIComponent(fileKey)}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    throw new Error(`Failed to delete file: ${response.status} ${response.statusText}`);
  }
}

// src/utils/validation.js
function isValidEmailAddress(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

// src/utils/time.js
function normalizeHHMM(value) {
  if (!value || typeof value !== "string") return "";
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return "";
  if (hours < 0 || hours > 23) return "";
  if (minutes < 0 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
function snapHHMMToStep(hhmm, stepMinutes) {
  const normalized = normalizeHHMM(hhmm);
  if (!normalized) return "";
  const [hoursStr, minutesStr] = normalized.split(":");
  const total = Number(hoursStr) * 60 + Number(minutesStr);
  const step = Number(stepMinutes) || 1;
  const snapped = Math.round(total / step) * step;
  const wrapped = (snapped % (24 * 60) + 24 * 60) % (24 * 60);
  const outHours = Math.floor(wrapped / 60);
  const outMinutes = wrapped % 60;
  return `${String(outHours).padStart(2, "0")}:${String(outMinutes).padStart(2, "0")}`;
}
function hhmmToMinutes(hhmm) {
  const normalized = normalizeHHMM(hhmm);
  if (!normalized) return null;
  const [hoursStr, minutesStr] = normalized.split(":");
  return Number(hoursStr) * 60 + Number(minutesStr);
}
function minutesToHHMM(totalMinutes) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Number(totalMinutes)));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
function clampHHMMToRange(hhmm, startHHMM, endHHMM) {
  const valueMinutes = hhmmToMinutes(hhmm);
  const startMinutes = hhmmToMinutes(startHHMM);
  const endMinutes = hhmmToMinutes(endHHMM);
  if (valueMinutes == null || startMinutes == null || endMinutes == null) return "";
  if (valueMinutes < startMinutes) return startHHMM;
  if (valueMinutes > endMinutes) return endHHMM;
  return hhmm;
}
function getKanbanUpdatedCutoffTime(value) {
  const now = Date.now();
  switch (value) {
    case "5m":
      return now - 5 * 60 * 1e3;
    case "30m":
      return now - 30 * 60 * 1e3;
    case "24h":
      return now - 24 * 60 * 60 * 1e3;
    case "week":
      return now - 7 * 24 * 60 * 60 * 1e3;
    case "month":
      return now - 30 * 24 * 60 * 60 * 1e3;
    case "all":
    default:
      return null;
  }
}
function getTaskUpdatedTime(task) {
  const raw = task && (task.updatedAt || task.createdAt || task.createdDate) || "";
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}
function formatTaskUpdatedDateTime(task) {
  const raw = task && (task.updatedAt || task.createdAt || task.createdDate) || "";
  const d = new Date(raw);
  const t2 = d.getTime();
  if (!Number.isFinite(t2) || t2 === 0) return "";
  try {
    return d.toLocaleString(void 0, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  } catch (e) {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}

// src/utils/functional.js
function debounce(fn, wait) {
  let t2 = null;
  return function(...args) {
    if (t2) clearTimeout(t2);
    t2 = setTimeout(() => fn.apply(this, args), wait);
  };
}
function toggleSet(setObj, val, on) {
  if (on) setObj.add(val);
  else setObj.delete(val);
}

// src/utils/filterPredicates.js
function getTodayISO() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function matchesSearch(task, search) {
  if (!search) return true;
  return task.title && task.title.toLowerCase().includes(search) || task.description && task.description.toLowerCase().includes(search);
}
function matchesStatus(task, statuses) {
  return statuses.size === 0 || statuses.has(task.status);
}
function matchesPriority(task, priorities) {
  return priorities.size === 0 || priorities.has(task.priority);
}
function matchesProject(task, projects2) {
  if (projects2.size === 0) return true;
  if (task.projectId && projects2.has(task.projectId.toString())) return true;
  if (!task.projectId && projects2.has("none")) return true;
  return false;
}
function matchesTags(task, tags) {
  if (tags.size === 0) return true;
  if (task.tags && task.tags.some((tag) => tags.has(tag))) return true;
  if ((!task.tags || task.tags.length === 0) && tags.has("none")) return true;
  return false;
}
function matchesDatePreset(task, preset, today) {
  const todayDate = /* @__PURE__ */ new Date(today + "T00:00:00");
  switch (preset) {
    // END DATE FILTERS
    case "no-date":
      return !task.endDate || task.endDate === "";
    case "overdue":
      return task.endDate && task.endDate < today;
    case "end-today":
      return task.endDate === today;
    case "end-tomorrow": {
      const endTomorrow = new Date(todayDate);
      endTomorrow.setDate(endTomorrow.getDate() + 1);
      return task.endDate === endTomorrow.toISOString().split("T")[0];
    }
    case "end-7days": {
      const endSevenDays = new Date(todayDate);
      endSevenDays.setDate(endSevenDays.getDate() + 7);
      return task.endDate === endSevenDays.toISOString().split("T")[0];
    }
    case "end-week": {
      const endWeekEnd = new Date(todayDate);
      endWeekEnd.setDate(endWeekEnd.getDate() + 7);
      const endWeekEndStr = endWeekEnd.toISOString().split("T")[0];
      return task.endDate && task.endDate >= today && task.endDate <= endWeekEndStr;
    }
    case "end-month": {
      const endMonthEnd = new Date(todayDate);
      endMonthEnd.setDate(endMonthEnd.getDate() + 30);
      const endMonthEndStr = endMonthEnd.toISOString().split("T")[0];
      return task.endDate && task.endDate >= today && task.endDate <= endMonthEndStr;
    }
    // START DATE FILTERS
    case "no-start-date":
      return !task.startDate || task.startDate === "";
    case "already-started":
      return task.startDate && task.startDate < today && task.status !== "done";
    case "start-today":
      return task.startDate === today;
    case "start-tomorrow": {
      const startTomorrow = new Date(todayDate);
      startTomorrow.setDate(startTomorrow.getDate() + 1);
      return task.startDate === startTomorrow.toISOString().split("T")[0];
    }
    case "start-7days": {
      const startSevenDays = new Date(todayDate);
      startSevenDays.setDate(startSevenDays.getDate() + 7);
      return task.startDate === startSevenDays.toISOString().split("T")[0];
    }
    case "start-week": {
      const startWeekEnd = new Date(todayDate);
      startWeekEnd.setDate(startWeekEnd.getDate() + 7);
      const startWeekEndStr = startWeekEnd.toISOString().split("T")[0];
      return task.startDate && task.startDate >= today && task.startDate <= startWeekEndStr;
    }
    case "start-month": {
      const startMonthEnd = new Date(todayDate);
      startMonthEnd.setDate(startMonthEnd.getDate() + 30);
      const startMonthEndStr = startMonthEnd.toISOString().split("T")[0];
      return task.startDate && task.startDate >= today && task.startDate <= startMonthEndStr;
    }
    default:
      return true;
  }
}
function matchesAnyDatePreset(task, datePresets, today) {
  if (datePresets.size === 0) return true;
  return Array.from(datePresets).some((preset) => matchesDatePreset(task, preset, today));
}
function matchesDateRange(task, dateFrom, dateTo, dateField = "endDate") {
  if (!dateFrom && !dateTo) return true;
  const taskDateValue = dateField === "startDate" ? task.startDate : task.endDate;
  if (!taskDateValue) return false;
  if (dateFrom && dateTo) {
    if (dateFrom === dateTo) {
      return taskDateValue === dateTo;
    } else {
      return taskDateValue >= dateFrom && taskDateValue <= dateTo;
    }
  } else if (dateFrom) {
    return taskDateValue >= dateFrom;
  } else if (dateTo) {
    return taskDateValue <= dateTo;
  }
  return true;
}
function filterTasks(tasks2, filterState2) {
  const {
    search = "",
    statuses = /* @__PURE__ */ new Set(),
    priorities = /* @__PURE__ */ new Set(),
    projects: projects2 = /* @__PURE__ */ new Set(),
    tags = /* @__PURE__ */ new Set(),
    datePresets = /* @__PURE__ */ new Set(),
    dateFrom = "",
    dateTo = "",
    dateField = "endDate"
  } = filterState2;
  const today = getTodayISO();
  const searchLower = search.toLowerCase();
  return tasks2.filter((task) => {
    if (!matchesSearch(task, searchLower)) return false;
    if (!matchesStatus(task, statuses)) return false;
    if (!matchesPriority(task, priorities)) return false;
    if (!matchesProject(task, projects2)) return false;
    if (!matchesTags(task, tags)) return false;
    if (datePresets.size > 0) {
      if (!matchesAnyDatePreset(task, datePresets, today)) return false;
    } else if (dateFrom || dateTo) {
      if (!matchesDateRange(task, dateFrom, dateTo, dateField)) return false;
    }
    return true;
  });
}

// src/views/dashboard.js
function calculateDashboardStats(tasks2, projects2) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const activeTasks = tasks2.filter((t2) => t2.status !== "backlog");
  const totalTasks = activeTasks.length;
  const completedTasks = activeTasks.filter((t2) => t2.status === "done").length;
  const completionRate = totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0;
  const inProgressTasks = activeTasks.filter((t2) => t2.status === "progress").length;
  const pendingTasks = activeTasks.filter((t2) => t2.status === "todo").length;
  const reviewTasks = activeTasks.filter((t2) => t2.status === "review").length;
  const overdueTasks = activeTasks.filter((t2) => t2.endDate && t2.endDate < today && t2.status !== "done").length;
  const highPriorityTasks = activeTasks.filter((t2) => t2.priority === "high" && t2.status !== "done").length;
  const milestones = projects2.filter((p) => p.endDate).length;
  return {
    activeProjects: projects2.length,
    totalTasks,
    completedTasks,
    completionRate,
    inProgressTasks,
    pendingTasks,
    reviewTasks,
    overdueTasks,
    highPriorityTasks,
    milestones
  };
}
function calculateTrendIndicators(tasks2, projects2) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const todayDate = /* @__PURE__ */ new Date();
  const activeTasks = tasks2.filter((t2) => t2.status !== "backlog");
  const weekAgo = /* @__PURE__ */ new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeekCompleted = activeTasks.filter((t2) => {
    if (t2.status !== "done" || !t2.completedDate) return false;
    return new Date(t2.completedDate) > weekAgo;
  }).length;
  const dueTodayCount = activeTasks.filter((t2) => {
    if (!t2.endDate || t2.status === "done") return false;
    return new Date(t2.endDate).toDateString() === todayDate.toDateString();
  }).length;
  const overdueCount = activeTasks.filter(
    (t2) => t2.status !== "done" && t2.endDate && t2.endDate < today
  ).length;
  const criticalHighPriority = activeTasks.filter((t2) => {
    if (t2.status === "done") return false;
    if (t2.priority !== "high") return false;
    if (!t2.endDate) return false;
    const todayMidnight = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
    const end = new Date(t2.endDate);
    const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const diffDays = Math.round((endMidnight - todayMidnight) / (1e3 * 60 * 60 * 24));
    return diffDays <= 7;
  }).length;
  const completedProjects = projects2.filter((p) => {
    const projectTasks = tasks2.filter((t2) => t2.projectId === p.id);
    const completedProjectTasks = projectTasks.filter((t2) => t2.status === "done");
    return projectTasks.length > 0 && completedProjectTasks.length === projectTasks.length;
  }).length;
  return {
    thisWeekCompleted,
    dueTodayCount,
    overdueCount,
    criticalHighPriority,
    completedProjects,
    progressChange: Math.max(1, Math.floor(activeTasks.length * 0.1))
  };
}
function calculateProjectProgress(projects2, tasks2, limit = 5) {
  return projects2.slice(0, limit).map((project) => {
    const projectId = Number(project?.id);
    const projectTasks = tasks2.filter((t2) => Number(t2?.projectId) === projectId && t2.status !== "backlog");
    const completed = projectTasks.filter((t2) => t2.status === "done").length;
    const inProgress = projectTasks.filter((t2) => t2.status === "progress").length;
    const review = projectTasks.filter((t2) => t2.status === "review").length;
    const todo = projectTasks.filter((t2) => t2.status === "todo").length;
    const total = projectTasks.length;
    return {
      id: project.id,
      name: project.name,
      completed,
      inProgress,
      review,
      todo,
      total,
      completedPercent: total > 0 ? completed / total * 100 : 0,
      inProgressPercent: total > 0 ? inProgress / total * 100 : 0,
      reviewPercent: total > 0 ? review / total * 100 : 0,
      todoPercent: total > 0 ? todo / total * 100 : 0
    };
  });
}
function generateProgressBarsHTML(progressData, helpers) {
  const { tasksLabel } = helpers;
  return progressData.map((p) => `
        <div class="progress-bar-item clickable-project" data-action="showProjectDetails" data-param="${p.id}" style="cursor: pointer; transition: all 0.2s ease;">
            <div class="project-progress-header">
                <span class="project-name">${p.name}</span>
                <span class="task-count">${p.completed}/${p.total} ${tasksLabel}</span>
            </div>
            <div style="height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; display: flex;">
                <div style="background: var(--accent-green); width: ${p.completedPercent}%; transition: width 0.5s ease;"></div>
                <div style="background: var(--accent-blue); width: ${p.inProgressPercent}%; transition: width 0.5s ease;"></div>
                <div style="background: var(--accent-amber); width: ${p.reviewPercent}%; transition: width 0.5s ease;"></div>
                <div style="background: var(--text-muted); width: ${p.todoPercent}%; transition: width 0.5s ease;"></div>
            </div>
        </div>
    `).join("");
}
function generateActivityFeedHTML(activities, formatDate2) {
  return activities.map((activity) => `
        <div class="activity-item">
            <div class="activity-icon ${activity.type}">${activity.icon}</div>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
            </div>
            <div class="activity-date">${formatDate2(activity.date)}</div>
        </div>
    `).join("");
}

// src/components/taskCard.js
function calculateDateUrgency(endDate, status) {
  if (!endDate) {
    return {
      hasDate: false,
      urgency: "none",
      bgColor: null,
      textColor: "var(--text-muted)",
      borderColor: null,
      icon: "",
      iconColor: ""
    };
  }
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(endDate);
  dueDate.setHours(0, 0, 0, 0);
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
  if (status === "done") {
    return {
      hasDate: true,
      urgency: "completed",
      diffDays,
      bgColor: "rgba(148, 163, 184, 0.12)",
      textColor: "#94a3b8",
      borderColor: "rgba(148, 163, 184, 0.25)",
      icon: "",
      iconColor: ""
    };
  }
  if (diffDays < 0) {
    return {
      hasDate: true,
      urgency: "overdue",
      diffDays,
      bgColor: "rgba(249, 115, 22, 0.2)",
      textColor: "#fb923c",
      borderColor: "rgba(249, 115, 22, 0.4)",
      icon: "\u26A0 ",
      iconColor: "#f97316"
    };
  }
  if (diffDays <= 7) {
    return {
      hasDate: true,
      urgency: "soon",
      diffDays,
      bgColor: "rgba(192, 132, 252, 0.25)",
      textColor: "#c084fc",
      borderColor: "rgba(192, 132, 252, 0.5)",
      icon: "",
      iconColor: ""
    };
  }
  return {
    hasDate: true,
    urgency: "normal",
    diffDays,
    bgColor: "rgba(59, 130, 246, 0.15)",
    textColor: "#93c5fd",
    borderColor: "rgba(59, 130, 246, 0.3)",
    icon: "",
    iconColor: ""
  };
}
function generateTaskCardHTML(task, helpers) {
  const {
    escapeHtml: escapeHtml2,
    formatDate: formatDate2,
    getProjectColor: getProjectColor2,
    getTagColor: getTagColor2,
    getPriorityLabel: getPriorityLabel2,
    projects: projects2,
    selectedCards: selectedCards2,
    showProjects = true,
    showNoDate = true,
    noProjectText,
    noDateText
  } = helpers;
  const proj = projects2.find((p) => p.id === task.projectId);
  const projName = proj ? proj.name : noProjectText;
  const dueText = task.endDate ? formatDate2(task.endDate) : noDateText;
  const urgency = calculateDateUrgency(task.endDate, task.status);
  let dueHTML;
  if (urgency.hasDate) {
    const { bgColor, textColor, borderColor, icon, iconColor } = urgency;
    dueHTML = `<span style="
            background: ${bgColor};
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            color: ${textColor};
            border: 1px solid ${borderColor};
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            text-decoration: none;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        ">${icon ? `<span style="color: ${iconColor};">${icon}</span>` : ""}${escapeHtml2(dueText)}</span>`;
  } else {
    dueHTML = showNoDate ? `<span style="color: var(--text-muted); font-size: 12px;">${dueText}</span>` : "";
  }
  const isSelected = selectedCards2 && selectedCards2.has(task.id);
  const selectedClass = isSelected ? " selected" : "";
  const doneClass = task.status === "done" ? " is-done" : "";
  const projectIndicator = proj ? `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor2(proj.id)}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>` : "";
  const tagsAndDateHTML = `<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 12px;">
        ${task.tags && task.tags.length > 0 ? task.tags.map((tag) => `<span style="background-color: ${getTagColor2(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml2(tag.toUpperCase())}</span>`).join("") : ""}
        <span style="margin-left: auto;">${dueHTML}</span>
    </div>`;
  return `
        <div class="task-card${selectedClass}${doneClass}" draggable="true" data-task-id="${task.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div class="task-title" style="flex: 1;">${projectIndicator}${escapeHtml2(task.title || "")}</div>
                <div class="task-priority priority-${task.priority}" style="flex-shrink: 0;">${getPriorityLabel2(task.priority || "").toUpperCase()}</div>
            </div>
            ${showProjects ? `
            <div style="margin-top:8px; font-size:12px;">
                ${proj ? `<span style="background-color: ${getProjectColor2(proj.id)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; display: inline-block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml2(proj.name)}">${escapeHtml2(proj.name)}</span>` : `<span style="color: var(--text-muted);">${noProjectText}</span>`}
            </div>
            ` : ""}
            ${tagsAndDateHTML}
        </div>
    `;
}

// src/views/kanban.js
function groupTasksByStatus(tasks2, showBacklog = false) {
  const byStatus = { backlog: [], todo: [], progress: [], review: [], done: [] };
  tasks2.forEach((task) => {
    if (task.status === "backlog" && !showBacklog) return;
    if (byStatus[task.status]) {
      byStatus[task.status].push(task);
    }
  });
  return byStatus;
}
function sortTasksByPriority(tasks2) {
  return [...tasks2].sort((a, b) => {
    const priorityA = PRIORITY_ORDER[a.priority] || 0;
    const priorityB = PRIORITY_ORDER[b.priority] || 0;
    return priorityB - priorityA;
  });
}
function sortTasksByManualOrder(tasks2, manualOrder) {
  if (!manualOrder || manualOrder.length === 0) {
    return sortTasksByPriority(tasks2);
  }
  const orderMap = new Map(manualOrder.map((id, idx) => [id, idx]));
  return [...tasks2].sort((a, b) => {
    const oa = orderMap.has(a.id) ? orderMap.get(a.id) : 9999;
    const ob = orderMap.has(b.id) ? orderMap.get(b.id) : 9999;
    if (oa !== ob) return oa - ob;
    const pa = PRIORITY_ORDER[a.priority] || 0;
    const pb = PRIORITY_ORDER[b.priority] || 0;
    return pb - pa;
  });
}
function sortGroupedTasks(byStatus, sortMode2, manualTaskOrder2 = null) {
  const sorted = {};
  Object.keys(byStatus).forEach((status) => {
    if (sortMode2 === "manual" && manualTaskOrder2 && manualTaskOrder2[status]) {
      sorted[status] = sortTasksByManualOrder(byStatus[status], manualTaskOrder2[status]);
    } else {
      sorted[status] = sortTasksByPriority(byStatus[status]);
    }
  });
  return sorted;
}
function getStatusCounts(byStatus) {
  return {
    backlog: byStatus.backlog ? byStatus.backlog.length : 0,
    todo: byStatus.todo ? byStatus.todo.length : 0,
    progress: byStatus.progress ? byStatus.progress.length : 0,
    review: byStatus.review ? byStatus.review.length : 0,
    done: byStatus.done ? byStatus.done.length : 0
  };
}
function filterTasksByUpdatedTime(tasks2, cutoffTime, getTaskUpdatedTime2) {
  if (cutoffTime === null) {
    return tasks2;
  }
  return tasks2.filter((task) => getTaskUpdatedTime2(task) >= cutoffTime);
}
function prepareKanbanData(tasks2, options = {}) {
  const {
    showBacklog = false,
    sortMode: sortMode2 = "priority",
    manualTaskOrder: manualTaskOrder2 = null,
    updatedCutoff = null,
    getTaskUpdatedTime: getTaskUpdatedTime2 = null
  } = options;
  let filteredTasks = tasks2;
  if (updatedCutoff !== null && getTaskUpdatedTime2) {
    filteredTasks = filterTasksByUpdatedTime(tasks2, updatedCutoff, getTaskUpdatedTime2);
  }
  const byStatus = groupTasksByStatus(filteredTasks, showBacklog);
  const sorted = sortGroupedTasks(byStatus, sortMode2, manualTaskOrder2);
  const counts = getStatusCounts(sorted);
  return {
    byStatus: sorted,
    counts,
    totalFiltered: filteredTasks.length,
    totalOriginal: tasks2.length
  };
}
function generateKanbanColumnHTML(tasks2, helpers) {
  return tasks2.map((task) => generateTaskCardHTML(task, helpers)).join("");
}

// src/views/listView.js
function sortTasksByPriorityAndDate(tasks2) {
  return [...tasks2].sort((a, b) => {
    const priorityA = PRIORITY_ORDER[a.priority] || 0;
    const priorityB = PRIORITY_ORDER[b.priority] || 0;
    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }
    const dateA = a.endDate ? new Date(a.endDate) : null;
    const dateB = b.endDate ? new Date(b.endDate) : null;
    if (dateA && dateB) {
      return dateA - dateB;
    }
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;
    return 0;
  });
}
function getColumnSortValue(task, column, projects2 = [], getTaskUpdatedTime2 = null) {
  switch (column) {
    case "title":
      return (task.title || "").toLowerCase();
    case "status": {
      const order = STATUS_ORDER || { backlog: 0, todo: 1, progress: 2, review: 3, done: 4 };
      return order[task.status] ?? 0;
    }
    case "priority": {
      const order = { low: 0, medium: 1, high: 2 };
      return order[task.priority] ?? 0;
    }
    case "project": {
      const proj = projects2.find((p) => p.id === task.projectId);
      return proj ? proj.name.toLowerCase() : "";
    }
    case "startDate":
      return task.startDate || "";
    case "endDate":
      return task.endDate || "";
    case "updatedAt":
      return getTaskUpdatedTime2 ? getTaskUpdatedTime2(task) : 0;
    default:
      return "";
  }
}
function sortTasksByColumn(tasks2, column, direction, projects2 = [], getTaskUpdatedTime2 = null) {
  if (!column) {
    return tasks2;
  }
  return [...tasks2].sort((a, b) => {
    const aVal = getColumnSortValue(a, column, projects2, getTaskUpdatedTime2);
    const bVal = getColumnSortValue(b, column, projects2, getTaskUpdatedTime2);
    if (aVal < bVal) return direction === "asc" ? -1 : 1;
    if (aVal > bVal) return direction === "asc" ? 1 : -1;
    return 0;
  });
}
function calculateSmartDateInfo(endDate, status = null) {
  if (!endDate) {
    return {
      text: null,
      // Caller should provide translated "No end date" text
      class: "",
      showPrefix: false,
      hasDate: false
    };
  }
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(endDate);
  dueDate.setHours(0, 0, 0, 0);
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
  if (diffDays < 0) {
    if (status === "done") {
      return {
        text: null,
        // Caller should format the date
        class: "",
        showPrefix: true,
        hasDate: true,
        diffDays,
        urgency: "completed"
      };
    }
    return {
      text: null,
      // Caller should provide translated overdue text
      class: "overdue",
      showPrefix: true,
      hasDate: true,
      diffDays,
      daysOverdue: Math.abs(diffDays),
      urgency: "overdue"
    };
  } else if (diffDays === 0) {
    return {
      text: null,
      // Caller should provide "Today" text
      class: "today",
      showPrefix: true,
      hasDate: true,
      diffDays,
      urgency: "today"
    };
  } else if (diffDays === 1) {
    return {
      text: null,
      // Caller should provide "Tomorrow" text
      class: "soon",
      showPrefix: true,
      hasDate: true,
      diffDays,
      urgency: "tomorrow"
    };
  } else if (diffDays <= 7) {
    return {
      text: null,
      // Caller should format the date
      class: "soon",
      showPrefix: true,
      hasDate: true,
      diffDays,
      urgency: "soon"
    };
  } else {
    return {
      text: null,
      // Caller should format the date
      class: "",
      showPrefix: true,
      hasDate: true,
      diffDays,
      urgency: "normal"
    };
  }
}
function generateTaskRowHTML(task, helpers) {
  const {
    escapeHtml: escapeHtml2,
    formatDate: formatDate2,
    getTagColor: getTagColor2,
    getProjectColor: getProjectColor2,
    getPriorityLabel: getPriorityLabel2,
    getStatusLabel: getStatusLabel2,
    formatTaskUpdatedDateTime: formatTaskUpdatedDateTime2,
    projects: projects2,
    noProjectText,
    noDateText
  } = helpers;
  const statusClass = `status-badge ${task.status}`;
  const proj = projects2.find((p) => p.id === task.projectId);
  const projName = proj ? proj.name : noProjectText;
  const start = task.startDate ? formatDate2(task.startDate) : noDateText;
  const due = task.endDate ? formatDate2(task.endDate) : noDateText;
  const updated = formatTaskUpdatedDateTime2(task) || "";
  const prText = task.priority ? getPriorityLabel2(task.priority) : "";
  const tagsHTML = task.tags && task.tags.length > 0 ? task.tags.map((tag) => `<span style="background-color: ${getTagColor2(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-right: 4px; font-weight: 500;">${escapeHtml2(tag.toUpperCase())}</span>`).join("") : "";
  const projectIndicator = proj ? `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor2(proj.id)}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>` : "";
  const rowClass = task.status === "done" ? " task-row-done" : "";
  return `
        <tr class="task-row${rowClass}" data-action="openTaskDetails" data-param="${task.id}">
            <td>${projectIndicator}${escapeHtml2(task.title || "")}</td>
            <td><span class="priority-badge priority-${task.priority}">${prText}</span></td>
            <td><span class="${statusClass}">${getStatusLabel2(task.status).toUpperCase()}</span></td>
            <td>${tagsHTML || '<span style="color: var(--text-muted); font-size: 12px;">-</span>'}</td>
            <td>${escapeHtml2(projName)}</td>
            <td>${start}</td>
            <td>${due}</td>
            <td>${escapeHtml2(updated)}</td>
        </tr>
    `;
}
function generateListViewHTML(tasks2, helpers) {
  return tasks2.map((task) => generateTaskRowHTML(task, helpers)).join("");
}
function prepareListViewData(tasks2, options = {}) {
  const {
    currentSort: currentSort2 = null,
    projects: projects2 = [],
    updatedCutoff = null,
    getTaskUpdatedTime: getTaskUpdatedTime2 = null
  } = options;
  let filteredTasks = tasks2;
  if (updatedCutoff !== null && getTaskUpdatedTime2) {
    filteredTasks = tasks2.filter((t2) => getTaskUpdatedTime2(t2) >= updatedCutoff);
  }
  let sortedTasks = sortTasksByPriorityAndDate(filteredTasks);
  if (currentSort2 && currentSort2.column) {
    sortedTasks = sortTasksByColumn(
      sortedTasks,
      currentSort2.column,
      currentSort2.direction,
      projects2,
      getTaskUpdatedTime2
    );
  }
  return {
    tasks: sortedTasks,
    count: sortedTasks.length,
    totalOriginal: tasks2.length
  };
}

// src/views/calendar.js
function calculateCalendarGrid(year, month) {
  let firstDayOfWeek = new Date(year, month, 1).getDay();
  firstDayOfWeek = (firstDayOfWeek + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const totalCells = firstDayOfWeek + daysInMonth;
  const cellsNeeded = Math.ceil(totalCells / 7) * 7;
  const nextMonthDays = cellsNeeded - totalCells;
  return {
    firstDayOfWeek,
    daysInMonth,
    daysInPrevMonth,
    totalCells,
    cellsNeeded,
    nextMonthDays,
    totalRows: Math.ceil(cellsNeeded / 7)
  };
}
function generateCalendarDays(year, month, options = {}) {
  const { today = /* @__PURE__ */ new Date() } = options;
  const grid = calculateCalendarGrid(year, month);
  const days = [];
  const isCurrentMonth2 = today.getMonth() === month && today.getFullYear() === year;
  const todayDate = today.getDate();
  let cellIndex = 0;
  for (let i = grid.firstDayOfWeek - 1; i >= 0; i--) {
    const day = grid.daysInPrevMonth - i;
    days.push({
      day,
      type: "prev-month",
      row: Math.floor(cellIndex / 7),
      column: cellIndex % 7,
      isWeekend: cellIndex % 7 >= 5,
      dateStr: null
      // Not clickable
    });
    cellIndex++;
  }
  for (let day = 1; day <= grid.daysInMonth; day++) {
    const dateStr = formatDateISO(year, month, day);
    const isToday = isCurrentMonth2 && day === todayDate;
    const column = cellIndex % 7;
    days.push({
      day,
      type: "current-month",
      row: Math.floor(cellIndex / 7),
      column,
      isWeekend: column >= 5,
      isToday,
      dateStr
    });
    cellIndex++;
  }
  for (let day = 1; day <= grid.nextMonthDays; day++) {
    days.push({
      day,
      type: "next-month",
      row: Math.floor(cellIndex / 7),
      column: cellIndex % 7,
      isWeekend: cellIndex % 7 >= 5,
      dateStr: null
      // Not clickable
    });
    cellIndex++;
  }
  return days;
}
function formatDateISO(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function isDateInProjectRange(dateStr, project) {
  if (!project.startDate) return false;
  const currentDate = new Date(dateStr);
  const startDate = new Date(project.startDate);
  const endDate = project.endDate ? new Date(project.endDate) : new Date(project.startDate);
  return currentDate >= startDate && currentDate <= endDate;
}
function countOverlappingProjects(dateStr, projects2, filteredProjectIds = null) {
  return projects2.filter((project) => {
    if (filteredProjectIds && !filteredProjectIds.has(project.id)) {
      return false;
    }
    return isDateInProjectRange(dateStr, project);
  }).length;
}
function getTasksForDate(dateStr, tasks2, options = {}) {
  const { includeBacklog = false, useStartDate = false } = options;
  return tasks2.filter((task) => {
    if (!includeBacklog && task.status === "backlog") {
      return false;
    }
    if (task.endDate === dateStr) {
      return true;
    }
    if (useStartDate && task.startDate === dateStr) {
      return true;
    }
    return false;
  });
}
function calculateMonthNavigation(year, month, delta) {
  let newMonth = month + delta;
  let newYear = year;
  if (newMonth < 0) {
    newMonth = 11;
    newYear--;
  } else if (newMonth > 11) {
    newMonth = 0;
    newYear++;
  }
  return { year: newYear, month: newMonth };
}
function isCurrentMonth(year, month, today = /* @__PURE__ */ new Date()) {
  return today.getMonth() === month && today.getFullYear() === year;
}
function prepareCalendarData(year, month, options = {}) {
  const {
    tasks: tasks2 = [],
    projects: projects2 = [],
    filteredProjectIds = null,
    includeBacklog = false,
    today = /* @__PURE__ */ new Date()
  } = options;
  const grid = calculateCalendarGrid(year, month);
  const days = generateCalendarDays(year, month, { today });
  const enhancedDays = days.map((day) => {
    if (day.type !== "current-month") {
      return { ...day, taskCount: 0, projectCount: 0 };
    }
    const dayTasks = getTasksForDate(day.dateStr, tasks2, { includeBacklog });
    const projectCount = countOverlappingProjects(day.dateStr, projects2, filteredProjectIds);
    return {
      ...day,
      taskCount: dayTasks.length,
      projectCount,
      hasProjects: projectCount > 0
    };
  });
  return {
    year,
    month,
    grid,
    days: enhancedDays,
    isCurrentMonth: isCurrentMonth(year, month, today),
    totalRows: grid.totalRows
  };
}
function generateCalendarHeadersHTML(dayNames) {
  return dayNames.map((day, idx) => {
    const isWeekend = idx >= 5;
    return `<div class="calendar-day-header${isWeekend ? " weekend" : ""}">${day}</div>`;
  }).join("");
}
function generateCalendarDayHTML(dayInfo) {
  const { day, dateStr, type, row, isToday, isWeekend, hasProjects } = dayInfo;
  if (type !== "current-month") {
    return `<div class="calendar-day other-month" data-row="${row}">
            <div class="calendar-day-number">${day}</div>
            <div class="project-spacer" style="height:0px;"></div>
        </div>`;
  }
  const todayClass = isToday ? " today" : "";
  const weekendClass = isWeekend ? " weekend" : "";
  return `<div class="calendar-day${todayClass}${weekendClass}" data-row="${row}" data-action="showDayTasks" data-param="${dateStr}" data-has-project="${hasProjects}">
        <div class="calendar-day-number">${day}</div>
        <div class="project-spacer" style="height:0px;"></div>
        <div class="tasks-container"></div>
    </div>`;
}
function generateCalendarGridHTML(calendarData, dayNames) {
  const { days } = calendarData;
  let html = generateCalendarHeadersHTML(dayNames);
  days.forEach((day, cellIndex) => {
    const row = Math.floor(cellIndex / 7);
    const isWeekend = cellIndex % 7 >= 5;
    html += generateCalendarDayHTML({
      ...day,
      row,
      isWeekend
    });
  });
  return html;
}

// src/views/projectsView.js
function calculateProjectTaskStats(tasks2, projectId) {
  const projectTasks = tasks2.filter((t2) => t2.projectId === projectId);
  const stats = {
    total: projectTasks.length,
    backlog: 0,
    todo: 0,
    progress: 0,
    review: 0,
    done: 0
  };
  projectTasks.forEach((task) => {
    if (stats.hasOwnProperty(task.status)) {
      stats[task.status]++;
    }
  });
  return stats;
}
function sortProjectTasks(tasks2) {
  return [...tasks2].sort((a, b) => {
    const aPriority = PRIORITY_ORDER[a.priority || "low"] || 1;
    const bPriority = PRIORITY_ORDER[b.priority || "low"] || 1;
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    const aStatus = STATUS_ORDER[a.status || "todo"] || 4;
    const bStatus = STATUS_ORDER[b.status || "todo"] || 4;
    return aStatus - bStatus;
  });
}
function generateProjectItemHTML(project, allTasks, helpers) {
  const {
    escapeHtml: escapeHtml2,
    formatDatePretty: formatDatePretty2,
    getProjectColor: getProjectColor2,
    getProjectStatus: getProjectStatus2,
    getProjectStatusLabel: getProjectStatusLabel2,
    getTagColor: getTagColor2,
    getPriorityLabel: getPriorityLabel2,
    getStatusLabel: getStatusLabel2,
    getLocale: getLocale2,
    t: t2
  } = helpers;
  const projectTasks = allTasks.filter((task) => task.projectId === project.id);
  const stats = calculateProjectTaskStats(allTasks, project.id);
  const { done: completed, progress: inProgress, review, todo, backlog, total } = stats;
  const completedPct = total > 0 ? completed / total * 100 : 0;
  const completionPct = total > 0 ? Math.round(completed / total * 100) : 0;
  const swatchColor = getProjectColor2(project.id);
  const projectStatus = getProjectStatus2(project.id);
  const sortedTasks = sortProjectTasks(projectTasks);
  const tasksHtml = sortedTasks.length > 0 ? sortedTasks.map((task) => {
    const priority = task.priority || "low";
    const hasStartDate = task.startDate && task.startDate !== "";
    const hasEndDate = task.endDate && task.endDate !== "";
    let dateRangeHtml = "";
    if (hasStartDate && hasEndDate) {
      dateRangeHtml = `<span class="date-badge">${formatDatePretty2(task.startDate, getLocale2())}</span><span class="date-arrow">\u2192</span><span class="date-badge">${formatDatePretty2(task.endDate, getLocale2())}</span>`;
    } else if (hasEndDate) {
      dateRangeHtml = `<span class="date-badge">${formatDatePretty2(task.endDate, getLocale2())}</span>`;
    } else if (hasStartDate) {
      dateRangeHtml = `<span class="date-badge">${formatDatePretty2(task.startDate, getLocale2())}</span>`;
    }
    return `
                <div class="expanded-task-item" data-action="openTaskDetails" data-param="${task.id}" data-stop-propagation="true">
                    <div class="expanded-task-info">
                        <div class="expanded-task-name">${escapeHtml2(task.title)}</div>
                        ${dateRangeHtml || task.tags && task.tags.length > 0 ? `
                            <div class="expanded-task-meta">
                                ${task.tags && task.tags.length > 0 ? `
                                    <div class="task-tags">
                                        ${task.tags.map((tag) => `<span style="background-color: ${getTagColor2(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml2(tag.toUpperCase())}</span>`).join(" ")}
                                    </div>
                                ` : ""}
                                ${dateRangeHtml ? `<div class="expanded-task-dates">${dateRangeHtml}</div>` : ""}
                            </div>
                        ` : ""}
                    </div>
                    <div class="expanded-task-priority">
                        <div class="priority-chip priority-${priority}">${getPriorityLabel2(priority)}</div>
                    </div>
                    <div class="expanded-task-status-col">
                        <div class="expanded-task-status ${task.status}">${getStatusLabel2(task.status)}</div>
                    </div>
                </div>
            `;
  }).join("") : `<div class="no-tasks-message">${t2("tasks.noTasksInProject")}</div>`;
  return `
        <div class="project-list-item" id="project-item-${project.id}">
            <div class="project-row" data-action="toggleProjectExpand" data-param="${project.id}">
                <div class="project-chevron">\u25B8</div>
                <div class="project-info">
                    <div class="project-swatch" style="background: ${swatchColor};"></div>
                    <div class="project-name-desc">
                        <div class="project-title project-title-link" data-action="showProjectDetails" data-param="${project.id}" data-stop-propagation="true">${escapeHtml2(project.name || t2("projects.untitled"))}</div>
                        ${project.tags && project.tags.length > 0 ? `
                            <div class="project-tags-row">
                                ${project.tags.map((tag) => `<span class="project-tag" style="background-color: ${getProjectColor2(project.id)};">${escapeHtml2(tag.toUpperCase())}</span>`).join("")}
                            </div>
                        ` : ""}
                        <div class="project-description">${escapeHtml2(project.description || t2("projects.noDescription"))}</div>
                    </div>
                </div>
                <div class="project-status-col">
                    <span class="project-status-badge ${projectStatus}">${getProjectStatusLabel2(projectStatus).toUpperCase()}</span>
                </div>
                <div class="project-progress-col">
                    <div class="progress-bar-wrapper">
                        <div class="progress-segment done" style="width: ${completedPct}%;"></div>
                    </div>
                    <div class="progress-percent">${completionPct}%</div>
                </div>
                <div class="project-tasks-col">
                    <span class="project-tasks-breakdown">${t2("projects.tasksBreakdown", { total, done: completed })}</span>
                </div>
                <div class="project-dates-col">
                    <span class="date-badge">${formatDatePretty2(project.startDate, getLocale2())}</span>
                    <span class="date-arrow">\u2192</span>
                    <span class="date-badge">${formatDatePretty2(project.endDate, getLocale2())}</span>
                </div>
            </div>
            <div class="project-tasks-expanded">
                <div class="expanded-tasks-container">
                    <div class="expanded-tasks-header">
                        <span>\u{1F4CB} ${t2("projects.details.tasksTitle", { count: total })}</span>
                        <button class="add-btn expanded-add-task-btn" type="button" data-action="openTaskModalForProject" data-param="${project.id}" data-stop-propagation="true">${t2("tasks.addButton")}</button>
                    </div>
                    ${tasksHtml}
                </div>
            </div>
        </div>
    `;
}

// src/components/taskDetails.js
function calculateMobileFieldPlacement(task, options = {}) {
  const { startDateWasEverSet = false, endDateWasEverSet = false } = options;
  const hasTags = Array.isArray(task?.tags) && task.tags.length > 0;
  const hasStartDate = typeof task?.startDate === "string" && task.startDate.trim() !== "";
  const hasEndDate = typeof task?.endDate === "string" && task.endDate.trim() !== "";
  const hasLinks = Array.isArray(task?.attachments) && task.attachments.some(
    (att) => att.type === "link" || att.url && att.type !== "file"
  );
  const startDateInGeneral = startDateWasEverSet || hasStartDate;
  const endDateInGeneral = endDateWasEverSet || hasEndDate;
  const tagsInGeneral = hasTags;
  const linksInGeneral = hasLinks;
  return {
    hasTags,
    hasStartDate,
    hasEndDate,
    hasLinks,
    startDateInGeneral,
    endDateInGeneral,
    tagsInGeneral,
    linksInGeneral
  };
}
function shouldHideDetailsTab(fieldState) {
  return fieldState.hasTags && fieldState.hasLinks;
}
function generateTagHTML(tag, options) {
  const { isMobile = false, getTagColor: getTagColor2, escapeHtml: escapeHtml2 } = options;
  const padding = isMobile ? "3px 6px" : "4px 8px";
  const fontSize = isMobile ? "11px" : "12px";
  const gap = isMobile ? "4px" : "4px";
  const buttonSize = isMobile ? "12px" : "14px";
  const lineHeight = isMobile ? "1.2" : "1.4";
  const color = getTagColor2(tag);
  return `
        <span class="task-tag" style="background-color: ${color}; color: white; padding: ${padding}; border-radius: 4px; font-size: ${fontSize}; display: inline-flex; align-items: center; gap: ${gap}; line-height: ${lineHeight};">
            ${escapeHtml2(tag.toUpperCase())}
            <button type="button" data-action="removeTag" data-param="${escapeHtml2(tag)}" style="background: none; border: none; color: white; cursor: pointer; padding: 0; margin: 0; font-size: ${buttonSize}; line-height: 1; display: inline-flex; align-items: center; justify-content: center; width: auto; min-width: auto;">\xD7</button>
        </span>
    `;
}
function generateTagsDisplayHTML(tags, options) {
  const { noTagsText = "No tags" } = options;
  if (!tags || tags.length === 0) {
    return `<span style="color: var(--text-muted); font-size: 13px;">${noTagsText}</span>`;
  }
  return tags.map((tag) => generateTagHTML(tag, options)).join("");
}

// src/core/events.js
function setupEventDelegation(deps) {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const param = target.dataset.param;
    const param2 = target.dataset.param2;
    const actions = {
      // Theme & UI
      "toggleTheme": () => deps.toggleTheme(),
      "showCalendarView": () => deps.showCalendarView(),
      "toggleKanbanSettings": () => deps.toggleKanbanSettings(event),
      // Modals
      "openProjectModal": () => deps.openProjectModal(),
      "openTaskModal": () => deps.openTaskModal(),
      "openSettingsModal": () => {
        deps.closeUserDropdown();
        deps.openSettingsModal();
      },
      "openTaskModalForProject": () => deps.openTaskModalForProject(parseInt(param)),
      "openSelectedProjectFromTask": () => deps.openSelectedProjectFromTask(),
      "closeModal": () => deps.closeModal(param),
      "closeTaskModal": () => deps.closeTaskModal(),
      "closeConfirmModal": () => deps.closeConfirmModal(),
      "closeFeedbackDeleteModal": () => deps.closeFeedbackDeleteModal(),
      "closeProjectConfirmModal": () => deps.closeProjectConfirmModal(),
      "closeUnsavedChangesModal": () => deps.closeUnsavedChangesModal(),
      "closeDayItemsModal": () => deps.closeDayItemsModal(),
      "closeDayItemsModalOnBackdrop": () => deps.closeDayItemsModalOnBackdrop(event),
      // Task operations
      "openTaskDetails": () => {
        if (target.dataset.stopPropagation) event.stopPropagation();
        const taskId = parseInt(param);
        const projectTasksList = target.closest("#project-tasks-list");
        if (projectTasksList) {
          const projectDetailsPage = document.getElementById("project-details");
          if (projectDetailsPage && projectDetailsPage.classList.contains("active")) {
            const taskItems = Array.from(projectTasksList.querySelectorAll(".project-task-item[data-param]"));
            const taskIds = taskItems.map((item) => parseInt(item.dataset.param));
            const currentIndex = taskIds.indexOf(taskId);
            if (currentIndex !== -1 && taskIds.length > 1) {
              const hash = window.location.hash;
              const projectIdMatch = hash.match(/project-(\d+)/);
              const projectId = projectIdMatch ? parseInt(projectIdMatch[1]) : null;
              const navContext = {
                projectId,
                taskIds,
                currentIndex
              };
              deps.openTaskDetails(taskId, navContext);
              return;
            }
          }
        }
        const expandedTaskItem = target.closest(".expanded-task-item");
        if (expandedTaskItem) {
          let projectCard = expandedTaskItem.closest(".project-card-mobile");
          let projectId = null;
          if (projectCard) {
            projectId = parseInt(projectCard.dataset.projectId);
          } else {
            const projectListItem = expandedTaskItem.closest(".project-list-item");
            if (projectListItem && projectListItem.id) {
              const match = projectListItem.id.match(/project-item-(\d+)/);
              if (match) {
                projectId = parseInt(match[1]);
              }
            }
          }
          if (projectId) {
            const taskContainer = expandedTaskItem.closest(".expanded-tasks-container");
            if (taskContainer) {
              const taskItems = Array.from(taskContainer.querySelectorAll(".expanded-task-item[data-param]"));
              const taskIds = taskItems.map((item) => parseInt(item.dataset.param));
              const currentIndex = taskIds.indexOf(taskId);
              if (currentIndex !== -1 && taskIds.length > 1) {
                const navContext = {
                  projectId,
                  taskIds,
                  currentIndex
                };
                deps.openTaskDetails(taskId, navContext);
                return;
              }
            }
          }
        }
        deps.openTaskDetails(taskId);
      },
      "deleteTask": () => deps.deleteTask(),
      "duplicateTask": () => deps.duplicateTask(),
      "confirmDelete": () => deps.confirmDelete(),
      // Project operations
      "showProjectDetails": () => {
        if (target.dataset.stopPropagation) event.stopPropagation();
        const isDashboard = document.getElementById("dashboard").classList.contains("active");
        const referrer = isDashboard ? "dashboard" : "projects";
        deps.showProjectDetails(parseInt(param), referrer);
      },
      "toggleProjectExpand": () => deps.toggleProjectExpand(parseInt(param)),
      "toggleProjectMenu": () => deps.toggleProjectMenu(event),
      "editProjectTitle": () => deps.editProjectTitle(parseInt(param), param2),
      "saveProjectTitle": () => deps.saveProjectTitle(parseInt(param)),
      "cancelProjectTitle": () => deps.cancelProjectTitle(),
      "handleDeleteProject": () => deps.handleDeleteProject(parseInt(param)),
      "handleDuplicateProject": () => deps.handleDuplicateProject(parseInt(param)),
      "toggleProjectColorPicker": () => deps.toggleProjectColorPicker(parseInt(param)),
      "updateProjectColor": () => deps.updateProjectColor(parseInt(param), param2),
      "openCustomProjectColorPicker": () => deps.openCustomProjectColorPicker(parseInt(param)),
      "navigateToProjectStatus": () => deps.navigateToProjectStatus(parseInt(param), param2),
      "deleteProject": () => deps.deleteProject(),
      "confirmProjectDelete": () => deps.confirmProjectDelete(),
      "closeDuplicateProjectModal": () => deps.closeDuplicateProjectModal(),
      "confirmDuplicateProject": () => deps.confirmDuplicateProject(),
      // Feedback operations
      "addFeedbackItem": () => deps.addFeedbackItem(),
      "deleteFeedbackItem": () => deps.deleteFeedbackItem(parseInt(param)),
      "confirmFeedbackDelete": () => deps.confirmFeedbackDelete(),
      // History operations
      "toggleHistoryEntryInline": () => deps.toggleHistoryEntryInline(parseInt(param)),
      // Formatting
      "formatTaskText": () => deps.formatTaskText(param),
      "insertTaskHeading": () => deps.insertTaskHeading(param),
      "insertTaskDivider": () => deps.insertTaskDivider(),
      // Sorting & filtering
      "sortTable": () => deps.sortTable(param),
      "toggleSortMode": () => deps.toggleSortMode(),
      // Calendar
      "changeMonth": () => deps.animateCalendarMonthChange(parseInt(param)),
      "goToToday": () => deps.goToToday(),
      "showDayTasks": () => deps.showDayTasks(param),
      // Attachments & tags
      "addAttachment": () => deps.addAttachment(),
      "addFileAttachment": () => deps.addFileAttachment(event),
      "addTag": () => deps.addTag(),
      "removeTag": () => deps.removeTag(param),
      "addProjectTag": () => deps.addProjectTag(),
      "removeProjectTag": () => deps.removeProjectTag(param),
      "addProjectDetailsTag": () => deps.addProjectDetailsTag(param),
      "removeProjectDetailsTag": () => deps.removeProjectDetailsTag(param),
      "removeAttachment": () => {
        deps.removeAttachment(parseInt(param));
        event.preventDefault();
      },
      "openUrlAttachment": () => {
        if (!param) return;
        try {
          const href = decodeURIComponent(param);
          window.open(href, "_blank", "noopener,noreferrer");
        } catch (e) {
          console.error("Failed to open URL attachment:", e);
        }
      },
      "downloadFileAttachment": () => deps.downloadFileAttachment(param, param2, target.dataset.param3),
      "viewFile": () => deps.viewFile(param, param2, target.dataset.param3),
      "viewImageLegacy": () => deps.viewImageLegacy(param, param2),
      "viewFeedbackScreenshot": () => {
        if (!param) return;
        try {
          const decoded = decodeURIComponent(param);
          const src = decoded;
          const title = "Feedback Screenshot";
          deps.viewImageLegacy(src, title);
        } catch (e) {
          console.error("Failed to open feedback screenshot", e);
          deps.showErrorNotification && deps.showErrorNotification(deps.t("error.openScreenshotFailed"));
        }
      },
      // Navigation
      "backToProjects": () => deps.backToProjects(),
      "showAllActivity": () => deps.showAllActivity(),
      "backToDashboard": () => deps.backToDashboard(),
      "backToCalendar": () => deps.backToCalendar(),
      "openUpdatesFromNotification": () => deps.openUpdatesFromNotification(),
      "openDueTodayFromNotification": () => deps.openDueTodayFromNotification(),
      // Other
      "dismissKanbanTip": () => deps.dismissKanbanTip(),
      "confirmDiscardChanges": () => deps.confirmDiscardChanges(),
      "closeReviewStatusConfirmModal": () => deps.closeReviewStatusConfirmModal(),
      "confirmDisableReviewStatus": () => deps.confirmDisableReviewStatus(),
      "closeCalendarCreateModal": () => deps.closeCalendarCreateModal(),
      "confirmCreateTask": () => deps.confirmCreateTask(),
      "addTaskFromDayItemsModal": () => deps.addTaskFromDayItemsModal(),
      "signOut": () => deps.signOut(),
      "exportDashboardData": () => deps.exportDashboardData(),
      "closeExportDataModal": () => deps.closeExportDataModal(),
      "confirmExportData": () => deps.confirmExportData(),
      "generateReport": () => deps.generateReport(),
      "showStatusInfoModal": () => {
        event.stopPropagation();
        deps.showStatusInfoModal();
      },
      // Special case: stopPropagation
      "stopPropagation": () => event.stopPropagation(),
      // Special case: close modal only if backdrop is clicked
      "closeModalOnBackdrop": () => {
        if (event.target === target) {
          deps.closeModal(param);
        }
      },
      // Combined actions
      "closeDayItemsAndOpenTask": () => {
        deps.closeDayItemsModal();
        deps.openTaskDetails(parseInt(param));
      },
      "closeDayItemsAndShowProject": () => {
        deps.closeDayItemsModal();
        deps.showProjectDetails(parseInt(param), "calendar", {
          month: deps.getCurrentMonth(),
          year: deps.getCurrentYear()
        });
      },
      "deleteFeedbackItemWithStop": () => {
        deps.deleteFeedbackItem(parseInt(param));
        event.stopPropagation();
      }
    };
    if (actions[action]) {
      actions[action]();
    } else {
      console.warn(`No handler found for action: ${action}`);
    }
  });
}

// src/core/state.js
var appState = {
  projects: null,
  tasks: null,
  feedbackItems: null,
  feedbackIndex: null,
  projectCounter: null,
  taskCounter: null,
  feedbackCounter: null,
  projectsSortedView: null,
  selectedCards: null,
  lastSelectedCardId: null,
  projectToDelete: null,
  tempAttachments: null,
  projectNavigationReferrer: null,
  calendarNavigationState: null,
  previousPage: null,
  currentFeedbackScreenshotData: null,
  feedbackPendingPage: null,
  feedbackDonePage: null,
  settings: null
};

// app.js
var APP_JS_PARSE_START = typeof performance !== "undefined" ? performance.now() : Date.now();
var PERF_MARKS_SEEN = /* @__PURE__ */ new Set();
if (typeof performance !== "undefined" && typeof performance.mark === "function") {
  performance.mark("app_start");
  PERF_MARKS_SEEN.add("app_start");
}
var isMobileCache = null;
var isMobileCacheRaf = 0;
function computeIsMobile() {
  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(max-width: 768px)").matches || window.matchMedia("(pointer: coarse)").matches;
  }
  return window.innerWidth <= 768;
}
function getIsMobileCached() {
  if (isMobileCache === null) {
    isMobileCache = computeIsMobile();
    if (!isMobileCacheRaf && typeof requestAnimationFrame === "function") {
      isMobileCacheRaf = requestAnimationFrame(() => {
        isMobileCache = null;
        isMobileCacheRaf = 0;
      });
    }
  }
  return isMobileCache;
}
var APP_VERSION = "2.7.1";
var APP_VERSION_LABEL = `v${APP_VERSION}`;
function bindAppState() {
  const bindings = {
    projects: () => projects,
    tasks: () => tasks,
    feedbackItems: () => feedbackItems,
    feedbackIndex: () => feedbackIndex,
    projectCounter: () => projectCounter,
    taskCounter: () => taskCounter,
    feedbackCounter: () => feedbackCounter,
    projectsSortedView: () => projectsSortedView,
    selectedCards: () => selectedCards,
    lastSelectedCardId: () => lastSelectedCardId,
    projectToDelete: () => projectToDelete,
    tempAttachments: () => tempAttachments,
    projectNavigationReferrer: () => projectNavigationReferrer,
    calendarNavigationState: () => calendarNavigationState,
    previousPage: () => previousPage,
    currentFeedbackScreenshotData: () => currentFeedbackScreenshotData,
    feedbackPendingPage: () => feedbackPendingPage,
    feedbackDonePage: () => feedbackDonePage,
    settings: () => settings
  };
  Object.entries(bindings).forEach(([key, getter]) => {
    Object.defineProperty(appState, key, {
      get: getter,
      set: (val) => {
        switch (key) {
          case "projects":
            projects = val;
            break;
          case "tasks":
            tasks = val;
            break;
          case "feedbackItems":
            feedbackItems = val;
            break;
          case "feedbackIndex":
            feedbackIndex = val;
            break;
          case "projectCounter":
            projectCounter = val;
            break;
          case "taskCounter":
            taskCounter = val;
            break;
          case "feedbackCounter":
            feedbackCounter = val;
            break;
          case "projectsSortedView":
            projectsSortedView = val;
            break;
          case "selectedCards":
            selectedCards = val;
            break;
          case "lastSelectedCardId":
            lastSelectedCardId = val;
            break;
          case "projectToDelete":
            projectToDelete = val;
            break;
          case "tempAttachments":
            tempAttachments = val;
            break;
          case "projectNavigationReferrer":
            projectNavigationReferrer = val;
            break;
          case "calendarNavigationState":
            calendarNavigationState = val;
            break;
          case "previousPage":
            previousPage = val;
            break;
          case "currentFeedbackScreenshotData":
            currentFeedbackScreenshotData = val;
            break;
          case "feedbackPendingPage":
            feedbackPendingPage = val;
            break;
          case "feedbackDonePage":
            feedbackDonePage = val;
            break;
          case "settings":
            settings = val;
            break;
        }
      },
      configurable: true,
      enumerable: true
    });
  });
}
bindAppState();
function clearSelectedCards() {
  appState.selectedCards.clear();
  appState.lastSelectedCardId = null;
  document.querySelectorAll(".task-card.selected").forEach((card) => {
    card.classList.remove("selected");
  });
}
var SUPPORTED_LANGUAGES = ["en", "es"];
function normalizeLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(value) ? value : "en";
}
function getCurrentLanguage() {
  return normalizeLanguage(settings.language || "en");
}
function getLocale() {
  const lang = getCurrentLanguage();
  return I18N_LOCALES[lang] || I18N_LOCALES.en;
}
function t(key, vars) {
  const lang = getCurrentLanguage();
  const dict = I18N[lang] || I18N.en;
  let text = dict[key] || I18N.en[key] || key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      return String(vars[name]);
    }
    return match;
  });
}
function applyTranslations(root = document) {
  const elements = root.querySelectorAll("[data-i18n]");
  elements.forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const attr = el.getAttribute("data-i18n-attr");
    if (attr) {
      attr.split(",").map((name) => name.trim()).filter(Boolean).forEach((name) => {
        el.setAttribute(name, t(key));
      });
    } else {
      el.textContent = t(key);
    }
  });
}
window.i18n = {
  t,
  applyTranslations,
  getCurrentLanguage
};
function getStatusLabel(status) {
  const map = {
    backlog: t("tasks.status.backlog"),
    todo: t("tasks.status.todo"),
    progress: t("tasks.status.progress"),
    review: t("tasks.status.review"),
    done: t("tasks.status.done")
  };
  return map[status] || STATUS_LABELS[status] || status || "";
}
function getProjectStatusLabel(status) {
  const map = {
    backlog: t("projects.status.backlog"),
    planning: t("projects.status.planning"),
    active: t("projects.status.active"),
    completed: t("projects.status.completed")
  };
  return map[status] || status || "";
}
function getPriorityLabel(priority) {
  const map = {
    high: t("tasks.priority.high"),
    medium: t("tasks.priority.medium"),
    low: t("tasks.priority.low")
  };
  return map[priority] || getPriorityLabel(priority) || priority || "";
}
function applyLanguage() {
  settings.language = getCurrentLanguage();
  document.documentElement.lang = settings.language;
  applyTranslations();
  updateFeedbackPlaceholderForViewport();
  const timeZoneSelect = document.getElementById("email-notification-timezone");
  const timeZoneValue = document.getElementById("email-notification-timezone-value");
  if (timeZoneSelect && timeZoneValue) {
    timeZoneValue.textContent = timeZoneSelect.options?.[timeZoneSelect.selectedIndex]?.textContent || timeZoneSelect.value || "";
  }
  const avatarDropzone = document.getElementById("user-avatar-dropzone");
  if (avatarDropzone) {
    avatarDropzone.dataset.defaultText = t("settings.avatarUploadDefault");
    avatarDropzone.dataset.changeText = t("settings.avatarUploadChange");
  }
  const logoDropzone = document.getElementById("workspace-logo-dropzone");
  if (logoDropzone) {
    logoDropzone.dataset.defaultText = t("settings.logoUploadDefault");
    logoDropzone.dataset.changeText = t("settings.logoUploadChange");
  }
  const taskAttachmentDropzone = document.getElementById("attachment-file-dropzone");
  if (taskAttachmentDropzone) {
    const isMobileScreen = getIsMobileCached();
    const attachmentText = isMobileScreen ? t("tasks.modal.attachmentsDropzoneTap") : t("tasks.modal.attachmentsDropzoneDefault");
    taskAttachmentDropzone.dataset.defaultText = attachmentText;
    const textEl = taskAttachmentDropzone.querySelector(".task-attachment-dropzone-text");
    if (textEl) textEl.textContent = attachmentText;
  }
  const screenshotInput = document.getElementById("feedback-screenshot-url");
  if (screenshotInput) {
    const isMobileScreen = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 768px)").matches : getIsMobileCached();
    const screenshotDefaultText = isMobileScreen ? t("feedback.screenshotDropzoneTap") : t("feedback.screenshotDropzoneDefault");
    screenshotInput.dataset.defaultText = screenshotDefaultText;
    if (!screenshotInput.dataset.hasInlineImage) {
      screenshotInput.textContent = screenshotDefaultText;
    }
  }
  updateThemeMenuText();
  refreshUserAvatarSettingsUI();
  document.dispatchEvent(new CustomEvent("refresh-workspace-logo-ui"));
  updateTrendIndicators();
  try {
    updateSortUI();
  } catch (e) {
  }
  try {
    updateProjectsUpdatedFilterUI();
  } catch (e) {
  }
  try {
    updateKanbanUpdatedFilterUI();
  } catch (e) {
  }
  try {
    refreshProjectsSortLabel();
  } catch (e) {
  }
  renderProjectProgressBars();
  renderActivityFeed();
  renderUpdatesPage();
  updateNotificationState();
  renderInsights();
  try {
    refreshFlatpickrLocale();
  } catch (e) {
  }
  const activePeriod = document.querySelector(".filter-chip.active")?.dataset?.period || "week";
  updateDashboardForPeriod(activePeriod);
  const activityPage = document.getElementById("activity-page");
  if (activityPage && activityPage.classList.contains("active")) {
    renderAllActivity();
  }
  try {
    if (document.getElementById("projects")?.classList.contains("active")) {
      renderProjects();
    }
    if (document.getElementById("tasks")?.classList.contains("active")) {
      renderTasks();
      if (document.getElementById("list-view")?.classList.contains("active")) {
        renderListView();
      }
    }
    if (document.getElementById("calendar")?.classList.contains("active")) {
      renderCalendar();
    }
    if (document.getElementById("feedback")?.classList.contains("active")) {
      renderFeedback();
      updateFeedbackSaveStatus();
    }
  } catch (e) {
  }
}
var workspaceLogoDraft = {
  hasPendingChange: false,
  dataUrl: null
};
var avatarDraft = {
  hasPendingChange: false,
  dataUrl: null
};
var cropState = {
  originalImage: null,
  // Image object
  originalDataUrl: null,
  // Original data URL
  canvas: null,
  // Canvas element
  ctx: null,
  // Canvas context
  selection: {
    x: 0,
    y: 0,
    size: 0
    // Square size
  },
  isDragging: false,
  isResizing: false,
  dragStartX: 0,
  dragStartY: 0,
  activeHandle: null,
  shape: "square",
  // 'square' | 'circle' (UI + output mask)
  outputMimeType: "image/jpeg",
  outputMaxSize: null,
  // number (px) or null
  onApply: null,
  successMessage: null
};
var defaultWorkspaceIconText = null;
var APP_JS_IMPORTS_READY = typeof performance !== "undefined" ? performance.now() : Date.now();
var APP_JS_NAV_START = typeof window !== "undefined" && typeof window.__pageLoadStart === "number" ? window.__pageLoadStart : APP_JS_PARSE_START;
logPerformanceMilestone("app-js-executed", {
  sinceNavStartMs: Math.round(APP_JS_IMPORTS_READY - APP_JS_NAV_START)
});
try {
  window.addEventListener("resize", debounce(() => {
    isMobileCache = null;
  }, 150));
  window.addEventListener("orientationchange", () => {
    isMobileCache = null;
  });
} catch (e) {
}
var PERF_DEBUG_QUERY_KEY = "debugPerf";
var perfDebugForced = false;
function isPerfDebugQueryEnabled() {
  try {
    const url = new URL(window.location.href);
    const value = url.searchParams.get(PERF_DEBUG_QUERY_KEY);
    return value === "1" || value === "true";
  } catch (e) {
    return false;
  }
}
function markPerfOnce(label, meta) {
  if (PERF_MARKS_SEEN.has(label)) return;
  PERF_MARKS_SEEN.add(label);
  if (typeof performance !== "undefined" && typeof performance.mark === "function") {
    performance.mark(label);
  }
  logPerformanceMilestone(label, meta);
}
var projects = [];
var tasks = [];
var feedbackItems = [];
var feedbackIndex = [];
var projectCounter = 1;
var taskCounter = 1;
var feedbackCounter = 1;
var projectsSortedView = null;
var selectedCards = /* @__PURE__ */ new Set();
var lastSelectedCardId = null;
var projectToDelete = null;
var tempAttachments = [];
var projectNavigationReferrer = "projects";
var calendarNavigationState = null;
var previousPage = "";
var currentFeedbackScreenshotData = "";
var feedbackPendingPage = 1;
var feedbackDonePage = 1;
var FEEDBACK_ITEMS_PER_PAGE = 10;
var FEEDBACK_CACHE_KEY2 = "feedbackItemsCache:v1";
var settings = {
  autoSetStartDateOnStatusChange: false,
  autoSetEndDateOnStatusChange: false,
  enableReviewStatus: true,
  calendarIncludeBacklog: false,
  debugLogsEnabled: false,
  historySortOrder: "newest",
  language: "en",
  customWorkspaceLogo: null,
  notificationEmail: "",
  emailNotificationsEnabled: true,
  emailNotificationsWeekdaysOnly: false,
  emailNotificationsIncludeStartDates: false,
  emailNotificationsIncludeBacklog: false,
  emailNotificationTime: "09:00",
  emailNotificationTimeZone: "Atlantic/Canary"
};
if (isPerfDebugQueryEnabled()) {
  perfDebugForced = true;
  settings.debugLogsEnabled = true;
  applyDebugLogSetting(true);
}
[
  "projects",
  "tasks",
  "feedbackItems",
  "feedbackIndex",
  "projectCounter",
  "taskCounter",
  "feedbackCounter",
  "projectsSortedView",
  "selectedCards",
  "lastSelectedCardId",
  "projectToDelete",
  "tempAttachments",
  "projectNavigationReferrer",
  "calendarNavigationState",
  "previousPage",
  "currentFeedbackScreenshotData",
  "feedbackPendingPage",
  "feedbackDonePage",
  "settings"
].forEach((key) => {
  Object.defineProperty(appState, key, {
    get: () => {
      switch (key) {
        case "projects":
          return projects;
        case "tasks":
          return tasks;
        case "feedbackItems":
          return feedbackItems;
        case "feedbackIndex":
          return feedbackIndex;
        case "projectCounter":
          return projectCounter;
        case "taskCounter":
          return taskCounter;
        case "feedbackCounter":
          return feedbackCounter;
        case "projectsSortedView":
          return projectsSortedView;
        case "selectedCards":
          return selectedCards;
        case "lastSelectedCardId":
          return lastSelectedCardId;
        case "projectToDelete":
          return projectToDelete;
        case "tempAttachments":
          return tempAttachments;
        case "projectNavigationReferrer":
          return projectNavigationReferrer;
        case "calendarNavigationState":
          return calendarNavigationState;
        case "previousPage":
          return previousPage;
        case "currentFeedbackScreenshotData":
          return currentFeedbackScreenshotData;
        case "feedbackPendingPage":
          return feedbackPendingPage;
        case "feedbackDonePage":
          return feedbackDonePage;
        case "settings":
          return settings;
      }
    },
    set: (val) => {
      switch (key) {
        case "projects":
          projects = val;
          break;
        case "tasks":
          tasks = val;
          break;
        case "feedbackItems":
          feedbackItems = val;
          break;
        case "feedbackIndex":
          feedbackIndex = val;
          break;
        case "projectCounter":
          projectCounter = val;
          break;
        case "taskCounter":
          taskCounter = val;
          break;
        case "feedbackCounter":
          feedbackCounter = val;
          break;
        case "projectsSortedView":
          projectsSortedView = val;
          break;
        case "selectedCards":
          selectedCards = val;
          break;
        case "lastSelectedCardId":
          lastSelectedCardId = val;
          break;
        case "projectToDelete":
          projectToDelete = val;
          break;
        case "tempAttachments":
          tempAttachments = val;
          break;
        case "projectNavigationReferrer":
          projectNavigationReferrer = val;
          break;
        case "calendarNavigationState":
          calendarNavigationState = val;
          break;
        case "previousPage":
          previousPage = val;
          break;
        case "currentFeedbackScreenshotData":
          currentFeedbackScreenshotData = val;
          break;
        case "feedbackPendingPage":
          feedbackPendingPage = val;
          break;
        case "feedbackDonePage":
          feedbackDonePage = val;
          break;
        case "settings":
          settings = val;
          break;
      }
    },
    configurable: true,
    enumerable: true
  });
});
window.saveData = saveData;
window.loadData = loadData;
var isInitializing = false;
var pendingSaves = 0;
var __projectFieldDebounceTimers = /* @__PURE__ */ new Map();
function debouncedUpdateProjectField(projectId, field, value, options) {
  const opts = options || {};
  const delayMs = Number.isFinite(opts.delayMs) ? opts.delayMs : 500;
  const key = `${projectId}:${field}`;
  const existing = __projectFieldDebounceTimers.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    __projectFieldDebounceTimers.delete(key);
    updateProjectField2(projectId, field, value, opts);
  }, delayMs);
  __projectFieldDebounceTimers.set(key, timer);
}
function flushDebouncedProjectField(projectId, field, value, options) {
  const key = `${projectId}:${field}`;
  const existing = __projectFieldDebounceTimers.get(key);
  if (existing) {
    clearTimeout(existing);
    __projectFieldDebounceTimers.delete(key);
  }
  updateProjectField2(projectId, field, value, options || {});
}
var RELEASE_SEEN_STORAGE_KEY = "nautilusLastSeenReleaseId";
var NOTIFICATION_HISTORY_KEY = "nautilusNotificationHistory";
var NOTIFICATION_HISTORY_MAX_DAYS = 30;
var NOTIFICATION_STATE_CACHE_TTL = 3e4;
var NOTIFICATION_PENDING_SEEN_KEY = "nautilusNotificationPendingSeen";
var USE_SERVER_NOTIFICATIONS = true;
var notificationStateCache = { timestamp: 0, data: null };
var notificationPendingFlushInFlight = false;
function normalizeReleaseDate(dateStr) {
  if (!dateStr) return 0;
  const normalized = looksLikeDMY(dateStr) ? toISOFromDMY(dateStr) : dateStr;
  const time = Date.parse(normalized);
  return Number.isNaN(time) ? 0 : time;
}
function resolveReleaseText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const locale = getLocale();
    const lang = locale && locale.startsWith("es") ? "es" : "en";
    return value[lang] || value.en || value.es || "";
  }
  return String(value);
}
function getSortedReleaseNotes() {
  const list = Array.isArray(RELEASE_NOTES) ? [...RELEASE_NOTES] : [];
  return list.sort((a, b) => normalizeReleaseDate(b.date) - normalizeReleaseDate(a.date));
}
function getLatestReleaseNote() {
  const list = getSortedReleaseNotes();
  return list[0] || null;
}
function getLastSeenReleaseId() {
  try {
    return localStorage.getItem(RELEASE_SEEN_STORAGE_KEY) || "";
  } catch (e) {
    return "";
  }
}
function setLastSeenReleaseId(releaseId) {
  if (!releaseId) return;
  try {
    localStorage.setItem(RELEASE_SEEN_STORAGE_KEY, releaseId);
  } catch (e) {
  }
}
function formatReleaseDate(dateStr) {
  if (!dateStr) return "";
  return formatDatePretty(dateStr, getLocale());
}
function normalizeISODate(dateStr) {
  if (!dateStr) return "";
  if (looksLikeISO(dateStr)) return dateStr;
  if (looksLikeDMY(dateStr)) return toISOFromDMY(dateStr);
  return "";
}
function getNotificationHistory() {
  try {
    const raw = localStorage.getItem(NOTIFICATION_HISTORY_KEY);
    if (!raw) return { notifications: [], lastChecked: null };
    const data = JSON.parse(raw);
    return {
      notifications: Array.isArray(data.notifications) ? data.notifications : [],
      lastChecked: data.lastChecked || null
    };
  } catch (e) {
    return { notifications: [], lastChecked: null };
  }
}
function saveNotificationHistory(history) {
  try {
    localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
  }
}
function createNotificationId(type, taskId, date) {
  return `notif_${date}_${type}_${taskId}`;
}
function checkAndCreateDueTodayNotifications() {
  if (!Array.isArray(tasks) || tasks.length === 0) return;
  const notifyTimer = debugTimeStart("notifications", "create-due-today", {
    taskCount: tasks.length
  });
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const history = getNotificationHistory();
  const existingIds = new Set(history.notifications.map((n) => n.id));
  const newNotifications = [];
  const includeStartDates = settings.emailNotificationsIncludeStartDates !== false;
  const includeBacklog = !!settings.emailNotificationsIncludeBacklog;
  tasks.forEach((task) => {
    if (!task || task.status === "done" || !task.id) return;
    if (task.status === "backlog" && !includeBacklog) return;
    const start = normalizeISODate(task.startDate || "");
    const due = normalizeISODate(task.endDate || "");
    if (includeStartDates && start === today) {
      const notifId = createNotificationId("task_starting", task.id, today);
      if (!existingIds.has(notifId)) {
        newNotifications.push({
          id: notifId,
          type: "task_starting",
          taskId: task.id,
          date: today,
          read: false,
          dismissed: false,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    if (due === today) {
      const notifId = createNotificationId("task_due", task.id, today);
      if (!existingIds.has(notifId)) {
        newNotifications.push({
          id: notifId,
          type: "task_due",
          taskId: task.id,
          date: today,
          read: false,
          dismissed: false,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
  });
  const pastDays = 7;
  for (let i = 1; i <= pastDays; i++) {
    const pastDate = /* @__PURE__ */ new Date();
    pastDate.setDate(pastDate.getDate() - i);
    const pastDateStr = pastDate.toISOString().split("T")[0];
    tasks.forEach((task) => {
      if (!task || task.status === "done" || !task.id) return;
      const start = normalizeISODate(task.startDate || "");
      const due = normalizeISODate(task.endDate || "");
      if (includeStartDates && start === pastDateStr) {
        const notifId = createNotificationId("task_starting", task.id, pastDateStr);
        if (!existingIds.has(notifId)) {
          newNotifications.push({
            id: notifId,
            type: "task_starting",
            taskId: task.id,
            date: pastDateStr,
            read: false,
            dismissed: false,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      }
      if (due === pastDateStr) {
        const notifId = createNotificationId("task_due", task.id, pastDateStr);
        if (!existingIds.has(notifId)) {
          newNotifications.push({
            id: notifId,
            type: "task_due",
            taskId: task.id,
            date: pastDateStr,
            read: false,
            dismissed: false,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      }
    });
  }
  if (newNotifications.length > 0) {
    history.notifications.push(...newNotifications);
  }
  history.lastChecked = (/* @__PURE__ */ new Date()).toISOString();
  saveNotificationHistory(history);
  debugTimeEnd("notifications", notifyTimer, {
    newCount: newNotifications.length,
    totalCount: history.notifications.length
  });
}
function markAllNotificationsRead() {
  const history = getNotificationHistory();
  history.notifications.forEach((n) => {
    if (!n.dismissed) {
      n.read = true;
    }
  });
  saveNotificationHistory(history);
}
function dismissNotificationsByDate(date) {
  const history = getNotificationHistory();
  history.notifications.forEach((n) => {
    if (n.date === date) {
      n.dismissed = true;
    }
  });
  saveNotificationHistory(history);
}
function dismissAllNotifications() {
  const history = getNotificationHistory();
  history.notifications.forEach((n) => {
    n.dismissed = true;
  });
  saveNotificationHistory(history);
}
function cleanupOldNotifications() {
  const cleanupTimer = debugTimeStart("notifications", "cleanup");
  const history = getNotificationHistory();
  const beforeCount = history.notifications.length;
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(cutoffDate.getDate() - NOTIFICATION_HISTORY_MAX_DAYS);
  const cutoffISO = cutoffDate.toISOString().split("T")[0];
  history.notifications = history.notifications.filter((n) => {
    return n.date >= cutoffISO;
  });
  saveNotificationHistory(history);
  debugTimeEnd("notifications", cleanupTimer, {
    beforeCount,
    afterCount: history.notifications.length
  });
}
function getActiveNotifications() {
  const history = getNotificationHistory();
  return history.notifications.filter((n) => !n.dismissed);
}
function getUnreadNotificationCount() {
  const active = getActiveNotifications();
  return active.filter((n) => !n.read).length;
}
function getTaskNotificationsByDate() {
  const active = getActiveNotifications();
  const taskNotifs = active.filter((n) => n.type === "task_due" || n.type === "task_starting");
  const grouped = /* @__PURE__ */ new Map();
  taskNotifs.forEach((notif) => {
    if (!grouped.has(notif.date)) {
      grouped.set(notif.date, []);
    }
    grouped.get(notif.date).push(notif);
  });
  const sorted = Array.from(grouped.entries()).sort((a, b) => {
    return b[0].localeCompare(a[0]);
  });
  return sorted;
}
function buildNotificationState() {
  const stateTimer = debugTimeStart("notifications", "build-state");
  const latest = getLatestReleaseNote();
  const lastSeen = getLastSeenReleaseId();
  const releaseUnseen = false;
  const taskNotificationsByDate = getTaskNotificationsByDate();
  const unreadCount = getUnreadNotificationCount();
  const state = {
    latest,
    releaseUnseen,
    taskNotificationsByDate,
    unreadCount
  };
  debugTimeEnd("notifications", stateTimer, {
    unreadCount,
    taskGroups: taskNotificationsByDate.length
  });
  return state;
}
function getNotificationAuthToken() {
  return window.authSystem?.getAuthToken?.() || localStorage.getItem("authToken");
}
function loadPendingNotificationSeen() {
  const raw = localStorage.getItem(NOTIFICATION_PENDING_SEEN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.seenAt) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}
function savePendingNotificationSeen(payload) {
  if (!payload || !payload.seenAt) return;
  localStorage.setItem(NOTIFICATION_PENDING_SEEN_KEY, JSON.stringify(payload));
}
function queueNotificationSeen(seenAt, clearAll = false) {
  const existing = loadPendingNotificationSeen();
  if (!existing) {
    savePendingNotificationSeen({ seenAt, clearAll: !!clearAll });
    return;
  }
  const existingTime = new Date(existing.seenAt).getTime();
  const nextTime = new Date(seenAt).getTime();
  const merged = {
    seenAt: Number.isFinite(existingTime) && Number.isFinite(nextTime) && existingTime > nextTime ? existing.seenAt : seenAt,
    clearAll: !!(existing.clearAll || clearAll)
  };
  savePendingNotificationSeen(merged);
}
async function flushPendingNotificationSeen() {
  if (!USE_SERVER_NOTIFICATIONS || notificationPendingFlushInFlight) return;
  const pending = loadPendingNotificationSeen();
  if (!pending) return;
  const token = getNotificationAuthToken();
  if (!token) return;
  notificationPendingFlushInFlight = true;
  try {
    const payload = {
      seenAt: pending.seenAt,
      clearAll: !!pending.clearAll
    };
    if (pending.dismissDate) {
      payload.dismissDate = pending.dismissDate;
    }
    const response = await fetch("/api/notifications/state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      localStorage.removeItem(NOTIFICATION_PENDING_SEEN_KEY);
    }
  } catch (error) {
    console.warn("[notifications] failed to flush pending seen", error);
  } finally {
    notificationPendingFlushInFlight = false;
  }
}
async function fetchNotificationState({ force = false } = {}) {
  if (USE_SERVER_NOTIFICATIONS) {
    await flushPendingNotificationSeen();
    const now = Date.now();
    if (!force && notificationStateCache.data && now - notificationStateCache.timestamp < NOTIFICATION_STATE_CACHE_TTL) {
      return notificationStateCache.data;
    }
    const token = getNotificationAuthToken();
    if (token) {
      try {
        const response = await fetch("/api/notifications/state", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (response.ok) {
          const payload = await response.json();
          const latest = getLatestReleaseNote();
          const releaseUnseen = false;
          const state = {
            latest,
            releaseUnseen,
            taskNotificationsByDate: Array.isArray(payload.taskNotificationsByDate) ? payload.taskNotificationsByDate : [],
            unreadCount: Number(payload.unreadCount) || 0
          };
          notificationStateCache = { timestamp: now, data: state };
          return state;
        }
      } catch (error) {
        console.warn("[notifications] failed to fetch server state", error);
      }
    }
  }
  return buildNotificationState();
}
function updateNotificationBadge(state = buildNotificationState()) {
  const badge = document.getElementById("notification-count");
  if (!badge) return;
  const releaseCount = state.releaseUnseen && state.latest ? 1 : 0;
  const total = releaseCount + state.unreadCount;
  if (total > 0) {
    badge.textContent = total > 99 ? "99+" : String(total);
    badge.classList.add("is-visible");
  } else {
    badge.textContent = "";
    badge.classList.remove("is-visible");
  }
}
function getRelativeDateLabel(dateStr) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const yesterday = /* @__PURE__ */ new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  if (dateStr === today) return t("notifications.today") || "Today";
  if (dateStr === yesterdayStr) return t("notifications.yesterday") || "Yesterday";
  return formatDatePretty(dateStr, getLocale());
}
function renderNotificationDropdown(state = buildNotificationState()) {
  const list = document.getElementById("notification-list");
  if (!list) return;
  const renderTimer = debugTimeStart("notifications", "render-dropdown", {
    taskGroups: state.taskNotificationsByDate.length,
    unreadCount: state.unreadCount
  });
  const sections = [];
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const includeBacklog = !!settings.emailNotificationsIncludeBacklog;
  state.taskNotificationsByDate.forEach(([date, notifications]) => {
    const dateLabel = getRelativeDateLabel(date);
    const startingTasks = notifications.filter((notif) => notif.type === "task_starting").map((notif) => taskMap.get(notif.taskId)).filter((task) => task && task.status !== "done" && (includeBacklog || task.status !== "backlog")).filter((task) => normalizeISODate(task.startDate || "") === date);
    const dueTasks = notifications.filter((notif) => notif.type === "task_due").map((notif) => taskMap.get(notif.taskId)).filter((task) => task && task.status !== "done" && (includeBacklog || task.status !== "backlog")).filter((task) => normalizeISODate(task.endDate || "") === date);
    if (startingTasks.length === 0 && dueTasks.length === 0) return;
    const sortTasks2 = (tasksArr) => [...tasksArr].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority || "low"] || 0;
      const pb = PRIORITY_ORDER[b.priority || "low"] || 0;
      if (pa !== pb) return pb - pa;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
    const sortedStartingTasks = sortTasks2(startingTasks);
    const sortedDueTasks = sortTasks2(dueTasks);
    const renderTaskList = (tasksArr) => {
      return tasksArr.slice(0, 3).map((task) => {
        const project = task.projectId ? projectMap.get(task.projectId) : null;
        const projectName = project ? project.name : "";
        const projectColor = project ? getProjectColor(project.id) : "";
        const priorityKey = (task.priority || "low").toLowerCase();
        const priorityLabel = ["high", "medium", "low"].includes(priorityKey) ? getPriorityLabel(priorityKey) : priorityKey || "";
        return `
                    <div class="notify-task" data-task-id="${task.id}">
                        <div class="notify-task-header">
                            <div class="notify-task-title">${escapeHtml(task.title || t("tasks.untitled"))}</div>
                            <span class="notify-priority notify-priority--${priorityKey}">${escapeHtml(priorityLabel)}</span>
                        </div>
                    </div>
                `;
      }).join("");
    };
    let taskListHTML = "";
    let totalCount = 0;
    let totalOverflow = 0;
    if (sortedStartingTasks.length > 0) {
      const preview = sortedStartingTasks.slice(0, 3);
      const overflow = Math.max(sortedStartingTasks.length - preview.length, 0);
      totalCount += sortedStartingTasks.length;
      totalOverflow += overflow;
      taskListHTML += `<div class="notify-section-subheader notify-section-subheader--starting">\u{1F680} STARTING <span class="notify-section-count notify-section-count--starting" aria-label="${sortedStartingTasks.length} starting tasks">${sortedStartingTasks.length}</span></div>`;
      taskListHTML += renderTaskList(preview);
      if (overflow > 0) {
        taskListHTML += `<div class="notify-task-overflow">+${overflow} more starting</div>`;
        taskListHTML += `<button type="button" class="notify-link notify-link--starting notify-link--full" data-action="openDueTodayFromNotification" data-date="${date}" data-date-field="startDate">View ${sortedStartingTasks.length} starting</button>`;
      }
    }
    if (sortedDueTasks.length > 0) {
      const preview = sortedDueTasks.slice(0, 3);
      const overflow = Math.max(sortedDueTasks.length - preview.length, 0);
      totalCount += sortedDueTasks.length;
      totalOverflow += overflow;
      if (sortedStartingTasks.length > 0) {
        taskListHTML += `<div style="height: 1px; background: var(--border); margin: 10px 0;"></div>`;
      }
      taskListHTML += `<div class="notify-section-subheader notify-section-subheader--due">\u{1F3AF} DUE <span class="notify-section-count notify-section-count--due" aria-label="${sortedDueTasks.length} due tasks">${sortedDueTasks.length}</span></div>`;
      taskListHTML += renderTaskList(preview);
      if (overflow > 0) {
        taskListHTML += `<div class="notify-task-overflow">+${overflow} more due</div>`;
        taskListHTML += `<button type="button" class="notify-link notify-link--due notify-link--full" data-action="openDueTodayFromNotification" data-date="${date}" data-date-field="endDate">View ${sortedDueTasks.length} due</button>`;
      }
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const isToday = date === today;
    sections.push(`
            <div class="notify-section notify-section--due" data-date="${date}">
                <div class="notify-section-heading">
                    <div class="notify-section-title">
                        <span class="notify-section-title-text">${dateLabel}</span>
                        ${!isToday ? `<div class="notify-section-title-actions"><button type="button" class="notify-dismiss-btn" data-action="dismissDate" data-date="${date}" aria-label="Dismiss" title="Dismiss">x</button></div>` : ""}
                    </div>
                </div>
                <div class="notify-task-list">
                    ${taskListHTML}
                </div>
            </div>
        `);
  });
  if (sections.length === 0) {
    sections.push(`<div class="notify-empty">${t("notifications.empty")}</div>`);
  }
  list.innerHTML = sections.join("");
  debugTimeEnd("notifications", renderTimer, {
    sections: sections.length,
    taskGroups: state.taskNotificationsByDate.length
  });
}
var updateNotificationStateTimer = null;
function updateNotificationState({ force = false } = {}) {
  if (updateNotificationStateTimer) {
    clearTimeout(updateNotificationStateTimer);
  }
  updateNotificationStateTimer = setTimeout(async () => {
    const state = await fetchNotificationState({ force });
    updateNotificationBadge(state);
    const dropdown = document.getElementById("notification-dropdown");
    if (dropdown && dropdown.classList.contains("active")) {
      renderNotificationDropdown(state);
    }
    updateNotificationStateTimer = null;
  }, 100);
}
async function markNotificationsSeen(state = null, { clearAll = false } = {}) {
  if (state && state.latest && state.latest.id) {
    setLastSeenReleaseId(state.latest.id);
  }
  if (USE_SERVER_NOTIFICATIONS) {
    const seenAt = (/* @__PURE__ */ new Date()).toISOString();
    const token = getNotificationAuthToken();
    if (!token) {
      queueNotificationSeen(seenAt, clearAll);
      const cached = state || notificationStateCache.data || buildNotificationState();
      const updatedState2 = {
        ...cached,
        unreadCount: 0
      };
      notificationStateCache = { timestamp: Date.now(), data: updatedState2 };
      updateNotificationBadge(updatedState2);
      return;
    }
    if (token) {
      try {
        const response = await fetch("/api/notifications/state", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            seenAt,
            clearAll: !!clearAll
          })
        });
        if (response.ok) {
          const cached = state || notificationStateCache.data || buildNotificationState();
          const updatedState2 = {
            ...cached,
            unreadCount: 0
          };
          notificationStateCache = { timestamp: Date.now(), data: updatedState2 };
          updateNotificationBadge(updatedState2);
          return;
        }
        queueNotificationSeen(seenAt, clearAll);
      } catch (error) {
        console.warn("[notifications] failed to mark seen", error);
        queueNotificationSeen((/* @__PURE__ */ new Date()).toISOString(), clearAll);
      }
    }
  }
  markAllNotificationsRead();
  const updatedState = buildNotificationState();
  updateNotificationBadge(updatedState);
}
async function dismissNotificationByDate(date) {
  if (USE_SERVER_NOTIFICATIONS) {
    const seenAt = (/* @__PURE__ */ new Date()).toISOString();
    const token = getNotificationAuthToken();
    if (!token) {
      savePendingNotificationSeen({ seenAt, dismissDate: date });
      if (notificationStateCache.data && notificationStateCache.data.taskNotificationsByDate) {
        const updatedState = {
          ...notificationStateCache.data,
          taskNotificationsByDate: notificationStateCache.data.taskNotificationsByDate.filter(([d]) => d !== date)
        };
        notificationStateCache = { timestamp: Date.now(), data: updatedState };
        updateNotificationBadge(updatedState);
        renderNotificationDropdown(updatedState);
      }
      return;
    }
    try {
      const response = await fetch("/api/notifications/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          seenAt,
          dismissDate: date
        })
      });
      if (response.ok) {
        if (notificationStateCache.data && notificationStateCache.data.taskNotificationsByDate) {
          const updatedState = {
            ...notificationStateCache.data,
            taskNotificationsByDate: notificationStateCache.data.taskNotificationsByDate.filter(([d]) => d !== date)
          };
          notificationStateCache = { timestamp: Date.now(), data: updatedState };
          updateNotificationBadge(updatedState);
          renderNotificationDropdown(updatedState);
        }
        return;
      }
      savePendingNotificationSeen({ seenAt, dismissDate: date });
    } catch (error) {
      console.warn("[notifications] failed to dismiss date", error);
      savePendingNotificationSeen({ seenAt, dismissDate: date });
    }
  } else {
    dismissNotificationsByDate(date);
    updateNotificationState();
  }
}
function markLatestReleaseSeen() {
  const latest = getLatestReleaseNote();
  if (!latest || !latest.id) return;
  setLastSeenReleaseId(latest.id);
  updateNotificationState();
}
function closeNotificationDropdown() {
  const dropdown = document.getElementById("notification-dropdown");
  const toggle = document.getElementById("notification-toggle");
  if (dropdown) {
    dropdown.classList.remove("active");
  }
  if (toggle) toggle.classList.remove("active");
  setNotificationScrollLock(false);
}
function setNotificationScrollLock(isLocked) {
  const isMobile = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 768px)").matches : false;
  if (!isMobile) return;
  document.body.classList.toggle("notify-scroll-lock", !!isLocked);
}
function setupNotificationMenu() {
  const toggle = document.getElementById("notification-toggle");
  const dropdown = document.getElementById("notification-dropdown");
  if (!toggle || !dropdown || toggle.dataset.bound) return;
  toggle.dataset.bound = "true";
  toggle.addEventListener("click", async (event) => {
    event.stopPropagation();
    const isOpen = dropdown.classList.contains("active");
    if (isOpen) {
      closeNotificationDropdown();
      return;
    }
    closeUserDropdown();
    const state = await fetchNotificationState({ force: true });
    renderNotificationDropdown(state);
    dropdown.classList.add("active");
    toggle.classList.add("active");
    setNotificationScrollLock(true);
    await markNotificationsSeen(state);
  });
  if (!dropdown.dataset.outsideListener) {
    dropdown.dataset.outsideListener = "true";
    document.addEventListener("click", (event) => {
      if (!dropdown.classList.contains("active")) return;
      const target = event.target;
      if (!target) return;
      if (dropdown.contains(target) || toggle.contains(target)) return;
      closeNotificationDropdown();
    });
  }
  if (!dropdown.dataset.actionListener) {
    dropdown.dataset.actionListener = "true";
    dropdown.addEventListener("click", async (event) => {
      const target = event.target;
      if (!target) return;
      const taskCard = target.closest(".notify-task");
      if (taskCard && taskCard.dataset.taskId) {
        event.preventDefault();
        event.stopPropagation();
        const taskId = parseInt(taskCard.dataset.taskId, 10);
        if (!isNaN(taskId)) {
          closeNotificationDropdown();
          openTaskDetails(taskId);
        }
        return;
      }
      const actionBtn = target.closest("[data-action]");
      if (!actionBtn) return;
      event.preventDefault();
      event.stopPropagation();
      const action = actionBtn.dataset.action;
      const date = actionBtn.dataset.date;
      if (action === "dismissDate" && date) {
        await dismissNotificationByDate(date);
      } else if (action === "dismissAll") {
        if (USE_SERVER_NOTIFICATIONS) {
          const currentState = notificationStateCache.data || await fetchNotificationState({ force: true });
          await markNotificationsSeen(currentState, { clearAll: true });
          updateNotificationState({ force: true });
        } else {
          dismissAllNotifications();
          updateNotificationState();
        }
      } else if (action === "openUpdatesFromNotification") {
        openUpdatesFromNotification();
      } else if (action === "openDueTodayFromNotification") {
        if (date) {
          const dateField = actionBtn.getAttribute("data-date-field") || "endDate";
          openDueTodayFromNotification(date, dateField);
        }
      }
    });
  }
  updateNotificationState();
}
function openUpdatesFromNotification() {
  closeNotificationDropdown();
  if (window.location.hash.replace("#", "") === "updates") {
    showPage("updates");
    return;
  }
  window.location.hash = "updates";
}
function openDueTodayFromNotification(dateStr, dateField = "endDate") {
  closeNotificationDropdown();
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const isToday = dateStr === today;
  const includeBacklog = !!settings.emailNotificationsIncludeBacklog;
  const statusList = includeBacklog ? "backlog,todo,progress,review" : "todo,progress,review";
  let targetHash;
  if (isToday) {
    const preset = dateField === "startDate" ? "start-today" : "end-today";
    targetHash = `#tasks?view=list&datePreset=${preset}&status=${statusList}`;
  } else {
    targetHash = `#tasks?view=list&dateFrom=${dateStr}&dateTo=${dateStr}&dateField=${dateField}&status=${statusList}`;
  }
  if (window.location.hash === targetHash) {
    showPage("tasks");
    return;
  }
  window.location.hash = targetHash.replace("#", "");
}
var sortMode = "priority";
var manualTaskOrder = {};
function toggleSortMode() {
  sortMode = "priority";
  manualTaskOrder = {};
  const sortBtn = document.getElementById("sort-btn");
  const sortLabel = document.getElementById("sort-label");
  const sortIcon = document.getElementById("sort-icon");
  if (sortBtn) sortBtn.classList.remove("manual");
  if (sortLabel) sortLabel.textContent = t("tasks.sort.orderByPriority");
  if (sortIcon) sortIcon.textContent = "\u2B06\uFE0F";
  renderTasks();
  saveSortPreferences();
}
async function saveSortPreferences() {
  try {
    await saveSortState(sortMode, manualTaskOrder);
  } catch (e) {
    try {
      localStorage.setItem("sortMode", sortMode);
      localStorage.setItem("manualTaskOrder", JSON.stringify(manualTaskOrder));
    } catch (err) {
    }
  }
}
function updateSortUI() {
  const sortToggle = document.getElementById("sort-toggle");
  const sortBtn = document.getElementById("sort-btn");
  const sortLabel = document.getElementById("sort-label");
  const sortIcon = document.getElementById("sort-icon");
  const kanbanUpdatedGroup = document.getElementById("group-kanban-updated");
  if (!sortToggle || !sortBtn) return;
  const kanban = document.querySelector(".kanban-board");
  const isKanban = kanban && !kanban.classList.contains("hidden");
  sortToggle.style.display = isKanban ? "flex" : "none";
  const isList = document.getElementById("list-view")?.classList.contains("active");
  const isCalendar = document.getElementById("calendar-view")?.classList.contains("active");
  const showUpdated = isKanban || isList || isCalendar;
  if (kanbanUpdatedGroup) kanbanUpdatedGroup.style.display = showUpdated ? "" : "none";
  try {
    updateKanbanUpdatedFilterUI();
  } catch (e) {
  }
  try {
    sortBtn.classList.remove("manual");
  } catch (e) {
  }
  if (sortLabel) sortLabel.textContent = t("tasks.sort.orderByPriority");
  if (sortIcon) sortIcon.textContent = "\u21C5";
  try {
    const statuses = window.kanbanShowBacklog === true ? ["backlog", "todo", "progress", "review", "done"] : ["todo", "progress", "review", "done"];
    let filtered = typeof getFilteredTasks === "function" ? getFilteredTasks() : tasks.slice();
    const cutoff = getKanbanUpdatedCutoffTime(window.kanbanUpdatedFilter);
    if (cutoff !== null) {
      filtered = filtered.filter((t2) => getTaskUpdatedTime(t2) >= cutoff);
    }
    const arraysEqual = (a, b) => {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
      return true;
    };
    let allMatch = true;
    for (const status of statuses) {
      const visibleNodes = Array.from(document.querySelectorAll(`#${status}-tasks .task-card`));
      const visibleIds = visibleNodes.map((n) => parseInt(n.dataset.taskId, 10)).filter((n) => !Number.isNaN(n));
      const expected = filtered.filter((t2) => t2.status === status).slice().sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0)).map((t2) => t2.id);
      if (!arraysEqual(visibleIds, expected)) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) {
      sortBtn.disabled = true;
      sortBtn.classList.add("disabled");
      sortBtn.setAttribute("aria-disabled", "true");
    } else {
      sortBtn.disabled = false;
      sortBtn.classList.remove("disabled");
      sortBtn.removeAttribute("aria-disabled");
    }
  } catch (e) {
    sortBtn.disabled = false;
    sortBtn.classList.remove("disabled");
  }
}
async function saveProjects2() {
  if (isInitializing) return;
  pendingSaves++;
  const timer = debugTimeStart("storage", "save-projects", { projectCount: projects.length });
  let success = false;
  try {
    await saveProjects(projects);
    success = true;
  } catch (error) {
    console.error("Error saving projects:", error);
    showErrorNotification(t("error.saveProjectsFailed"));
    throw error;
  } finally {
    debugTimeEnd("storage", timer, { success, projectCount: projects.length });
    pendingSaves--;
  }
}
async function saveTasks2() {
  if (isInitializing) return;
  pendingSaves++;
  const timer = debugTimeStart("storage", "save-tasks", { taskCount: tasks.length });
  let success = false;
  try {
    await saveTasks(tasks);
    success = true;
  } catch (error) {
    console.error("Error saving tasks:", error);
    showErrorNotification(t("error.saveTasksFailed"));
    throw error;
  } finally {
    debugTimeEnd("storage", timer, { success, taskCount: tasks.length });
    pendingSaves--;
  }
}
var feedbackSaveTimeoutId = null;
var feedbackSaveInProgress = false;
var feedbackRevision = 0;
var feedbackDirty = false;
var feedbackSaveError = false;
var feedbackShowSavedStatus = false;
var feedbackSaveStatusHideTimer = null;
var FEEDBACK_DELTA_QUEUE_KEY = "feedbackDeltaQueue";
var FEEDBACK_LOCALSTORAGE_DEBOUNCE_MS = 1e3;
var FEEDBACK_CACHE_DEBOUNCE_MS = 1200;
var FEEDBACK_FLUSH_TIMEOUT_MS = 1e4;
var FEEDBACK_MAX_RETRY_ATTEMPTS = 3;
var FEEDBACK_RETRY_DELAY_BASE_MS = 2e3;
var feedbackDeltaQueue = [];
var feedbackDeltaInProgress = false;
var feedbackDeltaFlushTimer = null;
var feedbackLocalStorageTimer = null;
var feedbackCacheTimer = null;
var feedbackDeltaRetryCount = 0;
var feedbackDeltaErrorHandlers = /* @__PURE__ */ new Map();
function logFeedbackDebug2(message, meta) {
  if (!isDebugLogsEnabled2()) return;
  if (meta) {
    console.log(`[feedback-debug] ${message}`, meta);
  } else {
    console.log(`[feedback-debug] ${message}`);
  }
}
function summarizeFeedbackOperations(operations) {
  const summary = {
    total: operations.length,
    add: 0,
    update: 0,
    delete: 0,
    maxScreenshotChars: 0,
    totalScreenshotChars: 0
  };
  for (const op of operations) {
    if (!op || !op.action) continue;
    if (op.action === "add") summary.add++;
    if (op.action === "update") summary.update++;
    if (op.action === "delete") summary.delete++;
    if (op.item && typeof op.item.screenshotUrl === "string") {
      const len = op.item.screenshotUrl.length;
      summary.totalScreenshotChars += len;
      if (len > summary.maxScreenshotChars) summary.maxScreenshotChars = len;
    }
  }
  return summary;
}
function loadFeedbackDeltaQueue() {
  try {
    const raw = localStorage.getItem(FEEDBACK_DELTA_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    feedbackDeltaQueue = Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    feedbackDeltaQueue = [];
  }
}
function persistFeedbackDeltaQueue() {
  try {
    localStorage.setItem(FEEDBACK_DELTA_QUEUE_KEY, JSON.stringify(feedbackDeltaQueue));
  } catch (e) {
  }
}
function persistFeedbackDeltaQueueDebounced() {
  if (feedbackLocalStorageTimer) {
    clearTimeout(feedbackLocalStorageTimer);
  }
  feedbackLocalStorageTimer = setTimeout(() => {
    persistFeedbackDeltaQueue();
    feedbackLocalStorageTimer = null;
  }, FEEDBACK_LOCALSTORAGE_DEBOUNCE_MS);
}
function persistFeedbackCache2() {
  try {
    localStorage.setItem(FEEDBACK_CACHE_KEY2, JSON.stringify(feedbackItems));
  } catch (e) {
  }
}
function persistFeedbackCacheDebounced() {
  if (feedbackCacheTimer) {
    clearTimeout(feedbackCacheTimer);
  }
  feedbackCacheTimer = setTimeout(() => {
    persistFeedbackCache2();
    feedbackCacheTimer = null;
  }, FEEDBACK_CACHE_DEBOUNCE_MS);
}
function applyFeedbackDeltaToLocal(delta) {
  if (!delta || !delta.action) return;
  if (delta.action === "add" && delta.item) {
    const exists = feedbackItems.some((f) => f && f.id === delta.item.id);
    if (!exists) {
      feedbackItems.unshift(delta.item);
      if (!feedbackIndex.includes(delta.item.id)) {
        feedbackIndex.unshift(delta.item.id);
      }
    }
    return;
  }
  if (delta.action === "update" && delta.item && delta.item.id != null) {
    const idx = feedbackItems.findIndex((f) => f && f.id === delta.item.id);
    if (idx >= 0) {
      feedbackItems[idx] = { ...feedbackItems[idx], ...delta.item };
    }
    return;
  }
  if (delta.action === "delete" && delta.targetId != null) {
    feedbackItems = feedbackItems.filter((f) => !f || f.id !== delta.targetId);
    feedbackIndex = feedbackIndex.filter((id) => id !== delta.targetId);
  }
  persistFeedbackCache2();
}
function scheduleFeedbackDeltaFlush(delayMs = 300) {
  if (feedbackDeltaFlushTimer) return;
  feedbackDeltaFlushTimer = setTimeout(() => {
    feedbackDeltaFlushTimer = null;
    flushFeedbackDeltaQueue();
  }, delayMs);
}
function enqueueFeedbackDelta(delta, options = {}) {
  if (!delta || !delta.action) return;
  const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, ...delta };
  feedbackDeltaQueue.push(entry);
  persistFeedbackDeltaQueueDebounced();
  markFeedbackDirty();
  updateFeedbackSaveStatus();
  if (typeof options.onError === "function") {
    feedbackDeltaErrorHandlers.set(entry.id, options.onError);
  }
  scheduleFeedbackDeltaFlush();
}
async function flushFeedbackDeltaQueue() {
  if (feedbackDeltaInProgress || feedbackDeltaQueue.length === 0) return;
  if (!navigator.onLine) {
    updateFeedbackSaveStatus();
    return;
  }
  feedbackDeltaInProgress = true;
  pendingSaves++;
  try {
    const operations = [];
    const queueSnapshot = [...feedbackDeltaQueue];
    for (const entry of queueSnapshot) {
      if (entry.action === "add" && entry.item) {
        operations.push({ action: "add", item: entry.item });
      } else if (entry.action === "update" && entry.item && entry.item.id != null) {
        operations.push({ action: "update", item: entry.item });
      } else if (entry.action === "delete" && entry.targetId != null) {
        operations.push({ action: "delete", id: entry.targetId });
      }
    }
    if (operations.length > 0) {
      const flushStartedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      const payload = { operations };
      let payloadBytes = null;
      try {
        payloadBytes = JSON.stringify(payload).length;
      } catch (e) {
      }
      logFeedbackDebug2("flush:start", {
        queueLength: feedbackDeltaQueue.length,
        operationCount: operations.length,
        payloadBytes,
        summary: summarizeFeedbackOperations(operations)
      });
      const result = await batchFeedbackOperations(operations, FEEDBACK_FLUSH_TIMEOUT_MS);
      if (result && result.index) {
        feedbackIndex = result.index;
      }
      const hasErrors = !!(result && Array.isArray(result.errors) && result.errors.length > 0);
      if (result && result.success && !hasErrors) {
        feedbackDeltaQueue.splice(0, queueSnapshot.length);
        persistFeedbackDeltaQueue();
        feedbackDeltaRetryCount = 0;
        markFeedbackSaved();
      } else {
        if (hasErrors) {
          const failedIndexes = new Set(result.errors.map((err) => err && err.index).filter((idx) => Number.isInteger(idx)));
          const failedEntries = queueSnapshot.filter((_, idx) => failedIndexes.has(idx));
          feedbackDeltaQueue = failedEntries.length > 0 ? failedEntries : queueSnapshot;
        } else {
          feedbackDeltaQueue = queueSnapshot;
        }
        persistFeedbackDeltaQueue();
        markFeedbackSaveError();
      }
      const flushEndedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      logFeedbackDebug2("flush:success", {
        durationMs: Math.round(flushEndedAt - flushStartedAt),
        processed: result && result.processed,
        total: result && result.total,
        success: result && result.success,
        indexSize: Array.isArray(result && result.index) ? result.index.length : null,
        errors: result && Array.isArray(result.errors) ? result.errors.length : 0
      });
    }
  } catch (error) {
    console.error("Feedback flush error:", error);
    logFeedbackDebug2("flush:error", {
      message: error && error.message ? error.message : String(error),
      name: error && error.name ? error.name : null,
      retryCount: feedbackDeltaRetryCount + 1,
      queueLength: feedbackDeltaQueue.length
    });
    feedbackDeltaRetryCount++;
    if (feedbackDeltaRetryCount >= FEEDBACK_MAX_RETRY_ATTEMPTS) {
      console.error(`Feedback save failed after ${FEEDBACK_MAX_RETRY_ATTEMPTS} attempts. Queue will be kept for later.`);
      markFeedbackSaveError();
      feedbackDeltaRetryCount = 0;
    } else {
      const retryDelay = FEEDBACK_RETRY_DELAY_BASE_MS * Math.pow(2, feedbackDeltaRetryCount - 1);
      console.log(`Feedback save failed. Retrying in ${retryDelay}ms (attempt ${feedbackDeltaRetryCount}/${FEEDBACK_MAX_RETRY_ATTEMPTS})`);
      markFeedbackSaveError();
      logFeedbackDebug2("flush:retry-scheduled", {
        retryDelayMs: retryDelay,
        attempt: feedbackDeltaRetryCount,
        maxAttempts: FEEDBACK_MAX_RETRY_ATTEMPTS
      });
      setTimeout(() => {
        flushFeedbackDeltaQueue();
      }, retryDelay);
    }
    const failed = feedbackDeltaQueue[0];
    if (failed) {
      const handler = feedbackDeltaErrorHandlers.get(failed.id);
      if (handler) {
        try {
          handler(error);
        } catch (e) {
        }
        feedbackDeltaErrorHandlers.delete(failed.id);
      }
    }
  } finally {
    feedbackDeltaInProgress = false;
    pendingSaves = Math.max(0, pendingSaves - 1);
    updateFeedbackSaveStatus();
  }
}
function clearFeedbackSaveStatusHideTimer() {
  if (feedbackSaveStatusHideTimer !== null) {
    clearTimeout(feedbackSaveStatusHideTimer);
    feedbackSaveStatusHideTimer = null;
  }
}
function hideFeedbackSaveStatusSoon() {
  clearFeedbackSaveStatusHideTimer();
  feedbackSaveStatusHideTimer = setTimeout(() => {
    const statusEl = document.getElementById("feedback-save-status");
    if (!statusEl) return;
    statusEl.classList.add("is-hidden");
    feedbackShowSavedStatus = false;
    const textEl = statusEl.querySelector(".feedback-save-text");
    if (textEl) textEl.textContent = "";
  }, 1600);
}
function updateFeedbackSaveStatus() {
  const statusEl = document.getElementById("feedback-save-status");
  if (!statusEl) return;
  const textEl = statusEl.querySelector(".feedback-save-text") || statusEl;
  let status = "saved";
  if (feedbackDirty || feedbackDeltaQueue.length > 0) {
    if (!navigator.onLine) {
      status = "offline";
    } else if (feedbackDeltaInProgress || feedbackDeltaQueue.length > 0 || feedbackSaveInProgress || feedbackSaveTimeoutId !== null) {
      status = "saving";
    } else if (feedbackSaveError) {
      status = "error";
    } else {
      status = "saving";
    }
  }
  const statusKey = {
    saved: "feedback.saveStatus.saved",
    saving: "feedback.saveStatus.saving",
    error: "feedback.saveStatus.error",
    offline: "feedback.saveStatus.offline"
  }[status];
  textEl.textContent = t(statusKey);
  const shouldShow = status !== "saved" || feedbackShowSavedStatus;
  statusEl.classList.toggle("is-hidden", !shouldShow);
  statusEl.classList.toggle("is-saving", status === "saving");
  statusEl.classList.toggle("is-error", status === "error");
  statusEl.classList.toggle("is-offline", status === "offline");
  statusEl.classList.toggle("is-saved", status === "saved");
}
function updateFeedbackPlaceholderForViewport() {
  const input = document.getElementById("feedback-description");
  if (!input) return;
  const isCompact = window.matchMedia("(max-width: 768px)").matches;
  const key = isCompact ? "feedback.descriptionPlaceholderShort" : "feedback.descriptionPlaceholder";
  input.setAttribute("placeholder", t(key));
}
function markFeedbackDirty() {
  feedbackDirty = true;
  feedbackSaveError = false;
  clearFeedbackSaveStatusHideTimer();
  updateFeedbackSaveStatus();
}
function markFeedbackSaved() {
  feedbackDirty = false;
  feedbackSaveError = false;
  feedbackShowSavedStatus = true;
  updateFeedbackSaveStatus();
  hideFeedbackSaveStatusSoon();
}
function markFeedbackSaveError() {
  feedbackDirty = true;
  feedbackSaveError = true;
  clearFeedbackSaveStatusHideTimer();
  updateFeedbackSaveStatus();
}
async function saveProjectColors2() {
  if (isInitializing) return;
  try {
    await saveProjectColors(projectColorMap);
  } catch (error) {
    console.error("Error saving project colors:", error);
    showErrorNotification(t("error.saveProjectColorsFailed"));
  }
}
async function saveSettings2() {
  const timer = debugTimeStart("settings", "save");
  let success = false;
  try {
    await saveSettings(settings);
    success = true;
  } catch (e) {
    console.error("Error saving settings:", e);
  } finally {
    debugTimeEnd("settings", timer, { success });
  }
  window.initialSettingsFormState = null;
  window.settingsFormIsDirty = false;
}
var notificationTimePortalEl = null;
var notificationTimePortalAnchor = null;
var notificationTimeZonePortalEl = null;
var notificationTimeZonePortalAnchor = null;
function buildNotificationTimeOptionsHTML(selectedValue) {
  const start = 8 * 60;
  const end = 18 * 60;
  const step = 30;
  const selected = String(selectedValue || "");
  const bits = [];
  for (let minutes = start; minutes <= end; minutes += step) {
    const hhmm = minutesToHHMM(minutes);
    const selectedClass = hhmm === selected ? " selected" : "";
    bits.push(`<div class="time-option${selectedClass}" role="option" data-value="${hhmm}">${hhmm}</div>`);
  }
  return bits.join("");
}
function buildNotificationTimeZoneOptionsHTML(selectEl) {
  if (!selectEl || !selectEl.options) return "";
  const selected = String(selectEl.value || "");
  const bits = [];
  Array.from(selectEl.options).forEach((opt) => {
    const value = String(opt.value || "");
    const label = String(opt.textContent || value);
    const selectedClass = value === selected ? " selected" : "";
    bits.push(`<div class="tz-option${selectedClass}" role="option" data-value="${escapeHtml(value)}">${escapeHtml(label)}</div>`);
  });
  return bits.join("");
}
function showNotificationTimeZonePortal(triggerBtn, selectEl, valueEl) {
  if (!triggerBtn || !selectEl) return;
  if (!notificationTimeZonePortalEl) {
    notificationTimeZonePortalEl = document.createElement("div");
    notificationTimeZonePortalEl.className = "tz-options-portal";
    document.body.appendChild(notificationTimeZonePortalEl);
  }
  notificationTimeZonePortalEl.innerHTML = buildNotificationTimeZoneOptionsHTML(selectEl);
  notificationTimeZonePortalEl.style.display = "block";
  notificationTimeZonePortalAnchor = triggerBtn;
  positionNotificationTimeZonePortal(triggerBtn, notificationTimeZonePortalEl);
  requestAnimationFrame(() => positionNotificationTimeZonePortal(triggerBtn, notificationTimeZonePortalEl));
  triggerBtn.setAttribute("aria-expanded", "true");
  const onClick = (evt) => {
    evt.stopPropagation();
    const opt = evt.target.closest(".tz-option");
    if (!opt) return;
    const value = opt.dataset.value;
    if (!value) return;
    selectEl.value = value;
    if (valueEl) {
      const label = selectEl.options?.[selectEl.selectedIndex]?.textContent || value;
      valueEl.textContent = label;
    }
    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    hideNotificationTimeZonePortal();
  };
  notificationTimeZonePortalEl.onclick = onClick;
  setTimeout(() => document.addEventListener("click", handleNotificationTimeZoneOutsideClick, true), 0);
  window.addEventListener("scroll", handleNotificationTimeZoneReposition, true);
  window.addEventListener("resize", handleNotificationTimeZoneReposition, true);
  document.addEventListener("keydown", handleNotificationTimeZoneEsc, true);
}
function hideNotificationTimeZonePortal() {
  if (!notificationTimeZonePortalEl) return;
  notificationTimeZonePortalEl.style.display = "none";
  notificationTimeZonePortalEl.innerHTML = "";
  notificationTimeZonePortalEl.onclick = null;
  if (notificationTimeZonePortalAnchor) {
    notificationTimeZonePortalAnchor.setAttribute("aria-expanded", "false");
  }
  notificationTimeZonePortalAnchor = null;
  document.removeEventListener("click", handleNotificationTimeZoneOutsideClick, true);
  window.removeEventListener("scroll", handleNotificationTimeZoneReposition, true);
  window.removeEventListener("resize", handleNotificationTimeZoneReposition, true);
  document.removeEventListener("keydown", handleNotificationTimeZoneEsc, true);
}
function handleNotificationTimeZoneOutsideClick(evt) {
  const target = evt.target;
  if (!notificationTimeZonePortalEl || notificationTimeZonePortalEl.style.display === "none") return;
  if (notificationTimeZonePortalEl.contains(target)) return;
  if (notificationTimeZonePortalAnchor && notificationTimeZonePortalAnchor.contains(target)) return;
  hideNotificationTimeZonePortal();
}
function handleNotificationTimeZoneReposition() {
  if (!notificationTimeZonePortalAnchor || !notificationTimeZonePortalEl || notificationTimeZonePortalEl.style.display === "none") return;
  positionNotificationTimeZonePortal(notificationTimeZonePortalAnchor, notificationTimeZonePortalEl);
}
function handleNotificationTimeZoneEsc(evt) {
  if (evt.key !== "Escape") return;
  if (!notificationTimeZonePortalEl || notificationTimeZonePortalEl.style.display === "none") return;
  evt.preventDefault();
  hideNotificationTimeZonePortal();
}
function positionNotificationTimeZonePortal(button, portal) {
  const rect = button.getBoundingClientRect();
  portal.style.width = `${rect.width}px`;
  const viewportH = window.innerHeight;
  const portalHeight = Math.min(portal.scrollHeight, 240);
  const spaceBelow = viewportH - rect.bottom;
  const showAbove = spaceBelow < portalHeight + 12;
  const top = showAbove ? Math.max(8, rect.top - portalHeight - 4) : rect.bottom + 4;
  const viewportW = window.innerWidth;
  const portalWidth = portal.getBoundingClientRect().width || rect.width;
  const desiredLeft = rect.left;
  const clampedLeft = Math.min(
    Math.max(8, desiredLeft),
    Math.max(8, viewportW - portalWidth - 8)
  );
  portal.style.left = `${clampedLeft}px`;
  portal.style.top = `${top}px`;
}
function showNotificationTimePortal(triggerBtn, hiddenInput, valueEl) {
  if (!triggerBtn || !hiddenInput) return;
  if (!notificationTimePortalEl) {
    notificationTimePortalEl = document.createElement("div");
    notificationTimePortalEl.className = "time-options-portal";
    document.body.appendChild(notificationTimePortalEl);
  }
  const currentValue = String(hiddenInput.value || "").trim();
  notificationTimePortalEl.innerHTML = buildNotificationTimeOptionsHTML(currentValue);
  notificationTimePortalEl.style.display = "block";
  notificationTimePortalAnchor = triggerBtn;
  positionNotificationTimePortal(triggerBtn, notificationTimePortalEl);
  requestAnimationFrame(() => positionNotificationTimePortal(triggerBtn, notificationTimePortalEl));
  triggerBtn.setAttribute("aria-expanded", "true");
  const onClick = (evt) => {
    evt.stopPropagation();
    const opt = evt.target.closest(".time-option");
    if (!opt) return;
    const value = opt.dataset.value;
    if (!value) return;
    hiddenInput.value = value;
    if (valueEl) valueEl.textContent = value;
    if (window.markSettingsDirtyIfNeeded) window.markSettingsDirtyIfNeeded();
    hideNotificationTimePortal();
  };
  notificationTimePortalEl.addEventListener("click", onClick);
  setTimeout(() => document.addEventListener("click", handleNotificationTimeOutsideClick, true), 0);
  window.addEventListener("scroll", handleNotificationTimeReposition, true);
  window.addEventListener("resize", handleNotificationTimeReposition, true);
  document.addEventListener("keydown", handleNotificationTimeEsc, true);
}
function hideNotificationTimePortal() {
  if (!notificationTimePortalEl) return;
  notificationTimePortalEl.style.display = "none";
  notificationTimePortalEl.innerHTML = "";
  if (notificationTimePortalAnchor) {
    notificationTimePortalAnchor.setAttribute("aria-expanded", "false");
  }
  notificationTimePortalAnchor = null;
  document.removeEventListener("click", handleNotificationTimeOutsideClick, true);
  window.removeEventListener("scroll", handleNotificationTimeReposition, true);
  window.removeEventListener("resize", handleNotificationTimeReposition, true);
  document.removeEventListener("keydown", handleNotificationTimeEsc, true);
}
function handleNotificationTimeOutsideClick(evt) {
  const target = evt.target;
  if (!notificationTimePortalEl || notificationTimePortalEl.style.display === "none") return;
  if (notificationTimePortalEl.contains(target)) return;
  if (notificationTimePortalAnchor && notificationTimePortalAnchor.contains(target)) return;
  hideNotificationTimePortal();
}
function handleNotificationTimeReposition() {
  if (!notificationTimePortalAnchor || !notificationTimePortalEl || notificationTimePortalEl.style.display === "none") return;
  positionNotificationTimePortal(notificationTimePortalAnchor, notificationTimePortalEl);
}
function handleNotificationTimeEsc(evt) {
  if (evt.key !== "Escape") return;
  if (!notificationTimePortalEl || notificationTimePortalEl.style.display === "none") return;
  evt.preventDefault();
  hideNotificationTimePortal();
}
function positionNotificationTimePortal(button, portal) {
  const rect = button.getBoundingClientRect();
  portal.style.width = `${rect.width}px`;
  const viewportH = window.innerHeight;
  const portalHeight = Math.min(portal.scrollHeight, 260);
  const spaceBelow = viewportH - rect.bottom;
  const showAbove = spaceBelow < portalHeight + 12;
  const top = showAbove ? Math.max(8, rect.top - portalHeight - 4) : rect.bottom + 4;
  const viewportW = window.innerWidth;
  const portalWidth = portal.getBoundingClientRect().width || rect.width;
  const desiredLeft = rect.left;
  const clampedLeft = Math.min(
    Math.max(8, desiredLeft),
    Math.max(8, viewportW - portalWidth - 8)
  );
  portal.style.left = `${clampedLeft}px`;
  portal.style.top = `${top}px`;
}
function applyWorkspaceLogo() {
  const iconEl = document.querySelector(".workspace-icon");
  if (!iconEl) return;
  if (defaultWorkspaceIconText === null) {
    defaultWorkspaceIconText = iconEl.textContent || "";
  }
  if (settings.customWorkspaceLogo) {
    iconEl.style.backgroundImage = `url(${settings.customWorkspaceLogo})`;
    iconEl.textContent = "";
  } else {
    iconEl.style.backgroundImage = "";
    iconEl.textContent = defaultWorkspaceIconText;
  }
}
function applyLoadedAllData({ tasks: loadedTasks, projects: loadedProjects, feedbackItems: loadedFeedback } = {}) {
  projects = loadedProjects || [];
  tasks = loadedTasks || [];
  feedbackItems = loadedFeedback || [];
  feedbackIndex = feedbackItems.map((item) => item && item.id).filter((id) => id != null);
  projects.forEach((p) => {
    if (p && p.id != null) p.id = parseInt(p.id, 10);
    if (!Array.isArray(p.tags)) {
      p.tags = [];
    }
  });
  tasks.forEach((t2) => {
    if (t2) {
      if (t2.id != null) t2.id = parseInt(t2.id, 10);
      if (t2.projectId != null && t2.projectId !== "null") {
        t2.projectId = parseInt(t2.projectId, 10);
      } else {
        t2.projectId = null;
      }
      if (t2.startDate === void 0 || t2.startDate === null) t2.startDate = "";
      if (t2.endDate === void 0 || t2.endDate === null) t2.endDate = "";
      if (typeof t2.startDate !== "string") t2.startDate = String(t2.startDate || "");
      if (typeof t2.endDate !== "string") t2.endDate = String(t2.endDate || "");
      if (!Array.isArray(t2.tags)) {
        if (typeof t2.tags === "string" && t2.tags.trim() !== "") {
          t2.tags = t2.tags.split(",").map((s) => s.trim()).filter(Boolean);
        } else {
          t2.tags = [];
        }
      }
      if (!Array.isArray(t2.attachments)) t2.attachments = [];
      if (t2.startDateWasEverSet === void 0) t2.startDateWasEverSet = t2.startDate.trim() !== "";
      if (t2.endDateWasEverSet === void 0) t2.endDateWasEverSet = t2.endDate.trim() !== "";
      if (t2.dueDate && !t2.endDate) {
        t2.endDate = t2.dueDate;
        t2.endDateWasEverSet = true;
      }
      delete t2.dueDate;
    }
  });
  feedbackItems.forEach((f) => {
    if (f && f.id != null) f.id = parseInt(f.id, 10);
  });
  loadFeedbackDeltaQueue();
  if (feedbackDeltaQueue.length > 0) {
    feedbackDeltaQueue.forEach(applyFeedbackDeltaToLocal);
  }
  persistFeedbackCache2();
  if (projects.length > 0) {
    projectCounter = Math.max(...projects.map((p) => p.id || 0)) + 1;
  } else {
    projectCounter = 1;
  }
  if (tasks.length > 0) {
    taskCounter = Math.max(...tasks.map((t2) => t2.id || 0)) + 1;
  } else {
    taskCounter = 1;
  }
  if (feedbackItems.length > 0) {
    feedbackCounter = Math.max(...feedbackItems.map((f) => f.id || 0)) + 1;
  } else {
    feedbackCounter = 1;
  }
}
var tagColorMap = {};
var projectColorMap = {};
var colorIndex = 0;
function getTagColor(tagName) {
  if (!tagColorMap[tagName]) {
    tagColorMap[tagName] = TAG_COLORS[colorIndex % TAG_COLORS.length];
    colorIndex++;
  }
  return tagColorMap[tagName];
}
function getProjectColor(projectId) {
  if (!projectColorMap[projectId]) {
    const usedColors = new Set(Object.values(projectColorMap));
    const availableColors = PROJECT_COLORS.filter((color) => !usedColors.has(color));
    projectColorMap[projectId] = availableColors.length > 0 ? availableColors[0] : PROJECT_COLORS[Object.keys(projectColorMap).length % PROJECT_COLORS.length];
  }
  return projectColorMap[projectId];
}
function setProjectColor(projectId, color) {
  projectColorMap[projectId] = color;
  saveProjectColors2();
  if (document.getElementById("calendar-view").classList.contains("active")) {
    renderCalendar();
  }
}
function toggleProjectColorPicker(projectId) {
  const picker = document.getElementById(`color-picker-${projectId}`);
  if (picker) {
    const isVisible = picker.style.display !== "none";
    document.querySelectorAll(".color-picker-dropdown").forEach((p) => p.style.display = "none");
    picker.style.display = isVisible ? "none" : "block";
  }
}
function updateProjectColor(projectId, color) {
  setProjectColor(projectId, color);
  const currentColorDiv = document.querySelector(`#color-picker-${projectId}`).previousElementSibling;
  if (currentColorDiv) {
    currentColorDiv.style.backgroundColor = color;
  }
  const picker = document.getElementById(`color-picker-${projectId}`);
  if (picker) {
    picker.querySelectorAll(".color-option").forEach((option) => {
      const optionColor = option.style.backgroundColor;
      const rgbColor = optionColor.replace(/rgb\(|\)|\s/g, "").split(",");
      const hexColor = "#" + rgbColor.map((x) => parseInt(x, 10).toString(16).padStart(2, "0")).join("");
      option.style.border = hexColor.toUpperCase() === color.toUpperCase() ? "2px solid white" : "2px solid transparent";
    });
    const customSwatch = picker.querySelector(".custom-color-swatch");
    if (customSwatch) {
      customSwatch.style.border = "2px solid transparent";
    }
  }
  const project = projects.find((p) => p.id === projectId);
  if (project && project.tags) {
    renderProjectDetailsTags(project.tags, projectId);
  }
  if (document.getElementById("projects")?.classList.contains("active")) {
    appState.projectsSortedView = null;
    renderProjects();
  }
}
function handleProjectCustomColorChange(projectId, color) {
  if (!color) return;
  setProjectColor(projectId, color);
  const pickerRoot = document.getElementById(`color-picker-${projectId}`);
  if (pickerRoot) {
    const currentColorDiv = pickerRoot.previousElementSibling;
    if (currentColorDiv) {
      currentColorDiv.style.backgroundColor = color;
    }
    const customSwatch = pickerRoot.querySelector(".custom-color-swatch");
    if (customSwatch) {
      customSwatch.style.backgroundColor = color;
    }
  }
  const picker = document.getElementById(`color-picker-${projectId}`);
  if (picker) {
    picker.querySelectorAll(".color-option").forEach((option) => {
      option.style.border = "2px solid transparent";
    });
    const customSwatch = picker.querySelector(".custom-color-swatch");
    if (customSwatch) {
      customSwatch.style.border = "2px solid white";
    }
  }
  const project = projects.find((p) => p.id === projectId);
  if (project && project.tags) {
    renderProjectDetailsTags(project.tags, projectId);
  }
  if (document.getElementById("projects")?.classList.contains("active")) {
    appState.projectsSortedView = null;
    renderProjects();
  }
}
function openCustomProjectColorPicker(projectId) {
  const input = document.getElementById(`project-color-input-${projectId}`);
  if (!input) return;
  ignoreNextOutsideColorClick = true;
  input.click();
}
var filterState = {
  search: "",
  statuses: /* @__PURE__ */ new Set(),
  priorities: /* @__PURE__ */ new Set(),
  projects: /* @__PURE__ */ new Set(),
  tags: /* @__PURE__ */ new Set(),
  datePresets: /* @__PURE__ */ new Set(),
  // Quick date filters: overdue, today, tomorrow, week, month (multi-select)
  dateFrom: "",
  dateTo: ""
};
var projectFilterState = {
  search: "",
  statuses: /* @__PURE__ */ new Set(),
  // planning, active, completed
  taskFilter: "",
  // 'has-tasks', 'no-tasks', or empty
  updatedFilter: "all",
  // all | 5m | 30m | 24h | week | month
  tags: /* @__PURE__ */ new Set()
  // project tags filter
};
var projectSortState = {
  lastSort: "",
  direction: "asc"
  // 'asc' or 'desc'
};
var filtersUIInitialized = false;
function initFiltersUI() {
  if (filtersUIInitialized) return;
  filtersUIInitialized = true;
  populateProjectOptions();
  populateTagOptions();
  updateNoDateOptionVisibility();
  setupFilterEventListeners();
}
function populateProjectOptions() {
  const ul = document.getElementById("project-options");
  if (ul) {
    const selected = new Set(filterState.projects);
    ul.innerHTML = "";
    const hasNoProjectTasks = tasks.some((t2) => !t2.projectId);
    if (hasNoProjectTasks) {
      const noProjectLi = document.createElement("li");
      const checked = selected.has("none") ? "checked" : "";
      noProjectLi.innerHTML = `<label><input type="checkbox" id="proj-none" value="none" data-filter="project" ${checked}> ${t("tasks.noProject")}</label>`;
      ul.appendChild(noProjectLi);
    } else {
      if (selected.has("none")) {
        filterState.projects.delete("none");
        updateFilterBadges();
      }
    }
    if (projects.length === 0) {
      const li = document.createElement("li");
      li.textContent = t("filters.noOtherProjects");
      li.style.color = "var(--text-muted)";
      li.style.padding = "8px 12px";
      ul.appendChild(li);
    } else {
      projects.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", void 0, { sensitivity: "base" })).forEach((p) => {
        const li = document.createElement("li");
        const id = `proj-${p.id}`;
        const checked = selected.has(String(p.id)) ? "checked" : "";
        li.innerHTML = `<label><input type="checkbox" id="${id}" value="${p.id}" data-filter="project" ${checked}> ${p.name}</label>`;
        ul.appendChild(li);
      });
    }
    ul.querySelectorAll('input[type="checkbox"][data-filter="project"]').forEach((cb) => {
      cb.addEventListener("change", () => {
        toggleSet(filterState.projects, cb.value, cb.checked);
        updateFilterBadges();
        renderAfterFilterChange();
        const calendarView = document.getElementById("calendar-view");
        if (calendarView) {
          renderCalendar();
        }
        updateClearButtonVisibility();
      });
    });
  }
}
function populateTagOptions() {
  const tagUl = document.getElementById("tag-options");
  if (tagUl) {
    const currentlySelected = new Set(filterState.tags);
    const allTags = /* @__PURE__ */ new Set();
    tasks.forEach((t2) => {
      if (t2.tags && t2.tags.length > 0) {
        t2.tags.forEach((tag) => allTags.add(tag));
      }
    });
    tagUl.innerHTML = "";
    const hasNoTagTasks = tasks.some((t2) => !t2.tags || t2.tags.length === 0);
    if (hasNoTagTasks) {
      const noTagsLi = document.createElement("li");
      const noTagsChecked = currentlySelected.has("none") ? "checked" : "";
      noTagsLi.innerHTML = `<label><input type="checkbox" id="tag-none" value="none" data-filter="tag" ${noTagsChecked}> ${t("filters.noTags")}</label>`;
      tagUl.appendChild(noTagsLi);
    } else {
      if (currentlySelected.has("none")) {
        filterState.tags.delete("none");
        updateFilterBadges();
      }
    }
    if (allTags.size === 0) {
      const li = document.createElement("li");
      li.textContent = t("filters.noOtherTags");
      li.style.color = "var(--text-muted)";
      li.style.padding = "8px 12px";
      tagUl.appendChild(li);
    } else {
      Array.from(allTags).sort().forEach((tag) => {
        const li = document.createElement("li");
        const id = `tag-${tag}`;
        const checked = currentlySelected.has(tag) ? "checked" : "";
        li.innerHTML = `<label><input type="checkbox" id="${id}" value="${tag}" data-filter="tag" ${checked}> ${tag.toUpperCase()}</label>`;
        tagUl.appendChild(li);
      });
    }
    tagUl.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener("change", () => {
        const type = cb.dataset.filter;
        if (type === "tag") toggleSet(filterState.tags, cb.value, cb.checked);
        updateFilterBadges();
        renderAfterFilterChange();
        const calendarView = document.getElementById("calendar-view");
        if (calendarView) {
          renderCalendar();
        }
        updateClearButtonVisibility();
      });
    });
  }
}
function setupFilterEventListeners() {
  const isMobile = !!(window.matchMedia && (window.matchMedia("(max-width: 768px)").matches || window.matchMedia("(pointer: coarse)").matches));
  const selectAllProjectRow = document.getElementById("project-select-all");
  if (selectAllProjectRow && selectAllProjectRow.parentElement.parentElement) {
    if (projects.length > 1) {
      selectAllProjectRow.parentElement.parentElement.style.display = "block";
    } else {
      selectAllProjectRow.parentElement.parentElement.style.display = "none";
    }
  }
  const groups = [
    document.getElementById("group-status"),
    document.getElementById("group-priority"),
    document.getElementById("group-project"),
    document.getElementById("group-tags"),
    document.getElementById("group-end-date"),
    document.getElementById("group-start-date"),
    document.getElementById("group-kanban-updated"),
    document.getElementById("group-project-status"),
    document.getElementById("group-project-updated"),
    document.getElementById("group-project-tags")
  ].filter(Boolean);
  const ensureBackdrop = () => {
    let backdrop = document.getElementById("dropdown-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "dropdown-backdrop";
      backdrop.setAttribute("aria-hidden", "true");
      backdrop.addEventListener("click", () => closeAllPanels());
      document.body.appendChild(backdrop);
    }
    return backdrop;
  };
  const closeAllPanels = () => {
    groups.forEach((g) => g.classList.remove("open"));
    document.body.classList.remove("dropdown-sheet-open");
    const backdrop = document.getElementById("dropdown-backdrop");
    if (backdrop) backdrop.classList.remove("open");
  };
  const enhanceMobilePanel = (g) => {
    const panel = g.querySelector(".dropdown-panel");
    if (!panel) return;
    panel.classList.add("has-sheet-header");
    if (isMobile) {
      try {
        const rect = g.getBoundingClientRect();
        const margin = 12;
        const gap = 8;
        const vh = window.innerHeight || document.documentElement.clientHeight || 0;
        const availableBelow = Math.max(0, vh - rect.bottom - margin);
        const availableAbove = Math.max(0, rect.top - margin);
        const preferredMax = Math.min(460, Math.floor(vh * 0.6));
        let placeBelow = availableBelow >= 260 || availableBelow >= availableAbove;
        let maxH = Math.min(preferredMax, placeBelow ? availableBelow : availableAbove);
        const useBottomSheet = maxH < 220;
        panel.classList.toggle("sheet-bottom", useBottomSheet);
        panel.classList.toggle("sheet-anchored", !useBottomSheet);
        if (!useBottomSheet) {
          if (maxH < 240) maxH = Math.min(240, Math.max(0, placeBelow ? availableBelow : availableAbove));
          let top = placeBelow ? rect.bottom + gap : rect.top - gap - maxH;
          top = Math.max(margin, Math.min(top, vh - margin - 140));
          panel.style.setProperty("--sheet-top", `${Math.round(top)}px`);
          panel.style.setProperty("--sheet-maxh", `${Math.round(maxH)}px`);
        } else {
          panel.style.removeProperty("--sheet-top");
          panel.style.removeProperty("--sheet-maxh");
        }
      } catch (e) {
        panel.classList.add("sheet-bottom");
        panel.classList.remove("sheet-anchored");
      }
      ensureBackdrop().classList.add("open");
      document.body.classList.add("dropdown-sheet-open");
    }
    if (!panel.querySelector(".dropdown-sheet-header")) {
      const titleText = panel.querySelector(".dropdown-section-title")?.textContent?.trim() || g.querySelector(".filter-button")?.textContent?.trim() || t("filters.sheet.title");
      const header = document.createElement("div");
      header.className = "dropdown-sheet-header";
      const handle = document.createElement("div");
      handle.className = "dropdown-sheet-handle";
      const title = document.createElement("div");
      title.className = "dropdown-sheet-title";
      title.textContent = titleText.toUpperCase();
      const done = document.createElement("button");
      done.type = "button";
      done.className = "dropdown-sheet-done";
      done.textContent = t("common.done");
      done.addEventListener("click", () => closeAllPanels());
      header.appendChild(handle);
      header.appendChild(title);
      header.appendChild(done);
      panel.insertBefore(header, panel.firstChild);
    }
  };
  groups.forEach((g) => {
    const btn = g.querySelector(".filter-button");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = g.classList.contains("open");
      closeAllPanels();
      if (!isOpen) {
        g.classList.add("open");
        enhanceMobilePanel(g);
      }
    });
    const panel = g.querySelector(".dropdown-panel");
    if (panel) {
      panel.addEventListener("click", (e) => e.stopPropagation());
    }
  });
  document.addEventListener("click", () => closeAllPanels());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllPanels();
  });
  document.querySelectorAll(
    '.dropdown-panel input[type="checkbox"][data-filter="status"],.dropdown-panel input[type="checkbox"][data-filter="priority"],.dropdown-panel input[type="checkbox"][data-filter="project"]'
  ).forEach((cb) => {
    cb.addEventListener("change", () => {
      const type = cb.dataset.filter;
      if (type === "status") toggleSet(filterState.statuses, cb.value, cb.checked);
      if (type === "priority") toggleSet(filterState.priorities, cb.value, cb.checked);
      if (type === "project") toggleSet(filterState.projects, cb.value, cb.checked);
      updateFilterBadges();
      renderAfterFilterChange();
      const calendarView = document.getElementById("calendar-view");
      if (calendarView) {
        renderCalendar();
      }
      updateClearButtonVisibility();
    });
  });
  document.querySelectorAll('input[type="checkbox"][data-filter="date-preset"]').forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const val = checkbox.value;
      if (checkbox.checked) {
        filterState.datePresets.add(val);
        if (filterState.datePresets.size > 0) {
          filterState.dateFrom = "";
          filterState.dateTo = "";
          const dateFromEl2 = document.getElementById("filter-date-from");
          const dateToEl2 = document.getElementById("filter-date-to");
          if (dateFromEl2) dateFromEl2.value = "";
          if (dateToEl2) dateToEl2.value = "";
        }
      } else {
        filterState.datePresets.delete(val);
      }
      updateFilterBadges();
      renderAfterFilterChange();
      const calendarView = document.getElementById("calendar-view");
      if (calendarView) {
        renderCalendar();
      }
      updateClearButtonVisibility();
    });
  });
  const selectAllProject = document.getElementById("project-select-all");
  if (selectAllProject) {
    selectAllProject.addEventListener("change", () => {
      const projectCheckboxes = document.querySelectorAll(
        '.dropdown-panel input[type="checkbox"][data-filter="project"]'
      );
      const allChecked = selectAllProject.checked;
      projectCheckboxes.forEach((cb) => {
        cb.checked = allChecked;
        if (allChecked) {
          filterState.projects.add(cb.value);
        } else {
          filterState.projects.delete(cb.value);
        }
      });
      updateFilterBadges();
      renderAfterFilterChange();
      const calendarView = document.getElementById("calendar-view");
      if (calendarView) {
        renderCalendar();
      }
      updateClearButtonVisibility();
    });
  }
  const searchEl = document.getElementById("filter-search");
  if (searchEl) {
    searchEl.addEventListener("input", () => {
      filterState.search = (searchEl.value || "").trim().toLowerCase();
      updateFilterBadges();
      renderAfterFilterChange();
      const calendarView = document.getElementById("calendar-view");
      if (calendarView) {
        renderCalendar();
      }
      updateClearButtonVisibility();
    });
  }
  document.querySelectorAll('input[type="radio"][data-filter="kanban-updated"][name="kanban-updated-filter"]').forEach((rb) => {
    rb.addEventListener("change", () => {
      if (!rb.checked) return;
      setKanbanUpdatedFilter(rb.value);
      updateClearButtonVisibility();
    });
  });
  const dateFromEl = document.getElementById("filter-date-from");
  const dateToEl = document.getElementById("filter-date-to");
  if (dateFromEl) {
    dateFromEl.addEventListener("change", () => {
      filterState.dateFrom = dateFromEl.value;
      updateFilterBadges();
      renderAfterFilterChange();
      const calendarView = document.getElementById("calendar-view");
      if (calendarView) {
        renderCalendar();
      }
      updateClearButtonVisibility();
    });
  } else {
    console.error("[Filter] Date From element not found!");
  }
  if (dateToEl) {
    dateToEl.addEventListener("change", () => {
      filterState.dateTo = dateToEl.value;
      updateFilterBadges();
      renderAfterFilterChange();
      const calendarView = document.getElementById("calendar-view");
      if (calendarView) {
        renderCalendar();
      }
      updateClearButtonVisibility();
    });
  } else {
    console.error("[Filter] Date To element not found!");
  }
  const clearBtn = document.getElementById("btn-clear-filters");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      filterState.search = "";
      filterState.statuses.clear();
      filterState.priorities.clear();
      filterState.projects.clear();
      filterState.tags.clear();
      filterState.datePresets.clear();
      filterState.dateFrom = "";
      filterState.dateTo = "";
      try {
        setKanbanUpdatedFilter("all", { render: false });
      } catch (e) {
      }
      document.querySelectorAll('.dropdown-panel input[type="checkbox"]').forEach((cb) => cb.checked = false);
      if (searchEl) searchEl.value = "";
      if (dateFromEl) {
        dateFromEl.value = "";
        const dateFromWrapper = dateFromEl.closest(".date-input-wrapper");
        if (dateFromWrapper) {
          const displayInput = dateFromWrapper.querySelector(".date-display");
          if (displayInput && displayInput._flatpickr) {
            displayInput._flatpickr.clear();
          }
        }
      }
      if (dateToEl) {
        dateToEl.value = "";
        const dateToWrapper = dateToEl.closest(".date-input-wrapper");
        if (dateToWrapper) {
          const displayInput = dateToWrapper.querySelector(".date-display");
          if (displayInput && displayInput._flatpickr) {
            displayInput._flatpickr.clear();
          }
        }
      }
      updateFilterBadges();
      renderAfterFilterChange();
      const calendarView = document.getElementById("calendar-view");
      if (calendarView) {
        renderCalendar();
      }
      updateClearButtonVisibility();
    });
  }
  updateFilterBadges();
  renderActiveFilterChips();
  updateKanbanUpdatedFilterUI();
  updateClearButtonVisibility();
}
function updateClearButtonVisibility() {
  const btn = document.getElementById("btn-clear-filters");
  if (!btn) return;
  const kanban = document.querySelector(".kanban-board");
  const isKanban = kanban && !kanban.classList.contains("hidden");
  const isList = document.getElementById("list-view")?.classList.contains("active");
  const isCalendar = document.getElementById("calendar-view")?.classList.contains("active");
  const showUpdated = isKanban || isList || isCalendar;
  const hasKanbanUpdated = showUpdated && window.kanbanUpdatedFilter && window.kanbanUpdatedFilter !== "all";
  const hasFilters = filterState.search && filterState.search.trim() !== "" || filterState.statuses.size > 0 || filterState.priorities.size > 0 || filterState.projects.size > 0 || filterState.tags.size > 0 || filterState.datePresets.size > 0 || filterState.dateFrom && filterState.dateFrom !== "" || filterState.dateTo && filterState.dateTo !== "" || hasKanbanUpdated;
  btn.style.display = hasFilters ? "inline-flex" : "none";
}
function updateFilterBadges() {
  const b1 = document.getElementById("badge-status");
  const b2 = document.getElementById("badge-priority");
  const b3 = document.getElementById("badge-project");
  const b4 = document.getElementById("badge-tags");
  const bEndDate = document.getElementById("badge-end-date");
  const bStartDate = document.getElementById("badge-start-date");
  if (b1) b1.textContent = filterState.statuses.size === 0 ? "" : filterState.statuses.size;
  if (b2) b2.textContent = filterState.priorities.size === 0 ? "" : filterState.priorities.size;
  if (b3) b3.textContent = filterState.projects.size === 0 ? "" : filterState.projects.size;
  if (b4) b4.textContent = filterState.tags.size === 0 ? "" : filterState.tags.size;
  const endDatePresets = ["no-date", "overdue", "end-today", "end-tomorrow", "end-7days", "end-week", "end-month"];
  const startDatePresets = ["no-start-date", "already-started", "start-today", "start-tomorrow", "start-7days", "start-week", "start-month"];
  let endDateCount = 0;
  let startDateCount = 0;
  filterState.datePresets.forEach((preset) => {
    if (endDatePresets.includes(preset)) {
      endDateCount++;
    } else if (startDatePresets.includes(preset)) {
      startDateCount++;
    }
  });
  if (bEndDate) bEndDate.textContent = endDateCount === 0 ? "" : endDateCount;
  if (bStartDate) bStartDate.textContent = startDateCount === 0 ? "" : startDateCount;
  const updateButtonState = (badgeId, isActive) => {
    const badge = document.getElementById(badgeId);
    if (badge) {
      const button = badge.closest(".filter-button");
      if (button) {
        if (isActive) {
          button.classList.add("active");
        } else {
          button.classList.remove("active");
        }
      }
    }
  };
  updateButtonState("badge-status", filterState.statuses.size > 0);
  updateButtonState("badge-priority", filterState.priorities.size > 0);
  updateButtonState("badge-project", filterState.projects.size > 0);
  updateButtonState("badge-tags", filterState.tags.size > 0);
  updateButtonState("badge-end-date", endDateCount > 0);
  updateButtonState("badge-start-date", startDateCount > 0);
  renderActiveFilterChips();
  updateClearButtonVisibility();
  logDebug("filters", "badges", {
    statusCount: filterState.statuses.size,
    priorityCount: filterState.priorities.size,
    projectCount: filterState.projects.size,
    tagCount: filterState.tags.size,
    endDateCount,
    startDateCount
  });
}
function renderActiveFilterChips() {
  const wrap = document.getElementById("active-filters");
  if (!wrap) return;
  const chipsTimer = debugTimeStart("filters", "chips");
  wrap.innerHTML = "";
  const addChip = (label, value, onRemove, type, rawValue) => {
    const chip = document.createElement("span");
    chip.className = "filter-chip";
    if (type === "status") {
      chip.classList.add("chip-status");
    } else if (type === "priority") {
      chip.classList.add("chip-priority");
    }
    const text = document.createElement("span");
    text.className = "chip-text";
    if (type === "status" && rawValue) {
      const dot = document.createElement("span");
      dot.className = `dot ${rawValue}`;
      text.appendChild(dot);
      text.appendChild(document.createTextNode(` ${label}: ${value}`));
    } else {
      text.textContent = `${label}: ${value}`;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip-remove";
    btn.setAttribute("aria-label", t("filters.chip.removeAria", { label }));
    btn.textContent = "\xD7";
    btn.addEventListener("click", onRemove);
    chip.appendChild(text);
    chip.appendChild(btn);
    wrap.appendChild(chip);
  };
  if (filterState.search)
    addChip(t("filters.chip.search"), filterState.search, () => {
      filterState.search = "";
      const el = document.getElementById("filter-search");
      if (el) el.value = "";
      updateFilterBadges();
      updateClearButtonVisibility();
      renderAfterFilterChange();
    });
  filterState.statuses.forEach(
    (v) => addChip(t("tasks.filters.status"), getStatusLabel(v), () => {
      filterState.statuses.delete(v);
      const cb = document.querySelector(
        `input[type="checkbox"][data-filter="status"][value="${v}"]`
      );
      if (cb) cb.checked = false;
      updateFilterBadges();
      renderAfterFilterChange();
    }, "status", v)
  );
  filterState.priorities.forEach(
    (v) => addChip(t("tasks.filters.priority"), getPriorityLabel(v), () => {
      filterState.priorities.delete(v);
      const cb = document.querySelector(
        `input[type="checkbox"][data-filter="priority"][value="${v}"]`
      );
      if (cb) cb.checked = false;
      updateFilterBadges();
      renderAfterFilterChange();
    }, "priority", v)
  );
  filterState.projects.forEach((pid) => {
    const proj = projects.find((p) => p.id.toString() === pid.toString());
    addChip(t("filters.chip.project"), proj ? proj.name : pid, () => {
      filterState.projects.delete(pid);
      const cb = document.querySelector(
        `input[type="checkbox"][data-filter="project"][value="${pid}"]`
      );
      if (cb) cb.checked = false;
      updateFilterBadges();
      renderAfterFilterChange();
    });
  });
  filterState.tags.forEach(
    (tag) => addChip(t("filters.chip.tag"), tag, () => {
      filterState.tags.delete(tag);
      const cb = document.querySelector(
        `input[type="checkbox"][data-filter="tag"][value="${tag}"]`
      );
      if (cb) cb.checked = false;
      updateFilterBadges();
      renderAfterFilterChange();
    })
  );
  filterState.datePresets.forEach((preset) => {
    const datePresetLabels = {
      "no-date": t("tasks.filters.noDate"),
      "overdue": t("tasks.filters.overdue"),
      "end-today": t("tasks.filters.endToday"),
      "end-tomorrow": t("tasks.filters.endTomorrow"),
      "end-7days": t("tasks.filters.end7Days"),
      "end-week": t("tasks.filters.endThisWeek"),
      "end-month": t("tasks.filters.endThisMonth"),
      "no-start-date": t("tasks.filters.noStartDate"),
      "already-started": t("tasks.filters.alreadyStarted"),
      "start-today": t("tasks.filters.startToday"),
      "start-tomorrow": t("tasks.filters.startTomorrow"),
      "start-7days": t("tasks.filters.start7Days"),
      "start-week": t("tasks.filters.startThisWeek"),
      "start-month": t("tasks.filters.startThisMonth")
    };
    const label = datePresetLabels[preset] || preset;
    addChip(t("filters.chip.date"), label, () => {
      filterState.datePresets.delete(preset);
      const checkbox = document.querySelector(`input[type="checkbox"][data-filter="date-preset"][value="${preset}"]`);
      if (checkbox) checkbox.checked = false;
      updateFilterBadges();
      renderAfterFilterChange();
    });
  });
  try {
    const kanban = document.querySelector(".kanban-board");
    const isKanban = kanban && !kanban.classList.contains("hidden");
    const isList = document.getElementById("list-view")?.classList.contains("active");
    const isCalendar = document.getElementById("calendar-view")?.classList.contains("active");
    const showUpdated = isKanban || isList || isCalendar;
    if (showUpdated && window.kanbanUpdatedFilter && window.kanbanUpdatedFilter !== "all") {
      addChip(t("filters.chip.updated"), getKanbanUpdatedFilterLabel(window.kanbanUpdatedFilter), () => {
        setKanbanUpdatedFilter("all");
        updateClearButtonVisibility();
      });
    }
  } catch (e) {
  }
  if (filterState.dateFrom || filterState.dateTo) {
    let dateLabel = "";
    if (filterState.dateFrom && filterState.dateTo) {
      dateLabel = `${formatDate(filterState.dateFrom)} - ${formatDate(filterState.dateTo)}`;
    } else if (filterState.dateFrom) {
      dateLabel = `${t("filters.dateRange.from")} ${formatDate(filterState.dateFrom)}`;
    } else if (filterState.dateTo) {
      dateLabel = `${t("filters.dateRange.until")} ${formatDate(filterState.dateTo)}`;
    }
    addChip(t("filters.chip.date"), dateLabel, () => {
      filterState.dateFrom = "";
      filterState.dateTo = "";
      const fromEl = document.getElementById("filter-date-from");
      const toEl = document.getElementById("filter-date-to");
      if (fromEl) {
        fromEl.value = "";
        const dateFromWrapper = fromEl.closest(".date-input-wrapper");
        if (dateFromWrapper) {
          const displayInput = dateFromWrapper.querySelector(".date-display");
          if (displayInput && displayInput._flatpickr) {
            displayInput._flatpickr.clear();
          }
        }
      }
      if (toEl) {
        toEl.value = "";
        const dateToWrapper = toEl.closest(".date-input-wrapper");
        if (dateToWrapper) {
          const displayInput = dateToWrapper.querySelector(".date-display");
          if (displayInput && displayInput._flatpickr) {
            displayInput._flatpickr.clear();
          }
        }
      }
      renderAfterFilterChange();
    });
  }
  debugTimeEnd("filters", chipsTimer, { chipCount: wrap.children.length });
}
function syncURLWithFilters() {
  const params = new URLSearchParams();
  const isListView = document.getElementById("list-view")?.classList.contains("active");
  const isCalendarView = document.getElementById("calendar-view")?.classList.contains("active");
  if (isListView) {
    params.set("view", "list");
  } else if (isCalendarView) {
    params.set("view", "calendar");
  }
  if (filterState.search && filterState.search.trim() !== "") {
    params.set("search", filterState.search.trim());
  }
  if (filterState.statuses.size > 0) {
    params.set("status", Array.from(filterState.statuses).join(","));
  }
  if (filterState.priorities.size > 0) {
    params.set("priority", Array.from(filterState.priorities).join(","));
  }
  if (filterState.projects.size > 0) {
    params.set("project", Array.from(filterState.projects).join(","));
  }
  if (filterState.tags.size > 0) {
    params.set("tags", Array.from(filterState.tags).join(","));
  }
  if (filterState.datePresets.size > 0) {
    params.set("datePreset", Array.from(filterState.datePresets).join(","));
  }
  if (filterState.dateFrom && filterState.dateFrom !== "") {
    params.set("dateFrom", filterState.dateFrom);
    if (filterState.dateField && filterState.dateField !== "endDate") {
      params.set("dateField", filterState.dateField);
    }
  }
  if (filterState.dateTo && filterState.dateTo !== "") {
    params.set("dateTo", filterState.dateTo);
  }
  if (window.kanbanUpdatedFilter && window.kanbanUpdatedFilter !== "all") {
    params.set("updated", window.kanbanUpdatedFilter);
  }
  const queryString = params.toString();
  const newHash = queryString ? `#tasks?${queryString}` : "#tasks";
  if (window.location.hash !== newHash) {
    window.history.replaceState(null, "", newHash);
  }
}
function renderAfterFilterChange() {
  syncURLWithFilters();
  renderActiveFilterChips();
  renderTasks();
  const isMobile = getIsMobileCached();
  if (isMobile || document.getElementById("list-view").classList.contains("active")) {
    renderListView();
  }
  if (document.getElementById("calendar-view").classList.contains("active")) {
    renderCalendar();
  }
}
function getFilteredTasks() {
  const filterTimer = debugTimeStart("filters", "tasks", {
    totalTasks: tasks.length,
    hasSearch: !!filterState.search,
    statusCount: filterState.statuses.size,
    priorityCount: filterState.priorities.size,
    projectCount: filterState.projects.size,
    tagCount: filterState.tags.size,
    datePresetCount: filterState.datePresets.size,
    hasDateRange: !!(filterState.dateFrom || filterState.dateTo)
  });
  const filtered = filterTasks(tasks, {
    search: filterState.search,
    statuses: filterState.statuses,
    priorities: filterState.priorities,
    projects: filterState.projects,
    tags: filterState.tags,
    datePresets: filterState.datePresets,
    dateFrom: filterState.dateFrom,
    dateTo: filterState.dateTo,
    dateField: filterState.dateField || "endDate"
  });
  debugTimeEnd("filters", filterTimer, {
    totalTasks: tasks.length,
    filteredCount: filtered.length
  });
  return filtered;
}
function initializeDatePickers() {
  const flatpickrFn = window.flatpickr;
  if (typeof flatpickrFn !== "function") {
    const retry = (initializeDatePickers.__retryCount || 0) + 1;
    initializeDatePickers.__retryCount = retry;
    if (retry <= 50) {
      setTimeout(initializeDatePickers, 100);
    } else {
      console.warn("flatpickr is not available; date pickers disabled");
    }
    return;
  }
  const flatpickrLocale = getFlatpickrLocale();
  const dateConfig = {
    dateFormat: "d/m/Y",
    altInput: false,
    allowInput: true,
    locale: flatpickrLocale,
    disableMobile: true
  };
  function addDateMask(input, flatpickrInstance) {
    let clearedOnFirstKey = false;
    input.addEventListener("keydown", function(e) {
      if (!clearedOnFirstKey && input.value.match(/^\d{2}\/\d{2}\/\d{4}$/) && e.key.length === 1 && /\d/.test(e.key)) {
        input.value = "";
        clearedOnFirstKey = true;
      }
      if (e.key === "Backspace" && input.selectionStart === 0 && input.selectionEnd === 0) {
        input.value = "";
        clearedOnFirstKey = true;
        e.preventDefault();
      }
    });
    input.addEventListener("input", function(e) {
      let value = e.target.value;
      let numbers = value.replace(/\D/g, "");
      let formatted = "";
      if (numbers.length >= 1) {
        let day = numbers.substring(0, 2);
        if (parseInt(day, 10) > 31) day = "31";
        formatted = day;
      }
      if (numbers.length >= 3) {
        let month = numbers.substring(2, 4);
        if (parseInt(month, 10) > 12) month = "12";
        formatted += "/" + month;
      }
      if (numbers.length >= 5) {
        formatted += "/" + numbers.substring(4, 8);
      }
      if (value !== formatted) {
        e.target.value = formatted;
      }
      if (formatted.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [dd, mm, yyyy] = formatted.split("/");
        const dateObj = new Date(+yyyy, +mm - 1, +dd);
        if (flatpickrInstance && flatpickrInstance.config) {
          try {
            flatpickrInstance.__suppressChange = true;
            flatpickrInstance.setDate(dateObj, false);
            setTimeout(() => flatpickrInstance.__suppressChange = false, 0);
          } catch (e2) {
          }
        }
      }
    });
    input.addEventListener("keypress", function(e) {
      const char = String.fromCharCode(e.which);
      if (!/[\d\/]/.test(char) && e.which !== 8 && e.which !== 46) {
        e.preventDefault();
      }
    });
    input.addEventListener("blur", function() {
      clearedOnFirstKey = false;
    });
    if (flatpickrInstance) {
      flatpickrInstance.config.onChange.push(() => clearedOnFirstKey = false);
    }
  }
  function patchProgrammaticGuards(fp) {
    if (fp.__patchedProgrammaticGuards) return;
    fp.__patchedProgrammaticGuards = true;
    const origClear = fp.clear.bind(fp);
    fp.clear = function() {
      fp.__suppressChange = true;
      const res = origClear();
      setTimeout(() => fp.__suppressChange = false, 0);
      return res;
    };
    const origSetDate = fp.setDate.bind(fp);
    fp.__origSetDate = origSetDate;
    fp.setDate = function(date, triggerChange, ...rest) {
      fp.__suppressChange = true;
      const res = origSetDate(date, triggerChange, ...rest);
      setTimeout(() => fp.__suppressChange = false, 0);
      return res;
    };
  }
  function addTodayButton(fp) {
    if (!fp || !fp.calendarContainer) return;
    if (fp.calendarContainer.querySelector(".flatpickr-today-btn")) return;
    const footer = document.createElement("div");
    footer.className = "flatpickr-today-footer";
    const todayBtn = document.createElement("button");
    todayBtn.type = "button";
    todayBtn.className = "flatpickr-today-btn";
    todayBtn.textContent = t("calendar.today") || "Today";
    todayBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const today = /* @__PURE__ */ new Date();
      fp.jumpToDate(today);
      fp.__suppressChange = false;
      if (typeof fp.__origSetDate === "function") {
        fp.__origSetDate(today, true);
      } else {
        fp.setDate(today, true);
      }
    });
    footer.appendChild(todayBtn);
    fp.calendarContainer.appendChild(footer);
  }
  document.querySelectorAll('input[type="date"], input.datepicker').forEach((input) => {
    if (input._flatpickrInstance) return;
    if (input.type === "date") {
      if (input._wrapped) return;
      input._wrapped = true;
      const wrapper = document.createElement("div");
      wrapper.className = "date-input-wrapper";
      const displayInput = document.createElement("input");
      displayInput.type = "text";
      displayInput.className = "form-input date-display";
      displayInput.placeholder = t("common.datePlaceholder");
      displayInput.maxLength = "10";
      input.style.display = "none";
      input.type = "hidden";
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
      wrapper.appendChild(displayInput);
      const initialISO = input.value && looksLikeISO(input.value) ? input.value : "";
      if (initialISO) {
        displayInput.value = toDMYFromISO(initialISO);
      } else {
        displayInput.value = "";
      }
      const fp = flatpickrFn(displayInput, {
        ...dateConfig,
        defaultDate: initialISO ? new Date(initialISO) : null,
        onReady(_, __, inst) {
          addTodayButton(inst);
        },
        onOpen(_, __, inst) {
          if (!input.value && !inst.selectedDates.length) {
            inst.jumpToDate(/* @__PURE__ */ new Date());
          }
        },
        onChange: function(selectedDates) {
          const previousValue = input.value || "";
          let iso = "";
          if (selectedDates.length > 0) {
            const d = selectedDates[0];
            iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
              d.getDate()
            ).padStart(2, "0")}`;
          }
          input.value = iso;
          const form = document.getElementById("task-form");
          if (form && (input.name === "startDate" || input.name === "endDate")) {
            const modal = document.querySelector(".modal.active");
            if (modal) {
              const startInput = modal.querySelector('input[name="startDate"]');
              const endInput = modal.querySelector('input[name="endDate"]');
              if (startInput && endInput) {
                const startValue = (startInput.value || "").trim();
                const endValue = (endInput.value || "").trim();
                if (startValue && endValue && endValue < startValue) {
                  input.value = previousValue;
                  if (previousValue) {
                    displayInput._flatpickr.setDate(new Date(previousValue), false);
                  } else {
                    displayInput._flatpickr.clear();
                  }
                  const wrapper2 = displayInput.closest(".date-input-wrapper");
                  const formGroup = wrapper2 ? wrapper2.closest(".form-group") : null;
                  if (formGroup) {
                    const existingError = formGroup.querySelector(".date-validation-error");
                    if (existingError) existingError.remove();
                    const errorMsg = document.createElement("div");
                    errorMsg.className = "date-validation-error";
                    errorMsg.style.cssText = "color: var(--error); font-size: 12px; margin-top: 6px; padding: 8px 12px; background: var(--bg-error, rgba(239, 68, 68, 0.08)); border-left: 3px solid var(--error); border-radius: 4px;";
                    errorMsg.innerHTML = "\u26A0\uFE0F " + (input.name === "endDate" ? "End Date cannot be before Start Date" : "Start Date cannot be after End Date");
                    wrapper2.parentNode.insertBefore(errorMsg, wrapper2.nextSibling);
                    setTimeout(() => {
                      if (errorMsg.parentElement) errorMsg.remove();
                    }, 5e3);
                  }
                  return;
                } else {
                  const wrapper2 = displayInput.closest(".date-input-wrapper");
                  const formGroup = wrapper2 ? wrapper2.closest(".form-group") : null;
                  if (formGroup) {
                    const existingError = formGroup.querySelector(".date-validation-error");
                    if (existingError) existingError.remove();
                  }
                }
              }
            }
          }
          if (input.id === "filter-date-from") {
            filterState.dateFrom = iso;
            updateFilterBadges();
            renderAfterFilterChange();
            const calendarView = document.getElementById("calendar-view");
            if (calendarView) {
              renderCalendar();
            }
            updateClearButtonVisibility();
            return;
          } else if (input.id === "filter-date-to") {
            filterState.dateTo = iso;
            updateFilterBadges();
            renderAfterFilterChange();
            const calendarView = document.getElementById("calendar-view");
            if (calendarView) {
              renderCalendar();
            }
            updateClearButtonVisibility();
            return;
          }
          const isEditing = !!(form && form.dataset.editingTaskId);
          const fieldName = input.name;
          const isDateField = fieldName === "startDate" || fieldName === "endDate";
          if (isEditing && isDateField && !fp.__suppressChange) {
            updateTaskField2(fieldName, iso);
            return;
          }
          if (displayInput.classList.contains("editable-date") && !fp.__suppressChange) {
            const onchangeAttr = displayInput.getAttribute("onchange");
            if (onchangeAttr && onchangeAttr.includes("updateProjectField")) {
              const match = onchangeAttr.match(/updateProjectField\((\d+),\s*['"](\w+)['"]/);
              if (match) {
                const projectId = parseInt(match[1], 10);
                const field = match[2];
                updateProjectField2(projectId, field, displayInput.value);
              }
            }
          }
        }
      });
      patchProgrammaticGuards(fp);
      addDateMask(displayInput, fp);
      input._flatpickrInstance = fp;
      const inTaskForm = !!displayInput.closest("#task-form");
      const isTaskDateField = input.name === "startDate" || input.name === "endDate";
      if (inTaskForm && isTaskDateField) {
        const clearBtn = document.createElement("button");
        clearBtn.type = "button";
        clearBtn.textContent = "Clear";
        clearBtn.style.padding = "6px 10px";
        clearBtn.style.border = "1px solid var(--border)";
        clearBtn.style.background = "var(--bg-tertiary)";
        clearBtn.style.color = "var(--text-secondary)";
        clearBtn.style.borderRadius = "6px";
        clearBtn.style.cursor = "pointer";
        clearBtn.style.flex = "0 0 auto";
        const wrapperNode = displayInput.parentElement;
        if (wrapperNode) {
          wrapperNode.style.display = "flex";
          wrapperNode.style.gap = "8px";
        }
        wrapperNode.appendChild(clearBtn);
        clearBtn.addEventListener("click", () => {
          displayInput.value = "";
          input.value = "";
          if (fp) {
            fp.__suppressChange = true;
            fp.clear();
            setTimeout(() => fp.__suppressChange = false, 0);
          }
          const form = document.getElementById("task-form");
          const isEditing = !!(form && form.dataset.editingTaskId);
          if (isEditing) {
            updateTaskField2(input.name, "");
          }
        });
      }
    } else {
      input.maxLength = "10";
      const fp = flatpickrFn(input, {
        ...dateConfig,
        defaultDate: null,
        onReady(_, __, inst) {
          addTodayButton(inst);
        },
        onChange: function(selectedDates, dateStr) {
          if (fp.__suppressChange) return;
          const projectId = input.dataset.projectId;
          const fieldName = input.dataset.field;
          if (projectId && fieldName) {
            updateProjectField2(parseInt(projectId, 10), fieldName, dateStr);
          }
        }
      });
      patchProgrammaticGuards(fp);
      addDateMask(input, fp);
      input._flatpickrInstance = fp;
    }
  });
}
function getFlatpickrLocale() {
  const lang = getCurrentLanguage();
  const l10n = window.flatpickr?.l10ns;
  let locale = null;
  if (lang === "es" && l10n?.es) {
    locale = l10n.es;
  } else {
    locale = l10n?.default || l10n?.en || l10n?.es || null;
  }
  return locale ? { ...locale, firstDayOfWeek: 1 } : { firstDayOfWeek: 1 };
}
function refreshFlatpickrLocale() {
  const locale = getFlatpickrLocale();
  document.querySelectorAll("input").forEach((input) => {
    const fp = input._flatpickrInstance;
    if (fp && typeof fp.set === "function") {
      fp.set("locale", locale);
      if (typeof fp.redraw === "function") {
        fp.redraw();
      }
    }
  });
}
var lastDataFingerprint = null;
var lastCalendarFingerprint = null;
var calendarRenderDebounceId = null;
function getMaxUpdatedTime(items, getTimeFn) {
  let maxTime = 0;
  const list = Array.isArray(items) ? items : [];
  for (const item of list) {
    const time = getTimeFn ? getTimeFn(item) : Date.parse(item?.updatedAt || item?.createdAt || item?.createdDate || "") || 0;
    if (Number.isFinite(time) && time > maxTime) maxTime = time;
  }
  return maxTime;
}
function getIdSum(items) {
  let sum = 0;
  const list = Array.isArray(items) ? items : [];
  for (const item of list) {
    const id = Number(item?.id);
    if (!Number.isNaN(id)) sum += id;
  }
  return sum;
}
function buildDataFingerprint(data) {
  const t2 = Array.isArray(data?.tasks) ? data.tasks : [];
  const p = Array.isArray(data?.projects) ? data.projects : [];
  const f = Array.isArray(data?.feedbackItems) ? data.feedbackItems : [];
  const tMax = getMaxUpdatedTime(t2, typeof getTaskUpdatedTime === "function" ? getTaskUpdatedTime : null);
  const pMax = getMaxUpdatedTime(p, (proj) => Date.parse(proj?.updatedAt || proj?.createdAt || "") || 0);
  const fMax = getMaxUpdatedTime(f, (fb) => Date.parse(fb?.updatedAt || fb?.createdAt || fb?.createdDate || "") || 0);
  return `t:${t2.length}:${tMax}:${getIdSum(t2)}|p:${p.length}:${pMax}:${getIdSum(p)}|f:${f.length}:${fMax}:${getIdSum(f)}`;
}
function buildCalendarFingerprint(sourceTasks = tasks, sourceProjects = projects) {
  const includeBacklog = !!settings.calendarIncludeBacklog;
  const projectFilter = filterState?.projects;
  const filteredProjectIds = projectFilter && projectFilter.size > 0 ? new Set(Array.from(projectFilter).map((id) => parseInt(id, 10))) : null;
  let hash = 0;
  let count = 0;
  const list = Array.isArray(sourceTasks) ? sourceTasks : [];
  for (const task of list) {
    if (!task) continue;
    if (!includeBacklog && task.status === "backlog") continue;
    if (filteredProjectIds && !filteredProjectIds.has(Number(task.projectId))) continue;
    const start = task.startDate || "";
    const end = task.endDate || "";
    const hasStart = typeof start === "string" && start.length === 10 && start.includes("-");
    const hasEnd = typeof end === "string" && end.length === 10 && end.includes("-");
    if (!hasStart && !hasEnd) continue;
    count++;
    const id = Number(task.id) || 0;
    const status = task.status ? String(task.status) : "";
    const proj = Number(task.projectId) || 0;
    const title = task.title ? String(task.title) : "";
    const updated = Date.parse(task.updatedAt || task.createdAt || task.createdDate || "") || 0;
    hash = hash * 31 + id + proj + updated | 0;
    for (let i = 0; i < start.length; i++) hash = hash * 31 + start.charCodeAt(i) | 0;
    for (let i = 0; i < end.length; i++) hash = hash * 31 + end.charCodeAt(i) | 0;
    for (let i = 0; i < status.length; i++) hash = hash * 31 + status.charCodeAt(i) | 0;
    for (let i = 0; i < title.length; i++) hash = hash * 31 + title.charCodeAt(i) | 0;
  }
  const projectList = Array.isArray(sourceProjects) ? sourceProjects : [];
  let projectHash = 0;
  let projectCount = 0;
  for (const project of projectList) {
    if (!project) continue;
    if (filteredProjectIds && !filteredProjectIds.has(Number(project.id))) continue;
    projectCount++;
    const pid = Number(project.id) || 0;
    const name = project.name ? String(project.name) : "";
    const startDate = project.startDate ? String(project.startDate) : "";
    const endDate = project.endDate ? String(project.endDate) : "";
    const updatedAt = Date.parse(project.updatedAt || project.createdAt || "") || 0;
    projectHash = projectHash * 31 + pid + updatedAt | 0;
    for (let i = 0; i < name.length; i++) projectHash = projectHash * 31 + name.charCodeAt(i) | 0;
    for (let i = 0; i < startDate.length; i++) projectHash = projectHash * 31 + startDate.charCodeAt(i) | 0;
    for (let i = 0; i < endDate.length; i++) projectHash = projectHash * 31 + endDate.charCodeAt(i) | 0;
  }
  return `m:${currentYear}-${currentMonth + 1}|b:${includeBacklog ? 1 : 0}|pf:${filteredProjectIds ? filteredProjectIds.size : 0}|c:${count}|h:${hash}|pc:${projectCount}|ph:${projectHash}`;
}
function scheduleCalendarRenderDebounced(delayMs = 500) {
  if (calendarRenderDebounceId !== null) {
    clearTimeout(calendarRenderDebounceId);
  }
  calendarRenderDebounceId = setTimeout(() => {
    calendarRenderDebounceId = null;
    renderCalendar();
    lastCalendarFingerprint = buildCalendarFingerprint();
  }, delayMs);
}
function getActivePageId() {
  const active = document.querySelector(".page.active");
  return active ? active.id : null;
}
function applyInitialRouteShell() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  const validPages = ["dashboard", "projects", "tasks", "updates", "feedback", "calendar"];
  let pageToShow = "dashboard";
  if (hash === "dashboard/recent_activity") {
    pageToShow = "dashboard";
  } else if (hash.startsWith("project-")) {
    pageToShow = "projects";
  } else if (validPages.includes(hash)) {
    pageToShow = hash === "calendar" ? "tasks" : hash;
  } else {
    return;
  }
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  document.getElementById(pageToShow)?.classList.add("active");
  document.getElementById("project-details")?.classList.remove("active");
  document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
  if (hash === "calendar") {
    document.querySelector(".nav-item.calendar-nav")?.classList.add("active");
  } else {
    document.querySelector(`.nav-item[data-page="${pageToShow}"]`)?.classList.add("active");
  }
}
function renderActivePageOnly(options = {}) {
  const calendarChanged = !!options.calendarChanged;
  updateCounts();
  renderAppVersionLabel();
  const activeId = getActivePageId();
  if (activeId === "dashboard") {
    renderDashboard();
    return;
  }
  if (activeId === "projects") {
    renderProjects();
    return;
  }
  if (activeId === "tasks") {
    const kanbanBoard = document.querySelector(".kanban-board");
    if (kanbanBoard && !kanbanBoard.classList.contains("hidden")) {
      renderTasks();
    }
    if (getIsMobileCached() || document.getElementById("list-view")?.classList.contains("active")) {
      renderListView();
    }
    if (document.getElementById("calendar-view")?.classList.contains("active")) {
      if (calendarChanged) {
        logPerformanceMilestone("calendar-refresh-debounced", { reason: "data-changed" });
        scheduleCalendarRenderDebounced(500);
      } else {
        logPerformanceMilestone("calendar-refresh-skipped", { reason: "fingerprint-match" });
      }
    }
    return;
  }
  if (activeId === "updates") {
    renderUpdatesPage();
    return;
  }
  if (activeId === "feedback") {
    renderFeedback();
  }
  const projectDetailsView = document.getElementById("project-details");
  if (projectDetailsView && projectDetailsView.classList.contains("active")) {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith("project-")) {
      const projectId = parseInt(hash.replace("project-", ""), 10);
      if (!Number.isNaN(projectId)) {
        showProjectDetails(projectId);
      }
    }
  }
}
var isInitialized = false;
async function init() {
  if (isInitialized) {
    return;
  }
  isInitialized = true;
  logPerformanceMilestone("init-start", {
    hasAuth: !!localStorage.getItem("authToken"),
    hasAdmin: !!localStorage.getItem("adminToken")
  });
  const initTimer = debugTimeStart("init", "init", {
    hasAuth: !!localStorage.getItem("authToken"),
    hasAdmin: !!localStorage.getItem("adminToken")
  });
  if (!localStorage.getItem("authToken") && !localStorage.getItem("adminToken")) {
    console.log("Waiting for authentication before initializing app...");
    isInitialized = false;
    return;
  }
  if (typeof updateBootSplashProgress === "function") {
    updateBootSplashProgress(10);
  }
  projects = [];
  tasks = [];
  feedbackItems = [];
  feedbackIndex = [];
  projectCounter = 1;
  taskCounter = 1;
  isInitializing = true;
  if (typeof updateBootSplashProgress === "function") {
    updateBootSplashProgress(20);
  }
  applyInitialRouteShell();
  markPerfOnce("first_skeleton_paint", { reason: "route-shell" });
  const handleAllDataRefresh = (fresh) => {
    if (!fresh) return;
    const nextFingerprint = buildDataFingerprint(fresh);
    const currentFingerprint = buildDataFingerprint({ tasks, projects, feedbackItems });
    if (nextFingerprint === currentFingerprint) return;
    applyLoadedAllData(fresh);
    if (feedbackDeltaQueue.length > 0) {
      scheduleFeedbackDeltaFlush(0);
    }
    const nextCalendarFingerprint = buildCalendarFingerprint(fresh.tasks || tasks, fresh.projects || projects);
    const calendarChanged = lastCalendarFingerprint && nextCalendarFingerprint !== lastCalendarFingerprint;
    lastDataFingerprint = nextFingerprint;
    lastCalendarFingerprint = nextCalendarFingerprint;
    renderActivePageOnly({ calendarChanged });
  };
  const allDataPromise = loadAll({
    preferCache: true,
    onRefresh: handleAllDataRefresh,
    feedback: {
      limitPending: FEEDBACK_ITEMS_PER_PAGE,
      limitDone: FEEDBACK_ITEMS_PER_PAGE,
      cacheKey: FEEDBACK_CACHE_KEY2,
      preferCache: true
    }
  });
  const sortStatePromise = loadSortState().catch(() => null);
  const projectColorsPromise = loadProjectColors().catch(() => ({}));
  const settingsPromise = loadSettings().catch(() => ({}));
  const historyPromise = window.historyService?.loadHistory ? window.historyService.loadHistory().catch(() => null) : Promise.resolve(null);
  const loadTimer = debugTimeStart("init", "load-data");
  const allData = await allDataPromise;
  if (typeof updateBootSplashProgress === "function") {
    updateBootSplashProgress(50);
  }
  applyLoadedAllData(allData);
  if (feedbackDeltaQueue.length > 0) {
    scheduleFeedbackDeltaFlush(0);
  }
  renderActivePageOnly();
  const [sortState, loadedProjectColors, loadedSettings] = await Promise.all([
    sortStatePromise,
    projectColorsPromise,
    settingsPromise,
    historyPromise
  ]);
  debugTimeEnd("init", loadTimer, {
    taskCount: allData?.tasks?.length || 0,
    projectCount: allData?.projects?.length || 0,
    feedbackCount: allData?.feedbackItems?.length || 0
  });
  logPerformanceMilestone("init-data-loaded", {
    taskCount: allData?.tasks?.length || 0,
    projectCount: allData?.projects?.length || 0,
    feedbackCount: allData?.feedbackItems?.length || 0
  });
  if (typeof updateBootSplashProgress === "function") {
    updateBootSplashProgress(60);
  }
  if (sortState && typeof sortState === "object") {
    const savedMode = sortState.sortMode;
    const savedOrder = sortState.manualTaskOrder;
    if (savedMode) sortMode = savedMode;
    if (savedOrder) manualTaskOrder = savedOrder;
  } else {
    try {
      const lm = localStorage.getItem("sortMode");
      const lo = localStorage.getItem("manualTaskOrder");
      if (lm) sortMode = lm;
      if (lo) manualTaskOrder = JSON.parse(lo);
    } catch (err) {
    }
  }
  if (sortMode === "auto" || sortMode !== "priority" && sortMode !== "manual") {
    sortMode = "priority";
  }
  updateSortUI();
  projectColorMap = loadedProjectColors && typeof loadedProjectColors === "object" ? loadedProjectColors : {};
  if (loadedSettings && typeof loadedSettings === "object") {
    settings = { ...settings, ...loadedSettings };
  }
  settings.language = normalizeLanguage(settings.language);
  applyDebugLogSetting(settings.debugLogsEnabled);
  if (perfDebugForced) {
    settings.debugLogsEnabled = true;
    applyDebugLogSetting(true);
  }
  applyWorkspaceLogo();
  if (typeof settings.enableReviewStatus !== "undefined") {
    window.enableReviewStatus = settings.enableReviewStatus;
    localStorage.setItem("enableReviewStatus", String(settings.enableReviewStatus));
  }
  applyReviewStatusVisibility();
  applyBacklogColumnVisibility();
  if (typeof updateBootSplashProgress === "function") {
    updateBootSplashProgress(75);
  }
  setupNavigation();
  setupStatusDropdown();
  setupPriorityDropdown();
  setupProjectDropdown();
  setupUserMenus();
  setupNotificationMenu();
  hydrateUserProfile();
  initializeDatePickers();
  initFiltersUI();
  setupModalTabs();
  applyLanguage();
  logPerformanceMilestone("init-ui-ready");
  if (typeof updateBootSplashProgress === "function") {
    updateBootSplashProgress(90);
  }
  isInitializing = false;
  filterState.search = "";
  filterState.statuses.clear();
  filterState.priorities.clear();
  filterState.projects.clear();
  filterState.tags.clear();
  filterState.datePresets.clear();
  filterState.dateFrom = "";
  filterState.dateTo = "";
  projectFilterState.search = "";
  projectFilterState.statuses.clear();
  projectFilterState.taskFilter = "";
  projectFilterState.updatedFilter = "all";
  try {
    localStorage.removeItem("projectsViewState");
  } catch (e) {
  }
  try {
    localStorage.removeItem("kanbanUpdatedFilter");
  } catch (e) {
  }
  window.kanbanUpdatedFilter = "all";
  const hash = window.location.hash.slice(1);
  const validPages = ["dashboard", "projects", "tasks", "updates", "feedback", "calendar"];
  document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
  if (hash === "calendar") {
    showCalendarView();
  } else if (hash === "dashboard/recent_activity") {
    document.querySelector('.nav-item[data-page="dashboard"]')?.classList.add("active");
    showPage("dashboard/recent_activity");
  } else if (hash.startsWith("project-")) {
    const projectId = parseInt(hash.replace("project-", ""));
    document.querySelector('.nav-item[data-page="projects"]')?.classList.add("active");
    showProjectDetails(projectId);
  } else {
    const pageToShow = validPages.includes(hash) ? hash === "calendar" ? "tasks" : hash : "dashboard";
    const navItem = document.querySelector(`.nav-item[data-page="${pageToShow}"]`);
    if (hash === "calendar") {
      document.querySelector(".nav-item.calendar-nav")?.classList.add("active");
    } else {
      if (navItem) navItem.classList.add("active");
    }
    document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
    document.getElementById(pageToShow).classList.add("active");
    if (hash === "calendar") {
      document.querySelector(".kanban-board")?.classList.add("hidden");
      document.getElementById("list-view")?.classList.remove("active");
      document.getElementById("calendar-view")?.classList.add("active");
      const viewToggle = document.querySelector(".view-toggle");
      if (viewToggle) viewToggle.classList.add("hidden");
      const globalFilters = document.getElementById("global-filters");
      if (globalFilters) globalFilters.style.display = "none";
      renderCalendar();
    }
  }
  if (typeof updateBootSplashProgress === "function") {
    updateBootSplashProgress(100);
  }
  if (!USE_SERVER_NOTIFICATIONS) {
    checkAndCreateDueTodayNotifications();
    cleanupOldNotifications();
  }
  logPerformanceMilestone("init-notifications-ready");
  debugTimeEnd("init", initTimer, {
    taskCount: tasks.length,
    projectCount: projects.length,
    feedbackCount: feedbackItems.length,
    pendingSaves
  });
  logPerformanceMilestone("init-complete", {
    taskCount: tasks.length,
    projectCount: projects.length,
    feedbackCount: feedbackItems.length
  });
  markPerfOnce("interactive_ready", {
    taskCount: tasks.length,
    projectCount: projects.length
  });
  function handleRouting() {
    const hash2 = window.location.hash.slice(1);
    const [page, queryString] = hash2.split("?");
    const params = new URLSearchParams(queryString || "");
    if (page === "login" || page === "admin-login" || page === "setup") {
      return;
    }
    document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
    if (page === "dashboard/recent_activity") {
      projectNavigationReferrer = "projects";
      document.querySelector('.nav-item[data-page="dashboard"]')?.classList.add("active");
      showPage("dashboard/recent_activity");
      previousPage = page;
    } else if (page.startsWith("project-")) {
      const projectId = parseInt(page.replace("project-", ""));
      document.querySelector('.nav-item[data-page="projects"]')?.classList.add("active");
      showProjectDetails(projectId);
      previousPage = page;
    } else if (page === "calendar") {
      projectNavigationReferrer = "projects";
      document.querySelector(".nav-item.calendar-nav")?.classList.add("active");
      showCalendarView();
      previousPage = page;
    } else if (page === "tasks") {
      projectNavigationReferrer = "projects";
      document.querySelector('.nav-item[data-page="tasks"]')?.classList.add("active");
      if (params.has("search")) {
        filterState.search = (params.get("search") || "").trim().toLowerCase();
      } else {
        filterState.search = "";
      }
      if (params.has("status")) {
        const statuses = params.get("status").split(",").filter(Boolean);
        filterState.statuses.clear();
        statuses.forEach((s) => filterState.statuses.add(s.trim()));
      } else {
        filterState.statuses.clear();
      }
      if (params.has("priority")) {
        const priorities = params.get("priority").split(",").filter(Boolean);
        filterState.priorities.clear();
        priorities.forEach((p) => filterState.priorities.add(p.trim()));
      } else {
        filterState.priorities.clear();
      }
      if (params.has("project")) {
        const projectIds = params.get("project").split(",").filter(Boolean);
        filterState.projects.clear();
        projectIds.forEach((id) => filterState.projects.add(id.trim()));
      } else {
        filterState.projects.clear();
      }
      if (params.has("tags")) {
        const tags = params.get("tags").split(",").filter(Boolean);
        filterState.tags.clear();
        tags.forEach((t2) => filterState.tags.add(t2.trim()));
      } else {
        filterState.tags.clear();
      }
      if (params.has("datePreset")) {
        const datePresetParam = params.get("datePreset") || "";
        const presets = datePresetParam.split(",").filter(Boolean);
        filterState.datePresets.clear();
        presets.forEach((p) => filterState.datePresets.add(p.trim()));
        filterState.dateFrom = "";
        filterState.dateTo = "";
        filterState.dateField = "endDate";
      } else if (params.has("dateFrom") || params.has("dateTo")) {
        const dateFrom = params.get("dateFrom") || "";
        const dateTo = params.get("dateTo") || "";
        filterState.dateFrom = dateFrom;
        filterState.dateTo = dateTo;
        filterState.dateField = params.get("dateField") || "endDate";
        filterState.datePresets.clear();
      } else {
        filterState.datePresets.clear();
        filterState.dateFrom = "";
        filterState.dateTo = "";
        filterState.dateField = "endDate";
      }
      if (params.has("updated")) {
        const updatedValue = params.get("updated");
        const allowed = /* @__PURE__ */ new Set(["all", "5m", "30m", "24h", "week", "month"]);
        if (allowed.has(updatedValue)) {
          try {
            setKanbanUpdatedFilter(updatedValue, { render: false });
          } catch (e) {
            console.error("Failed to set kanbanUpdatedFilter from URL:", e);
          }
        }
      }
      if (params.has("view")) {
        const view = params.get("view");
        if (view === "list" || view === "kanban" || view === "calendar") {
          setTimeout(() => {
            const viewButtons = document.querySelectorAll(".view-btn");
            const viewButton = Array.from(viewButtons).find((btn) => btn.dataset.view === view);
            if (viewButton && !viewButton.classList.contains("active")) {
              viewButton.click();
            }
          }, 100);
        }
      }
      showPage("tasks");
      setTimeout(() => {
        const searchEl = document.getElementById("filter-search");
        if (searchEl) searchEl.value = filterState.search;
        document.querySelectorAll('input[data-filter="status"]').forEach((cb) => {
          cb.checked = filterState.statuses.has(cb.value);
        });
        document.querySelectorAll('input[data-filter="priority"]').forEach((cb) => {
          cb.checked = filterState.priorities.has(cb.value);
        });
        document.querySelectorAll('input[data-filter="project"]').forEach((cb) => {
          cb.checked = filterState.projects.has(cb.value);
        });
        document.querySelectorAll('input[data-filter="tag"]').forEach((cb) => {
          cb.checked = filterState.tags.has(cb.value);
        });
        document.querySelectorAll('input[data-filter="date-preset"]').forEach((cb) => {
          cb.checked = filterState.datePresets.has(cb.value);
        });
        const dateFromEl = document.getElementById("filter-date-from");
        const dateToEl = document.getElementById("filter-date-to");
        if (dateFromEl && filterState.dateFrom) {
          dateFromEl.value = filterState.dateFrom;
          const displayInput = dateFromEl.closest(".date-input-wrapper")?.querySelector(".date-display");
          if (displayInput) displayInput.value = formatDate(filterState.dateFrom);
        }
        if (dateToEl && filterState.dateTo) {
          dateToEl.value = filterState.dateTo;
          const displayInput = dateToEl.closest(".date-input-wrapper")?.querySelector(".date-display");
          if (displayInput) displayInput.value = formatDate(filterState.dateTo);
        }
        updateFilterBadges();
        renderActiveFilterChips();
        updateClearButtonVisibility();
      }, 100);
      previousPage = page;
    } else if (page === "projects") {
      projectNavigationReferrer = "projects";
      document.querySelector('.nav-item[data-page="projects"]')?.classList.add("active");
      const urlProjectFilters = {};
      if (params.has("search")) {
        urlProjectFilters.search = params.get("search");
      }
      if (params.has("status")) {
        const statuses = params.get("status").split(",").filter(Boolean);
        const validStatuses = ["backlog", "planning", "active", "completed"];
        urlProjectFilters.statuses = statuses.filter((s) => validStatuses.includes(s.trim()));
      }
      if (params.has("filter")) {
        const filter = params.get("filter");
        const validFilters = ["has-tasks", "no-tasks"];
        if (validFilters.includes(filter)) {
          urlProjectFilters.filter = filter;
        }
      }
      if (params.has("sort")) {
        const sort = params.get("sort");
        const validSorts = ["default", "name", "created-desc", "updated-desc", "tasks-desc", "completion-desc"];
        if (validSorts.includes(sort)) {
          urlProjectFilters.sort = sort;
        }
      }
      if (params.has("sortDirection")) {
        const sortDirection = params.get("sortDirection");
        if (sortDirection === "asc" || sortDirection === "desc") {
          urlProjectFilters.sortDirection = sortDirection;
        }
      }
      if (params.has("updatedFilter")) {
        const updatedFilter = params.get("updatedFilter");
        const validUpdatedFilters = ["all", "5m", "30m", "24h", "week", "month"];
        if (validUpdatedFilters.includes(updatedFilter)) {
          urlProjectFilters.updatedFilter = updatedFilter;
        }
      }
      window.urlProjectFilters = urlProjectFilters;
      showPage("projects");
      previousPage = page;
    } else if (page === "updates") {
      projectNavigationReferrer = "projects";
      document.querySelector('.nav-item[data-page="updates"]')?.classList.add("active");
      showPage("updates");
      previousPage = page;
    } else if (page === "feedback") {
      projectNavigationReferrer = "projects";
      document.querySelector('.nav-item[data-page="feedback"]')?.classList.add("active");
      showPage("feedback");
      previousPage = page;
    } else if (page === "" || page === "dashboard") {
      projectNavigationReferrer = "projects";
      document.querySelector('.nav-item[data-page="dashboard"]')?.classList.add("active");
      showPage("dashboard");
      previousPage = page || "dashboard";
    }
  }
  handleRouting();
  markPerfOnce("first_contentful_page_ready", {
    page: document.querySelector(".page.active")?.id || "unknown"
  });
  lastDataFingerprint = buildDataFingerprint({ tasks, projects, feedbackItems });
  lastCalendarFingerprint = buildCalendarFingerprint(tasks, projects);
  markPerfOnce("init-render-complete");
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  markPerfOnce("init-first-paint");
  window.addEventListener("hashchange", handleRouting);
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
      const button = e.currentTarget;
      button.classList.add("active");
      const view = (button.dataset.view || "").toLowerCase();
      try {
        const backlogBtn = document.getElementById("backlog-quick-btn");
        if (backlogBtn) backlogBtn.style.display = view === "kanban" ? "inline-flex" : "none";
      } catch (e2) {
      }
      document.querySelector(".kanban-board").classList.add("hidden");
      document.getElementById("list-view").classList.remove("active");
      document.getElementById("calendar-view").classList.remove("active");
      const pageTitle = document.querySelector("#tasks .page-title");
      if (pageTitle) pageTitle.textContent = t("tasks.title");
      if (view === "list") {
        const globalFilters = document.getElementById("global-filters");
        if (globalFilters) globalFilters.style.display = "";
        document.getElementById("list-view").classList.add("active");
        renderListView();
        updateSortUI();
        try {
          document.querySelector(".kanban-header")?.classList.remove("calendar-mode");
        } catch (e2) {
        }
        const kanbanSettingsContainer = document.getElementById("kanban-settings-btn")?.parentElement;
        if (kanbanSettingsContainer) kanbanSettingsContainer.style.display = "none";
        syncURLWithFilters();
      } else if (view === "kanban") {
        const backlogBtn = document.getElementById("backlog-quick-btn");
        if (backlogBtn) backlogBtn.style.display = "inline-flex";
        const globalFilters = document.getElementById("global-filters");
        if (globalFilters) globalFilters.style.display = "";
        document.querySelector(".kanban-board").classList.remove("hidden");
        renderTasks();
        updateSortUI();
        try {
          document.querySelector(".kanban-header")?.classList.remove("calendar-mode");
        } catch (e2) {
        }
        const kanbanSettingsContainer = document.getElementById("kanban-settings-btn")?.parentElement;
        if (kanbanSettingsContainer) kanbanSettingsContainer.style.display = "";
        syncURLWithFilters();
      } else if (view === "calendar") {
        const cal = document.getElementById("calendar-view");
        if (!cal) return;
        const backlogBtn = document.getElementById("backlog-quick-btn");
        if (backlogBtn) backlogBtn.style.display = "none";
        const kanbanSettingsContainer = document.getElementById("kanban-settings-btn")?.parentElement;
        if (kanbanSettingsContainer) kanbanSettingsContainer.style.display = "none";
        cal.classList.add("preparing");
        renderCalendar();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            renderProjectBars();
            cal.classList.remove("preparing");
            cal.classList.add("active");
            updateSortUI();
            syncURLWithFilters();
          });
        });
      }
    });
  });
  try {
    const existing = document.getElementById("backlog-quick-btn");
    const viewToggle = document.querySelector(".kanban-header .view-toggle");
    if (!existing && viewToggle && viewToggle.parentElement) {
      const backlogBtn = document.createElement("button");
      backlogBtn.type = "button";
      backlogBtn.id = "backlog-quick-btn";
      backlogBtn.className = "backlog-quick-btn";
      backlogBtn.title = t("tasks.backlogQuickTitle");
      backlogBtn.textContent = t("tasks.backlogQuickLabel");
      backlogBtn.addEventListener("click", (evt) => {
        evt.preventDefault();
        window.location.hash = "#tasks?view=list&status=backlog";
      });
      viewToggle.insertAdjacentElement("afterend", backlogBtn);
      const activeView = (document.querySelector(".view-btn.active")?.dataset.view || "").trim().toLowerCase();
      backlogBtn.style.display = activeView === "kanban" ? "inline-flex" : "none";
    }
  } catch (e) {
  }
  setupDashboardInteractions();
}
function setupDashboardInteractions() {
  const filterChips = document.querySelectorAll(".filter-chip");
  filterChips.forEach((chip) => {
    chip.addEventListener("click", function() {
      filterChips.forEach((c) => c.classList.remove("active"));
      this.classList.add("active");
      const period = this.dataset.period;
      updateDashboardForPeriod(period);
    });
  });
  const statCards = document.querySelectorAll(".enhanced-stat-card");
  statCards.forEach((card) => {
    card.addEventListener("mouseenter", function() {
      this.style.transform = "translateY(-4px) scale(1.02)";
    });
    card.addEventListener("mouseleave", function() {
      this.style.transform = "translateY(0) scale(1)";
    });
    card.addEventListener("click", function() {
      const filterType = this.dataset.filter;
      const filterValue = this.dataset.value;
      if (filterType && filterValue) {
        navigateToFilteredTasks(filterType, filterValue);
      }
    });
  });
  const quickActions = document.querySelectorAll(".quick-action");
  quickActions.forEach((action) => {
    action.addEventListener("click", function() {
      this.style.transform = "scale(0.95)";
      setTimeout(() => {
        this.style.transform = "scale(1)";
      }, 150);
    });
  });
}
function navigateToFilteredTasks(filterType, filterValue) {
  window.location.hash = "tasks";
  document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
  const tasksNavItem = document.querySelector('.nav-item[data-page="tasks"]');
  if (tasksNavItem) tasksNavItem.classList.add("active");
  showPage("tasks");
  const viewToggle = document.querySelector(".view-toggle");
  if (viewToggle) viewToggle.classList.remove("hidden");
  document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
  const kanbanBtn = document.querySelector(".view-btn:first-child");
  if (kanbanBtn) kanbanBtn.classList.add("active");
  const kanbanBoard = document.querySelector(".kanban-board");
  const listView = document.getElementById("list-view");
  const calendarView = document.getElementById("calendar-view");
  if (kanbanBoard) kanbanBoard.classList.remove("hidden");
  if (calendarView) calendarView.classList.remove("active");
  if (listView) listView.classList.remove("active");
  try {
    document.querySelector(".kanban-header")?.classList.remove("calendar-mode");
  } catch (e) {
  }
  clearAllFilters();
  setTimeout(() => {
    applyDashboardFilter(filterType, filterValue);
    renderTasks();
  }, 100);
}
function applyDashboardFilter(filterType, filterValue) {
  if (filterType === "status") {
    filterState.statuses.clear();
    filterState.statuses.add(filterValue);
    const statusCheckboxes = document.querySelectorAll('input[data-filter="status"]');
    statusCheckboxes.forEach((checkbox) => {
      checkbox.checked = checkbox.value === filterValue;
    });
  } else if (filterType === "priority") {
    filterState.priorities.clear();
    filterState.priorities.add(filterValue);
    filterState.statuses.clear();
    filterState.statuses.add("todo");
    filterState.statuses.add("progress");
    filterState.statuses.add("review");
    const priorityCheckboxes = document.querySelectorAll('input[data-filter="priority"]');
    priorityCheckboxes.forEach((checkbox) => {
      checkbox.checked = checkbox.value === filterValue;
    });
    const statusCheckboxes = document.querySelectorAll('input[data-filter="status"]');
    statusCheckboxes.forEach((checkbox) => {
      checkbox.checked = ["todo", "progress", "review"].includes(checkbox.value);
    });
  } else if (filterType === "overdue") {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    filterState.dateTo = today;
    const dateToEl = document.getElementById("filter-date-to");
    if (dateToEl) {
      dateToEl.value = today;
    }
    filterState.statuses.clear();
    filterState.statuses.add("todo");
    filterState.statuses.add("progress");
    filterState.statuses.add("review");
    const statusCheckboxes = document.querySelectorAll('input[data-filter="status"]');
    statusCheckboxes.forEach((checkbox) => {
      checkbox.checked = ["todo", "progress", "review"].includes(checkbox.value);
    });
  }
  updateFilterBadges();
  renderAfterFilterChange();
}
function updateDashboardForPeriod(period) {
  const periodLabels = {
    week: t("dashboard.trend.thisWeek"),
    month: t("dashboard.trend.thisMonth"),
    quarter: t("dashboard.trend.thisQuarter")
  };
  const label = periodLabels[period] || t("dashboard.trend.thisWeek");
  const progressChange = document.getElementById("progress-change");
  const completedChange = document.getElementById("completed-change");
  if (progressChange) {
    progressChange.textContent = `+${Math.max(1, Math.floor(tasks.length * 0.1))} ${label}`;
  }
  if (completedChange) {
    completedChange.textContent = `+${tasks.filter((t2) => t2.status === "done").length} ${label}`;
  }
}
function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      const page = item.dataset.page;
      if (page) {
        if (page === "calendar") {
          showCalendarView();
          document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
          item.classList.add("active");
          return;
        }
        if (page === "tasks") {
          document.getElementById("calendar-view")?.classList.remove("active");
          document.getElementById("list-view")?.classList.remove("active");
        }
        window.location.hash = page;
        if (page === "tasks") {
          const hash = window.location.hash.slice(1);
          const [hashPage, queryString] = hash.split("?");
          const params = new URLSearchParams(queryString || "");
          if (hashPage === "tasks" && params.toString() === "") {
            filterState.search = "";
            filterState.statuses.clear();
            filterState.priorities.clear();
            filterState.projects.clear();
            filterState.tags.clear();
            filterState.datePresets.clear();
            filterState.dateFrom = "";
            filterState.dateTo = "";
            try {
              setKanbanUpdatedFilter("all", { render: false });
            } catch (e) {
            }
            const searchEl = document.getElementById("filter-search");
            if (searchEl) searchEl.value = "";
            document.querySelectorAll('#global-filters input[type="checkbox"]').forEach((cb) => cb.checked = false);
          }
        }
        document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
        item.classList.add("active");
        showPage(page);
        const viewToggle = document.querySelector(".view-toggle");
        if (viewToggle) {
          if (page === "tasks") {
            viewToggle.classList.remove("hidden");
          } else {
            viewToggle.classList.add("hidden");
          }
        }
      }
    });
  });
}
function showPage(pageId) {
  if (pageId.includes("/")) {
    const [mainPage, subPage] = pageId.split("/");
    if (mainPage === "dashboard" && subPage === "recent_activity") {
      showRecentActivityPage();
      return;
    }
  }
  if (getIsMobileCached()) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  document.getElementById("project-details").classList.remove("active");
  const activityPage = document.getElementById("activity-page");
  if (activityPage) activityPage.style.display = "none";
  const dashboardGrid = document.querySelector(".dashboard-grid");
  if (dashboardGrid) dashboardGrid.style.display = "grid";
  const insightsCard = document.querySelector(".insights-card");
  if (insightsCard) insightsCard.style.display = "";
  const userMenu = document.querySelector(".user-menu");
  if (userMenu) userMenu.style.display = "";
  document.getElementById(pageId).classList.add("active");
  if (pageId === "dashboard") {
    updateCounts();
    renderDashboard();
  } else if (pageId === "projects") {
    updateCounts();
    try {
      populateProjectTagOptions();
      setupProjectsControls();
    } catch (e) {
    }
  } else if (pageId === "tasks") {
    updateCounts();
    const hash = window.location.hash.slice(1);
    const [, queryString] = hash.split("?");
    const params = new URLSearchParams(queryString || "");
    const hasViewParam = params.has("view");
    if (!hasViewParam) {
      document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
      document.querySelector(".view-btn:nth-child(1)").classList.add("active");
      document.querySelector(".kanban-board").classList.remove("hidden");
      document.getElementById("list-view").classList.remove("active");
      document.getElementById("calendar-view").classList.remove("active");
      const pageTitle = document.querySelector("#tasks .page-title");
      if (pageTitle) pageTitle.textContent = t("tasks.title");
      try {
        document.querySelector(".kanban-header")?.classList.remove("calendar-mode");
      } catch (e) {
      }
      const kanbanSettingsContainer = document.getElementById("kanban-settings-btn")?.parentElement;
      if (kanbanSettingsContainer) kanbanSettingsContainer.style.display = "";
      const backlogBtn = document.getElementById("backlog-quick-btn");
      if (backlogBtn) backlogBtn.style.display = "inline-flex";
    }
    renderTasks();
    renderListView();
  } else if (pageId === "updates") {
    updateCounts();
    renderUpdatesPage();
    markLatestReleaseSeen();
  } else if (pageId === "feedback") {
    renderFeedback();
  }
}
var renderCallsThisTick = 0;
var renderResetScheduled = false;
var renderExtraCallLogged = false;
function trackRenderCall() {
  renderCallsThisTick += 1;
  if (renderCallsThisTick > 1 && !renderExtraCallLogged && isDebugLogsEnabled2()) {
    renderExtraCallLogged = true;
    console.warn("[perf] render called multiple times in the same tick", new Error().stack);
  }
  if (!renderResetScheduled) {
    renderResetScheduled = true;
    queueMicrotask(() => {
      renderCallsThisTick = 0;
      renderResetScheduled = false;
    });
  }
}
function render() {
  trackRenderCall();
  renderActivePageOnly();
}
function renderAppVersionLabel() {
  const label = APP_VERSION_LABEL;
  document.querySelectorAll(".app-version").forEach((el) => el.textContent = label);
  document.querySelectorAll(".mobile-version").forEach((el) => el.textContent = label);
}
function renderReleaseSectionList(items) {
  const normalizedItems = (items || []).map((item) => resolveReleaseText(item)).filter(Boolean);
  if (!normalizedItems.length) {
    return `<div class="release-section-empty">${t("updates.sectionEmpty")}</div>`;
  }
  return `
        <ul class="release-list">
            ${normalizedItems.map((item) => `<li><span class="release-point-icon" aria-hidden="true"></span><span>${escapeHtml(item)}</span></li>`).join("")}
        </ul>
    `;
}
function renderUpdatesPage() {
  const container = document.getElementById("updates-content");
  if (!container) return;
  const releases = getSortedReleaseNotes();
  if (releases.length === 0) {
    container.innerHTML = `<div class="updates-empty">${t("updates.empty")}</div>`;
    return;
  }
  const latest = releases[0];
  const history = releases.slice(1);
  const latestTitle = [latest.version, resolveReleaseText(latest.title)].filter(Boolean).join(" - ");
  const latestMeta = t("notifications.releaseMeta", { date: formatReleaseDate(latest.date) });
  const latestSummary = latest.summary ? escapeHtml(resolveReleaseText(latest.summary)) : "";
  const sections = latest.sections || {};
  const sectionDefs = [
    { key: "new", label: t("updates.sections.new") },
    { key: "improvements", label: t("updates.sections.improvements") },
    { key: "fixes", label: t("updates.sections.fixes") }
  ];
  const sectionHtml = sectionDefs.map((def) => {
    const items = sections[def.key] || [];
    return `
            <div class="release-section-card release-section-card--${def.key}">
                <div class="release-section-card-header">
                    <span class="release-section-icon" data-kind="${def.key}" aria-hidden="true"></span>
                    <div>
                        <div class="release-section-title">${def.label}</div>
                    </div>
                </div>
                ${renderReleaseSectionList(items)}
            </div>
        `;
  }).join("");
  const historyHtml = history.length ? history.map((release) => {
    const title = [release.version, resolveReleaseText(release.title)].filter(Boolean).join(" - ");
    const meta = formatReleaseDate(release.date);
    const summary = release.summary ? escapeHtml(resolveReleaseText(release.summary)) : "";
    return `
                <div class="release-history-item">
                    <div class="release-history-title">${escapeHtml(title)}</div>
                    <div class="release-history-meta">${meta}</div>
                    ${summary ? `<div class="release-history-summary">${summary}</div>` : ""}
                </div>
            `;
  }).join("") : `<div class="release-history-empty">${t("updates.historyEmpty")}</div>`;
  container.innerHTML = `
        <div class="release-notes-stack">
            <article class="release-hero" data-release-id="${latest.id}" aria-label="${t("updates.latestLabel")}">
                <div class="release-hero-top">
                    <span class="release-badge">${t("updates.latestLabel")}</span>
                    <span class="release-hero-meta">${latestMeta}</span>
                </div>
                <div class="release-hero-title">${escapeHtml(latestTitle)}</div>
                ${latestSummary ? `<p class="release-hero-summary">${latestSummary}</p>` : ""}
            </article>
            <div class="release-section-stack">
                ${sectionHtml}
            </div>
            <section class="release-history-block" aria-label="${t("updates.historyLabel")}">
                <div class="release-history-header">
                    <div>
                        <div class="release-history-label">${t("updates.historyLabel")}</div>
                        <div class="release-history-subtitle">${t("updates.subtitle")}</div>
                    </div>
                </div>
                <div class="release-history-list">
                    ${historyHtml}
                </div>
            </section>
        </div>
    `;
}
function renderDashboard() {
  const renderTimer = debugTimeStart("render", "dashboard", {
    taskCount: tasks.length,
    projectCount: projects.length
  });
  updateDashboardStats();
  renderProjectProgressBars();
  renderActivityFeed();
  renderInsights();
  animateDashboardElements();
  const projectsStatCard = document.getElementById("projects-stat-card");
  if (projectsStatCard) {
    projectsStatCard.onclick = () => {
      window.location.hash = "projects";
    };
  }
  debugTimeEnd("render", renderTimer, {
    taskCount: tasks.length,
    projectCount: projects.length
  });
}
function updateDashboardStats() {
  const statsTimer = debugTimeStart("render", "dashboard-stats", {
    taskCount: tasks.length,
    projectCount: projects.length
  });
  const stats = calculateDashboardStats(tasks, projects);
  document.getElementById("hero-active-projects").textContent = stats.activeProjects;
  document.getElementById("hero-completion-rate").textContent = `${stats.completionRate}%`;
  const circle = document.querySelector(".progress-circle");
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - stats.completionRate / 100 * circumference;
  circle.style.strokeDashoffset = offset;
  document.getElementById("ring-percentage").textContent = `${stats.completionRate}%`;
  document.getElementById("in-progress-tasks").textContent = stats.inProgressTasks;
  document.getElementById("pending-tasks-new").textContent = stats.pendingTasks;
  document.getElementById("completed-tasks-new").textContent = stats.completedTasks;
  document.getElementById("overdue-tasks").textContent = stats.overdueTasks;
  document.getElementById("high-priority-tasks").textContent = stats.highPriorityTasks;
  document.getElementById("research-milestones").textContent = stats.milestones;
  updateTrendIndicators();
  debugTimeEnd("render", statsTimer, {
    activeProjects: stats.activeProjects,
    totalTasks: stats.totalTasks,
    completionRate: stats.completionRate
  });
}
function updateTrendIndicators() {
  const trends = calculateTrendIndicators(tasks, projects);
  document.getElementById("progress-change").textContent = `+${trends.progressChange} ${t("dashboard.trend.thisWeek")}`;
  document.getElementById("pending-change").textContent = trends.dueTodayCount > 0 ? t(trends.dueTodayCount === 1 ? "dashboard.trend.dueTodayOne" : "dashboard.trend.dueTodayMany", { count: trends.dueTodayCount }) : t("dashboard.trend.onTrack");
  document.getElementById("completed-change").textContent = `+${trends.thisWeekCompleted} ${t("dashboard.trend.thisWeek")}`;
  const overdueChangeEl = document.getElementById("overdue-change");
  if (overdueChangeEl) {
    overdueChangeEl.textContent = trends.overdueCount > 0 ? t("dashboard.trend.needsAttention") : t("dashboard.trend.allOnTrack");
    overdueChangeEl.classList.toggle("negative", trends.overdueCount > 0);
    overdueChangeEl.classList.toggle("positive", trends.overdueCount === 0);
    overdueChangeEl.classList.remove("neutral");
  }
  document.getElementById("priority-change").textContent = trends.criticalHighPriority > 0 ? t(trends.criticalHighPriority === 1 ? "dashboard.trend.criticalOne" : "dashboard.trend.criticalMany", { count: trends.criticalHighPriority }) : t("dashboard.trend.onTrack");
  document.getElementById("milestones-change").textContent = trends.completedProjects > 0 ? t(trends.completedProjects === 1 ? "dashboard.trend.completedOne" : "dashboard.trend.completedMany", { count: trends.completedProjects }) : t("dashboard.trend.inProgress");
}
function renderProjectProgressBars() {
  const container = document.getElementById("project-progress-bars");
  if (!container) return;
  const activeProjects = projects.filter((project) => getProjectStatus(project.id) === "active");
  if (activeProjects.length === 0) {
    container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <div style="font-size: 48px; margin-bottom: 16px;">\u{1F30A}</div>
                <div style="font-size: 16px; margin-bottom: 8px;">${t("dashboard.emptyProjects.title")}</div>
                <div style="font-size: 14px;">${t("dashboard.emptyProjects.subtitle")}</div>
            </div>
        `;
    return;
  }
  const projectProgressData = calculateProjectProgress(activeProjects, tasks, 5);
  container.innerHTML = generateProgressBarsHTML(projectProgressData, {
    tasksLabel: t("dashboard.tasks")
  });
}
function renderActivityFeed() {
  const container = document.getElementById("activity-feed");
  if (!container) return;
  const activities = [];
  const recentCompleted = tasks.filter((t2) => t2.status === "done").sort((a, b) => new Date(b.completedDate || b.createdAt || b.createdDate) - new Date(a.completedDate || a.createdAt || a.createdDate)).slice(0, 3);
  recentCompleted.forEach((task) => {
    const project = projects.find((p) => p.id === task.projectId);
    const activityDate = task.completedDate || task.createdAt || task.createdDate;
    const projectPart = project ? t("dashboard.activity.inProject", { project: project.name }) : "";
    activities.push({
      type: "completed",
      text: t("dashboard.activity.completed", { title: task.title, projectPart }).trim(),
      timeText: formatRelativeTime(activityDate),
      date: activityDate,
      icon: "\u2705"
    });
  });
  const recentProjects = projects.sort((a, b) => new Date(b.createdAt || b.createdDate) - new Date(a.createdAt || a.createdDate)).slice(0, 2);
  recentProjects.forEach((project) => {
    const projectDate = project.createdAt || project.createdDate;
    activities.push({
      type: "created",
      text: t("dashboard.activity.createdProject", { project: project.name }),
      timeText: formatRelativeTime(projectDate),
      date: projectDate,
      icon: "\u{1F680}"
    });
  });
  const recentTasks = tasks.filter((t2) => t2.status !== "done").sort((a, b) => new Date(b.createdAt || b.createdDate) - new Date(a.createdAt || a.createdDate)).slice(0, 2);
  recentTasks.forEach((task) => {
    const taskDate = task.createdAt || task.createdDate;
    const project = projects.find((p) => p.id === task.projectId);
    const projectPart = project ? t("dashboard.activity.toProject", { project: project.name }) : "";
    activities.push({
      type: "created",
      text: t("dashboard.activity.addedTask", { title: task.title, projectPart }).trim(),
      timeText: formatRelativeTime(taskDate),
      date: taskDate,
      icon: "\u{1F4DD}"
    });
  });
  activities.sort((a, b) => new Date(b.date) - new Date(a.date));
  if (activities.length === 0) {
    container.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon completed">\u{1F30A}</div>
                <div class="activity-content">
                    <div class="activity-text">${t("dashboard.activity.emptyTitle")}</div>
                    <div class="activity-time">${t("dashboard.activity.emptySubtitle")}</div>
                </div>
            </div>
        `;
    return;
  }
  container.innerHTML = generateActivityFeedHTML(activities.slice(0, 4), formatDashboardActivityDate);
}
function showAllActivity() {
  window.location.hash = "dashboard/recent_activity";
}
function backToDashboard() {
  window.location.hash = "dashboard";
}
function showRecentActivityPage() {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });
  let activityPage = document.getElementById("activity-page");
  if (!activityPage) {
    activityPage = document.createElement("div");
    activityPage.id = "activity-page";
    activityPage.className = "page";
    activityPage.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title" data-i18n="dashboard.activity.allTitle">${t("dashboard.activity.allTitle")}</h1>
                    <p class="page-subtitle" data-i18n="dashboard.activity.allSubtitle">${t("dashboard.activity.allSubtitle")}</p>
                </div>
                <button class="view-all-btn back-btn" data-action="backToDashboard" data-i18n="dashboard.activity.backToDashboard">${t("dashboard.activity.backToDashboard")}</button>
            </div>
            <div class="page-content">
                <div id="all-activity-list" class="all-activity-list"></div>
            </div>
        `;
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.appendChild(activityPage);
    }
  }
  activityPage.classList.add("active");
  activityPage.style.display = "flex";
  renderAllActivity();
  try {
    activityPage.scrollIntoView({ behavior: "auto", block: "start" });
  } catch (e) {
    window.scrollTo(0, 0);
  }
  document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
  document.querySelector('.nav-item[data-page="dashboard"]').classList.add("active");
}
function renderAllActivity() {
  const activities = [];
  const allCompleted = tasks.filter((t2) => t2.status === "done").sort((a, b) => new Date(b.completedDate || b.createdAt || b.createdDate) - new Date(a.completedDate || a.createdAt || a.createdDate));
  allCompleted.forEach((task) => {
    const project = projects.find((p) => p.id === task.projectId);
    const activityDate = task.completedDate || task.createdAt || task.createdDate;
    const projectPart = project ? t("dashboard.activity.inProject", { project: project.name }) : "";
    activities.push({
      type: "completed",
      text: t("dashboard.activity.completed", { title: task.title, projectPart }).trim(),
      date: activityDate,
      icon: "\u2705"
    });
  });
  projects.sort((a, b) => new Date(b.createdAt || b.createdDate) - new Date(a.createdAt || a.createdDate)).forEach((project) => {
    activities.push({
      type: "created",
      text: t("dashboard.activity.createdProject", { project: project.name }),
      date: project.createdAt || project.createdDate,
      icon: "\u{1F680}"
    });
  });
  tasks.sort((a, b) => new Date(b.createdAt || b.createdDate) - new Date(a.createdAt || a.createdDate)).forEach((task) => {
    const project = projects.find((p) => p.id === task.projectId);
    const projectPart = project ? t("dashboard.activity.toProject", { project: project.name }) : "";
    activities.push({
      type: "created",
      text: t("dashboard.activity.addedTask", { title: task.title, projectPart }).trim(),
      date: task.createdAt || task.createdDate,
      icon: "\u{1F4DD}"
    });
  });
  activities.sort((a, b) => new Date(b.date) - new Date(a.date));
  const container = document.getElementById("all-activity-list");
  if (!container) return;
  const activityHTML = activities.map((activity) => `
        <div class="activity-item-full">
            <div class="activity-icon ${activity.type}">${activity.icon}</div>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
            </div>
            <div class="activity-full-date">${new Date(activity.date).toLocaleDateString(getLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })}</div>
        </div>
    `).join("");
  container.innerHTML = activityHTML;
}
function renderInsights() {
  const container = document.getElementById("insights-list");
  if (!container) return;
  const insights = generateInsights();
  const insightsHTML = insights.map((insight) => `
        <div class="insight-item ${insight.type}">
            <div class="insight-icon">${insight.icon}</div>
            <div class="insight-content">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-desc">${insight.description}</div>
            </div>
        </div>
    `).join("");
  container.innerHTML = insightsHTML;
}
function generateInsights() {
  const insights = [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t2) => t2.status === "done").length;
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const overdueTasks = tasks.filter((t2) => t2.endDate && t2.endDate < today && t2.status !== "done").length;
  const highPriorityTasks = tasks.filter((t2) => t2.priority === "high").length;
  const todayTasks = tasks.filter((t2) => {
    if (!t2.endDate) return false;
    const today2 = (/* @__PURE__ */ new Date()).toDateString();
    return new Date(t2.endDate).toDateString() === today2 && t2.status !== "done";
  }).length;
  if (totalTasks > 0) {
    const completionRate = completedTasks / totalTasks * 100;
    if (completionRate >= 80) {
      insights.push({
        type: "success",
        icon: "\u{1F3AF}",
        title: t("dashboard.insights.excellentTitle"),
        description: t("dashboard.insights.excellentDesc", { percent: completionRate.toFixed(0) })
      });
    } else if (completionRate >= 60) {
      insights.push({
        type: "success",
        icon: "\u{1F4C8}",
        title: t("dashboard.insights.goodTitle"),
        description: t("dashboard.insights.goodDesc", { percent: completionRate.toFixed(0) })
      });
    } else if (completionRate >= 30) {
      insights.push({
        type: "warning",
        icon: "\u26A1",
        title: t("dashboard.insights.opportunityTitle"),
        description: t("dashboard.insights.opportunityDesc", { percent: completionRate.toFixed(0) })
      });
    } else {
      insights.push({
        type: "priority",
        icon: "\u{1F6A8}",
        title: t("dashboard.insights.actionTitle"),
        description: t("dashboard.insights.actionDesc", { percent: completionRate.toFixed(0) })
      });
    }
  }
  if (todayTasks > 0) {
    insights.push({
      type: "priority",
      icon: "\u{1F4C5}",
      title: t("dashboard.insights.todayTitle"),
      description: t(todayTasks === 1 ? "dashboard.insights.todayDescOne" : "dashboard.insights.todayDescMany", { count: todayTasks })
    });
  }
  if (overdueTasks > 0 && todayTasks === 0) {
    insights.push({
      type: "warning",
      icon: "\u23F0",
      title: t("dashboard.insights.overdueTitle"),
      description: t(overdueTasks === 1 ? "dashboard.insights.overdueDescOne" : "dashboard.insights.overdueDescMany", { count: overdueTasks })
    });
  }
  if (highPriorityTasks > 0) {
    const urgentCount = tasks.filter((t2) => t2.priority === "high" && t2.status !== "done").length;
    if (urgentCount > 0) {
      insights.push({
        type: "priority",
        icon: "\u{1F525}",
        title: t("dashboard.insights.highPriorityTitle"),
        description: t(urgentCount === 1 ? "dashboard.insights.highPriorityDescOne" : "dashboard.insights.highPriorityDescMany", { count: urgentCount })
      });
    }
  }
  if (projects.length > 1) {
    const projectsWithTasks = projects.filter((p) => tasks.some((t2) => t2.projectId === p.id)).length;
    const projectsWithoutTasks = projects.length - projectsWithTasks;
    if (projectsWithoutTasks > 0) {
      insights.push({
        type: "warning",
        icon: "\uFFFD",
        title: t("dashboard.insights.emptyProjectsTitle"),
        description: t(projectsWithoutTasks === 1 ? "dashboard.insights.emptyProjectsDescOne" : "dashboard.insights.emptyProjectsDescMany", { count: projectsWithoutTasks })
      });
    }
  }
  if (totalTasks >= 5) {
    const recentlyCompleted = tasks.filter((t2) => {
      if (t2.status !== "done" || !t2.completedDate) return false;
      const weekAgo = /* @__PURE__ */ new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(t2.completedDate) > weekAgo;
    }).length;
    if (recentlyCompleted >= 3) {
      insights.push({
        type: "success",
        icon: "\u{1F680}",
        title: t("dashboard.insights.momentumTitle"),
        description: t(recentlyCompleted === 1 ? "dashboard.insights.momentumDescOne" : "dashboard.insights.momentumDescMany", { count: recentlyCompleted })
      });
    }
  }
  if (insights.length === 0) {
    if (totalTasks === 0) {
      insights.push({
        type: "priority",
        icon: "\u{1F30A}",
        title: t("dashboard.insights.readyTitle"),
        description: t("dashboard.insights.readyDesc")
      });
    } else {
      insights.push({
        type: "success",
        icon: "\u2705",
        title: t("dashboard.insights.caughtUpTitle"),
        description: t("dashboard.insights.caughtUpDesc")
      });
    }
  }
  return insights.slice(0, 3);
}
function animateDashboardElements() {
  const statCards = document.querySelectorAll(".enhanced-stat-card");
  statCards.forEach((card, index) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    setTimeout(() => {
      card.style.transition = "all 0.4s ease";
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, index * 100);
  });
  const heroCards = document.querySelectorAll(".hero-stat-card");
  heroCards.forEach((card, index) => {
    card.style.opacity = "0";
    card.style.transform = "translateX(-30px)";
    setTimeout(() => {
      card.style.transition = "all 0.6s ease";
      card.style.opacity = "1";
      card.style.transform = "translateX(0)";
    }, index * 200);
  });
}
function formatRelativeTime(dateString) {
  if (!dateString) return t("dashboard.activity.recently");
  const date = new Date(dateString);
  const now = /* @__PURE__ */ new Date();
  const diffInSeconds = Math.floor((now - date) / 1e3);
  if (diffInSeconds < 60) return t("dashboard.activity.justNow");
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return t(minutes === 1 ? "dashboard.activity.minuteAgo" : "dashboard.activity.minutesAgo", { count: minutes });
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return t(hours === 1 ? "dashboard.activity.hourAgo" : "dashboard.activity.hoursAgo", { count: hours });
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return t(days === 1 ? "dashboard.activity.dayAgo" : "dashboard.activity.daysAgo", { count: days });
  }
  return date.toLocaleDateString(getLocale());
}
function formatDashboardActivityDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = /* @__PURE__ */ new Date();
  const diffDays = Math.floor((now - date) / (1e3 * 60 * 60 * 24));
  if (diffDays === 0) return t("dashboard.activity.today");
  if (diffDays === 1) return t("dashboard.activity.yesterday");
  if (diffDays < 7) return t("dashboard.activity.daysAgoShort", { count: diffDays });
  return date.toLocaleDateString(getLocale(), { month: "short", day: "numeric" });
}
function signOut() {
  if (window.authSystem && window.authSystem.logout) {
    window.authSystem.logout();
  }
}
function exportDashboardData() {
  document.getElementById("export-data-modal").classList.add("active");
}
function closeExportDataModal() {
  document.getElementById("export-data-modal").classList.remove("active");
}
function confirmExportData() {
  closeExportDataModal();
  const currentUser = window.authSystem ? window.authSystem.getCurrentUser() : null;
  const completeBackup = {
    // User info
    user: currentUser ? {
      id: currentUser.id,
      username: currentUser.username,
      name: currentUser.name,
      email: currentUser.email
    } : null,
    // Core data
    projects,
    tasks,
    feedbackItems,
    // Metadata
    projectColors: projectColorMap,
    sortMode,
    manualTaskOrder,
    settings,
    // History (if available)
    history: window.historyService ? window.historyService.getHistory() : [],
    // Counters (for import/restore)
    projectCounter,
    taskCounter,
    // Statistics (for user info)
    statistics: {
      totalProjects: projects.length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t2) => t2.status === "done").length,
      completionRate: tasks.length > 0 ? (tasks.filter((t2) => t2.status === "done").length / tasks.length * 100).toFixed(1) : 0,
      feedbackCount: feedbackItems.length
    },
    // Export metadata
    exportDate: (/* @__PURE__ */ new Date()).toISOString(),
    exportVersion: "2.0",
    // Version for tracking export format
    sourceSystem: "Nautilus Multi-User"
  };
  const dataStr = JSON.stringify(completeBackup, null, 2);
  const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
  const username = currentUser?.username || "user";
  const exportFileDefaultName = `nautilus-complete-backup-${username}-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
  showNotification("Complete backup exported successfully! All data, settings, and history included.", "success");
}
async function generateReport() {
  showNotification("Generando reporte...", "info");
  try {
    const { generateWordReport: generateWordReport2 } = await Promise.resolve().then(() => (init_reportGenerator(), reportGenerator_exports));
    const result = await generateWordReport2(projects, tasks);
    if (result.success) {
      showNotification(`\u2705 Reporte generado: ${result.filename}`, "success");
      console.log("Report Summary:", {
        activeProjects: result.insights.activeProjectsCount,
        completedTasks: `${result.insights.completedTasks}/${result.insights.totalTasks}`,
        progress: `${result.insights.completionPercent}%`
      });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("Error generating report:", error);
    showNotification("\u274C Error al generar el reporte: " + error.message, "error");
  }
}
function updateCounts() {
  document.getElementById("projects-count").textContent = projects.length;
  document.getElementById("tasks-count").textContent = tasks.length;
  const activeProjectsEl = document.getElementById("active-projects");
  const pendingTasksEl = document.getElementById("pending-tasks");
  const completedTasksEl = document.getElementById("completed-tasks");
  if (activeProjectsEl) activeProjectsEl.textContent = projects.length;
  if (pendingTasksEl) pendingTasksEl.textContent = tasks.filter((t2) => t2.status !== "done").length;
  if (completedTasksEl) completedTasksEl.textContent = tasks.filter((t2) => t2.status === "done").length;
  const todoCountEl = document.getElementById("todo-count");
  const progressCountEl = document.getElementById("progress-count");
  const reviewCountEl = document.getElementById("review-count");
  const doneCountEl = document.getElementById("done-count");
  if (todoCountEl) todoCountEl.textContent = tasks.filter((t2) => t2.status === "todo").length;
  if (progressCountEl) progressCountEl.textContent = tasks.filter((t2) => t2.status === "progress").length;
  if (reviewCountEl) reviewCountEl.textContent = tasks.filter((t2) => t2.status === "review").length;
  if (doneCountEl) doneCountEl.textContent = tasks.filter((t2) => t2.status === "done").length;
  const feedbackCount = feedbackItems.filter((f) => f.status === "open").length;
  const feedbackCountEl = document.getElementById("feedback-count");
  if (feedbackCountEl) feedbackCountEl.textContent = feedbackCount;
  updateNotificationState();
}
var currentSort = { column: null, direction: "asc" };
function sortTable(column) {
  if (currentSort.column === column) {
    currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
  } else {
    currentSort.column = column;
    currentSort.direction = "asc";
  }
  document.querySelectorAll(".tasks-table th .sort-indicator").forEach((span) => {
    span.textContent = "\u2195";
    span.style.opacity = "0.5";
  });
  const indicator = document.getElementById(`sort-${column}`);
  if (indicator) {
    indicator.textContent = currentSort.direction === "asc" ? "\u2191" : "\u2193";
    indicator.style.opacity = "1";
  }
  renderListView();
}
function renderListView() {
  const tbody = document.getElementById("tasks-table-body");
  const source = typeof getFilteredTasks === "function" ? getFilteredTasks() : tasks.slice();
  const cutoff = getKanbanUpdatedCutoffTime(window.kanbanUpdatedFilter);
  const listData = prepareListViewData(source, {
    currentSort,
    projects,
    updatedCutoff: cutoff,
    getTaskUpdatedTime
  });
  const rows = listData.tasks;
  const listCountText = t("tasks.list.count", { count: rows.length }) || `${rows.length} results`;
  const listCountEl = document.getElementById("tasks-list-count");
  if (listCountEl) {
    listCountEl.textContent = listCountText;
  }
  const listCountBottomEl = document.getElementById("tasks-list-count-bottom");
  if (listCountBottomEl) {
    listCountBottomEl.textContent = listCountText;
  }
  if (tbody) {
    const helpers = {
      escapeHtml,
      formatDate,
      getTagColor,
      getProjectColor,
      getPriorityLabel,
      getStatusLabel,
      formatTaskUpdatedDateTime,
      projects,
      noProjectText: t("tasks.noProject"),
      noDateText: t("tasks.noDate")
    };
    tbody.innerHTML = generateListViewHTML(rows, helpers);
  }
  renderMobileCardsPremium(rows);
}
function getSmartDateInfo(endDate, status = null) {
  const info = calculateSmartDateInfo(endDate, status);
  if (!info.hasDate) {
    return { text: t("tasks.noEndDate"), class: "", showPrefix: false };
  }
  let text;
  switch (info.urgency) {
    case "overdue":
      text = info.daysOverdue === 1 ? t("tasks.due.yesterday") : t("tasks.due.daysOverdue", { count: info.daysOverdue });
      break;
    case "tomorrow":
      text = t("tasks.due.tomorrow");
      break;
    default:
      text = formatDate(endDate);
  }
  return { text, class: info.class, showPrefix: info.showPrefix };
}
function renderMobileCardsPremium(tasks2) {
  const container = document.getElementById("tasks-list-mobile");
  if (!container) return;
  const expandedIds = new Set(
    Array.from(container.querySelectorAll(".task-card-mobile.expanded")).map((card) => parseInt(card.dataset.taskId, 10)).filter(Number.isFinite)
  );
  const getDescriptionForMobileCard = (html) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html || "";
    const checkboxRows = Array.from(tempDiv.querySelectorAll(".checkbox-row"));
    const checklistLines = checkboxRows.map((row) => {
      const toggle = row.querySelector(".checkbox-toggle");
      const isChecked = toggle?.getAttribute("aria-pressed") === "true" || toggle?.classList?.contains("checked");
      const text = (row.querySelector(".check-text")?.textContent || "").trim();
      if (!text) return null;
      return `${isChecked ? "\u2713" : "\u2610"} ${text}`;
    }).filter(Boolean);
    checkboxRows.forEach((row) => row.remove());
    const baseText = (tempDiv.textContent || tempDiv.innerText || "").replace(/\s+/g, " ").trim();
    const checklistText = checklistLines.join("\n").trim();
    if (baseText && checklistText) return `${baseText}
${checklistText}`;
    return baseText || checklistText;
  };
  if (tasks2.length === 0) {
    container.innerHTML = `
            <div class="tasks-list-mobile-empty">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3>${t("projects.details.noTasksFound")}</h3>
                <p>Try adjusting your filters or create a new task</p>
            </div>
        `;
    return;
  }
  container.innerHTML = tasks2.map((task) => {
    const proj = projects.find((p) => p.id === task.projectId);
    const projColor = proj ? getProjectColor(proj.id) : "#999";
    const dateInfo = getSmartDateInfo(task.endDate, task.status);
    const descText = getDescriptionForMobileCard(task.description);
    const tagsHTML = task.tags && task.tags.length > 0 ? task.tags.map((tag) => {
      const tagColor = getTagColor(tag);
      return `<span class="card-tag-premium" style="background:${tagColor}; border-color:${tagColor}; color:#ffffff;">${escapeHtml(tag.toUpperCase())}</span>`;
    }).join("") : "";
    const attachmentCount = task.attachments && task.attachments.length > 0 ? task.attachments.length : 0;
    const doneClass = task.status === "done" ? " is-done" : "";
    return `
            <div class="task-card-mobile${doneClass}" data-priority="${task.priority}" data-task-id="${task.id}">
                <!-- Header (always visible) -->
                <div class="card-header-premium">
                    <div class="card-header-content" data-card-action="toggle">
                        <h3 class="card-title-premium">${escapeHtml(task.title || t("tasks.untitled"))}</h3>
                        <div class="card-meta-premium">
                            <span class="status-badge-mobile ${task.status}">${getStatusLabel(task.status)}</span>
                            ${dateInfo.text ? `<span class="card-date-smart ${dateInfo.class}">${dateInfo.showPrefix ? t("tasks.endDatePrefix") : ""}${dateInfo.text}</span>` : ""}
                        </div>
                    </div>
                    <div class="card-actions-premium">
                        <button class="card-open-btn-premium" data-card-action="open" title="${t("tasks.openTaskDetails")}">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </button>
                        <svg class="card-chevron-premium" data-card-action="toggle" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                <!-- Expandable body -->
                <div class="card-body-premium">
                    ${descText ? `
                    <div class="card-description-premium">
                        <div class="card-description-premium-label">${t("tasks.card.description")}</div>
                        <div class="card-description-premium-text">${escapeHtml(descText)}</div>
                    </div>
                    ` : ""}

                    ${tagsHTML ? `
                    <div class="card-tags-premium">${tagsHTML}</div>
                    ` : ""}

                    ${proj ? `
                    <div class="card-project-premium">
                        <span class="card-project-dot-premium" style="background-color: ${projColor};"></span>
                        <span class="card-project-name-premium">${escapeHtml(proj.name)}</span>
                    </div>
                    ` : ""}

                    <div class="card-footer-premium">
                        ${task.startDate ? `
                        <div class="card-meta-item-premium">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>${t("tasks.startDatePrefix")}${formatDate(task.startDate)}</span>
                        </div>
                        ` : ""}
                        ${task.endDate ? `
                        <div class="card-meta-item-premium">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>${t("tasks.endDatePrefix")}${formatDate(task.endDate)}</span>
                        </div>
                        ` : ""}
                        ${attachmentCount > 0 ? `
                        <div class="card-meta-item-premium">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span>${attachmentCount}</span>
                        </div>
                        ` : ""}
                    </div>
                </div>
            </div>
        `;
  }).join("");
  attachMobileCardListeners();
  if (expandedIds.size > 0) {
    expandedIds.forEach((id) => {
      const card = container.querySelector(`.task-card-mobile[data-task-id="${id}"]`);
      if (card) card.classList.add("expanded");
    });
  }
}
function attachMobileCardListeners() {
  const cards = document.querySelectorAll(".task-card-mobile");
  cards.forEach((card) => {
    const taskId = parseInt(card.dataset.taskId);
    const toggleElements = card.querySelectorAll('[data-card-action="toggle"]');
    const openButton = card.querySelector('[data-card-action="open"]');
    toggleElements.forEach((element) => {
      element.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".task-card-mobile.expanded").forEach((otherCard) => {
          if (otherCard !== card) {
            otherCard.classList.remove("expanded");
          }
        });
        card.classList.toggle("expanded");
      });
    });
    if (openButton) {
      openButton.addEventListener("click", (e) => {
        e.stopPropagation();
        openTaskDetails(taskId);
      });
    }
  });
}
document.addEventListener("click", function(e) {
  if (!e.target.closest(".multi-select-wrapper")) {
    document.querySelectorAll(".multi-select.active").forEach((s) => s.classList.remove("active"));
  }
});
function generateProjectItemHTML2(project) {
  const helpers = {
    escapeHtml,
    formatDatePretty,
    getProjectColor,
    getProjectStatus,
    getProjectStatusLabel,
    getTagColor,
    getPriorityLabel,
    getStatusLabel,
    getLocale,
    t
  };
  return generateProjectItemHTML(project, tasks, helpers);
}
var expandedTaskLayoutRafId = null;
function updateExpandedTaskRowLayouts(root = document) {
  const taskItems = root.querySelectorAll?.(".expanded-task-item") || [];
  taskItems.forEach((item) => {
    if (item.offsetParent === null) return;
    item.classList.remove("expanded-task-item--stacked");
    const meta = item.querySelector(".expanded-task-meta");
    if (!meta) return;
    const tags = meta.querySelector(".task-tags");
    const dates = meta.querySelector(".expanded-task-dates");
    const overflows = (el) => el && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1;
    const shouldStack = overflows(item) || overflows(meta) || overflows(tags) || overflows(dates);
    if (shouldStack) item.classList.add("expanded-task-item--stacked");
  });
}
function scheduleExpandedTaskRowLayoutUpdate(root = document) {
  if (expandedTaskLayoutRafId !== null) cancelAnimationFrame(expandedTaskLayoutRafId);
  expandedTaskLayoutRafId = requestAnimationFrame(() => {
    expandedTaskLayoutRafId = null;
    updateExpandedTaskRowLayouts(root);
  });
}
function renderProjects() {
  const renderTimer = debugTimeStart("render", "projects", { projectCount: projects.length });
  const container = document.getElementById("projects-list");
  if (projects.length === 0) {
    container.innerHTML = `<div class="empty-state"><h3>${t("projects.empty.title")}</h3><p>${t("projects.empty.subtitle")}</p></div>`;
    const mobileContainer = document.getElementById("projects-list-mobile");
    if (mobileContainer) mobileContainer.innerHTML = "";
    debugTimeEnd("render", renderTimer, { projectCount: projects.length, rendered: 0 });
    return;
  }
  const expandedProjects = /* @__PURE__ */ new Set();
  container.querySelectorAll(".project-list-item.expanded").forEach((item) => {
    const projectId = item.id.replace("project-item-", "");
    expandedProjects.add(projectId);
  });
  const projectsToRender = appState.projectsSortedView || projects;
  container.innerHTML = projectsToRender.map(generateProjectItemHTML2).join("");
  expandedProjects.forEach((projectId) => {
    const item = document.getElementById(`project-item-${projectId}`);
    if (item) {
      item.classList.add("expanded");
    } else {
    }
  });
  renderMobileProjects(projectsToRender);
  scheduleExpandedTaskRowLayoutUpdate(container);
  debugTimeEnd("render", renderTimer, { projectCount: projects.length, rendered: projectsToRender.length });
}
function toggleProjectExpand(projectId) {
  const item = document.getElementById(`project-item-${projectId}`);
  if (item) {
    item.classList.toggle("expanded");
    scheduleExpandedTaskRowLayoutUpdate(item);
  }
}
window.toggleProjectExpand = toggleProjectExpand;
function renderMobileProjects(projects2) {
  const container = document.getElementById("projects-list-mobile");
  if (!container) return;
  if (projects2.length === 0) {
    container.innerHTML = `
            <div class="projects-list-mobile-empty">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <h3>${t("projects.empty.searchTitle")}</h3>
                <p>${t("projects.empty.searchSubtitle")}</p>
            </div>
        `;
    return;
  }
  container.innerHTML = projects2.map((project) => {
    const projectTasks = tasks.filter((t2) => t2.projectId === project.id);
    const completed = projectTasks.filter((t2) => t2.status === "done").length;
    const inProgress = projectTasks.filter((t2) => t2.status === "progress").length;
    const review = projectTasks.filter((t2) => t2.status === "review").length;
    const todo = projectTasks.filter((t2) => t2.status === "todo").length;
    const backlog = projectTasks.filter((t2) => t2.status === "backlog").length;
    const total = projectTasks.length;
    const completionPct = total > 0 ? Math.round(completed / total * 100) : 0;
    const swatchColor = getProjectColor(project.id);
    const projectStatus = getProjectStatus(project.id);
    return `
            <div class="project-card-mobile" data-project-id="${project.id}">
                <!-- Header (always visible) -->
                <div class="project-card-header-premium">
                    <div class="project-card-header-content" data-card-action="toggle">
                        <div class="project-card-title-row">
                            <span class="project-swatch-mobile" style="background: ${swatchColor};"></span>
                            <h3 class="project-card-title-premium">${escapeHtml(project.name || "Untitled Project")}</h3>
                        </div>
                        <div class="project-card-meta-premium">
                            <span class="project-status-badge-mobile ${projectStatus}">${getProjectStatusLabel(projectStatus)}</span>
                            <span class="project-card-tasks-count">${t("projects.card.tasksCount", { count: total })}</span>
                            ${completionPct > 0 ? `<span class="project-card-completion">${t("projects.card.percentDone", { count: completionPct })}</span>` : ""}
                        </div>
                    </div>
                    <div class="project-card-actions-premium">
                        <button class="project-card-open-btn-premium" data-action="showProjectDetails" data-param="${project.id}" title="${t("projects.openDetailsTitle")}">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </button>
                        <svg class="project-card-chevron-premium" data-card-action="toggle" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                <!-- Expandable body -->
                <div class="project-card-body-premium">
                    ${project.tags && project.tags.length > 0 ? `
                    <div class="project-card-tags-premium" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
                        ${project.tags.map((tag) => `<span style="background-color: ${getProjectColor(project.id)}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`).join("")}
                    </div>
                    ` : ""}

                    ${project.description ? `
                    <div class="project-card-description-premium">
                        <div class="project-card-description-label">${t("tasks.card.description")}</div>
                        <div class="project-card-description-text">${escapeHtml(project.description)}</div>
                    </div>
                    ` : ""}

                    <div class="project-card-footer-premium">
                        ${project.startDate ? `
                        <div class="project-card-meta-item-premium">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>${t("projects.details.startDate")}: ${formatDate(project.startDate)}</span>
                        </div>
                        ` : ""}
                        ${project.endDate ? `
                        <div class="project-card-meta-item-premium">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>${t("tasks.endDatePrefix")}${formatDate(project.endDate)}</span>
                        </div>
                        ` : ""}
                    </div>

                    ${total > 0 ? `
                    <div class="project-card-progress-premium">
                        <div class="project-card-progress-label">${t("projects.details.taskProgress")}</div>
                        <div class="project-card-progress-bar">
                            <div class="progress-segment done" style="width: ${completed / total * 100}%;"></div>
                            <div class="progress-segment progress" style="width: ${inProgress / total * 100}%;"></div>
                            <div class="progress-segment review" style="width: ${review / total * 100}%;"></div>
                            <div class="progress-segment todo" style="width: ${todo / total * 100}%;"></div>
                            <div class="progress-segment backlog" style="width: ${backlog / total * 100}%;"></div>
                        </div>
                        <div class="project-card-breakdown">
                            ${completed > 0 ? `<span class="breakdown-item done">${completed} ${t("tasks.status.done")}</span>` : ""}
                            ${inProgress > 0 ? `<span class="breakdown-item progress">${inProgress} ${t("tasks.status.progress")}</span>` : ""}
                            ${review > 0 ? `<span class="breakdown-item review">${review} ${t("tasks.status.review")}</span>` : ""}
                            ${todo > 0 ? `<span class="breakdown-item todo">${todo} ${t("tasks.status.todo")}</span>` : ""}
                            ${backlog > 0 ? `<span class="breakdown-item backlog">${backlog} ${t("tasks.status.backlog")}</span>` : ""}
                        </div>
                    </div>
                    ` : ""}
                </div>
            </div>
        `;
  }).join("");
  attachMobileProjectCardListeners();
}
function attachMobileProjectCardListeners() {
  const cards = document.querySelectorAll(".project-card-mobile");
  cards.forEach((card) => {
    const projectId = parseInt(card.dataset.projectId);
    const toggleElements = card.querySelectorAll('[data-card-action="toggle"]');
    const openButton = card.querySelector('[data-action="showProjectDetails"]');
    toggleElements.forEach((element) => {
      element.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".project-card-mobile.expanded").forEach((otherCard) => {
          if (otherCard !== card) {
            otherCard.classList.remove("expanded");
          }
        });
        card.classList.toggle("expanded");
      });
    });
    if (openButton) {
      openButton.addEventListener("click", (e) => {
        e.stopPropagation();
        showProjectDetails(projectId);
      });
    }
  });
}
function renderTasks() {
  const renderTimer = debugTimeStart("render", "tasks", { taskCount: tasks.length });
  const source = typeof getFilteredTasks === "function" ? getFilteredTasks() : tasks.slice();
  const cutoff = getKanbanUpdatedCutoffTime(window.kanbanUpdatedFilter);
  const kanbanData = prepareKanbanData(source, {
    showBacklog: window.kanbanShowBacklog === true,
    sortMode,
    manualTaskOrder,
    updatedCutoff: cutoff,
    getTaskUpdatedTime
  });
  const byStatus = kanbanData.byStatus;
  const sourceForKanban = kanbanData.totalFiltered;
  const cols = {
    backlog: document.getElementById("backlog-tasks"),
    todo: document.getElementById("todo-tasks"),
    progress: document.getElementById("progress-tasks"),
    review: document.getElementById("review-tasks"),
    done: document.getElementById("done-tasks")
  };
  const counts = kanbanData.counts;
  const cBacklog = document.getElementById("backlog-count");
  const cTodo = document.getElementById("todo-count");
  const cProg = document.getElementById("progress-count");
  const cRev = document.getElementById("review-count");
  const cDone = document.getElementById("done-count");
  if (cBacklog) cBacklog.textContent = counts.backlog;
  if (cTodo) cTodo.textContent = counts.todo;
  if (cProg) cProg.textContent = counts.progress;
  if (cRev) cRev.textContent = counts.review;
  if (cDone) cDone.textContent = counts.done;
  const cardHelpers = {
    escapeHtml,
    formatDate,
    getProjectColor,
    getTagColor,
    getPriorityLabel,
    projects,
    selectedCards: appState.selectedCards,
    showProjects: window.kanbanShowProjects !== false,
    showNoDate: window.kanbanShowNoDate !== false,
    noProjectText: t("tasks.noProject"),
    noDateText: t("tasks.noDate")
  };
  ["backlog", "todo", "progress", "review", "done"].forEach((status) => {
    const wrap = cols[status];
    if (!wrap) return;
    wrap.innerHTML = generateKanbanColumnHTML(byStatus[status], cardHelpers);
  });
  setupDragAndDrop();
  updateSortUI();
  debugTimeEnd("render", renderTimer, {
    taskCount: tasks.length,
    filteredCount: source.length,
    kanbanCount: sourceForKanban
  });
}
function reorganizeMobileTaskFields() {
  if (window.innerWidth > 768) return;
  const modal = document.getElementById("task-modal");
  if (!modal) return;
  const form = modal.querySelector("#task-form");
  const editingTaskId = form?.dataset.editingTaskId;
  if (!editingTaskId) return;
  const startDateWasEverSet = modal.dataset.initialStartDate === "true";
  const endDateWasEverSet = modal.dataset.initialEndDate === "true";
  let taskData = null;
  if (editingTaskId) {
    taskData = tasks.find((t2) => t2.id === parseInt(editingTaskId, 10));
  }
  if (!taskData) {
    taskData = {
      tags: window.tempTags || [],
      attachments: tempAttachments || []
    };
  }
  const fieldState = calculateMobileFieldPlacement(taskData, {
    startDateWasEverSet,
    endDateWasEverSet
  });
  const tagInput = modal.querySelector("#tag-input");
  const tagsGroup = tagInput ? tagInput.closest(".form-group") : null;
  const startDateInputs = modal.querySelectorAll('input[name="startDate"]');
  let startDateGroup = null;
  for (const input of startDateInputs) {
    const group = input.closest(".form-group");
    if (group) {
      startDateGroup = group;
      break;
    }
  }
  const endDateInputs = modal.querySelectorAll('input[name="endDate"]');
  let endDateGroup = null;
  for (const input of endDateInputs) {
    const group = input.closest(".form-group");
    if (group) {
      endDateGroup = group;
      break;
    }
  }
  const linksList = modal.querySelector("#attachments-links-list");
  const linksGroup = linksList ? linksList.closest(".form-group") : null;
  if (tagsGroup) {
    tagsGroup.classList.toggle("mobile-general-field", fieldState.tagsInGeneral);
    tagsGroup.classList.toggle("mobile-details-field", !fieldState.tagsInGeneral);
  }
  if (startDateGroup) {
    startDateGroup.classList.toggle("mobile-general-field", fieldState.startDateInGeneral);
    startDateGroup.classList.toggle("mobile-details-field", !fieldState.startDateInGeneral);
  }
  if (endDateGroup) {
    endDateGroup.classList.toggle("mobile-general-field", fieldState.endDateInGeneral);
    endDateGroup.classList.toggle("mobile-details-field", !fieldState.endDateInGeneral);
  }
  if (linksGroup) {
    linksGroup.classList.toggle("mobile-general-field", fieldState.linksInGeneral);
    linksGroup.classList.toggle("mobile-details-field", !fieldState.linksInGeneral);
  }
  const detailsTab = modal.querySelector('.modal-tab[data-tab="details"]');
  const hideDetailsTab = shouldHideDetailsTab(fieldState);
  console.log("\u{1F504} Reorganizing fields:", {
    ...fieldState,
    hideDetailsTab
  });
  if (detailsTab) {
    if (hideDetailsTab) {
      console.log("\u2705 Hiding Details tab - Tags and Links both filled");
      detailsTab.classList.add("hide-details-tab");
    } else {
      console.log("\u{1F441}\uFE0F Showing Details tab - some dynamic fields empty");
      detailsTab.classList.remove("hide-details-tab");
    }
  }
}
var currentTaskNavigationContext = null;
function openTaskDetails(taskId, navigationContext = null) {
  const task = tasks.find((t2) => t2.id === taskId);
  if (!task) return;
  const modal = document.getElementById("task-modal");
  if (!modal) return;
  currentTaskNavigationContext = navigationContext;
  const generalTab = modal.querySelector('.modal-tab[data-tab="general"]');
  const detailsTab = modal.querySelector('.modal-tab[data-tab="details"]');
  const historyTab = modal.querySelector('.modal-tab[data-tab="history"]');
  const generalContent = modal.querySelector("#task-details-tab");
  const historyContent = modal.querySelector("#task-history-tab");
  if (generalTab) generalTab.classList.add("active");
  if (detailsTab) detailsTab.classList.remove("active");
  if (historyTab) historyTab.classList.remove("active");
  if (generalContent) generalContent.classList.add("active");
  if (historyContent) historyContent.classList.remove("active");
  document.body.classList.remove("mobile-tab-details-active");
  if (historyTab) historyTab.style.display = "";
  const modalContent = modal.querySelector(".modal-content");
  if (modalContent) {
    modalContent.style.minHeight = "";
    modalContent.style.maxHeight = "";
  }
  const titleEl = modal.querySelector("h2");
  if (titleEl) titleEl.textContent = "Edit Task";
  const closeBtn = modal.querySelector(".modal-close");
  if (closeBtn) closeBtn.style.display = "inline-block";
  const optionsBtn = modal.querySelector("#task-options-btn");
  if (optionsBtn) optionsBtn.style.display = "inline-block";
  const footer = modal.querySelector("#task-footer");
  if (footer) footer.style.display = "none";
  populateProjectDropdownOptions();
  const hiddenProject = modal.querySelector("#hidden-project");
  const projectCurrentBtn = modal.querySelector("#project-current");
  if (hiddenProject && projectCurrentBtn) {
    hiddenProject.value = task.projectId || "";
    const projectTextSpan = projectCurrentBtn.querySelector(".project-text");
    if (projectTextSpan) {
      if (task.projectId) {
        const project = projects.find((p) => p.id === task.projectId);
        if (project) {
          const colorSquare = `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor(project.id)}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>`;
          projectTextSpan.innerHTML = colorSquare + escapeHtml(project.name);
        } else {
          projectTextSpan.textContent = t("tasks.project.selectPlaceholder");
        }
      } else {
        projectTextSpan.textContent = t("tasks.project.selectPlaceholder");
      }
    }
    updateTaskProjectOpenBtn(task.projectId || "");
  }
  const titleInput = modal.querySelector('#task-form input[name="title"]');
  if (titleInput) titleInput.value = task.title || "";
  const descEditor = modal.querySelector("#task-description-editor");
  if (descEditor) descEditor.innerHTML = task.description || "";
  const descHidden = modal.querySelector("#task-description-hidden");
  if (descHidden) descHidden.value = task.description || "";
  const hiddenPriority = modal.querySelector("#hidden-priority");
  if (hiddenPriority) hiddenPriority.value = task.priority || "medium";
  const priorityCurrentBtn = modal.querySelector("#priority-current");
  if (priorityCurrentBtn) {
    const priority = task.priority || "medium";
    priorityCurrentBtn.innerHTML = `<span class="priority-dot ${priority}"></span> ${getPriorityLabel(priority)} <span class="dropdown-arrow">\u25BC</span>`;
    updatePriorityOptions(priority);
  }
  const hiddenStatus = modal.querySelector("#hidden-status");
  if (hiddenStatus) hiddenStatus.value = task.status || "todo";
  const currentBtn = modal.querySelector("#status-current");
  if (currentBtn) {
    const statusBadge = currentBtn.querySelector(".status-badge");
    if (statusBadge) {
      statusBadge.className = "status-badge " + (task.status || "todo");
      statusBadge.textContent = getStatusLabel(task.status || "todo");
    }
    updateStatusOptions(task.status || "todo");
  }
  let startIso = "";
  if (typeof task.startDate === "string") {
    if (looksLikeISO(task.startDate)) startIso = task.startDate;
    else if (looksLikeDMY(task.startDate)) startIso = toISOFromDMY(task.startDate);
  }
  let endIso = "";
  if (typeof task.endDate === "string") {
    if (looksLikeISO(task.endDate)) endIso = task.endDate;
    else if (looksLikeDMY(task.endDate)) endIso = toISOFromDMY(task.endDate);
  }
  const startInput = modal.querySelector('#task-form input[name="startDate"]');
  const endInput = modal.querySelector('#task-form input[name="endDate"]');
  const startWrapper = startInput ? startInput.parentElement : null;
  const endWrapper = endInput ? endInput.parentElement : null;
  const startDisplayInput = startWrapper && startWrapper.classList.contains("date-input-wrapper") ? startWrapper.querySelector("input.date-display") : null;
  const endDisplayInput = endWrapper && endWrapper.classList.contains("date-input-wrapper") ? endWrapper.querySelector("input.date-display") : null;
  const startDateAlreadyWrapped = startDisplayInput && startDisplayInput._flatpickr;
  const endDateAlreadyWrapped = endDisplayInput && endDisplayInput._flatpickr;
  if (startDateAlreadyWrapped && endDateAlreadyWrapped) {
    if (startDisplayInput && startDisplayInput._flatpickr) {
      startInput.value = startIso || "";
      if (startIso) {
        startDisplayInput._flatpickr.setDate(new Date(startIso), false);
      } else {
        startDisplayInput._flatpickr.clear();
      }
    }
    if (endDisplayInput && endDisplayInput._flatpickr) {
      endInput.value = endIso || "";
      if (endIso) {
        endDisplayInput._flatpickr.setDate(new Date(endIso), false);
      } else {
        endDisplayInput._flatpickr.clear();
      }
    }
  } else {
    const dateInputs = modal.querySelectorAll('input[name="startDate"], input[name="endDate"]');
    dateInputs.forEach((input) => {
      if (input._flatpickrInstance) {
        input._flatpickrInstance.destroy();
        input._flatpickrInstance = null;
      }
      input._wrapped = false;
      const wrapper = input.closest(".date-input-wrapper");
      if (wrapper) {
        const parent = wrapper.parentNode;
        parent.insertBefore(input, wrapper);
        wrapper.remove();
      }
      input.type = "date";
      input.style.display = "";
    });
  }
  const form = modal.querySelector("#task-form");
  if (form) form.dataset.editingTaskId = String(taskId);
  renderAttachments(task.attachments || []);
  renderTags(task.tags || []);
  if (getIsMobileCached() && taskId) {
    const hasTags = Array.isArray(task.tags) && task.tags.length > 0;
    const hasStartDate = typeof task.startDate === "string" && task.startDate.trim() !== "";
    const hasEndDate = typeof task.endDate === "string" && task.endDate.trim() !== "";
    const hasLinks = Array.isArray(task.attachments) && task.attachments.some(
      (att) => att.type === "link" || att.url && att.type !== "file"
    );
    const startDateWasEverSet = !!task.startDateWasEverSet || hasStartDate;
    const endDateWasEverSet = !!task.endDateWasEverSet || hasEndDate;
    modal.dataset.initialStartDate = startDateWasEverSet ? "true" : "false";
    modal.dataset.initialEndDate = endDateWasEverSet ? "true" : "false";
    const tagInput = modal.querySelector("#tag-input");
    const tagsGroup = tagInput ? tagInput.closest(".form-group") : null;
    const startDateInputs = modal.querySelectorAll('input[name="startDate"]');
    let startDateGroup = null;
    for (const input of startDateInputs) {
      const group = input.closest(".form-group");
      if (group && group.classList.contains("mobile-details-field")) {
        startDateGroup = group;
        break;
      }
    }
    const endDateInputs = modal.querySelectorAll('input[name="endDate"]');
    let endDateGroup = null;
    for (const input of endDateInputs) {
      const group = input.closest(".form-group");
      if (group && group.classList.contains("mobile-details-field")) {
        endDateGroup = group;
        break;
      }
    }
    const linksList = modal.querySelector("#attachments-links-list");
    const linksGroup = linksList ? linksList.closest(".form-group") : null;
    if (tagsGroup) {
      if (hasTags) {
        tagsGroup.classList.remove("mobile-details-field");
        tagsGroup.classList.add("mobile-general-field");
      } else {
        tagsGroup.classList.remove("mobile-general-field");
        tagsGroup.classList.add("mobile-details-field");
      }
    }
    if (startDateGroup) {
      if (startDateWasEverSet) {
        startDateGroup.classList.remove("mobile-details-field");
        startDateGroup.classList.add("mobile-general-field");
      } else {
        startDateGroup.classList.remove("mobile-general-field");
        startDateGroup.classList.add("mobile-details-field");
      }
    }
    if (endDateGroup) {
      if (endDateWasEverSet) {
        endDateGroup.classList.remove("mobile-details-field");
        endDateGroup.classList.add("mobile-general-field");
      } else {
        endDateGroup.classList.remove("mobile-general-field");
        endDateGroup.classList.add("mobile-details-field");
      }
    }
    if (linksGroup) {
      if (hasLinks) {
        linksGroup.classList.remove("mobile-details-field");
        linksGroup.classList.add("mobile-general-field");
      } else {
        linksGroup.classList.remove("mobile-general-field");
        linksGroup.classList.add("mobile-details-field");
      }
    }
    const allDetailsFilled = hasTags && hasLinks;
    console.log("\u{1F50D} Details Tab Logic:", {
      hasTags,
      hasStartDate,
      hasEndDate,
      hasLinks,
      allDetailsFilled,
      tags: task.tags,
      startDate: task.startDate,
      endDate: task.endDate,
      attachments: task.attachments
    });
    if (detailsTab) {
      if (allDetailsFilled) {
        console.log("\u2705 Hiding Details tab - all fields filled");
        detailsTab.classList.add("hide-details-tab");
      } else {
        console.log("\u{1F441}\uFE0F Showing Details tab - some fields empty");
        detailsTab.classList.remove("hide-details-tab");
      }
    }
  }
  modal.classList.add("active");
  updateTaskNavigationButtons();
  setTimeout(() => {
    if (!startDateAlreadyWrapped || !endDateAlreadyWrapped) {
      if (startInput) startInput.value = startIso || "";
      if (endInput) endInput.value = endIso || "";
      initializeDatePickers();
    }
    if (startInput) {
      const wrapper = startInput.parentElement;
      if (wrapper && wrapper.classList.contains("date-input-wrapper")) {
        const displayInput = wrapper.querySelector("input.date-display");
        if (displayInput) {
          startInput.value = startIso || "";
          if (displayInput._flatpickr) {
            if (startIso) {
              displayInput._flatpickr.setDate(new Date(startIso), false);
            } else {
              displayInput._flatpickr.clear();
            }
          }
        }
      }
    }
    if (endInput) {
      const wrapper = endInput.parentElement;
      if (wrapper && wrapper.classList.contains("date-input-wrapper")) {
        const displayInput = wrapper.querySelector("input.date-display");
        if (displayInput) {
          endInput.value = endIso || "";
          if (displayInput._flatpickr) {
            if (endIso) {
              displayInput._flatpickr.setDate(new Date(endIso), false);
            } else {
              displayInput._flatpickr.clear();
            }
          }
        }
      }
    }
  }, 0);
  setTimeout(() => {
    const dateInputsForListeners = modal.querySelectorAll('input[name="startDate"], input[name="endDate"]');
    dateInputsForListeners.forEach((input) => {
      input.removeEventListener("change", reorganizeMobileTaskFields);
      input.addEventListener("change", reorganizeMobileTaskFields);
    });
  }, 50);
  setTimeout(() => {
    const modalBody = modal.querySelector(".modal-body");
    if (modalBody) modalBody.scrollTop = 0;
  }, 0);
}
function deleteTask2() {
  const taskId = document.getElementById("task-form").dataset.editingTaskId;
  if (!taskId) return;
  const task = tasks.find((t2) => t2.id === parseInt(taskId));
  if (!task) return;
  document.getElementById("confirm-modal").classList.add("active");
  const confirmInput = document.getElementById("confirm-input");
  confirmInput.value = "";
  confirmInput.focus();
  const lowercaseHandler = function(e) {
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    e.target.value = e.target.value.toLowerCase();
    e.target.setSelectionRange(start, end);
  };
  confirmInput.addEventListener("input", lowercaseHandler);
  document.addEventListener("keydown", function(e) {
    const confirmModal = document.getElementById("confirm-modal");
    if (!confirmModal || !confirmModal.classList.contains("active")) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeConfirmModal();
    } else if (e.key === "Enter") {
      e.preventDefault();
      confirmDelete();
    }
  });
}
async function duplicateTask2() {
  const form = document.getElementById("task-form");
  const editingTaskId = form?.dataset.editingTaskId;
  if (!editingTaskId) return;
  const result = duplicateTask(parseInt(editingTaskId, 10), tasks, taskCounter);
  if (!result.task) return;
  tasks = result.tasks;
  taskCounter = result.taskCounter;
  const cloned = result.task;
  if (cloned && cloned.projectId) {
    touchProjectUpdatedAt(cloned.projectId);
    recordProjectTaskLinkChange(cloned.projectId, "added", cloned);
    saveProjects2().catch(() => {
    });
  }
  const menu = document.getElementById("options-menu");
  if (menu) menu.style.display = "none";
  closeModal("task-modal");
  populateProjectOptions();
  populateTagOptions();
  updateNoDateOptionVisibility();
  const inProjectDetails = document.getElementById("project-details").classList.contains("active");
  if (inProjectDetails && cloned.projectId) {
    showProjectDetails(cloned.projectId);
  } else {
    render();
  }
  const calendarView = document.getElementById("calendar-view");
  if (calendarView) {
    renderCalendar();
  }
  updateCounts();
  saveTasks2().catch((err) => {
    console.error("Failed to save duplicated task:", err);
    showErrorNotification(t("error.saveTaskFailed"));
  });
}
function closeConfirmModal() {
  document.getElementById("confirm-modal").classList.remove("active");
  document.getElementById("confirm-error").classList.remove("show");
}
function showStatusInfoModal() {
  const modal = document.getElementById("status-info-modal");
  if (modal) modal.classList.add("active");
}
async function confirmDelete() {
  const input = document.getElementById("confirm-input");
  const errorMsg = document.getElementById("confirm-error");
  const confirmText = input.value;
  if (confirmText === "delete") {
    const taskId = document.getElementById("task-form").dataset.editingTaskId;
    const result = deleteTask(parseInt(taskId, 10), tasks);
    if (!result.task) return;
    if (window.historyService) {
      window.historyService.recordTaskDeleted(result.task);
    }
    const wasInProjectDetails = result.task && result.projectId && document.getElementById("project-details").classList.contains("active");
    const projectId = result.projectId;
    tasks = result.tasks;
    if (projectId) {
      touchProjectUpdatedAt(projectId);
      recordProjectTaskLinkChange(projectId, "removed", result.task);
      saveProjects2().catch(() => {
      });
    }
    closeConfirmModal();
    closeModal("task-modal");
    populateProjectOptions();
    populateTagOptions();
    updateNoDateOptionVisibility();
    if (wasInProjectDetails && projectId) {
      showProjectDetails(projectId);
    } else {
      render();
    }
    const calendarView = document.getElementById("calendar-view");
    if (calendarView) {
      renderCalendar();
    }
    updateCounts();
    saveTasks2().catch((err) => {
      console.error("Failed to save task deletion:", err);
      showErrorNotification(t("error.saveChangesFailed"));
    });
  } else {
    errorMsg.classList.add("show");
    input.focus();
  }
}
function setupDragAndDrop() {
  let draggedTaskIds = [];
  let draggedFromStatus = null;
  let isSingleDrag = true;
  let dragPlaceholder = null;
  let autoScrollTimer = null;
  const SCROLL_ZONE = 80;
  const SCROLL_SPEED = 20;
  function getScrollableAncestor(el) {
    let node = el;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      const overflowY = style.overflowY;
      if ((overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") && node.scrollHeight > node.clientHeight) {
        return node;
      }
      node = node.parentElement;
    }
    return window;
  }
  function startAutoScroll(direction, container) {
    stopAutoScroll();
    autoScrollTimer = setInterval(() => {
      try {
        if (container === window) {
          window.scrollBy({ top: direction === "down" ? SCROLL_SPEED : -SCROLL_SPEED, left: 0 });
        } else {
          container.scrollTop += direction === "down" ? SCROLL_SPEED : -SCROLL_SPEED;
        }
      } catch (err) {
      }
    }, 50);
  }
  function stopAutoScroll() {
    if (autoScrollTimer) {
      clearInterval(autoScrollTimer);
      autoScrollTimer = null;
    }
  }
  const kanbanBoard = document.querySelector(".kanban-board");
  if (!kanbanBoard) return;
  if (kanbanBoard.dataset.dragDelegation === "1") return;
  kanbanBoard.dataset.dragDelegation = "1";
  const resolveStatusFromColumn = (column) => {
    const tasksContainer = column?.querySelector('[id$="-tasks"]');
    const id = tasksContainer?.id || "";
    return id ? id.replace("-tasks", "") : null;
  };
  kanbanBoard.addEventListener("dragstart", (e) => {
    const card = e.target.closest(".task-card");
    if (!card || !kanbanBoard.contains(card)) return;
    const taskId = parseInt(card.dataset.taskId, 10);
    if (Number.isNaN(taskId)) return;
    const taskObj = tasks.find((t2) => t2.id === taskId);
    draggedFromStatus = taskObj ? taskObj.status : null;
    if (appState.selectedCards.has(taskId)) {
      draggedTaskIds = Array.from(appState.selectedCards);
    } else {
      draggedTaskIds = [taskId];
    }
    isSingleDrag = draggedTaskIds.length === 1;
    card.classList.add("dragging");
    card.style.opacity = "0.5";
    dragPlaceholder = document.createElement("div");
    dragPlaceholder.className = "drag-placeholder active";
    dragPlaceholder.setAttribute("aria-hidden", "true");
    const cardHeight = card.offsetHeight;
    dragPlaceholder.style.height = cardHeight + "px";
    dragPlaceholder.style.margin = "8px 0";
    dragPlaceholder.style.opacity = "1";
    document.querySelectorAll(".kanban-column").forEach((col) => {
      col.style.backgroundColor = "var(--bg-tertiary)";
      col.style.border = "2px dashed var(--accent-blue)";
    });
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(taskId));
    } catch (err) {
    }
  });
  kanbanBoard.addEventListener("dragend", (e) => {
    const card = e.target.closest(".task-card");
    if (!card || !kanbanBoard.contains(card)) return;
    card.classList.remove("dragging");
    card.style.opacity = "1";
    draggedTaskIds = [];
    draggedFromStatus = null;
    isSingleDrag = true;
    try {
      if (dragPlaceholder && dragPlaceholder.parentNode) {
        dragPlaceholder.parentNode.removeChild(dragPlaceholder);
      }
    } catch (err) {
    }
    dragPlaceholder = null;
    document.querySelectorAll(".kanban-column").forEach((col) => {
      col.style.backgroundColor = "";
      col.style.border = "";
      col.classList.remove("drag-over");
    });
    document.querySelectorAll(".task-card").forEach((c) => {
      c.classList.remove("drag-over-top", "drag-over-bottom");
    });
    stopAutoScroll();
  });
  kanbanBoard.addEventListener("click", (e) => {
    const card = e.target.closest(".task-card");
    if (!card || !kanbanBoard.contains(card)) return;
    const taskId = parseInt(card.dataset.taskId, 10);
    if (isNaN(taskId)) return;
    const isToggleClick = e.ctrlKey || e.metaKey;
    const isRangeClick = e.shiftKey;
    if (isRangeClick) {
      e.preventDefault();
      e.stopPropagation();
      const column = card.closest(".kanban-column");
      const scope = column || document;
      const cardsInScope = Array.from(scope.querySelectorAll(".task-card"));
      let anchorCard = null;
      if (Number.isInteger(appState.lastSelectedCardId)) {
        anchorCard = cardsInScope.find((c) => parseInt(c.dataset.taskId, 10) === appState.lastSelectedCardId);
      }
      if (!anchorCard) {
        anchorCard = cardsInScope.find((c) => appState.selectedCards.has(parseInt(c.dataset.taskId, 10))) || card;
      }
      const startIndex = cardsInScope.indexOf(anchorCard);
      const endIndex = cardsInScope.indexOf(card);
      if (!isToggleClick) {
        clearSelectedCards();
      }
      if (startIndex === -1 || endIndex === -1) {
        card.classList.add("selected");
        appState.selectedCards.add(taskId);
        appState.lastSelectedCardId = taskId;
        return;
      }
      const from = Math.min(startIndex, endIndex);
      const to = Math.max(startIndex, endIndex);
      for (let i = from; i <= to; i++) {
        const rangeCard = cardsInScope[i];
        const rangeId = parseInt(rangeCard.dataset.taskId, 10);
        if (isNaN(rangeId)) continue;
        rangeCard.classList.add("selected");
        appState.selectedCards.add(rangeId);
      }
      appState.lastSelectedCardId = taskId;
      return;
    }
    if (isToggleClick) {
      e.preventDefault();
      e.stopPropagation();
      card.classList.toggle("selected");
      if (card.classList.contains("selected")) {
        appState.selectedCards.add(taskId);
      } else {
        appState.selectedCards.delete(taskId);
      }
      appState.lastSelectedCardId = taskId;
      return;
    }
    openTaskDetails(taskId);
  });
  const columns = document.querySelectorAll(".kanban-column");
  columns.forEach((column) => {
    column.addEventListener("dragover", (e) => {
      e.preventDefault();
      column.classList.add("drag-over");
      column.style.backgroundColor = "var(--hover-bg)";
      if (!dragPlaceholder) return;
      const tasksContainer = column.querySelector('[id$="-tasks"]');
      if (!tasksContainer) return;
      const newStatus = resolveStatusFromColumn(column);
      if (!newStatus) return;
      const cards = Array.from(tasksContainer.querySelectorAll(".task-card:not(.dragging)"));
      const mouseY = e.clientY;
      if (dragPlaceholder.parentNode) {
        dragPlaceholder.remove();
      }
      if (cards.length === 0) {
        tasksContainer.appendChild(dragPlaceholder);
      } else {
        let insertBeforeCard = null;
        for (const card of cards) {
          const rect = card.getBoundingClientRect();
          const cardMiddle = rect.top + rect.height / 2;
          if (mouseY < cardMiddle) {
            insertBeforeCard = card;
            break;
          }
        }
        if (insertBeforeCard) {
          tasksContainer.insertBefore(dragPlaceholder, insertBeforeCard);
        } else {
          tasksContainer.appendChild(dragPlaceholder);
        }
      }
      try {
        const scrollContainer = getScrollableAncestor(column);
        const y = e.clientY;
        const topDist = y;
        const bottomDist = window.innerHeight - y;
        if (topDist < SCROLL_ZONE) startAutoScroll("up", scrollContainer);
        else if (bottomDist < SCROLL_ZONE) startAutoScroll("down", scrollContainer);
        else stopAutoScroll();
      } catch (err) {
        stopAutoScroll();
      }
    });
    column.addEventListener("dragleave", (e) => {
      if (!column.contains(e.relatedTarget)) {
        column.classList.remove("drag-over");
        column.style.backgroundColor = "var(--bg-tertiary)";
      }
    });
    column.addEventListener("drop", async (e) => {
      e.preventDefault();
      column.classList.remove("drag-over");
      column.style.backgroundColor = "var(--bg-tertiary)";
      if (draggedTaskIds.length === 0) return;
      const newStatus = resolveStatusFromColumn(column);
      if (!newStatus) return;
      const tasksContainer = column.querySelector('[id$="-tasks"]');
      if (!tasksContainer) return;
      if (isSingleDrag) {
        if (sortMode !== "manual") {
          sortMode = "manual";
          ["backlog", "todo", "progress", "review", "done"].forEach((st) => {
            manualTaskOrder[st] = tasks.filter((t2) => t2.status === st).slice().sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0)).map((t2) => t2.id);
          });
          updateSortUI();
          saveSortPreferences();
        }
        Object.keys(manualTaskOrder).forEach((st) => {
          if (!Array.isArray(manualTaskOrder[st])) return;
          manualTaskOrder[st] = manualTaskOrder[st].filter((id) => !draggedTaskIds.includes(id));
        });
        const currentColumnTasks = tasks.filter((t2) => t2.status === newStatus && !draggedTaskIds.includes(t2.id));
        let orderedIds;
        if (Array.isArray(manualTaskOrder[newStatus]) && manualTaskOrder[newStatus].length) {
          const presentIds = new Set(currentColumnTasks.map((t2) => t2.id));
          orderedIds = manualTaskOrder[newStatus].filter((id) => presentIds.has(id));
          const missing = currentColumnTasks.filter((t2) => !orderedIds.includes(t2.id)).slice().sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0)).map((t2) => t2.id);
          orderedIds = orderedIds.concat(missing);
        } else {
          orderedIds = currentColumnTasks.slice().sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0)).map((t2) => t2.id);
        }
        let insertIndex = orderedIds.length;
        if (dragPlaceholder && dragPlaceholder.parentNode === tasksContainer) {
          const cardsInDOM = Array.from(tasksContainer.querySelectorAll(".task-card:not(.dragging)"));
          let placeholderIndex = -1;
          const children = Array.from(tasksContainer.children);
          for (let i = 0; i < children.length; i++) {
            if (children[i] === dragPlaceholder) {
              placeholderIndex = i;
              break;
            }
          }
          if (placeholderIndex !== -1) {
            let cardsBefore = 0;
            for (let i = 0; i < placeholderIndex; i++) {
              if (children[i].classList && children[i].classList.contains("task-card")) {
                cardsBefore++;
              }
            }
            insertIndex = cardsBefore;
          }
        }
        orderedIds.splice(insertIndex, 0, ...draggedTaskIds);
        manualTaskOrder[newStatus] = orderedIds;
        draggedTaskIds.forEach((id) => {
          const t2 = tasks.find((x) => x.id === id);
          if (t2) {
            const statusChanged = t2.status !== newStatus;
            if (statusChanged) {
              const oldTaskCopy = JSON.parse(JSON.stringify(t2));
              t2.status = newStatus;
              t2.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
              if (settings.autoSetStartDateOnStatusChange || settings.autoSetEndDateOnStatusChange) {
                const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
                if (settings.autoSetStartDateOnStatusChange && newStatus === "progress" && !t2.startDate) {
                  t2.startDate = today;
                }
                if (settings.autoSetEndDateOnStatusChange && newStatus === "done" && !t2.endDate) {
                  t2.endDate = today;
                }
              }
              if (newStatus === "done" && !t2.completedDate) {
                t2.completedDate = (/* @__PURE__ */ new Date()).toISOString();
              }
              if (window.historyService) {
                window.historyService.recordTaskUpdated(oldTaskCopy, t2);
              }
            }
          }
        });
        saveSortPreferences();
        clearSelectedCards();
        render();
        const calendarView = document.getElementById("calendar-view");
        if (calendarView) renderCalendar();
        try {
          if (dragPlaceholder && dragPlaceholder.parentNode) dragPlaceholder.parentNode.removeChild(dragPlaceholder);
        } catch (err) {
        }
        dragPlaceholder = null;
        stopAutoScroll();
        saveTasks2().catch((error) => {
          console.error("Failed to save drag-and-drop changes:", error);
          showErrorNotification(t("error.saveTaskPositionFailed"));
        });
      } else {
        if (sortMode !== "manual") {
          sortMode = "manual";
          ["backlog", "todo", "progress", "review", "done"].forEach((st) => {
            manualTaskOrder[st] = tasks.filter((t2) => t2.status === st).slice().sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0)).map((t2) => t2.id);
          });
          updateSortUI();
          saveSortPreferences();
        }
        Object.keys(manualTaskOrder).forEach((st) => {
          if (!Array.isArray(manualTaskOrder[st])) return;
          manualTaskOrder[st] = manualTaskOrder[st].filter((id) => !draggedTaskIds.includes(id));
        });
        const currentColumnTasks = tasks.filter((t2) => t2.status === newStatus && !draggedTaskIds.includes(t2.id));
        let orderedIds;
        if (Array.isArray(manualTaskOrder[newStatus]) && manualTaskOrder[newStatus].length) {
          const presentIds = new Set(currentColumnTasks.map((t2) => t2.id));
          orderedIds = manualTaskOrder[newStatus].filter((id) => presentIds.has(id));
          const missing = currentColumnTasks.filter((t2) => !orderedIds.includes(t2.id)).slice().sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0)).map((t2) => t2.id);
          orderedIds = orderedIds.concat(missing);
        } else {
          orderedIds = currentColumnTasks.slice().sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0)).map((t2) => t2.id);
        }
        let insertIndex = orderedIds.length;
        if (dragPlaceholder && dragPlaceholder.parentNode === tasksContainer) {
          const children = Array.from(tasksContainer.children);
          let placeholderIndex = children.indexOf(dragPlaceholder);
          if (placeholderIndex !== -1) {
            let cardsBefore = 0;
            for (let i = 0; i < placeholderIndex; i++) {
              if (children[i].classList && children[i].classList.contains("task-card")) {
                cardsBefore++;
              }
            }
            insertIndex = cardsBefore;
          }
        }
        orderedIds.splice(insertIndex, 0, ...draggedTaskIds);
        manualTaskOrder[newStatus] = orderedIds;
        draggedTaskIds.forEach((id) => {
          const t2 = tasks.find((x) => x.id === id);
          if (t2) {
            const statusChanged = t2.status !== newStatus;
            if (statusChanged) {
              const oldTaskCopy = JSON.parse(JSON.stringify(t2));
              t2.status = newStatus;
              t2.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
              if (settings.autoSetStartDateOnStatusChange || settings.autoSetEndDateOnStatusChange) {
                const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
                if (settings.autoSetStartDateOnStatusChange && newStatus === "progress" && !t2.startDate) {
                  t2.startDate = today;
                }
                if (settings.autoSetEndDateOnStatusChange && newStatus === "done" && !t2.endDate) {
                  t2.endDate = today;
                }
              }
              if (newStatus === "done" && !t2.completedDate) {
                t2.completedDate = (/* @__PURE__ */ new Date()).toISOString();
              }
              if (window.historyService) {
                window.historyService.recordTaskUpdated(oldTaskCopy, t2);
              }
            }
          }
        });
        saveSortPreferences();
        clearSelectedCards();
        render();
        const calendarView = document.getElementById("calendar-view");
        if (calendarView) renderCalendar();
        try {
          if (dragPlaceholder && dragPlaceholder.parentNode) dragPlaceholder.parentNode.removeChild(dragPlaceholder);
        } catch (err) {
        }
        dragPlaceholder = null;
        stopAutoScroll();
        saveTasks2().catch((error) => {
          console.error("Failed to save drag-and-drop changes:", error);
          showErrorNotification(t("error.saveTaskPositionFailed"));
        });
      }
    });
  });
  document.addEventListener("dragend", () => stopAutoScroll());
}
function openProjectModal() {
  const modal = document.getElementById("project-modal");
  window.tempProjectTags = [];
  renderProjectTags([]);
  document.getElementById("project-form").dataset.editingProjectId = "";
  modal.classList.add("active");
  setTimeout(() => {
    document.querySelector('#project-form input[name="startDate"]').value = "";
    const dateInputs = document.querySelectorAll('#project-modal input[type="date"]');
    dateInputs.forEach((input) => {
      if (input._flatpickrInstance) {
        input._flatpickrInstance.destroy();
        input._flatpickrInstance = null;
        input._wrapped = false;
      }
    });
    initializeDatePickers();
  }, 150);
  setTimeout(() => {
    const modalBody = modal.querySelector(".modal-body");
    if (modalBody) modalBody.scrollTop = 0;
  }, 0);
}
function updateTaskNavigationButtons() {
  const prevBtn = document.getElementById("task-nav-prev");
  const nextBtn = document.getElementById("task-nav-next");
  if (!prevBtn || !nextBtn) return;
  if (!currentTaskNavigationContext) {
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
    return;
  }
  const { taskIds, currentIndex } = currentTaskNavigationContext;
  prevBtn.style.display = "flex";
  nextBtn.style.display = "flex";
  prevBtn.disabled = currentIndex <= 0;
  nextBtn.disabled = currentIndex >= taskIds.length - 1;
}
function navigateToTask(direction) {
  if (!currentTaskNavigationContext) return;
  const { taskIds, currentIndex, projectId } = currentTaskNavigationContext;
  const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
  if (newIndex < 0 || newIndex >= taskIds.length) return;
  const newTaskId = taskIds[newIndex];
  const newContext = {
    projectId,
    taskIds,
    currentIndex: newIndex
  };
  openTaskDetails(newTaskId, newContext);
}
function navigateToPreviousTask() {
  navigateToTask("prev");
}
function navigateToNextTask() {
  navigateToTask("next");
}
if (!window.taskNavigationInitialized) {
  window.taskNavigationInitialized = true;
  document.addEventListener("DOMContentLoaded", () => {
    const prevBtn = document.getElementById("task-nav-prev");
    const nextBtn = document.getElementById("task-nav-next");
    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigateToPreviousTask();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigateToNextTask();
      });
    }
    document.addEventListener("keydown", (e) => {
      const taskModal = document.getElementById("task-modal");
      if (!taskModal || !taskModal.classList.contains("active")) return;
      if (!currentTaskNavigationContext) return;
      const target = e.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      if (e.key === "ArrowLeft" && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        navigateToPreviousTask();
      }
      if (e.key === "ArrowRight" && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        navigateToNextTask();
      }
    });
  });
}
function openTaskModal() {
  const modal = document.getElementById("task-modal");
  if (!modal) return;
  currentTaskNavigationContext = null;
  const generalTab = modal.querySelector('.modal-tab[data-tab="general"]');
  const detailsTab = modal.querySelector('.modal-tab[data-tab="details"]');
  const historyTab = modal.querySelector('.modal-tab[data-tab="history"]');
  const generalContent = modal.querySelector("#task-details-tab");
  const historyContent = modal.querySelector("#task-history-tab");
  if (generalTab) generalTab.classList.add("active");
  if (detailsTab) detailsTab.classList.remove("active");
  if (historyTab) historyTab.classList.remove("active");
  if (generalContent) generalContent.classList.add("active");
  if (historyContent) historyContent.classList.remove("active");
  document.body.classList.remove("mobile-tab-details-active");
  if (historyTab) historyTab.style.display = "none";
  const modalContent = modal.querySelector(".modal-content");
  if (modalContent) {
    modalContent.style.minHeight = "";
    modalContent.style.maxHeight = "";
  }
  setTimeout(() => {
    const dateInputs = modal.querySelectorAll('input[name="startDate"], input[name="endDate"]');
    dateInputs.forEach((input) => {
      if (input._flatpickrInstance) {
        input._flatpickrInstance.destroy();
        input._flatpickrInstance = null;
      }
      input._wrapped = false;
      const wrapper = input.closest(".date-input-wrapper");
      if (wrapper) {
        const parent = wrapper.parentNode;
        parent.insertBefore(input, wrapper);
        wrapper.remove();
      }
      input.type = "date";
      input.style.display = "";
    });
    initializeDatePickers();
  }, 150);
  const titleEl = modal.querySelector("h2");
  if (titleEl) titleEl.textContent = "Create New Task";
  const closeBtn = modal.querySelector(".modal-close");
  if (closeBtn) closeBtn.style.display = "none";
  const optionsBtn = modal.querySelector("#task-options-btn");
  if (optionsBtn) optionsBtn.style.display = "none";
  const footer = modal.querySelector("#task-footer");
  if (footer) footer.style.display = "flex";
  setTimeout(() => {
    const modalContent2 = modal.querySelector(".modal-content");
    const modalBody = modal.querySelector(".modal-body");
    const modalFooter = modal.querySelector(".modal-footer");
    if (modalContent2 && modalFooter) {
      const contentRect = modalContent2.getBoundingClientRect();
      const footerRect = modalFooter.getBoundingClientRect();
      const contentStyle = window.getComputedStyle(modalContent2);
      const footerStyle = window.getComputedStyle(modalFooter);
      console.log("=== MODAL DEBUG ===");
      console.log("Viewport:", window.innerWidth, "x", window.innerHeight);
      console.log("Zoom:", window.devicePixelRatio * 100 + "%");
      console.log("");
      console.log("MODAL-CONTENT:");
      console.log("  Position:", contentRect.top.toFixed(1), "to", contentRect.bottom.toFixed(1));
      console.log("  Height:", contentRect.height.toFixed(1), "/", contentStyle.height, "/", contentStyle.maxHeight);
      console.log("  Padding:", contentStyle.padding);
      console.log("  Display:", contentStyle.display);
      console.log("  Overflow:", contentStyle.overflow);
      console.log("");
      console.log("MODAL-FOOTER:");
      console.log("  Position:", footerRect.top.toFixed(1), "to", footerRect.bottom.toFixed(1));
      console.log("  Height:", footerRect.height.toFixed(1));
      console.log("  Flex-shrink:", footerStyle.flexShrink);
      console.log("  Padding:", footerStyle.padding);
      console.log("");
      const overflow = footerRect.bottom - contentRect.bottom;
      if (overflow > 1) {
        console.error("\u274C FOOTER OVERFLOW:", overflow.toFixed(1) + "px OUTSIDE modal-content");
      } else {
        console.log("\u2705 Footer is inside modal-content");
      }
      console.log("==================");
    }
  }, 100);
  const form = modal.querySelector("#task-form");
  if (form) {
    delete form.dataset.editingTaskId;
    form.reset();
  }
  const descEditor = modal.querySelector("#task-description-editor");
  if (descEditor) descEditor.innerHTML = "";
  const descHidden = modal.querySelector("#task-description-hidden");
  if (descHidden) descHidden.value = "";
  const hiddenProject = modal.querySelector("#hidden-project");
  if (hiddenProject) hiddenProject.value = "";
  const projectCurrentBtn = modal.querySelector("#project-current .project-text");
  if (projectCurrentBtn) projectCurrentBtn.textContent = t("tasks.project.selectPlaceholder");
  updateTaskProjectOpenBtn("");
  if (typeof hideProjectDropdownPortal === "function") hideProjectDropdownPortal();
  const hiddenPriority = modal.querySelector("#hidden-priority");
  if (hiddenPriority) hiddenPriority.value = "medium";
  const priorityCurrentBtn = modal.querySelector("#priority-current");
  if (priorityCurrentBtn) {
    priorityCurrentBtn.innerHTML = `<span class="priority-dot medium"></span> ${getPriorityLabel("medium")} <span class="dropdown-arrow">\u25BC</span>`;
    updatePriorityOptions("medium");
  }
  const hiddenStatus = modal.querySelector("#hidden-status");
  if (hiddenStatus) hiddenStatus.value = "backlog";
  const currentBtn = modal.querySelector("#status-current");
  if (currentBtn) {
    const statusBadge = currentBtn.querySelector(".status-badge");
    if (statusBadge) {
      statusBadge.className = "status-badge backlog";
      statusBadge.textContent = getStatusLabel("backlog");
    }
  }
  tempAttachments = [];
  window.tempTags = [];
  filterState.tags.clear();
  renderAttachments([]);
  renderTags([]);
  if (getIsMobileCached()) {
    modal.dataset.initialStartDate = "false";
    modal.dataset.initialEndDate = "false";
    const tagsGroup = modal.querySelector(".form-group:has(#tag-input)");
    const startDateGroup = modal.querySelector('.form-group:has([name="startDate"])');
    const endDateGroup = modal.querySelector('.form-group:has([name="endDate"])');
    const linksGroup = modal.querySelector(".form-group:has(#attachments-links-list)");
    if (tagsGroup) {
      tagsGroup.classList.remove("mobile-general-field");
      tagsGroup.classList.add("mobile-details-field");
    }
    if (startDateGroup) {
      startDateGroup.classList.remove("mobile-general-field");
      startDateGroup.classList.add("mobile-details-field");
    }
    if (endDateGroup) {
      endDateGroup.classList.remove("mobile-general-field");
      endDateGroup.classList.add("mobile-details-field");
    }
    if (linksGroup) {
      linksGroup.classList.remove("mobile-general-field");
      linksGroup.classList.add("mobile-details-field");
    }
    if (detailsTab) {
      detailsTab.classList.remove("hide-details-tab");
    }
  }
  const hiddenStart = modal.querySelector('#task-form input[name="startDate"]');
  if (hiddenStart) {
    const fp = hiddenStart._flatpickrInstance;
    if (fp) {
      fp.clear();
      fp.jumpToDate(/* @__PURE__ */ new Date());
    }
    hiddenStart.value = "";
    const displayStart = hiddenStart.parentElement ? hiddenStart.parentElement.querySelector("input.date-display") : null;
    if (displayStart) displayStart.value = "";
  }
  const hiddenEnd = modal.querySelector('#task-form input[name="endDate"]');
  if (hiddenEnd) {
    const fp = hiddenEnd._flatpickrInstance;
    if (fp) {
      fp.clear();
      fp.jumpToDate(/* @__PURE__ */ new Date());
    }
    hiddenEnd.value = "";
    const displayEnd = hiddenEnd.parentElement ? hiddenEnd.parentElement.querySelector("input.date-display") : null;
    if (displayEnd) displayEnd.value = "";
  }
  modal.classList.add("active");
  setTimeout(() => {
    const modalBody = modal.querySelector(".modal-body");
    if (modalBody) modalBody.scrollTop = 0;
  }, 0);
  setTimeout(() => {
    initializeDatePickers();
    captureInitialTaskFormState();
  }, 100);
}
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  if (modalId === "settings-modal" && window.settingsFormIsDirty) {
    showUnsavedChangesModal(modalId);
    return;
  }
  modal.classList.remove("active");
  if (modalId === "settings-modal") {
    if (typeof hideNotificationTimePortal === "function") hideNotificationTimePortal();
    if (typeof hideNotificationTimeZonePortal === "function") hideNotificationTimeZonePortal();
  }
  if (modalId === "task-modal") {
    try {
      const content = modal.querySelector(".modal-content");
      if (content) content.style.minHeight = "";
    } catch (e) {
    }
  }
  if (modalId === "project-modal") {
    document.getElementById("project-form").reset();
  }
}
function closeTaskModal() {
  if (hasUnsavedNewTask && hasUnsavedNewTask()) {
    showUnsavedChangesModal("task-modal");
    return;
  }
  const form = document.getElementById("task-form");
  if (form && form.dataset.editingTaskId) {
    const descEditor = form.querySelector("#task-description-editor");
    if (descEditor) {
      updateTaskField2("description", descEditor.innerHTML);
    }
  }
  if (form) {
    form.reset();
    delete form.dataset.editingTaskId;
    const statusBadge = document.querySelector("#status-current .status-badge");
    if (statusBadge) {
      statusBadge.className = "status-badge backlog";
      statusBadge.textContent = getStatusLabel("backlog");
    }
    const hiddenStatus = document.getElementById("hidden-status");
    if (hiddenStatus) hiddenStatus.value = "backlog";
    const priorityCurrentBtn = document.querySelector("#priority-current");
    if (priorityCurrentBtn) {
      priorityCurrentBtn.innerHTML = `<span class="priority-dot medium"></span> ${getPriorityLabel("medium")} <span class="dropdown-arrow">\u25BC</span>`;
    }
    const hiddenPriority = document.getElementById("hidden-priority");
    if (hiddenPriority) hiddenPriority.value = "medium";
  }
  initialTaskFormState = null;
  currentTaskNavigationContext = null;
  closeModal("task-modal");
}
document.getElementById("project-form").addEventListener("submit", function(e) {
  e.preventDefault();
  const submitTimer = debugTimeStart("projects", "submit", {
    projectCount: projects.length,
    tagCount: (window.tempProjectTags || []).length
  });
  const formData = new FormData(e.target);
  const tags = window.tempProjectTags || [];
  const result = createProject({
    name: formData.get("name"),
    description: formData.get("description"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    tags
  }, projects, projectCounter);
  projects = result.projects;
  projectCounter = result.projectCounter;
  const project = result.project;
  if (window.historyService) {
    window.historyService.recordProjectCreated(project);
  }
  closeModal("project-modal");
  e.target.reset();
  window.tempProjectTags = [];
  appState.projectsSortedView = null;
  window.location.hash = "projects";
  showPage("projects");
  render();
  saveProjects2().catch((err) => {
    console.error("Failed to save project:", err);
    showErrorNotification(t("error.saveProjectFailed"));
  });
  debugTimeEnd("projects", submitTimer, {
    projectCount: projects.length
  });
});
function resetPINFlow() {
  const resetPinModal = document.createElement("div");
  resetPinModal.className = "modal active";
  resetPinModal.id = "reset-pin-modal-temp";
  resetPinModal.innerHTML = `
        <div class="modal-content reset-pin-modal-content">
            <div class="reset-pin-modal-inner">
                <div class="reset-pin-header">
                    <div>
                        <h2 class="reset-pin-title">Reset PIN</h2>
                        <p class="reset-pin-description">Verify your current PIN to set a new one</p>
                    </div>
                </div>
                
                <form id="reset-pin-form" class="reset-pin-form">
                    <div class="reset-pin-field">
                        <label class="reset-pin-label">Current PIN</label>
                        <input
                            type="password"
                            id="current-pin-input"
                            maxlength="4"
                            placeholder="\u2022\u2022\u2022\u2022"
                            class="reset-pin-input"
                            inputmode="numeric"
                            autocomplete="off"
                            required
                        />
                        <div id="current-pin-error" class="reset-pin-error" style="display: none;"></div>
                    </div>

                    <div class="reset-pin-actions">
                        <button type="button" class="reset-pin-btn reset-pin-btn-cancel" onclick="document.getElementById('reset-pin-modal-temp').remove()">
                            Cancel
                        </button>
                        <button type="submit" class="reset-pin-btn reset-pin-btn-primary">
                            Continue
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
  document.body.appendChild(resetPinModal);
  document.getElementById("reset-pin-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const currentPin = document.getElementById("current-pin-input").value.trim();
    const errorEl = document.getElementById("current-pin-error");
    errorEl.style.display = "none";
    errorEl.textContent = "";
    if (!currentPin || currentPin.length !== 4) {
      errorEl.textContent = "PIN must be 4 digits";
      errorEl.style.display = "block";
      return;
    }
    if (!/^\d{4}$/.test(currentPin)) {
      errorEl.textContent = "PIN must contain only digits";
      errorEl.style.display = "block";
      return;
    }
    document.getElementById("reset-pin-modal-temp").remove();
    showNewPinEntry(currentPin);
  });
  document.getElementById("current-pin-input").focus();
}
function showNewPinEntry(currentPin) {
  const newPinModal = document.createElement("div");
  newPinModal.className = "modal active";
  newPinModal.id = "new-pin-modal-temp";
  newPinModal.innerHTML = `
        <div class="modal-content reset-pin-modal-content">
            <div class="reset-pin-modal-inner">
                <div class="reset-pin-header">
                    <div>
                        <h2 class="reset-pin-title">Set New PIN</h2>
                        <p class="reset-pin-description">Create your new 4-digit PIN</p>
                    </div>
                </div>
                
                <form id="new-pin-form" class="reset-pin-form">
                    <div class="reset-pin-field">
                        <label class="reset-pin-label">New PIN</label>
                        <input 
                            type="password" 
                            id="new-pin-input" 
                            maxlength="4" 
                            placeholder="\u2022\u2022\u2022\u2022"
                            class="reset-pin-input"
                            inputmode="numeric"
                            autocomplete="off"
                            required
                        />
                    </div>
                    
                    <div class="reset-pin-field">
                        <label class="reset-pin-label">Confirm PIN</label>
                        <input
                            type="password"
                            id="confirm-pin-input"
                            maxlength="4"
                            placeholder="\u2022\u2022\u2022\u2022"
                            class="reset-pin-input"
                            inputmode="numeric"
                            autocomplete="off"
                            required
                        />
                        <div id="new-pin-error" class="reset-pin-error" style="display: none;"></div>
                    </div>

                    <div class="reset-pin-actions">
                        <button type="button" class="reset-pin-btn reset-pin-btn-cancel" onclick="document.getElementById('new-pin-modal-temp').remove()">
                            Cancel
                        </button>
                        <button type="submit" class="reset-pin-btn reset-pin-btn-primary">
                            Reset PIN
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
  document.body.appendChild(newPinModal);
  document.getElementById("new-pin-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const newPin = document.getElementById("new-pin-input").value.trim();
    const confirmPin = document.getElementById("confirm-pin-input").value.trim();
    const errorEl = document.getElementById("new-pin-error");
    errorEl.style.display = "none";
    errorEl.textContent = "";
    if (!newPin || newPin.length !== 4) {
      errorEl.textContent = "New PIN must be 4 digits";
      errorEl.style.display = "block";
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      errorEl.textContent = "PIN must contain only digits";
      errorEl.style.display = "block";
      return;
    }
    if (newPin !== confirmPin) {
      errorEl.textContent = "PINs do not match";
      errorEl.style.display = "block";
      return;
    }
    submitPINReset(currentPin, newPin);
  });
  document.getElementById("new-pin-input").focus();
}
async function submitPINReset(currentPin, newPin) {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      showErrorNotification(t("error.notLoggedInResetPin"));
      return;
    }
    const response = await fetch("/api/auth/change-pin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPin,
        newPin
      })
    });
    const data = await response.json();
    if (!response.ok) {
      showErrorNotification(data.error || t("error.resetPinFailed"));
      return;
    }
    const modal = document.getElementById("new-pin-modal-temp");
    if (modal) modal.remove();
    showSuccessNotification(t("success.resetPin"));
    setTimeout(() => {
      window.location.hash = "";
      location.reload();
    }, 2e3);
  } catch (error) {
    console.error("PIN reset error:", error);
    showErrorNotification(t("error.resetPinError"));
  }
}
document.getElementById("settings-form").addEventListener("submit", async function(e) {
  e.preventDefault();
  const saveBtn = this.querySelector(".settings-btn-save");
  if (saveBtn && saveBtn.disabled && !window.settingsFormIsDirty) {
    return;
  }
  const newName = document.getElementById("user-name").value.trim();
  if (!newName) {
    showErrorNotification(t("error.userNameEmpty"));
    return;
  }
  try {
    const token = window.authSystem?.getAuthToken?.() || localStorage.getItem("authToken");
    if (!token) throw new Error("Missing auth token");
    const resp = await fetch("/api/auth/change-name", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ newName })
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.error || "Failed to update display name");
    }
    const currentUser = window.authSystem?.getCurrentUser?.();
    if (currentUser) currentUser.name = data.name || newName;
    updateUserDisplay(data.name || newName, window.authSystem?.getCurrentUser?.()?.avatarDataUrl);
  } catch (err) {
    console.error("Failed to save display name:", err);
    showErrorNotification(t("error.saveDisplayNameFailed"));
    return;
  }
  const emailInput = document.getElementById("user-email");
  const newEmail = String(emailInput?.value || "").trim().toLowerCase();
  if (!newEmail || !isValidEmailAddress(newEmail)) {
    showErrorNotification(t("error.invalidEmail"));
    return;
  }
  try {
    const currentUser = window.authSystem?.getCurrentUser?.();
    const currentEmail = String(currentUser?.email || "").trim().toLowerCase();
    if (newEmail && newEmail !== currentEmail) {
      const token = window.authSystem?.getAuthToken?.() || localStorage.getItem("authToken");
      if (!token) throw new Error("Missing auth token");
      const resp = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ newEmail })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data.error || "Failed to update email");
      }
      if (currentUser) currentUser.email = data.email || newEmail;
      document.querySelectorAll(".user-email").forEach((el) => {
        if (el) el.textContent = data.email || newEmail;
      });
    }
  } catch (err) {
    console.error("Failed to save email:", err);
    showErrorNotification(t("error.saveEmailFailed"));
    return;
  }
  try {
    if (avatarDraft.hasPendingChange) {
      const token = window.authSystem?.getAuthToken?.() || localStorage.getItem("authToken");
      if (!token) throw new Error("Missing auth token");
      const resp = await fetch("/api/auth/change-avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ avatarDataUrl: avatarDraft.dataUrl || null })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data.error || "Failed to update avatar");
      }
      const currentUser = window.authSystem?.getCurrentUser?.();
      if (currentUser) currentUser.avatarDataUrl = data.avatarDataUrl || null;
      applyUserAvatarToHeader();
      refreshUserAvatarSettingsUI();
      avatarDraft.hasPendingChange = false;
      avatarDraft.dataUrl = null;
    }
  } catch (err) {
    console.error("Failed to save avatar:", err);
    showErrorNotification(t("error.saveAvatarFailed"));
    return;
  }
  const autoStartToggle = document.getElementById("auto-start-date-toggle");
  const autoEndToggle = document.getElementById("auto-end-date-toggle");
  const enableReviewStatusToggle = document.getElementById("enable-review-status-toggle");
  const calendarIncludeBacklogToggle = document.getElementById("calendar-include-backlog-toggle");
  const debugLogsToggle = document.getElementById("debug-logs-toggle");
  const historySortOrderSelect = document.getElementById("history-sort-order");
  const languageSelect = document.getElementById("language-select");
  settings.autoSetStartDateOnStatusChange = !!autoStartToggle?.checked;
  settings.autoSetEndDateOnStatusChange = !!autoEndToggle?.checked;
  settings.debugLogsEnabled = !!debugLogsToggle?.checked;
  applyDebugLogSetting(settings.debugLogsEnabled);
  const wasEnabled = window.enableReviewStatus;
  const willBeEnabled = !!enableReviewStatusToggle?.checked;
  if (wasEnabled && !willBeEnabled) {
    const reviewTasks = tasks.filter((t2) => t2.status === "review");
    if (reviewTasks.length > 0) {
      const taskListContainer = document.getElementById("review-status-task-list");
      const displayTasks = reviewTasks.slice(0, 5);
      const hasMore = reviewTasks.length > 5;
      const taskListHTML = `
                    <div style="
                        color: var(--text-primary);
                        font-size: 14px;
                        line-height: 1.6;
                        margin-bottom: 16px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        flex-wrap: wrap;
                    ">
                        <span style="color: var(--text-secondary);">You have</span>
                        <span style="
                            color: var(--text-primary);
                            font-weight: 600;
                            font-size: 16px;
                        ">${reviewTasks.length}</span>
                        <span style="color: var(--text-secondary);">${reviewTasks.length === 1 ? "task" : "tasks"} with</span>
                        <span class="status-badge review" style="
                            display: inline-flex;
                            align-items: center;
                            padding: 4px 10px;
                            border-radius: 6px;
                            font-size: 11px;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        ">IN REVIEW</span>
                        <span style="color: var(--text-secondary);">status</span>
                    </div>
                    <div style="margin: 20px 0;">
                        ${displayTasks.map((t2) => `
                            <div style="
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                padding: 8px 0;
                                color: var(--text-primary);
                                font-size: 14px;
                            ">
                                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style="flex-shrink: 0; color: var(--accent-green);">
                                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                    <path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${escapeHtml(t2.title)}
                                </span>
                            </div>
                        `).join("")}
                        ${hasMore ? `
                            <div style="
                                margin-top: 12px;
                                padding-top: 12px;
                                border-top: 1px solid var(--border-color);
                            ">
                                <button type="button" style="
                                    background: none;
                                    border: none;
                                    color: var(--accent-blue);
                                    text-decoration: none;
                                    font-size: 13px;
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 6px;
                                    cursor: pointer;
                                    padding: 0;
                                    font-family: inherit;
                                " onclick="
                                    const baseUrl = window.location.href.split('#')[0];
                                    const url = baseUrl + '#tasks?status=review&view=list';
                                    window.open(url, '_blank');
                                ">
                                    <span>View all ${reviewTasks.length} tasks in List view</span>
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex-shrink: 0;">
                                        <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                        ` : ""}
                    </div>
                    <div style="
                        color: var(--text-primary);
                        font-size: 14px;
                        line-height: 1.6;
                        margin-top: 20px;
                        padding: 16px;
                        background: var(--bg-tertiary);
                        border-radius: 8px;
                        border-left: 3px solid var(--accent-blue);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        flex-wrap: wrap;
                    ">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style="flex-shrink: 0; color: var(--accent-blue);">
                            <path d="M8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2Z" stroke="currentColor" stroke-width="1.5"/>
                            <path d="M8 5V8L10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                        <span style="color: var(--text-secondary);">These tasks will be moved to</span>
                        <span class="status-badge progress" style="
                            display: inline-flex;
                            align-items: center;
                            padding: 4px 10px;
                            border-radius: 6px;
                            font-size: 11px;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        ">IN PROGRESS</span>
                    </div>
                `;
      taskListContainer.innerHTML = taskListHTML;
      window.pendingReviewTaskMigration = reviewTasks;
      window.pendingReviewStatusToggle = enableReviewStatusToggle;
      document.getElementById("review-status-confirm-modal").classList.add("active");
      return;
    }
  }
  settings.enableReviewStatus = willBeEnabled;
  settings.calendarIncludeBacklog = !!calendarIncludeBacklogToggle?.checked;
  settings.historySortOrder = historySortOrderSelect.value;
  settings.language = normalizeLanguage(languageSelect?.value || "en");
  window.enableReviewStatus = settings.enableReviewStatus;
  localStorage.setItem("enableReviewStatus", String(settings.enableReviewStatus));
  applyReviewStatusVisibility();
  applyLanguage();
  settings.notificationEmail = newEmail;
  const emailNotificationsEnabledToggle = document.getElementById("email-notifications-enabled");
  const emailNotificationsWeekdaysOnlyToggle = document.getElementById("email-notifications-weekdays-only");
  const emailNotificationsIncludeStartDatesToggle = document.getElementById("email-notifications-include-start-dates");
  const emailNotificationsIncludeBacklogToggle = document.getElementById("email-notifications-include-backlog");
  const emailNotificationTimeInput = document.getElementById("email-notification-time");
  const emailNotificationTimeZoneSelect = document.getElementById("email-notification-timezone");
  settings.emailNotificationsEnabled = !!emailNotificationsEnabledToggle?.checked;
  settings.emailNotificationsWeekdaysOnly = !!emailNotificationsWeekdaysOnlyToggle?.checked;
  settings.emailNotificationsIncludeStartDates = !!emailNotificationsIncludeStartDatesToggle?.checked;
  settings.emailNotificationsIncludeBacklog = !!emailNotificationsIncludeBacklogToggle?.checked;
  const snappedTime = snapHHMMToStep(
    normalizeHHMM(emailNotificationTimeInput?.value) || "09:00",
    30
  );
  settings.emailNotificationTime = clampHHMMToRange(snappedTime || "09:00", "08:00", "18:00") || "09:00";
  settings.emailNotificationTimeZone = String(
    emailNotificationTimeZoneSelect?.value || "Atlantic/Canary"
  );
  if (emailNotificationTimeInput) {
    emailNotificationTimeInput.value = settings.emailNotificationTime;
  }
  if (workspaceLogoDraft.hasPendingChange) {
    settings.customWorkspaceLogo = workspaceLogoDraft.dataUrl || null;
  }
  saveSettings2();
  applyWorkspaceLogo();
  updateNotificationState({ force: true });
  const calendarView = document.getElementById("calendar-view");
  if (calendarView && calendarView.classList.contains("active")) {
    renderCalendar();
  }
  workspaceLogoDraft.hasPendingChange = false;
  workspaceLogoDraft.dataUrl = null;
  const userEmailEl = document.querySelector(".user-email");
  if (userEmailEl) userEmailEl.textContent = newEmail;
  showSuccessNotification(t("success.settingsSaved"));
  window.initialSettingsFormState = null;
  window.settingsFormIsDirty = false;
  if (saveBtn) {
    saveBtn.classList.remove("dirty");
    saveBtn.disabled = true;
  }
  closeModal("settings-modal");
});
function refreshUserAvatarSettingsUI() {
  const preview = document.getElementById("user-avatar-preview");
  const clearButton = document.getElementById("user-avatar-clear-btn");
  const dropzone = document.getElementById("user-avatar-dropzone");
  const row = preview?.closest?.(".user-avatar-input-row") || dropzone?.closest?.(".user-avatar-input-row") || null;
  const currentUser = window.authSystem?.getCurrentUser?.();
  const effectiveAvatar = avatarDraft.hasPendingChange ? avatarDraft.dataUrl : currentUser?.avatarDataUrl || null;
  const hasAvatar = !!effectiveAvatar;
  if (preview && clearButton) {
    if (effectiveAvatar) {
      preview.style.display = "block";
      preview.style.backgroundImage = `url(${effectiveAvatar})`;
      clearButton.style.display = "inline-flex";
    } else {
      preview.style.display = "none";
      preview.style.backgroundImage = "";
      clearButton.style.display = "none";
    }
  }
  if (dropzone) {
    const uploadAria = t("settings.avatarUploadAriaUpload");
    const changeAria = t("settings.avatarUploadAriaChange");
    dropzone.setAttribute("aria-label", hasAvatar ? changeAria : uploadAria);
    const textEl = dropzone.querySelector(".workspace-logo-dropzone-text");
    if (textEl) {
      const defaultText = dropzone.dataset.defaultText || t("settings.avatarUploadDefault");
      const changeText = dropzone.dataset.changeText || t("settings.avatarUploadChange");
      textEl.textContent = hasAvatar ? changeText : defaultText;
    }
    dropzone.style.minHeight = hasAvatar ? "40px" : "48px";
    dropzone.style.padding = hasAvatar ? "10px 12px" : "12px 16px";
  }
  if (row) {
    row.classList.toggle("has-avatar", hasAvatar);
  }
}
function applyUserAvatarToHeader() {
  const currentUser = window.authSystem?.getCurrentUser?.();
  if (!currentUser) return;
  updateUserDisplay(currentUser.name, currentUser.avatarDataUrl || null);
}
function setupWorkspaceLogoControls() {
  const dropzone = document.getElementById("workspace-logo-dropzone");
  const fileInput = document.getElementById("workspace-logo-input");
  const clearButton = document.getElementById("workspace-logo-clear-btn");
  const preview = document.getElementById("workspace-logo-preview");
  if (!dropzone || !fileInput) return;
  const defaultText = t("settings.logoUploadDefault");
  dropzone.dataset.defaultText = defaultText;
  function setDropzoneText(text) {
    dropzone.innerHTML = "";
    const textEl = document.createElement("span");
    textEl.className = "workspace-logo-dropzone-text";
    textEl.textContent = text;
    dropzone.appendChild(textEl);
  }
  function applyDropzoneBaseStyles(el) {
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.gap = "10px";
    el.style.padding = "12px 16px";
    el.style.textAlign = "center";
    el.style.cursor = "pointer";
    el.style.userSelect = "none";
    el.style.minHeight = "48px";
    el.style.border = "2px dashed var(--border)";
    el.style.borderRadius = "10px";
    el.style.background = "var(--bg-tertiary)";
    el.style.boxShadow = "none";
    el.style.color = "var(--text-muted)";
    el.style.fontWeight = "500";
    el.style.transition = "border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease";
  }
  function setDropzoneDragoverStyles(el, isActive) {
    if (isActive) {
      el.style.borderColor = "var(--accent-blue)";
      el.style.background = "rgba(59, 130, 246, 0.08)";
      el.style.boxShadow = "0 0 0 1px var(--accent-blue)";
    } else {
      el.style.border = "2px dashed var(--border)";
      el.style.background = "var(--bg-tertiary)";
      el.style.boxShadow = "none";
    }
  }
  function refreshWorkspaceLogoUI() {
    if (!preview || !clearButton) return;
    const row = preview.closest(".workspace-logo-input-row") || dropzone?.closest?.(".workspace-logo-input-row") || null;
    const effectiveLogo = workspaceLogoDraft.hasPendingChange ? workspaceLogoDraft.dataUrl : settings.customWorkspaceLogo;
    const hasLogo = !!effectiveLogo;
    if (effectiveLogo) {
      preview.style.display = "block";
      preview.style.backgroundImage = `url(${effectiveLogo})`;
      clearButton.style.display = "inline-flex";
    } else {
      preview.style.display = "none";
      preview.style.backgroundImage = "";
      clearButton.style.display = "none";
    }
    if (dropzone) {
      const uploadAria = t("settings.logoUploadAriaUpload");
      const changeAria = t("settings.logoUploadAriaChange");
      dropzone.setAttribute("aria-label", hasLogo ? changeAria : uploadAria);
      const defaultText2 = dropzone.dataset.defaultText || t("settings.logoUploadDefault");
      const changeText = dropzone.dataset.changeText || t("settings.logoUploadChange");
      if (dropzone.getAttribute("aria-busy") !== "true" && !dropzone.classList.contains("workspace-logo-uploading")) {
        setDropzoneText(hasLogo ? changeText : defaultText2);
      }
      dropzone.style.minHeight = hasLogo ? "40px" : "48px";
      dropzone.style.padding = hasLogo ? "10px 12px" : "12px 16px";
    }
    if (row) {
      row.classList.toggle("has-logo", hasLogo);
    }
  }
  async function handleWorkspaceLogoFile(file, event) {
    if (!file) return;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!file.type.startsWith("image/")) {
      showErrorNotification(t("error.logoSelectFile"));
      return;
    }
    const maxSizeBytes = 2048 * 1024;
    if (file.size > maxSizeBytes) {
      showErrorNotification(t("error.logoTooLarge"));
      return;
    }
    const defaultText2 = dropzone.dataset.defaultText || t("settings.logoUploadDefault");
    try {
      dropzone.innerHTML = "";
      const textEl = document.createElement("span");
      textEl.className = "workspace-logo-dropzone-text";
      textEl.textContent = `Uploading ${file.name}...`;
      dropzone.appendChild(textEl);
      dropzone.classList.add("workspace-logo-uploading");
      dropzone.setAttribute("aria-busy", "true");
      const reader = new FileReader();
      reader.onload = function(event2) {
        const dataUrl = event2.target && event2.target.result;
        if (!dataUrl) {
          showErrorNotification(t("error.imageReadFailed"));
          setDropzoneText(defaultText2);
          dropzone.classList.remove("workspace-logo-uploading");
          dropzone.removeAttribute("aria-busy");
          return;
        }
        const img = new Image();
        img.onload = function() {
          openCropModal(dataUrl, img);
          setDropzoneText(defaultText2);
          dropzone.classList.remove("workspace-logo-uploading");
          dropzone.removeAttribute("aria-busy");
        };
        img.onerror = function() {
          showErrorNotification(t("error.imageLoadFailed"));
          setDropzoneText(defaultText2);
          dropzone.classList.remove("workspace-logo-uploading");
          dropzone.removeAttribute("aria-busy");
        };
        img.src = dataUrl;
      };
      reader.onerror = function() {
        showErrorNotification(t("error.imageReadFailed"));
        setDropzoneText(defaultText2);
        dropzone.classList.remove("workspace-logo-uploading");
        dropzone.removeAttribute("aria-busy");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showErrorNotification(t("error.logoUploadFailed", { message: error.message }));
      setDropzoneText(defaultText2);
      dropzone.classList.remove("workspace-logo-uploading");
      dropzone.removeAttribute("aria-busy");
    }
  }
  applyDropzoneBaseStyles(dropzone);
  setDropzoneText(defaultText);
  refreshWorkspaceLogoUI();
  let dragDepth = 0;
  dropzone.addEventListener("dragenter", function(e) {
    e.preventDefault();
    dragDepth += 1;
    dropzone.classList.add("workspace-logo-dragover");
    setDropzoneDragoverStyles(dropzone, true);
  });
  dropzone.addEventListener("dragover", function(e) {
    e.preventDefault();
    dropzone.classList.add("workspace-logo-dragover");
    setDropzoneDragoverStyles(dropzone, true);
  });
  dropzone.addEventListener("dragleave", function(e) {
    e.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) {
      dropzone.classList.remove("workspace-logo-dragover");
      setDropzoneDragoverStyles(dropzone, false);
    }
  });
  dropzone.addEventListener("drop", function(e) {
    dragDepth = 0;
    dropzone.classList.remove("workspace-logo-dragover");
    setDropzoneDragoverStyles(dropzone, false);
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length > 0) {
      handleWorkspaceLogoFile(files[0], e);
    }
  });
  dropzone.addEventListener("dragend", function() {
    dragDepth = 0;
    dropzone.classList.remove("workspace-logo-dragover");
    setDropzoneDragoverStyles(dropzone, false);
  });
  dropzone.addEventListener("paste", function(e) {
    if (!e.clipboardData) return;
    const files = e.clipboardData.files;
    if (files && files.length > 0) {
      handleWorkspaceLogoFile(files[0], e);
    }
  });
  dropzone.addEventListener("click", function() {
    fileInput.click();
  });
  dropzone.addEventListener("keydown", function(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener("change", function(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleWorkspaceLogoFile(files[0], e);
    }
    fileInput.value = "";
  });
  if (clearButton) {
    clearButton.addEventListener("click", function(e) {
      e.preventDefault();
      workspaceLogoDraft.hasPendingChange = true;
      workspaceLogoDraft.dataUrl = null;
      if (fileInput) {
        fileInput.value = "";
      }
      refreshWorkspaceLogoUI();
      if (window.markSettingsDirtyIfNeeded) {
        window.markSettingsDirtyIfNeeded();
      }
    });
  }
  document.addEventListener("refresh-workspace-logo-ui", () => {
    refreshWorkspaceLogoUI();
  });
  function openCropModal(dataUrl, image, options = null) {
    const modal = document.getElementById("workspace-logo-crop-modal");
    const canvas = document.getElementById("crop-canvas");
    const ctx = canvas.getContext("2d");
    const titleEl = document.getElementById("crop-modal-title");
    const instructionsEl = modal?.querySelector(".crop-instructions");
    cropState.originalImage = image;
    cropState.originalDataUrl = dataUrl;
    cropState.canvas = canvas;
    cropState.ctx = ctx;
    cropState.onApply = options?.onApply || null;
    cropState.successMessage = options?.successMessage || null;
    cropState.shape = options?.shape || "square";
    cropState.outputMimeType = options?.outputMimeType || "image/jpeg";
    cropState.outputMaxSize = typeof options?.outputMaxSize === "number" ? options.outputMaxSize : null;
    if (titleEl) titleEl.textContent = options?.title || "Crop Image to Square";
    if (instructionsEl && options?.instructions) instructionsEl.textContent = options.instructions;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "crop-modal-title");
    modal.classList.add("active");
    requestAnimationFrame(() => {
      const containerMaxWidth = 600;
      const containerMaxHeight = window.innerHeight * 0.6;
      let displayWidth = image.width;
      let displayHeight = image.height;
      if (displayWidth > containerMaxWidth || displayHeight > containerMaxHeight) {
        const scale = Math.min(
          containerMaxWidth / displayWidth,
          containerMaxHeight / displayHeight
        );
        displayWidth = Math.floor(displayWidth * scale);
        displayHeight = Math.floor(displayHeight * scale);
      }
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, displayWidth, displayHeight);
      const minDimension = Math.min(displayWidth, displayHeight);
      const initialSize = Math.floor(minDimension * 0.8);
      cropState.selection = {
        x: Math.floor((displayWidth - initialSize) / 2),
        y: Math.floor((displayHeight - initialSize) / 2),
        size: initialSize
      };
      setupCropEventListeners();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateCropSelection();
        });
      });
    });
  }
  function closeCropModal() {
    const modal = document.getElementById("workspace-logo-crop-modal");
    modal.classList.remove("active");
    removeCropEventListeners();
    cropState = {
      originalImage: null,
      originalDataUrl: null,
      canvas: null,
      ctx: null,
      selection: { x: 0, y: 0, size: 0 },
      isDragging: false,
      isResizing: false,
      dragStartX: 0,
      dragStartY: 0,
      activeHandle: null,
      shape: "square",
      outputMimeType: "image/jpeg",
      outputMaxSize: null,
      onApply: null,
      successMessage: null
    };
  }
  function updateCropSelection() {
    const selection = document.getElementById("crop-selection");
    const canvas = cropState.canvas;
    if (!canvas || !selection) return;
    selection.dataset.shape = cropState.shape || "square";
    const canvasRect = canvas.getBoundingClientRect();
    const container = canvas.closest(".crop-canvas-container") || canvas.parentElement;
    const containerRect = container ? container.getBoundingClientRect() : canvasRect;
    const offsetX = canvasRect.left - containerRect.left;
    const offsetY = canvasRect.top - containerRect.top;
    const uniformScale = canvas.width / canvasRect.width;
    const displayX = cropState.selection.x / uniformScale;
    const displayY = cropState.selection.y / uniformScale;
    const displaySize = cropState.selection.size / uniformScale;
    selection.style.left = `${offsetX + displayX}px`;
    selection.style.top = `${offsetY + displayY}px`;
    selection.style.width = `${displaySize}px`;
    selection.style.height = `${displaySize}px`;
    updateCropInfo();
  }
  function updateCropInfo() {
    const dimensionsEl = document.getElementById("crop-dimensions");
    const sizeEl = document.getElementById("crop-size-estimate");
    if (!dimensionsEl || !sizeEl) return;
    const canvas = cropState.canvas;
    const image = cropState.originalImage;
    if (!canvas || !image) return;
    const selectionEl = document.getElementById("crop-selection");
    const canvasRect = canvas.getBoundingClientRect();
    const selectionRect = selectionEl?.getBoundingClientRect?.();
    let actualSize = 0;
    if (selectionRect && canvasRect.width > 0 && canvasRect.height > 0) {
      const scaleX = image.width / canvasRect.width;
      const scaleY = image.height / canvasRect.height;
      const cropSizeX = selectionRect.width * scaleX;
      const cropSizeY = selectionRect.height * scaleY;
      actualSize = Math.max(1, Math.floor(Math.min(cropSizeX, cropSizeY)));
    } else {
      const scale = image.width / canvas.width;
      actualSize = Math.max(1, Math.floor(cropState.selection.size * scale));
    }
    dimensionsEl.textContent = `${actualSize} \xD7 ${actualSize} px`;
    const estimatedBytes = actualSize * actualSize * 3;
    const estimatedKB = Math.floor(estimatedBytes / 1024);
    sizeEl.textContent = `~${estimatedKB} KB`;
    const maxSizeKB = 2048;
    sizeEl.classList.remove("size-warning", "size-error");
    if (estimatedKB > maxSizeKB) {
      sizeEl.classList.add("size-error");
    } else if (estimatedKB > maxSizeKB * 0.8) {
      sizeEl.classList.add("size-warning");
    }
  }
  async function applyCrop() {
    try {
      const canvas = cropState.canvas;
      const image = cropState.originalImage;
      const selection = cropState.selection;
      if (!canvas || !image) {
        showErrorNotification(t("error.cropInvalid"));
        return;
      }
      const canvasRect = canvas.getBoundingClientRect();
      const selectionEl = document.getElementById("crop-selection");
      const selectionRect = selectionEl?.getBoundingClientRect?.();
      let cropX = 0;
      let cropY = 0;
      let cropSize = 0;
      if (selectionRect && canvasRect.width > 0 && canvasRect.height > 0) {
        const centerXRatio = (selectionRect.left + selectionRect.width / 2 - canvasRect.left) / canvasRect.width;
        const centerYRatio = (selectionRect.top + selectionRect.height / 2 - canvasRect.top) / canvasRect.height;
        const centerXOrig = centerXRatio * image.width;
        const centerYOrig = centerYRatio * image.height;
        const cropSizeX = selectionRect.width / canvasRect.width * image.width;
        const cropSizeY = selectionRect.height / canvasRect.height * image.height;
        cropSize = Math.max(1, Math.floor(Math.min(cropSizeX, cropSizeY)));
        cropX = Math.floor(centerXOrig - cropSize / 2);
        cropY = Math.floor(centerYOrig - cropSize / 2);
      } else {
        const scaleX = image.width / canvas.width;
        const scaleY = image.height / canvas.height;
        cropSize = Math.max(1, Math.floor(selection.size * Math.min(scaleX, scaleY)));
        cropX = Math.floor(selection.x * scaleX);
        cropY = Math.floor(selection.y * scaleY);
      }
      cropX = Math.max(0, Math.min(cropX, image.width - cropSize));
      cropY = Math.max(0, Math.min(cropY, image.height - cropSize));
      const maxSizeBytes = 2048 * 1024;
      const maxAttempts = 6;
      const renderOutputDataUrl = (targetSize2, quality2) => {
        const outCanvas = document.createElement("canvas");
        outCanvas.width = targetSize2;
        outCanvas.height = targetSize2;
        const outCtx = outCanvas.getContext("2d");
        if (!outCtx) {
          throw new Error("Canvas context unavailable");
        }
        const shape = cropState.shape || "square";
        if (shape === "circle") {
          outCtx.clearRect(0, 0, targetSize2, targetSize2);
          outCtx.save();
          outCtx.beginPath();
          outCtx.arc(targetSize2 / 2, targetSize2 / 2, targetSize2 / 2, 0, Math.PI * 2);
          outCtx.closePath();
          outCtx.clip();
        }
        outCtx.drawImage(
          image,
          cropX,
          cropY,
          cropSize,
          cropSize,
          // Source rectangle
          0,
          0,
          targetSize2,
          targetSize2
          // Destination rectangle
        );
        if (shape === "circle") {
          outCtx.restore();
        }
        const mimeType = cropState.outputMimeType || (shape === "circle" ? "image/png" : "image/jpeg");
        if (mimeType === "image/jpeg" || mimeType === "image/webp") {
          return outCanvas.toDataURL(mimeType, quality2);
        }
        return outCanvas.toDataURL(mimeType);
      };
      let targetSize = cropState.outputMaxSize ? Math.min(cropSize, cropState.outputMaxSize) : cropSize;
      targetSize = Math.max(50, Math.floor(targetSize));
      let attempts = 0;
      let quality = 0.92;
      let croppedDataUrl = renderOutputDataUrl(targetSize, quality);
      while (croppedDataUrl.length > maxSizeBytes * 1.37 && attempts < maxAttempts) {
        const shape = cropState.shape || "square";
        const mimeType = cropState.outputMimeType || (shape === "circle" ? "image/png" : "image/jpeg");
        if (mimeType === "image/jpeg" || mimeType === "image/webp") {
          quality = Math.max(0.5, quality - 0.1);
        } else {
          targetSize = Math.floor(targetSize * 0.85);
        }
        croppedDataUrl = renderOutputDataUrl(targetSize, quality);
        attempts++;
      }
      if (croppedDataUrl.length > maxSizeBytes * 1.37) {
        showErrorNotification(t("error.cropTooLarge"));
        return;
      }
      if (typeof cropState.onApply === "function") {
        cropState.onApply(croppedDataUrl);
        if (window.markSettingsDirtyIfNeeded) {
          window.markSettingsDirtyIfNeeded();
        }
        closeCropModal();
        showSuccessNotification(cropState.successMessage || t("success.cropApplied"));
      } else {
        workspaceLogoDraft.hasPendingChange = true;
        workspaceLogoDraft.dataUrl = croppedDataUrl;
        refreshWorkspaceLogoUI();
        if (window.markSettingsDirtyIfNeeded) {
          window.markSettingsDirtyIfNeeded();
        }
        closeCropModal();
        showSuccessNotification(t("success.logoCroppedApplied"));
      }
    } catch (error) {
      showErrorNotification(t("error.cropFailed", { message: error.message }));
      console.error("Crop error:", error);
    }
  }
  function setupUserAvatarControls() {
    const dropzone2 = document.getElementById("user-avatar-dropzone");
    const fileInput2 = document.getElementById("user-avatar-input");
    const clearButton2 = document.getElementById("user-avatar-clear-btn");
    if (!dropzone2 || !fileInput2) return;
    const defaultText2 = t("settings.avatarUploadDefault");
    dropzone2.dataset.defaultText = defaultText2;
    dropzone2.dataset.changeText = t("settings.avatarUploadChange");
    function setDropzoneText2(text) {
      dropzone2.innerHTML = "";
      const textEl = document.createElement("span");
      textEl.className = "workspace-logo-dropzone-text";
      textEl.textContent = text;
      dropzone2.appendChild(textEl);
    }
    function applyDropzoneBaseStyles2(el) {
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.gap = "10px";
      el.style.padding = "12px 16px";
      el.style.textAlign = "center";
      el.style.cursor = "pointer";
      el.style.userSelect = "none";
      el.style.minHeight = "48px";
      el.style.border = "2px dashed var(--border)";
      el.style.borderRadius = "10px";
      el.style.background = "var(--bg-tertiary)";
      el.style.boxShadow = "none";
      el.style.color = "var(--text-muted)";
      el.style.fontWeight = "500";
      el.style.transition = "border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease";
    }
    function setDropzoneDragoverStyles2(el, isActive) {
      if (isActive) {
        el.style.borderColor = "var(--accent-blue)";
        el.style.background = "rgba(59, 130, 246, 0.08)";
        el.style.boxShadow = "0 0 0 1px var(--accent-blue)";
      } else {
        el.style.border = "2px dashed var(--border)";
        el.style.background = "var(--bg-tertiary)";
        el.style.boxShadow = "none";
      }
    }
    async function handleAvatarFile(file, event) {
      if (!file) return;
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      if (!file.type.startsWith("image/")) {
        showErrorNotification(t("error.avatarSelectFile"));
        return;
      }
      const maxSizeBytes = 2048 * 1024;
      if (file.size > maxSizeBytes) {
        showErrorNotification(t("error.avatarTooLarge"));
        return;
      }
      const defaultText3 = dropzone2.dataset.defaultText || t("settings.avatarUploadDefault");
      try {
        dropzone2.innerHTML = "";
        const textEl = document.createElement("span");
        textEl.className = "workspace-logo-dropzone-text";
        textEl.textContent = `Uploading ${file.name}...`;
        dropzone2.appendChild(textEl);
        dropzone2.setAttribute("aria-busy", "true");
        const reader = new FileReader();
        const dataUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const img = new Image();
        img.onload = () => {
          openCropModal(dataUrl, img, {
            title: "Crop Avatar",
            instructions: "Drag to adjust the crop area. Your avatar will be displayed as a circle.",
            shape: "circle",
            outputMimeType: "image/png",
            outputMaxSize: 512,
            successMessage: "Avatar cropped and applied successfully!",
            onApply: (croppedDataUrl) => {
              avatarDraft.hasPendingChange = true;
              avatarDraft.dataUrl = croppedDataUrl;
              refreshUserAvatarSettingsUI();
            }
          });
        };
        img.onerror = () => {
          showErrorNotification(t("error.imageLoadFailed"));
        };
        img.src = dataUrl;
      } catch (err) {
        console.error("Avatar upload error:", err);
        showErrorNotification(t("error.avatarUploadFailed"));
      } finally {
        dropzone2.setAttribute("aria-busy", "false");
        setDropzoneText2(defaultText3);
      }
    }
    applyDropzoneBaseStyles2(dropzone2);
    setDropzoneText2(defaultText2);
    dropzone2.addEventListener("click", () => fileInput2.click());
    dropzone2.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fileInput2.click();
      }
    });
    fileInput2.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      handleAvatarFile(file, e);
      fileInput2.value = "";
    });
    dropzone2.addEventListener("dragenter", (e) => {
      e.preventDefault();
      setDropzoneDragoverStyles2(dropzone2, true);
    });
    dropzone2.addEventListener("dragover", (e) => {
      e.preventDefault();
      setDropzoneDragoverStyles2(dropzone2, true);
    });
    dropzone2.addEventListener("dragleave", (e) => {
      e.preventDefault();
      setDropzoneDragoverStyles2(dropzone2, false);
    });
    dropzone2.addEventListener("drop", (e) => {
      e.preventDefault();
      setDropzoneDragoverStyles2(dropzone2, false);
      const file = e.dataTransfer?.files?.[0];
      handleAvatarFile(file, e);
    });
    if (clearButton2 && !clearButton2.__avatarClearBound) {
      clearButton2.__avatarClearBound = true;
      clearButton2.addEventListener("click", () => {
        avatarDraft.hasPendingChange = true;
        avatarDraft.dataUrl = null;
        refreshUserAvatarSettingsUI();
        if (window.markSettingsDirtyIfNeeded) {
          window.markSettingsDirtyIfNeeded();
        }
      });
    }
    refreshUserAvatarSettingsUI();
  }
  function setupCropEventListeners() {
    const selection = document.getElementById("crop-selection");
    const handles = document.querySelectorAll(".crop-handle");
    if (selection) {
      selection.addEventListener("mousedown", onSelectionMouseDown);
      selection.addEventListener("touchstart", onSelectionTouchStart);
    }
    handles.forEach((handle) => {
      handle.addEventListener("mousedown", onHandleMouseDown);
      handle.addEventListener("touchstart", onHandleTouchStart);
    });
    document.addEventListener("mousemove", onDocumentMouseMove);
    document.addEventListener("mouseup", onDocumentMouseUp);
    document.addEventListener("touchmove", onDocumentTouchMove);
    document.addEventListener("touchend", onDocumentTouchEnd);
    document.addEventListener("keydown", onCropModalKeyDown);
  }
  function removeCropEventListeners() {
    const selection = document.getElementById("crop-selection");
    const handles = document.querySelectorAll(".crop-handle");
    if (selection) {
      selection.removeEventListener("mousedown", onSelectionMouseDown);
      selection.removeEventListener("touchstart", onSelectionTouchStart);
    }
    handles.forEach((handle) => {
      handle.removeEventListener("mousedown", onHandleMouseDown);
      handle.removeEventListener("touchstart", onHandleTouchStart);
    });
    document.removeEventListener("mousemove", onDocumentMouseMove);
    document.removeEventListener("mouseup", onDocumentMouseUp);
    document.removeEventListener("touchmove", onDocumentTouchMove);
    document.removeEventListener("touchend", onDocumentTouchEnd);
    document.removeEventListener("keydown", onCropModalKeyDown);
  }
  function onSelectionMouseDown(e) {
    if (e.target.classList.contains("crop-handle")) return;
    e.preventDefault();
    e.stopPropagation();
    cropState.isDragging = true;
    cropState.dragStartX = e.clientX;
    cropState.dragStartY = e.clientY;
  }
  function onHandleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    cropState.isResizing = true;
    cropState.dragStartX = e.clientX;
    cropState.dragStartY = e.clientY;
    if (e.target.classList.contains("crop-handle-nw")) {
      cropState.activeHandle = "nw";
    } else if (e.target.classList.contains("crop-handle-ne")) {
      cropState.activeHandle = "ne";
    } else if (e.target.classList.contains("crop-handle-sw")) {
      cropState.activeHandle = "sw";
    } else if (e.target.classList.contains("crop-handle-se")) {
      cropState.activeHandle = "se";
    }
  }
  function onDocumentMouseMove(e) {
    if (!cropState.isDragging && !cropState.isResizing) return;
    e.preventDefault();
    const canvas = cropState.canvas;
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const uniformScale = canvas.width / canvasRect.width;
    const deltaX = (e.clientX - cropState.dragStartX) * uniformScale;
    const deltaY = (e.clientY - cropState.dragStartY) * uniformScale;
    if (cropState.isDragging) {
      let newX = cropState.selection.x + deltaX;
      let newY = cropState.selection.y + deltaY;
      newX = Math.max(0, Math.min(newX, canvas.width - cropState.selection.size));
      newY = Math.max(0, Math.min(newY, canvas.height - cropState.selection.size));
      cropState.selection.x = newX;
      cropState.selection.y = newY;
    } else if (cropState.isResizing) {
      const dominant = (a, b) => Math.abs(a) > Math.abs(b) ? a : b;
      const minSize = 50;
      const current = cropState.selection;
      let fixedX = 0;
      let fixedY = 0;
      let resizeDelta = 0;
      let maxSize = 0;
      switch (cropState.activeHandle) {
        case "se":
          resizeDelta = dominant(deltaX, deltaY);
          fixedX = current.x;
          fixedY = current.y;
          maxSize = Math.min(canvas.width - fixedX, canvas.height - fixedY);
          break;
        case "nw":
          resizeDelta = dominant(-deltaX, -deltaY);
          fixedX = current.x + current.size;
          fixedY = current.y + current.size;
          maxSize = Math.min(fixedX, fixedY);
          break;
        case "ne":
          resizeDelta = dominant(deltaX, -deltaY);
          fixedX = current.x;
          fixedY = current.y + current.size;
          maxSize = Math.min(canvas.width - fixedX, fixedY);
          break;
        case "sw":
          resizeDelta = dominant(-deltaX, deltaY);
          fixedX = current.x + current.size;
          fixedY = current.y;
          maxSize = Math.min(fixedX, canvas.height - fixedY);
          break;
      }
      let newSize = current.size + resizeDelta;
      newSize = Math.max(minSize, Math.min(newSize, maxSize));
      let newX = current.x;
      let newY = current.y;
      switch (cropState.activeHandle) {
        case "se":
          newX = fixedX;
          newY = fixedY;
          break;
        case "nw":
          newX = fixedX - newSize;
          newY = fixedY - newSize;
          break;
        case "ne":
          newX = fixedX;
          newY = fixedY - newSize;
          break;
        case "sw":
          newX = fixedX - newSize;
          newY = fixedY;
          break;
      }
      cropState.selection.size = newSize;
      cropState.selection.x = newX;
      cropState.selection.y = newY;
    }
    updateCropSelection();
    cropState.dragStartX = e.clientX;
    cropState.dragStartY = e.clientY;
  }
  function onDocumentMouseUp(e) {
    if (cropState.isDragging || cropState.isResizing) {
      e.preventDefault();
      cropState.isDragging = false;
      cropState.isResizing = false;
      cropState.activeHandle = null;
    }
  }
  function onSelectionTouchStart(e) {
    if (e.target.classList.contains("crop-handle")) return;
    e.preventDefault();
    const touch = e.touches[0];
    cropState.isDragging = true;
    cropState.dragStartX = touch.clientX;
    cropState.dragStartY = touch.clientY;
  }
  function onHandleTouchStart(e) {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    cropState.isResizing = true;
    cropState.dragStartX = touch.clientX;
    cropState.dragStartY = touch.clientY;
    if (e.target.classList.contains("crop-handle-nw")) {
      cropState.activeHandle = "nw";
    } else if (e.target.classList.contains("crop-handle-ne")) {
      cropState.activeHandle = "ne";
    } else if (e.target.classList.contains("crop-handle-sw")) {
      cropState.activeHandle = "sw";
    } else if (e.target.classList.contains("crop-handle-se")) {
      cropState.activeHandle = "se";
    }
  }
  function onDocumentTouchMove(e) {
    if (!cropState.isDragging && !cropState.isResizing) return;
    e.preventDefault();
    const touch = e.touches[0];
    const fakeEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      preventDefault: () => {
      }
    };
    onDocumentMouseMove(fakeEvent);
  }
  function onDocumentTouchEnd(e) {
    if (cropState.isDragging || cropState.isResizing) {
      e.preventDefault();
      cropState.isDragging = false;
      cropState.isResizing = false;
      cropState.activeHandle = null;
    }
  }
  function onCropModalKeyDown(e) {
    if (e.key === "Escape") {
      closeCropModal();
    }
  }
  window.openCropModal = openCropModal;
  window.closeCropModal = closeCropModal;
  window.applyCrop = applyCrop;
  setupUserAvatarControls();
}
setupWorkspaceLogoControls();
window.initializeApp = init;
window.setupUserMenus = setupUserMenus;
window.addEventListener("beforeunload", (e) => {
  if (feedbackLocalStorageTimer) {
    clearTimeout(feedbackLocalStorageTimer);
    persistFeedbackDeltaQueue();
  }
  if (pendingSaves > 0) {
    e.preventDefault();
    e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
    return e.returnValue;
  }
});
document.addEventListener("DOMContentLoaded", function() {
  const taskModal = document.getElementById("task-modal");
  if (!taskModal) return;
  const titleInput = taskModal.querySelector('#task-form input[name="title"]');
  if (titleInput) {
    titleInput.addEventListener("blur", function(e) {
      const form = taskModal.querySelector("#task-form");
      if (form && form.dataset.editingTaskId) {
        updateTaskField2("title", e.target.value);
      }
    });
  }
  const descEditor = taskModal.querySelector("#task-description-editor");
  const descHidden = taskModal.querySelector("#task-description-hidden");
  if (descEditor && descHidden) {
    let originalDescriptionHTML = "";
    descEditor.addEventListener("focus", function() {
      originalDescriptionHTML = descEditor.innerHTML;
    });
    descEditor.addEventListener("input", function() {
      descHidden.value = descEditor.innerHTML;
    });
    descEditor.addEventListener("blur", function() {
      const form = taskModal.querySelector("#task-form");
      if (form && form.dataset.editingTaskId) {
        if (descEditor.innerHTML !== originalDescriptionHTML) {
          updateTaskField2("description", descEditor.innerHTML);
        }
      }
    });
  }
});
var ignoreNextOutsideColorClick = false;
document.addEventListener("click", function(e) {
  if (!e.target.closest(".color-picker-container")) {
    if (ignoreNextOutsideColorClick) {
      ignoreNextOutsideColorClick = false;
      return;
    }
    document.querySelectorAll(".color-picker-dropdown").forEach((picker) => {
      picker.style.display = "none";
    });
  }
});
async function submitTaskForm() {
  const form = document.getElementById("task-form");
  const editingTaskId = form.dataset.editingTaskId;
  const submitTimer = debugTimeStart("tasks", "submit", {
    editing: !!editingTaskId,
    taskCount: tasks.length
  });
  const title = form.querySelector('input[name="title"]').value;
  let description = document.getElementById("task-description-hidden").value;
  description = autoLinkifyDescription(description);
  const projectIdRaw = form.querySelector('input[name="projectId"]').value || (form.querySelector('select[name="projectId"]') ? form.querySelector('select[name="projectId"]').value : "");
  const status = document.getElementById("hidden-status").value || "backlog";
  const priority = form.querySelector("#hidden-priority").value || "medium";
  const startRaw = (form.querySelector('input[name="startDate"]')?.value || "").trim();
  const startISO = startRaw === "" ? "" : startRaw;
  const endRaw = (form.querySelector('input[name="endDate"]')?.value || "").trim();
  const endISO = endRaw === "" ? "" : endRaw;
  if (editingTaskId) {
    const oldTask = tasks.find((t2) => t2.id === parseInt(editingTaskId, 10));
    const oldTaskCopy = oldTask ? JSON.parse(JSON.stringify(oldTask)) : null;
    const result = updateTask(parseInt(editingTaskId, 10), { title, description, projectId: projectIdRaw, startDate: startISO, endDate: endISO, priority, status }, tasks);
    if (result.task) {
      if (window.historyService && oldTaskCopy) {
        window.historyService.recordTaskUpdated(oldTaskCopy, result.task);
      }
      const oldProjectId = result.oldProjectId;
      tasks = result.tasks;
      const t2 = result.task;
      if (oldProjectId !== t2.projectId) {
        if (oldProjectId) {
          touchProjectUpdatedAt(oldProjectId);
          recordProjectTaskLinkChange(oldProjectId, "removed", t2);
        }
        if (t2.projectId) {
          touchProjectUpdatedAt(t2.projectId);
          recordProjectTaskLinkChange(t2.projectId, "added", t2);
        }
        saveProjects2().catch(() => {
        });
      }
      closeModal("task-modal");
      if (document.getElementById("project-details").classList.contains("active")) {
        const displayedProjectId = oldProjectId || t2.projectId;
        if (displayedProjectId) {
          showProjectDetails(displayedProjectId);
        }
      } else if (document.getElementById("projects").classList.contains("active")) {
        appState.projectsSortedView = null;
        renderProjects();
        updateCounts();
      }
      saveTasks2().catch((err) => {
        console.error("Failed to save task:", err);
        showErrorNotification(t2("error.saveChangesFailed"));
      });
    } else {
    }
  } else {
    const result = createTask({ title, description, projectId: projectIdRaw, startDate: startISO, endDate: endISO, priority, status, tags: window.tempTags ? [...window.tempTags] : [] }, tasks, taskCounter, tempAttachments);
    tasks = result.tasks;
    taskCounter = result.taskCounter;
    const newTask = result.task;
    tempAttachments = [];
    window.tempTags = [];
    if (window.historyService) {
      window.historyService.recordTaskCreated(newTask);
    }
    if (newTask && newTask.projectId) {
      touchProjectUpdatedAt(newTask.projectId);
      recordProjectTaskLinkChange(newTask.projectId, "added", newTask);
      saveProjects2().catch(() => {
      });
    }
    populateProjectOptions();
    populateTagOptions();
    updateNoDateOptionVisibility();
    closeModal("task-modal");
    if (newTask.projectId && document.getElementById("project-details").classList.contains("active")) {
      showProjectDetails(newTask.projectId);
      updateCounts();
    } else if (document.getElementById("projects").classList.contains("active")) {
      appState.projectsSortedView = null;
      renderProjects();
      updateCounts();
    }
    saveTasks2().catch((err) => {
      console.error("Failed to save task:", err);
      showErrorNotification(t("error.saveChangesFailed"));
    });
  }
  closeModal("task-modal");
  render();
  const calendarView = document.getElementById("calendar-view");
  if (calendarView) {
    renderCalendar();
  }
  renderActivityFeed();
  saveTasks2().catch((err) => {
    console.error("Failed to save task:", err);
    showErrorNotification(t("error.saveChangesFailed"));
  });
  debugTimeEnd("tasks", submitTimer, {
    taskCount: tasks.length,
    projectCount: projects.length
  });
}
document.getElementById("task-form").addEventListener("submit", function(e) {
  e.preventDefault();
  e.stopPropagation();
  submitTaskForm();
});
function setupStatusDropdown() {
  if (document.body.hasAttribute("data-status-dropdown-initialized")) {
    return;
  }
  document.body.setAttribute("data-status-dropdown-initialized", "true");
  document.addEventListener("click", handleStatusDropdown);
}
function handleStatusDropdown(e) {
  if (e.target.closest("#task-options-btn")) {
    e.preventDefault();
    e.stopPropagation();
    const menu2 = document.getElementById("options-menu");
    if (menu2) {
      menu2.style.display = menu2.style.display === "block" ? "none" : "block";
    }
    return;
  }
  const menu = document.getElementById("options-menu");
  if (menu && !e.target.closest("#task-options-btn") && !e.target.closest("#options-menu")) {
    menu.style.display = "none";
  }
  if (e.target.closest("#status-current")) {
    e.preventDefault();
    e.stopPropagation();
    const dropdown = e.target.closest(".status-dropdown");
    const isActive = dropdown.classList.contains("active");
    document.querySelectorAll(".status-dropdown.active").forEach((d) => d.classList.remove("active"));
    if (!isActive) {
      dropdown.classList.add("active");
      const hiddenStatus = document.getElementById("hidden-status");
      if (hiddenStatus) {
        updateStatusOptions(hiddenStatus.value);
      }
    }
    return;
  }
  if (e.target.closest(".status-option")) {
    e.preventDefault();
    e.stopPropagation();
    const option = e.target.closest(".status-option");
    const status = option.dataset.status;
    const statusBadge = option.querySelector(".status-badge");
    const statusText = statusBadge.textContent.trim();
    const currentBtn = document.getElementById("status-current");
    const hiddenStatus = document.getElementById("hidden-status");
    if (currentBtn && hiddenStatus) {
      const currentBadge = currentBtn.querySelector(".status-badge");
      if (currentBadge) {
        currentBadge.className = `status-badge ${status}`;
        currentBadge.textContent = statusText;
      }
      hiddenStatus.value = status;
      updateTaskField2("status", status);
    }
    const dropdown = option.closest(".status-dropdown");
    if (dropdown) dropdown.classList.remove("active");
    setTimeout(() => updateStatusOptions(status), 100);
    return;
  }
  const activeDropdowns = document.querySelectorAll(
    ".status-dropdown.active"
  );
  activeDropdowns.forEach((dropdown) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("active");
    }
  });
}
function setupPriorityDropdown() {
  if (document.body.hasAttribute("data-priority-dropdown-initialized")) {
    return;
  }
  document.body.setAttribute("data-priority-dropdown-initialized", "true");
  document.addEventListener("click", handlePriorityDropdown);
}
function handlePriorityDropdown(e) {
  if (e.target.closest("#priority-current")) {
    e.preventDefault();
    e.stopPropagation();
    const dropdown = e.target.closest(".priority-dropdown");
    const isActive = dropdown.classList.contains("active");
    document.querySelectorAll(".priority-dropdown.active").forEach((d) => d.classList.remove("active"));
    if (!isActive) {
      dropdown.classList.add("active");
      const hiddenPriority = document.getElementById("hidden-priority");
      if (hiddenPriority) {
        updatePriorityOptions(hiddenPriority.value);
      }
    }
    return;
  }
  if (e.target.closest(".priority-option")) {
    e.preventDefault();
    e.stopPropagation();
    const option = e.target.closest(".priority-option");
    const priority = option.dataset.priority;
    const priorityText = option.textContent.trim();
    const currentBtn = document.getElementById("priority-current");
    const hiddenPriority = document.getElementById("hidden-priority");
    if (currentBtn && hiddenPriority) {
      currentBtn.innerHTML = `<span class="priority-dot ${priority}"></span> ${priorityText} <span class="dropdown-arrow">\u25BC</span>`;
      hiddenPriority.value = priority;
      updateTaskField2("priority", priority);
    }
    const dropdown = option.closest(".priority-dropdown");
    if (dropdown) dropdown.classList.remove("active");
    setTimeout(() => updatePriorityOptions(priority), 100);
    return;
  }
  const activePriorityDropdowns = document.querySelectorAll(
    ".priority-dropdown.active"
  );
  activePriorityDropdowns.forEach((dropdown) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("active");
    }
  });
}
function updatePriorityOptions(selectedPriority) {
  const priorityOptions = document.getElementById("priority-options");
  if (!priorityOptions) return;
  const allPriorities = PRIORITY_OPTIONS.map((priority) => ({
    ...priority,
    label: getPriorityLabel(priority.value)
  }));
  const availableOptions = allPriorities.filter((p) => p.value !== selectedPriority);
  priorityOptions.innerHTML = availableOptions.map(
    (priority) => `<div class="priority-option" data-priority="${priority.value}">
            <span class="priority-dot ${priority.value}"></span> ${priority.label}
        </div>`
  ).join("");
}
function updateStatusOptions(selectedStatus) {
  const statusOptions = document.getElementById("status-options");
  if (!statusOptions) return;
  const allStatuses = [
    { value: "backlog", label: getStatusLabel("backlog") },
    { value: "todo", label: getStatusLabel("todo") },
    { value: "progress", label: getStatusLabel("progress") },
    { value: "review", label: getStatusLabel("review") },
    { value: "done", label: getStatusLabel("done") }
  ];
  let enabledStatuses = allStatuses;
  if (window.enableReviewStatus === false) {
    enabledStatuses = allStatuses.filter((s) => s.value !== "review");
  }
  const availableOptions = enabledStatuses.filter((s) => s.value !== selectedStatus);
  statusOptions.innerHTML = availableOptions.map(
    (status) => `<div class="status-option" data-status="${status.value}">
            <span class="status-badge ${status.value}">${status.label}</span>
        </div>`
  ).join("");
}
function setupProjectDropdown() {
  if (document.body.hasAttribute("data-project-dropdown-initialized")) {
    return;
  }
  document.body.setAttribute("data-project-dropdown-initialized", "true");
  document.addEventListener("click", handleProjectDropdown);
}
function handleProjectDropdown(e) {
  if (e.target.closest("#project-current")) {
    e.preventDefault();
    e.stopPropagation();
    const dropdown = e.target.closest(".project-dropdown");
    const isActive = dropdown.classList.contains("active");
    document.querySelectorAll(".project-dropdown.active").forEach((d) => d.classList.remove("active"));
    if (!isActive) {
      dropdown.classList.add("active");
      showProjectDropdownPortal(dropdown);
    }
    return;
  }
  if (e.target.closest(".project-option")) {
    e.preventDefault();
    e.stopPropagation();
    const option = e.target.closest(".project-option");
    const projectId = option.dataset.projectId;
    const projectText = option.textContent.trim();
    const currentBtn = document.getElementById("project-current");
    const hiddenProject = document.getElementById("hidden-project");
    if (currentBtn && hiddenProject) {
      const projectTextSpan = currentBtn.querySelector(".project-text");
      if (projectTextSpan) {
        if (projectId) {
          const colorSquare = `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor(parseInt(projectId))}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>`;
          projectTextSpan.innerHTML = colorSquare + escapeHtml(projectText);
        } else {
          projectTextSpan.textContent = projectText;
        }
      }
      hiddenProject.value = projectId;
      updateTaskField2("projectId", projectId);
      updateTaskProjectOpenBtn(projectId);
    }
    const dropdown = option.closest(".project-dropdown");
    if (dropdown) dropdown.classList.remove("active");
    hideProjectDropdownPortal();
    return;
  }
  const activeDropdowns = document.querySelectorAll(".project-dropdown.active");
  if (activeDropdowns.length > 0 && !e.target.closest(".project-dropdown")) {
    activeDropdowns.forEach((d) => d.classList.remove("active"));
    hideProjectDropdownPortal();
  }
}
function updateTaskProjectOpenBtn(projectId) {
  const btn = document.getElementById("task-project-open-btn");
  if (!btn) return;
  btn.style.display = projectId ? "inline-flex" : "none";
}
function openSelectedProjectFromTask() {
  const hiddenProject = document.getElementById("hidden-project");
  if (!hiddenProject || !hiddenProject.value) return;
  const projectId = parseInt(hiddenProject.value, 10);
  if (!projectId) return;
  closeModal("task-modal");
  showProjectDetails(projectId, "projects");
}
function populateProjectDropdownOptions(dropdownEl) {
  const projectOptions = dropdownEl ? dropdownEl.querySelector(".project-options") : null;
  const hiddenProject = document.getElementById("hidden-project");
  const selectedId = hiddenProject ? hiddenProject.value || "" : "";
  let optionsHTML = selectedId ? `<div class="project-option" data-project-id="">${t("tasks.project.selectPlaceholder")}</div>` : "";
  if (projects && projects.length > 0) {
    optionsHTML += projects.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", void 0, { sensitivity: "base" })).filter((project) => selectedId === "" || String(project.id) !== String(selectedId)).map((project) => {
      const colorSquare = `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor(project.id)}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>`;
      return `<div class="project-option" data-project-id="${project.id}">${colorSquare}${escapeHtml(project.name)}</div>`;
    }).join("");
  }
  if (projectOptions) projectOptions.innerHTML = optionsHTML;
  return optionsHTML;
}
var projectPortalEl = null;
var projectPortalAnchor = null;
var projectPortalScrollParents = [];
function showProjectDropdownPortal(dropdownEl) {
  const optionsHTML = populateProjectDropdownOptions(dropdownEl) || "";
  if (!projectPortalEl) {
    projectPortalEl = document.createElement("div");
    projectPortalEl.className = "project-options-portal";
    document.body.appendChild(projectPortalEl);
  }
  projectPortalEl.innerHTML = `
        <div class="project-portal-search">
            <input type="text" class="form-input" id="project-portal-search-input" placeholder="Search projects..." autocomplete="off" />
        </div>
        <div class="project-portal-options">${optionsHTML}</div>
    `;
  projectPortalEl.style.display = "block";
  const button = dropdownEl.querySelector("#project-current");
  projectPortalAnchor = button;
  positionProjectPortal(button, projectPortalEl);
  requestAnimationFrame(() => positionProjectPortal(button, projectPortalEl));
  projectPortalEl.addEventListener("click", (evt) => {
    evt.stopPropagation();
    const opt = evt.target.closest(".project-option");
    if (!opt) return;
    const projectId = opt.dataset.projectId;
    const projectText = opt.textContent.trim();
    const currentBtn = document.getElementById("project-current");
    const hiddenProject = document.getElementById("hidden-project");
    if (currentBtn && hiddenProject) {
      const projectTextSpan = currentBtn.querySelector(".project-text");
      if (projectTextSpan) {
        if (projectId) {
          const colorSquare = `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor(parseInt(projectId))}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>`;
          projectTextSpan.innerHTML = colorSquare + escapeHtml(projectText);
        } else {
          projectTextSpan.textContent = projectText;
        }
      }
      hiddenProject.value = projectId;
      updateTaskField2("projectId", projectId);
      updateTaskProjectOpenBtn(projectId);
    }
    const dd = button.closest(".project-dropdown");
    if (dd) dd.classList.remove("active");
    hideProjectDropdownPortal();
  }, { once: true });
  const searchInput = projectPortalEl.querySelector("#project-portal-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", () => filterProjectPortalList(searchInput.value));
    setTimeout(() => searchInput.focus(), 0);
  }
  window.addEventListener("scroll", handleProjectPortalClose, true);
  window.addEventListener("resize", handleProjectPortalClose, true);
  document.addEventListener("keydown", handleProjectPortalEsc, true);
  const inlineOptions = dropdownEl.querySelector(".project-options");
  if (inlineOptions) inlineOptions.style.display = "none";
  attachScrollListeners(button);
}
function positionProjectPortal(button, portal) {
  const rect = button.getBoundingClientRect();
  portal.style.width = `${rect.width}px`;
  const viewportH = window.innerHeight;
  const portalHeight = Math.min(portal.scrollHeight, 200);
  const spaceBelow = viewportH - rect.bottom;
  const showAbove = spaceBelow < portalHeight + 12;
  const top = showAbove ? Math.max(8, rect.top - portalHeight - 4) : rect.bottom + 4;
  const viewportW = window.innerWidth;
  const portalWidth = portal.getBoundingClientRect().width || rect.width;
  const desiredLeft = rect.left;
  const clampedLeft = Math.min(
    Math.max(8, desiredLeft),
    Math.max(8, viewportW - portalWidth - 8)
  );
  portal.style.left = `${clampedLeft}px`;
  portal.style.top = `${top}px`;
}
function hideProjectDropdownPortal() {
  if (projectPortalEl) {
    projectPortalEl.style.display = "none";
    projectPortalEl.innerHTML = "";
  }
  document.querySelectorAll(".project-dropdown .project-options").forEach((el) => {
    el.style.display = "";
  });
  window.removeEventListener("scroll", handleProjectPortalClose, true);
  window.removeEventListener("resize", handleProjectPortalClose, true);
  document.removeEventListener("keydown", handleProjectPortalEsc, true);
  projectPortalAnchor = null;
  detachScrollListeners();
}
function handleProjectPortalClose() {
  if (!projectPortalAnchor || !projectPortalEl || projectPortalEl.style.display === "none") return;
  if (document.querySelector(".project-dropdown.active")) {
    positionProjectPortal(projectPortalAnchor, projectPortalEl);
  } else {
    hideProjectDropdownPortal();
  }
}
function attachScrollListeners(anchor) {
  detachScrollListeners();
  projectPortalScrollParents = getScrollableAncestors(anchor);
  projectPortalScrollParents.forEach((el) => {
    el.addEventListener("scroll", handleProjectPortalClose, { capture: true, passive: true });
  });
}
function detachScrollListeners() {
  if (!projectPortalScrollParents || projectPortalScrollParents.length === 0) return;
  projectPortalScrollParents.forEach((el) => {
    el.removeEventListener("scroll", handleProjectPortalClose, { capture: true });
  });
  projectPortalScrollParents = [];
}
function getScrollableAncestors(el) {
  const result = [];
  let node = el.parentElement;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    const isScrollableY = /(auto|scroll|overlay)/.test(style.overflowY);
    if (isScrollableY && node.scrollHeight > node.clientHeight) {
      result.push(node);
    }
    node = node.parentElement;
  }
  result.push(document.documentElement);
  result.push(document.body);
  return result;
}
function handleProjectPortalEsc(e) {
  if (e.key === "Escape") {
    hideProjectDropdownPortal();
    document.querySelectorAll(".project-dropdown.active").forEach((d) => d.classList.remove("active"));
  }
}
function formatTaskText(command) {
  document.execCommand(command, false, null);
  document.getElementById("task-description-editor").focus();
}
function insertTaskHeading(level) {
  document.execCommand("formatBlock", false, level);
  document.getElementById("task-description-editor").focus();
}
function insertTaskDivider() {
  const editor = document.getElementById("task-description-editor");
  if (!editor) return;
  const sel = window.getSelection();
  let inserted = false;
  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const checkText = container.nodeType === 1 ? container.closest?.(".check-text") : container.parentElement?.closest?.(".check-text");
    if (checkText && editor.contains(checkText)) {
      const row = checkText.closest(".checkbox-row");
      if (row && row.parentNode) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = '<div class="divider-row"><hr></div><div><br></div>';
        const newNode = wrapper.firstChild;
        row.parentNode.insertBefore(newNode, row.nextSibling);
        const r = document.createRange();
        const nxt = newNode.nextSibling;
        if (nxt) {
          r.setStart(nxt, 0);
          r.collapse(true);
        } else {
          r.selectNodeContents(editor);
          r.collapse(false);
        }
        sel.removeAllRanges();
        sel.addRange(r);
        editor.focus();
        editor.dispatchEvent(new Event("input"));
        inserted = true;
      }
    }
  }
  if (!inserted) {
    document.execCommand("insertHTML", false, '<div class="divider-row"><hr></div><div><br></div>');
    document.getElementById("task-description-editor").focus();
  }
}
function insertCheckbox() {
  const editor = document.getElementById("task-description-editor");
  if (!editor) return;
  const id = "chk-" + Date.now() + "-" + Math.floor(Math.random() * 1e3);
  const html = `<div class="checkbox-row" data-id="${id}" contenteditable="false"><button type="button" class="checkbox-toggle variant-1" aria-pressed="false" title="${t("tasks.checklist.toggle")}" contenteditable="false"></button><div class="check-text" contenteditable="true"></div></div>`;
  try {
    document.execCommand("insertHTML", false, html);
  } catch (e) {
    editor.insertAdjacentHTML("beforeend", html);
  }
  setTimeout(() => {
    const el = editor.querySelector(`[data-id="${id}"] .check-text`);
    if (el) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(true);
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(range);
      el.focus();
    }
    editor.dispatchEvent(new Event("input"));
  }, 10);
}
function autoLinkifyDescription(html) {
  if (!html) return html;
  const container = document.createElement("div");
  container.innerHTML = html;
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node || !node.nodeValue) continue;
    const parentEl = node.parentElement;
    if (parentEl && parentEl.closest("a")) continue;
    urlRegex.lastIndex = 0;
    if (!urlRegex.test(node.nodeValue)) continue;
    textNodes.push(node);
  }
  textNodes.forEach((node) => {
    const text = node.nodeValue;
    let lastIndex = 0;
    urlRegex.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[0];
      if (match.index > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const a = document.createElement("a");
      a.href = url;
      a.textContent = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      frag.appendChild(a);
      lastIndex = match.index + url.length;
    }
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    if (node.parentNode) {
      node.parentNode.replaceChild(frag, node);
    }
  });
  return container.innerHTML;
}
document.addEventListener("DOMContentLoaded", function() {
  const taskEditor = document.getElementById("task-description-editor");
  const taskHiddenField = document.getElementById("task-description-hidden");
  if (taskEditor && taskHiddenField) {
    taskEditor.addEventListener("input", function() {
      taskHiddenField.value = taskEditor.innerHTML;
    });
    taskEditor.addEventListener("paste", function(e) {
      if (!e.clipboardData) return;
      const file = Array.from(e.clipboardData.files || [])[0];
      if (!file || !file.type || !file.type.startsWith("image/")) return;
      e.preventDefault();
      e.stopPropagation();
      const dropzone = document.getElementById("attachment-file-dropzone");
      if (typeof uploadTaskAttachmentFile === "function") {
        uploadTaskAttachmentFile(file, dropzone).catch((err) => {
          console.error("Failed to upload pasted image as attachment:", err);
        });
      }
    });
    taskEditor.addEventListener("keydown", function(e) {
      const sel = window.getSelection();
      if ((e.key === "Backspace" || e.key === "Delete") && sel && sel.rangeCount) {
        try {
          const r0 = sel.getRangeAt(0);
          if (!r0.collapsed && r0.startContainer !== r0.endContainer) {
            return;
          }
          if (!r0.collapsed) {
            let topLevel = function(node) {
              let n = node.nodeType === 3 ? node.parentElement : node;
              while (n && n.parentElement !== taskEditor) n = n.parentElement;
              return n;
            };
            const children = Array.from(taskEditor.childNodes);
            const startNode = topLevel(r0.startContainer);
            const endNode = topLevel(r0.endContainer);
            let startIdx = children.indexOf(startNode);
            let endIdx = children.indexOf(endNode);
            if (startIdx === -1) startIdx = 0;
            if (endIdx === -1) endIdx = children.length - 1;
            const lo = Math.min(startIdx, endIdx);
            const hi = Math.max(startIdx, endIdx);
            let removed = false;
            for (let i = lo; i <= hi; i++) {
              const node = children[i];
              if (node && node.classList && node.classList.contains("checkbox-row")) {
                const next = node.nextSibling;
                node.parentNode.removeChild(node);
                if (next && next.nodeType === 1 && next.tagName.toLowerCase() === "div" && next.innerHTML.trim() === "<br>") {
                  next.parentNode.removeChild(next);
                }
                removed = true;
              }
            }
            if (removed) {
              e.preventDefault();
              taskEditor.dispatchEvent(new Event("input"));
              return;
            }
          } else {
            const container = r0.startContainer;
            const checkText = container.nodeType === 1 ? container.closest?.(".check-text") : container.parentElement?.closest?.(".check-text");
            if (!checkText && e.key === "Backspace") {
              const node = container.nodeType === 3 ? container.parentElement : container;
              if (node) {
                const atStart = container.nodeType === 3 ? r0.startOffset === 0 : r0.startOffset === 0;
                if (atStart) {
                  let prev = node.previousSibling;
                  while (prev && prev.nodeType !== 1) prev = prev.previousSibling;
                  if (prev && prev.classList && prev.classList.contains("checkbox-row")) {
                    e.preventDefault();
                    const txt = prev.querySelector(".check-text");
                    if (txt) {
                      if (!txt.firstChild) txt.appendChild(document.createTextNode(""));
                      const textNode = txt.firstChild.nodeType === 3 ? txt.firstChild : txt.firstChild;
                      const pos = textNode.nodeType === 3 ? textNode.length : txt.textContent ? txt.textContent.length : 0;
                      const newRange = document.createRange();
                      try {
                        newRange.setStart(textNode, pos);
                      } catch (e2) {
                        newRange.selectNodeContents(txt);
                        newRange.collapse(false);
                      }
                      newRange.collapse(true);
                      sel.removeAllRanges();
                      sel.addRange(newRange);
                      txt.focus();
                      taskEditor.dispatchEvent(new Event("input"));
                      return;
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
        }
      }
      if (e.key === "Enter") {
        if (!sel || !sel.rangeCount) {
          e.stopPropagation();
          return;
        }
        const range = sel.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const checkText = container.nodeType === 1 ? container.closest?.(".check-text") : container.parentElement?.closest?.(".check-text");
        if (checkText && taskEditor.contains(checkText)) {
          e.preventDefault();
          const row = checkText.closest(".checkbox-row");
          if (!row) return;
          const range2 = sel.getRangeAt(0);
          const beforeRange = range2.cloneRange();
          beforeRange.selectNodeContents(checkText);
          beforeRange.setEnd(range2.startContainer, range2.startOffset);
          const beforeText = beforeRange.toString();
          const afterRange = range2.cloneRange();
          afterRange.selectNodeContents(checkText);
          afterRange.setStart(range2.endContainer, range2.endOffset);
          const afterText = afterRange.toString();
          if (beforeText.length === 0 && afterText.length === 0) {
            const p = document.createElement("div");
            p.innerHTML = "<br>";
            row.parentNode.replaceChild(p, row);
            const r = document.createRange();
            r.setStart(p, 0);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
            taskEditor.focus();
            taskEditor.dispatchEvent(new Event("input"));
            return;
          }
          if (afterText.length === 0) {
            const id2 = "chk-" + Date.now() + "-" + Math.floor(Math.random() * 1e3);
            const wrapper = document.createElement("div");
            wrapper.innerHTML = `<div class="checkbox-row" data-id="${id2}" contenteditable="false"><button type="button" class="checkbox-toggle variant-1" aria-pressed="false" title="${t("tasks.checklist.toggle")}" contenteditable="false"></button><div class="check-text" contenteditable="true"></div></div>`;
            const newRow = wrapper.firstChild;
            if (row && row.parentNode) {
              row.parentNode.insertBefore(newRow, row.nextSibling);
              const el = newRow.querySelector(".check-text");
              const r = document.createRange();
              r.selectNodeContents(el);
              r.collapse(true);
              sel.removeAllRanges();
              sel.addRange(r);
              el.focus();
              taskEditor.dispatchEvent(new Event("input"));
            }
            return;
          }
          document.execCommand("insertHTML", false, "<br><br>");
          taskEditor.dispatchEvent(new Event("input"));
          return;
        }
        e.stopPropagation();
        return;
      }
      if ((e.key === "Backspace" || e.key === "Delete") && sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const checkText = container.nodeType === 1 ? container.closest?.(".check-text") : container.parentElement?.closest?.(".check-text");
        console.log("[checkbox-editor] keydown", {
          key: e.key,
          collapsed: range.collapsed,
          containerNodeType: container.nodeType,
          containerTag: container.nodeType === 1 ? container.tagName : null,
          isInCheckText: !!checkText
        });
        if (checkText && taskEditor.contains(checkText)) {
          const row = checkText.closest(".checkbox-row");
          if (!row) return;
          const beforeRange = range.cloneRange();
          beforeRange.selectNodeContents(checkText);
          beforeRange.setEnd(range.startContainer, range.startOffset);
          const beforeText = beforeRange.toString();
          const afterRange = range.cloneRange();
          afterRange.selectNodeContents(checkText);
          afterRange.setStart(range.endContainer, range.endOffset);
          const afterText = afterRange.toString();
          if (e.key === "Backspace" && beforeText.length === 0) {
            e.preventDefault();
            console.log("[checkbox-editor] Backspace at start of checkbox row", {
              beforeText,
              afterText
            });
            let prev = row.previousSibling;
            let next = row.nextSibling;
            while (prev && prev.nodeType !== 1) prev = prev.previousSibling;
            row.parentNode.removeChild(row);
            if (next && next.nodeType === 1 && next.tagName.toLowerCase() === "div" && next.innerHTML.trim() === "<br>") {
              next.parentNode.removeChild(next);
            }
            const newSel = window.getSelection();
            const r = document.createRange();
            let focusNode = null;
            let placed = false;
            if (prev && prev.classList && prev.classList.contains("checkbox-row")) {
              const prevText = prev.querySelector(".check-text");
              if (prevText) {
                if (!prevText.firstChild) prevText.appendChild(document.createTextNode(""));
                const textNode = prevText.firstChild.nodeType === 3 ? prevText.firstChild : prevText.firstChild;
                const pos = textNode.nodeType === 3 ? textNode.length : prevText.textContent ? prevText.textContent.length : 0;
                try {
                  r.setStart(textNode, pos);
                } catch (e2) {
                  r.selectNodeContents(prevText);
                }
                r.collapse(false);
                placed = true;
                focusNode = prevText;
                console.log("[checkbox-editor] caret moved to previous checkbox row");
              }
            }
            if (!placed) {
              while (next && next.nodeType !== 1) next = next.nextSibling;
              if (next && next.parentNode) {
                r.setStart(next, 0);
                r.collapse(true);
              } else {
                r.selectNodeContents(taskEditor);
                r.collapse(false);
              }
              console.log("[checkbox-editor] caret fallback placement", { hasNext: !!next });
            }
            newSel.removeAllRanges();
            newSel.addRange(r);
            if (focusNode && typeof focusNode.focus === "function") {
              focusNode.focus();
            } else {
              taskEditor.focus();
            }
            {
              const anchor = newSel.anchorNode;
              console.log("[checkbox-editor] final caret location", {
                nodeType: anchor ? anchor.nodeType : null,
                tag: anchor && anchor.nodeType === 1 ? anchor.tagName : null,
                textSnippet: anchor && anchor.textContent ? anchor.textContent.slice(0, 30) : null,
                insideCheckboxRow: !!(anchor && anchor.parentElement && anchor.parentElement.closest(".checkbox-row"))
              });
            }
            taskEditor.dispatchEvent(new Event("input"));
            return;
          }
          if (e.key === "Delete" && afterText.length === 0) {
            e.preventDefault();
            const next = row.nextSibling;
            row.parentNode.removeChild(row);
            if (next && next.nodeType === 1 && next.tagName.toLowerCase() === "div" && next.innerHTML.trim() === "<br>") {
              next.parentNode.removeChild(next);
            }
            const newSel = window.getSelection();
            const r = document.createRange();
            if (next) {
              r.setStart(next, 0);
              r.collapse(true);
            } else {
              r.selectNodeContents(taskEditor);
              r.collapse(false);
            }
            newSel.removeAllRanges();
            newSel.addRange(r);
            taskEditor.focus();
            taskEditor.dispatchEvent(new Event("input"));
            return;
          }
        }
      }
    });
    taskEditor.addEventListener("click", function(e) {
      const btn = e.target.closest(".checkbox-toggle");
      if (!btn) return;
      const pressed = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", String(!pressed));
      btn.classList.toggle("checked", !pressed);
      btn.innerText = !pressed ? "\u2714" : "";
      taskEditor.dispatchEvent(new Event("input"));
    });
  }
  const taskEditorForLinks = document.getElementById("task-description-editor");
  if (taskEditorForLinks) {
    taskEditorForLinks.addEventListener("click", function(e) {
      const link = e.target.closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href) return;
      const sel = window.getSelection();
      if (sel && sel.toString()) return;
      e.preventDefault();
      e.stopPropagation();
      window.open(href, "_blank", "noopener,noreferrer");
    });
  }
  const attachmentUrl = document.getElementById("attachment-url");
  const attachmentName = document.getElementById("attachment-name");
  if (attachmentUrl) {
    attachmentUrl.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addAttachment();
      }
    });
  }
  if (attachmentName) {
    attachmentName.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addAttachment();
      }
    });
  }
  const checklistBtn = document.getElementById("checklist-btn");
  if (checklistBtn) {
    checklistBtn.addEventListener("click", function() {
      const editor = document.getElementById("task-description-editor");
      const sel = window.getSelection();
      const insideHandled = handleChecklistEnter(editor);
      if (!insideHandled) {
        insertCheckbox();
      }
    });
  }
  const tagInput = document.getElementById("tag-input");
  if (tagInput) {
    tagInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addTag();
      }
    });
  }
  const feedbackInput = document.getElementById("feedback-description");
  if (feedbackInput) {
    const desktopPlaceholder = feedbackInput.getAttribute("placeholder") || "";
    const mobilePlaceholder = "Describe the issue or idea.";
    const resolveIsMobile = () => {
      if (typeof window.matchMedia === "function") {
        return window.matchMedia("(max-width: 768px)").matches;
      }
      return getIsMobileCached();
    };
    const applyFeedbackPlaceholder = () => {
      feedbackInput.placeholder = resolveIsMobile() ? mobilePlaceholder : desktopPlaceholder;
    };
    applyFeedbackPlaceholder();
    if (typeof window.matchMedia === "function") {
      const mq = window.matchMedia("(max-width: 768px)");
      if (typeof mq.addEventListener === "function") mq.addEventListener("change", applyFeedbackPlaceholder);
      else if (typeof mq.addListener === "function") mq.addListener(applyFeedbackPlaceholder);
    }
    feedbackInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addFeedbackItem();
      }
    });
  }
});
function loadCalendarState() {
  const today = /* @__PURE__ */ new Date();
  const currentMonth2 = today.getMonth();
  const currentYear2 = today.getFullYear();
  return { currentMonth: currentMonth2, currentYear: currentYear2 };
}
var calendarState = loadCalendarState();
var currentMonth = calendarState.currentMonth;
var currentYear = calendarState.currentYear;
function saveCalendarState() {
  localStorage.setItem("calendarMonth", currentMonth.toString());
  localStorage.setItem("calendarYear", currentYear.toString());
}
function renderCalendar() {
  const renderTimer = debugTimeStart("render", "calendar", {
    taskCount: tasks.length,
    month: currentMonth + 1,
    year: currentYear
  });
  const locale = getLocale();
  const dayNames = getCalendarDayNames(locale);
  const today = /* @__PURE__ */ new Date();
  document.getElementById("calendar-month-year").textContent = formatCalendarMonthYear(locale, currentYear, currentMonth);
  const filteredProjectIds = filterState.projects.size > 0 ? new Set(Array.from(filterState.projects).map((id) => parseInt(id, 10))) : null;
  const calendarData = prepareCalendarData(currentYear, currentMonth, {
    tasks,
    projects,
    filteredProjectIds,
    includeBacklog: !!settings.calendarIncludeBacklog,
    today
  });
  const isCurrentMonthNow = calendarData.isCurrentMonth;
  try {
    const isMobile = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 768px)").matches : getIsMobileCached();
    if (isMobile) {
      document.querySelectorAll(".calendar-today-btn--header").forEach((btn) => {
        btn.style.display = isCurrentMonthNow ? "none" : "inline-flex";
      });
    }
    if (!isMobile) {
      document.querySelectorAll(".calendar-today-btn--nav").forEach((btn) => {
        btn.style.display = isCurrentMonthNow ? "none" : "inline-flex";
      });
    }
  } catch (e) {
  }
  const calendarHTML = generateCalendarGridHTML(calendarData, dayNames);
  document.getElementById("calendar-grid").innerHTML = calendarHTML;
  const overlay = document.getElementById("project-overlay");
  if (overlay) overlay.style.opacity = "0";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      renderProjectBars();
    });
  });
}
var renderProjectBarsRetries = 0;
var MAX_RENDER_RETRIES = 20;
function renderProjectBars() {
  const renderTimer = debugTimeStart("render", "projectBars", {
    taskCount: tasks.length,
    projectCount: projects.length
  });
  try {
    const overlay = document.getElementById("project-overlay");
    if (!overlay) {
      console.error("[ProjectBars] No overlay element found!");
      renderProjectBarsRetries = 0;
      return;
    }
    overlay.innerHTML = "";
    overlay.style.opacity = "0";
    const calendarGrid = document.getElementById("calendar-grid");
    if (!calendarGrid) {
      console.error("[ProjectBars] No calendar grid found!");
      renderProjectBarsRetries = 0;
      return;
    }
    const calendarView = document.getElementById("calendar-view");
    const calendarVisible = calendarView && (calendarView.classList.contains("active") || calendarView.classList.contains("preparing"));
    if (!calendarVisible) {
      renderProjectBarsRetries = 0;
      return;
    }
    const h = calendarGrid.offsetHeight;
    const w = calendarGrid.offsetWidth;
    const allDayElements = Array.from(
      calendarGrid.querySelectorAll(".calendar-day")
    );
    if (allDayElements.length === 0) {
      if (renderProjectBarsRetries < MAX_RENDER_RETRIES) {
        console.warn("[ProjectBars] No day elements found, retrying in 100ms...");
        renderProjectBarsRetries++;
        setTimeout(renderProjectBars, 100);
        return;
      } else {
        console.error("[ProjectBars] Max retries reached, giving up");
        renderProjectBarsRetries = 0;
        return;
      }
    }
    const firstDayRect = allDayElements[0].getBoundingClientRect();
    if (firstDayRect.width === 0 || firstDayRect.height === 0) {
      if (renderProjectBarsRetries < MAX_RENDER_RETRIES) {
        console.warn("[ProjectBars] Elements not ready (zero dimensions), retrying in 50ms...", { firstDayRect });
        renderProjectBarsRetries++;
        setTimeout(renderProjectBars, 50);
        return;
      } else {
        console.error("[ProjectBars] Max retries reached, giving up");
        renderProjectBarsRetries = 0;
        return;
      }
    }
    renderProjectBarsRetries = 0;
    const currentMonthDays = allDayElements.map((el, index) => ({
      element: el,
      index,
      gridIndex: index,
      // Original index in 42-cell grid
      day: parseInt(el.querySelector(".calendar-day-number").textContent),
      isOtherMonth: el.classList.contains("other-month")
    })).filter((item) => !item.isOtherMonth);
    const filteredProjectIds = filterState.projects.size > 0 ? Array.from(filterState.projects).map((id) => parseInt(id, 10)) : projects.map((p) => p.id);
    const filteredProjects = projects.filter((p) => filteredProjectIds.includes(p.id));
    const projectRank = /* @__PURE__ */ new Map();
    filteredProjects.slice().sort((a, b) => {
      const aStart = a.startDate || "";
      const bStart = b.startDate || "";
      if (aStart !== bStart) return aStart.localeCompare(bStart);
      const aEnd = a.endDate || a.startDate || "";
      const bEnd = b.endDate || b.startDate || "";
      if (aEnd !== bEnd) return aEnd.localeCompare(bEnd);
      const aName = (a.name || "").toLowerCase();
      const bName = (b.name || "").toLowerCase();
      if (aName !== bName) return aName.localeCompare(bName);
      return (a.id || 0) - (b.id || 0);
    }).forEach((p, idx) => projectRank.set(p.id, idx));
    const firstDayOfMonthIndex = currentMonthDays.length > 0 ? currentMonthDays[0].gridIndex : -1;
    const lastDayOfMonthIndex = currentMonthDays.length > 0 ? currentMonthDays[currentMonthDays.length - 1].gridIndex : -1;
    const projectSegmentsByRow = /* @__PURE__ */ new Map();
    const taskSegmentsByRow = /* @__PURE__ */ new Map();
    filteredProjects.forEach((project) => {
      const [startYear, startMonth, startDay] = project.startDate.split("-").map((n) => parseInt(n));
      const startDate = new Date(startYear, startMonth - 1, startDay);
      const [endYear, endMonth, endDay] = (project.endDate || project.startDate).split("-").map((n) => parseInt(n));
      const endDate = new Date(endYear, endMonth - 1, endDay);
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);
      if (startDate <= monthEnd && endDate >= monthStart) {
        const calStartDate = startDate < monthStart ? monthStart : startDate;
        const calEndDate = endDate > monthEnd ? monthEnd : endDate;
        const startDay2 = calStartDate.getDate();
        const endDay2 = calEndDate.getDate();
        const startDayInfo = currentMonthDays.find((d) => d.day === startDay2);
        const endDayInfo = currentMonthDays.find((d) => d.day === endDay2);
        if (!startDayInfo || !endDayInfo) return;
        const startIndex = startDayInfo.gridIndex;
        const endIndex = endDayInfo.gridIndex;
        let cursor = startIndex;
        while (cursor <= endIndex) {
          const rowStart = Math.floor(cursor / 7) * 7;
          const rowEnd = Math.min(rowStart + 6, endIndex);
          const segStart = Math.max(cursor, rowStart);
          const segEnd = rowEnd;
          const row = Math.floor(segStart / 7);
          if (!projectSegmentsByRow.has(row)) projectSegmentsByRow.set(row, []);
          projectSegmentsByRow.get(row).push({ startIndex: segStart, endIndex: segEnd, project });
          cursor = rowEnd + 1;
        }
      }
    });
    const cutoff = getKanbanUpdatedCutoffTime(window.kanbanUpdatedFilter);
    const baseTasks = typeof getFilteredTasks === "function" ? getFilteredTasks() : tasks.slice();
    const updatedFilteredTasks = cutoff === null ? baseTasks : baseTasks.filter((t2) => getTaskUpdatedTime(t2) >= cutoff);
    const includeBacklog = !!settings.calendarIncludeBacklog;
    const tasksToShow = includeBacklog ? updatedFilteredTasks : updatedFilteredTasks.filter((task) => task.status !== "backlog");
    const filteredTasks = tasksToShow.filter((task) => {
      const hasEndDate = task.endDate && task.endDate.length === 10 && task.endDate.includes("-");
      const hasStartDate = task.startDate && task.startDate.length === 10 && task.startDate.includes("-");
      return hasEndDate || hasStartDate;
    });
    const taskRank = /* @__PURE__ */ new Map();
    const taskStartKey = (t2) => t2.startDate && t2.startDate.length === 10 && t2.startDate.includes("-") ? t2.startDate : t2.endDate || "";
    filteredTasks.slice().sort((a, b) => {
      const as = taskStartKey(a);
      const bs = taskStartKey(b);
      if (as !== bs) return as.localeCompare(bs);
      const ae = a.endDate || "";
      const be = b.endDate || "";
      if (ae !== be) return ae.localeCompare(be);
      const at = (a.title || "").toLowerCase();
      const bt = (b.title || "").toLowerCase();
      if (at !== bt) return at.localeCompare(bt);
      return (a.id || 0) - (b.id || 0);
    }).forEach((t2, idx) => taskRank.set(t2.id, idx));
    filteredTasks.forEach((task) => {
      let startDate, endDate;
      const hasValidStartDate = task.startDate && task.startDate.length === 10 && task.startDate.includes("-");
      const hasValidEndDate = task.endDate && task.endDate.length === 10 && task.endDate.includes("-");
      if (hasValidStartDate) {
        const [startYear, startMonth, startDay] = task.startDate.split("-").map((n) => parseInt(n));
        startDate = new Date(startYear, startMonth - 1, startDay);
      } else if (hasValidEndDate) {
        const [endYear, endMonth, endDay] = task.endDate.split("-").map((n) => parseInt(n));
        startDate = new Date(endYear, endMonth - 1, endDay);
      } else {
        return;
      }
      if (hasValidEndDate) {
        const [endYear, endMonth, endDay] = task.endDate.split("-").map((n) => parseInt(n));
        endDate = new Date(endYear, endMonth - 1, endDay);
      } else if (hasValidStartDate) {
        endDate = startDate;
      } else {
        return;
      }
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);
      if (startDate <= monthEnd && endDate >= monthStart) {
        const calStartDate = startDate < monthStart ? monthStart : startDate;
        const calEndDate = endDate > monthEnd ? monthEnd : endDate;
        const startDay = calStartDate.getDate();
        const endDay = calEndDate.getDate();
        const startDayInfo = currentMonthDays.find((d) => d.day === startDay);
        const endDayInfo = currentMonthDays.find((d) => d.day === endDay);
        if (!startDayInfo || !endDayInfo) return;
        const startIndex = startDayInfo.gridIndex;
        const endIndex = endDayInfo.gridIndex;
        let cursor = startIndex;
        while (cursor <= endIndex) {
          const rowStart = Math.floor(cursor / 7) * 7;
          const rowEnd = Math.min(rowStart + 6, endIndex);
          const segStart = Math.max(cursor, rowStart);
          const segEnd = rowEnd;
          const row = Math.floor(segStart / 7);
          if (!taskSegmentsByRow.has(row)) taskSegmentsByRow.set(row, []);
          taskSegmentsByRow.get(row).push({ startIndex: segStart, endIndex: segEnd, task });
          cursor = rowEnd + 1;
        }
      }
    });
    const projectHeight = 18;
    const projectSpacing = 3;
    const taskHeight = 20;
    const taskSpacing = 4;
    const h2 = calendarGrid.offsetHeight;
    const gridRect = calendarGrid.getBoundingClientRect();
    const rowMaxTracks = /* @__PURE__ */ new Map();
    projectSegmentsByRow.forEach((segments, row) => {
      segments.sort(
        (a, b) => (projectRank.get(a.project.id) ?? 0) - (projectRank.get(b.project.id) ?? 0) || a.startIndex - b.startIndex || a.endIndex - b.endIndex
      );
      const trackEnds = [];
      segments.forEach((seg) => {
        let track = trackEnds.findIndex((end) => seg.startIndex > end);
        if (track === -1) {
          track = trackEnds.length;
          trackEnds.push(seg.endIndex);
        } else {
          trackEnds[track] = seg.endIndex;
        }
        seg.track = track;
      });
      segments.forEach((seg) => {
        const startEl = allDayElements[seg.startIndex];
        const endEl = allDayElements[seg.endIndex];
        if (!startEl || !endEl) return;
        const startRect = startEl.getBoundingClientRect();
        const endRect = endEl.getBoundingClientRect();
        const bar = document.createElement("div");
        bar.className = "project-bar";
        if (getProjectStatus(seg.project.id) === "completed") {
          bar.classList.add("completed");
        }
        bar.style.position = "absolute";
        const inset = 6;
        let left = startRect.left - gridRect.left + inset;
        let width = endRect.right - startRect.left - inset * 2;
        if (left < 0) {
          width += left;
          left = 0;
        }
        if (left + width > gridRect.width) {
          width = Math.max(0, gridRect.width - left);
        }
        width = Math.max(0, width);
        bar.style.left = left + "px";
        bar.style.width = width + "px";
        const spacerEl = startEl.querySelector(".project-spacer");
        const anchorTop = (spacerEl ? spacerEl.getBoundingClientRect().top : startRect.top) - gridRect.top;
        bar.style.top = anchorTop + seg.track * (projectHeight + projectSpacing) + "px";
        bar.style.height = projectHeight + "px";
        const projectColor = getProjectColor(seg.project.id);
        bar.style.background = `linear-gradient(90deg, ${projectColor}, ${projectColor}dd)`;
        bar.style.textShadow = "0 1px 2px rgba(0,0,0,0.3)";
        bar.style.fontWeight = "600";
        bar.style.color = "white";
        bar.style.padding = "1px 6px";
        bar.style.fontSize = "10px";
        bar.style.display = "flex";
        bar.style.alignItems = "center";
        bar.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
        bar.style.pointerEvents = "auto";
        bar.style.cursor = "pointer";
        bar.style.zIndex = "10";
        bar.style.whiteSpace = "nowrap";
        bar.style.overflow = "hidden";
        bar.style.textOverflow = "ellipsis";
        const monthStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const monthEndStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;
        const projectStartStr = seg.project.startDate;
        const projectEndStr = seg.project.endDate || seg.project.startDate;
        const continuesLeft = projectStartStr < monthStartStr && seg.startIndex === firstDayOfMonthIndex;
        const continuesRight = projectEndStr > monthEndStr && seg.endIndex === lastDayOfMonthIndex;
        if (continuesLeft) bar.classList.add("continues-left");
        if (continuesRight) bar.classList.add("continues-right");
        bar.style.borderTopLeftRadius = continuesLeft ? "0" : "6px";
        bar.style.borderBottomLeftRadius = continuesLeft ? "0" : "6px";
        bar.style.borderTopRightRadius = continuesRight ? "0" : "6px";
        bar.style.borderBottomRightRadius = continuesRight ? "0" : "6px";
        bar.textContent = seg.project.name;
        bar.onclick = (e) => {
          e.stopPropagation();
          showProjectDetails(seg.project.id, "calendar", { month: currentMonth, year: currentYear });
        };
        overlay.appendChild(bar);
      });
      if (!rowMaxTracks.has(row)) {
        rowMaxTracks.set(row, { projectTracks: 0, taskTracks: 0 });
      }
      rowMaxTracks.get(row).projectTracks = trackEnds.length;
    });
    taskSegmentsByRow.forEach((segments, row) => {
      segments.sort(
        (a, b) => (taskRank.get(a.task.id) ?? 0) - (taskRank.get(b.task.id) ?? 0) || a.startIndex - b.startIndex || a.endIndex - b.endIndex
      );
      const trackEnds = [];
      segments.forEach((seg) => {
        let track = trackEnds.findIndex((end) => seg.startIndex > end);
        if (track === -1) {
          track = trackEnds.length;
          trackEnds.push(seg.endIndex);
        } else {
          trackEnds[track] = seg.endIndex;
        }
        seg.track = track;
      });
      segments.forEach((seg) => {
        const hasValidStartDate = seg.task.startDate && seg.task.startDate.length === 10 && seg.task.startDate.includes("-");
        const hasValidEndDate = seg.task.endDate && seg.task.endDate.length === 10 && seg.task.endDate.includes("-");
        const startEl = allDayElements[seg.startIndex];
        const endEl = allDayElements[seg.endIndex];
        if (!startEl || !endEl) return;
        const startRect = startEl.getBoundingClientRect();
        const endRect = endEl.getBoundingClientRect();
        const bar = document.createElement("div");
        bar.className = "task-bar";
        if (seg.task.status === "done") {
          bar.classList.add("done");
        }
        bar.style.position = "absolute";
        const inset = 6;
        let left = startRect.left - gridRect.left + inset;
        let width = endRect.right - startRect.left - inset * 2;
        if (left < 0) {
          width += left;
          left = 0;
        }
        if (left + width > gridRect.width) {
          width = Math.max(0, gridRect.width - left);
        }
        width = Math.max(0, width);
        bar.style.left = left + "px";
        bar.style.width = width + "px";
        const spacerEl = startEl.querySelector(".project-spacer");
        const anchorTop = (spacerEl ? spacerEl.getBoundingClientRect().top : startRect.top) - gridRect.top;
        const projectTracksCount = rowMaxTracks.get(row)?.projectTracks || 0;
        const projectsHeight = projectTracksCount * (projectHeight + projectSpacing);
        const gapBetweenProjectsAndTasks = projectTracksCount > 0 ? 6 : 0;
        bar.style.top = anchorTop + projectsHeight + gapBetweenProjectsAndTasks + seg.track * (taskHeight + taskSpacing) + "px";
        bar.style.height = taskHeight + "px";
        const borderColor = PRIORITY_COLORS[seg.task.priority] || "var(--accent-blue)";
        if (hasValidStartDate) {
          bar.style.borderLeftWidth = "5px";
          bar.style.borderLeftColor = borderColor;
        } else {
          bar.style.borderLeftWidth = "1px";
        }
        if (hasValidEndDate) {
          bar.style.borderRightWidth = "5px";
          bar.style.borderRightColor = borderColor;
        } else {
          bar.style.borderRightWidth = "1px";
        }
        bar.style.color = "var(--text-primary)";
        bar.style.padding = "2px 6px";
        bar.style.fontSize = "11px";
        bar.style.fontWeight = "500";
        bar.style.display = "flex";
        bar.style.alignItems = "center";
        bar.style.boxShadow = "var(--shadow-sm)";
        bar.style.pointerEvents = "auto";
        bar.style.cursor = "pointer";
        bar.style.zIndex = "11";
        bar.style.whiteSpace = "nowrap";
        bar.style.overflow = "hidden";
        bar.style.textOverflow = "ellipsis";
        const monthStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const monthEndStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;
        const taskStartStr = hasValidStartDate ? seg.task.startDate : seg.task.endDate;
        const taskEndStr = hasValidEndDate ? seg.task.endDate : seg.task.startDate;
        const continuesLeft = taskStartStr < monthStartStr && seg.startIndex === firstDayOfMonthIndex;
        const continuesRight = taskEndStr > monthEndStr && seg.endIndex === lastDayOfMonthIndex;
        if (continuesLeft) bar.classList.add("continues-left");
        if (continuesRight) bar.classList.add("continues-right");
        if (hasValidStartDate) bar.classList.add("has-start-date");
        if (hasValidEndDate) bar.classList.add("has-end-date");
        bar.style.borderTopLeftRadius = continuesLeft ? "0" : "4px";
        bar.style.borderBottomLeftRadius = continuesLeft ? "0" : "4px";
        bar.style.borderTopRightRadius = continuesRight ? "0" : "4px";
        bar.style.borderBottomRightRadius = continuesRight ? "0" : "4px";
        bar.textContent = seg.task.title;
        bar.onclick = (e) => {
          e.stopPropagation();
          openTaskDetails(seg.task.id);
        };
        overlay.appendChild(bar);
      });
      if (!rowMaxTracks.has(row)) {
        rowMaxTracks.set(row, { projectTracks: 0, taskTracks: 0 });
      }
      rowMaxTracks.get(row).taskTracks = trackEnds.length;
    });
    const spacers = calendarGrid.querySelectorAll(".calendar-day .project-spacer");
    const spacerByRow = /* @__PURE__ */ new Map();
    spacers.forEach((sp) => {
      const row = parseInt(sp.closest(".calendar-day").dataset.row, 10);
      const trackInfo = rowMaxTracks.get(row) || { projectTracks: 0, taskTracks: 0 };
      const projectTracksHeight = trackInfo.projectTracks > 0 ? trackInfo.projectTracks * (projectHeight + projectSpacing) : 0;
      const taskTracksHeight = trackInfo.taskTracks > 0 ? trackInfo.taskTracks * (taskHeight + taskSpacing) : 0;
      const gapBetweenProjectsAndTasks = trackInfo.projectTracks > 0 && trackInfo.taskTracks > 0 ? 6 : 0;
      const reserved = projectTracksHeight + taskTracksHeight + gapBetweenProjectsAndTasks + (trackInfo.projectTracks > 0 || trackInfo.taskTracks > 0 ? 4 : 0);
      sp.style.height = reserved + "px";
      spacerByRow.set(row, reserved);
    });
    overlay.style.opacity = "1";
  } catch (error) {
    console.error("[ProjectBars] Error rendering project/task bars:", error);
  }
  debugTimeEnd("render", renderTimer, {
    taskCount: tasks.length,
    projectCount: projects.length
  });
}
function animateCalendarMonthChange(delta) {
  changeMonth(delta);
}
function setupCalendarSwipeNavigation() {
  const stage = document.querySelector(".calendar-stage");
  if (!stage || stage.dataset.swipeReady === "true") return;
  stage.dataset.swipeReady = "true";
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let swiping = false;
  stage.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    tracking = true;
    swiping = false;
  }, { passive: true });
  stage.addEventListener("touchmove", (e) => {
    if (!tracking) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (!swiping) {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
        swiping = true;
      } else if (Math.abs(dy) > 12) {
        tracking = false;
      }
    }
    if (swiping) {
      e.preventDefault();
    }
  }, { passive: false });
  stage.addEventListener("touchend", (e) => {
    if (!tracking) return;
    tracking = false;
    if (!swiping) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    const delta = dx < 0 ? 1 : -1;
    animateCalendarMonthChange(delta);
  }, { passive: true });
  stage.addEventListener("touchcancel", () => {
    tracking = false;
    swiping = false;
  }, { passive: true });
}
document.addEventListener("DOMContentLoaded", () => {
  setupCalendarSwipeNavigation();
});
function changeMonth(delta) {
  const nav = calculateMonthNavigation(currentYear, currentMonth, delta);
  currentYear = nav.year;
  currentMonth = nav.month;
  saveCalendarState();
  renderCalendar();
  const calendarView = document.getElementById("calendar-view");
  if (calendarView) {
    renderCalendar();
  }
}
function goToToday() {
  const today = /* @__PURE__ */ new Date();
  currentMonth = today.getMonth();
  currentYear = today.getFullYear();
  saveCalendarState();
  renderCalendar();
  const calendarView = document.getElementById("calendar-view");
  if (calendarView) {
    renderCalendar();
  }
}
function getProjectStatus(projectId) {
  const projectTasks = tasks.filter((t2) => t2.projectId === projectId);
  if (projectTasks.length === 0) {
    return "planning";
  }
  const allDone = projectTasks.every((t2) => t2.status === "done");
  const hasInProgress = projectTasks.some((t2) => t2.status === "progress" || t2.status === "review");
  const hasTodo = projectTasks.some((t2) => t2.status === "todo");
  const allBacklog = projectTasks.every((t2) => t2.status === "backlog");
  if (allDone) {
    return "completed";
  } else if (hasInProgress) {
    return "active";
  }
  if (hasTodo) {
    return "planning";
  }
  if (allBacklog) {
    return "backlog";
  }
  return "planning";
}
function showDayTasks(dateStr) {
  const cutoff = getKanbanUpdatedCutoffTime(window.kanbanUpdatedFilter);
  const baseTasks = typeof getFilteredTasks === "function" ? getFilteredTasks() : tasks.slice();
  const updatedFilteredTasks = cutoff === null ? baseTasks : baseTasks.filter((t2) => getTaskUpdatedTime(t2) >= cutoff);
  let dayTasks = updatedFilteredTasks.filter((task) => {
    if (task.startDate && task.endDate) {
      return dateStr >= task.startDate && dateStr <= task.endDate;
    } else if (task.endDate) {
      return task.endDate === dateStr;
    } else if (task.startDate) {
      return task.startDate === dateStr;
    }
    return false;
  });
  const includeBacklog = !!settings.calendarIncludeBacklog;
  if (!includeBacklog) {
    dayTasks = dayTasks.filter((task) => task.status !== "backlog");
  }
  dayTasks.sort((a, b) => {
    const priorityA = PRIORITY_ORDER[a.priority] || 0;
    const priorityB = PRIORITY_ORDER[b.priority] || 0;
    return priorityB - priorityA;
  });
  const dayProjects = projects.filter((project) => {
    const startDate = new Date(project.startDate);
    const endDate = project.endDate ? new Date(project.endDate) : new Date(project.startDate);
    const currentDate = new Date(dateStr);
    return currentDate >= startDate && currentDate <= endDate;
  });
  if (dayTasks.length === 0 && dayProjects.length === 0) {
    const message = `No tasks or projects for ${formatDate(dateStr)}. Would you like to create a new task?`;
    document.getElementById("calendar-create-message").textContent = message;
    document.getElementById("calendar-create-modal").classList.add("active");
    window.pendingCalendarDate = dateStr;
    return;
  }
  const modal = document.getElementById("day-items-modal");
  const title = document.getElementById("day-items-modal-title");
  const body = document.getElementById("day-items-modal-body");
  title.textContent = t("calendar.dayItemsTitle", { date: formatDate(dateStr) });
  window.dayItemsModalDate = dateStr;
  let html = "";
  if (dayProjects.length > 0) {
    html += '<div class="day-items-section">';
    html += `<div class="day-items-section-title">\u{1F4CA} ${t("calendar.dayItemsProjects")}</div>`;
    dayProjects.forEach((project) => {
      const projectStatus = getProjectStatus(project.id);
      html += `
                <div class="day-item" data-action="closeDayItemsAndShowProject" data-param="${project.id}">
                    <div class="day-item-title">${escapeHtml(project.name)}</div>
                    <div class="day-item-meta" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;">
                        <span>${formatDate(project.startDate)} - ${formatDate(project.endDate)}</span>
                        <span class="project-status-badge ${projectStatus}">${getProjectStatusLabel(projectStatus).toUpperCase()}</span>
                    </div>
                </div>
            `;
    });
    html += "</div>";
  }
  if (dayTasks.length > 0) {
    html += '<div class="day-items-section">';
    html += `<div class="day-items-section-title">\u2705 ${t("calendar.dayItemsTasks")}</div>`;
    dayTasks.forEach((task) => {
      let projectIndicator = "";
      if (task.projectId) {
        const project = projects.find((p) => p.id === task.projectId);
        if (project) {
          const projectColor = getProjectColor(task.projectId);
          projectIndicator = `<span class="project-indicator" style="background-color: ${projectColor}; color: white; padding: 1px 6px; border-radius: 8px; font-size: 10px; margin-right: 6px; text-shadow: 0 1px 2px rgba(0,0,0,0.3); font-weight: 600;">${escapeHtml(project.name)}</span>`;
        } else {
          projectIndicator = t("tasks.projectIndicatorNone");
        }
      } else {
        projectIndicator = t("tasks.projectIndicatorNone");
      }
      const statusBadge = `<span class="status-badge ${task.status}" style="padding: 2px 8px; font-size: 10px; font-weight: 600;">${getStatusLabel(task.status)}</span>`;
      const priorityLabel = getPriorityLabel(task.priority || "").toUpperCase();
      html += `
                <div class="day-item" data-action="closeDayItemsAndOpenTask" data-param="${task.id}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                        <div class="day-item-title" style="flex: 1; min-width: 0;">${escapeHtml(task.title)}</div>
                        <div class="day-item-meta" style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;"><span class="task-priority priority-${task.priority}">${priorityLabel}</span>${statusBadge}</div>
                    </div>
                    <div style="margin-top: 8px; font-size: 11px;">${projectIndicator}</div>
                </div>
            `;
    });
    html += "</div>";
  }
  body.innerHTML = html;
  modal.classList.add("active");
}
function closeDayItemsModal() {
  document.getElementById("day-items-modal").classList.remove("active");
}
function closeDayItemsModalOnBackdrop(event) {
  const modal = document.getElementById("day-items-modal");
  if (!modal) return;
  if (event.target === modal) closeDayItemsModal();
}
function addTaskFromDayItemsModal() {
  const dateStr = window.dayItemsModalDate;
  closeDayItemsModal();
  if (dateStr) {
    openTaskModal();
    setTimeout(() => {
      const modal = document.getElementById("task-modal");
      if (!modal) return;
      const endInput = modal.querySelector('#task-form input[name="endDate"]');
      if (!endInput) return;
      const wrapper = endInput.closest(".date-input-wrapper");
      if (!wrapper) return;
      const displayInput = wrapper.querySelector(".date-display");
      if (!displayInput || !displayInput._flatpickr) return;
      endInput.value = dateStr;
      displayInput._flatpickr.setDate(new Date(dateStr), false);
    }, 100);
  }
  window.dayItemsModalDate = null;
}
document.addEventListener("keydown", function(e) {
  const dayModal = document.getElementById("day-items-modal");
  if (dayModal && dayModal.classList.contains("active") && e.key === "Escape") {
    e.preventDefault();
    closeDayItemsModal();
  }
});
function closeProjectConfirmModal() {
  document.getElementById("project-confirm-modal").classList.remove("active");
  document.getElementById("delete-tasks-checkbox").checked = false;
  document.getElementById("project-confirm-error").classList.remove("show");
  projectToDelete = null;
}
function showUnsavedChangesModal(modalId) {
  window.pendingModalToClose = modalId;
  document.getElementById("unsaved-changes-modal").classList.add("active");
}
function closeUnsavedChangesModal() {
  document.getElementById("unsaved-changes-modal").classList.remove("active");
}
function confirmDiscardChanges() {
  const targetModal = window.pendingModalToClose || "task-modal";
  closeUnsavedChangesModal();
  if (targetModal === "task-modal") {
    initialTaskFormState = null;
  } else if (targetModal === "settings-modal") {
    window.initialSettingsFormState = null;
    window.settingsFormIsDirty = false;
    const settingsForm = document.getElementById("settings-form");
    const saveBtn = settingsForm?.querySelector(".settings-btn-save");
    if (saveBtn) {
      saveBtn.classList.remove("dirty");
      saveBtn.disabled = true;
    }
  }
  window.pendingModalToClose = null;
  closeModal(targetModal);
}
function closeReviewStatusConfirmModal() {
  document.getElementById("review-status-confirm-modal").classList.remove("active");
  if (window.pendingReviewStatusToggle) {
    window.pendingReviewStatusToggle.checked = true;
    window.pendingReviewStatusToggle.dispatchEvent(new Event("change", { bubbles: true }));
    if (typeof window.markSettingsDirtyIfNeeded === "function") {
      window.markSettingsDirtyIfNeeded();
    }
  }
  window.pendingReviewTaskMigration = null;
  window.pendingReviewStatusToggle = null;
}
async function confirmDisableReviewStatus() {
  const tasksToMigrate = window.pendingReviewTaskMigration ? [...window.pendingReviewTaskMigration] : [];
  closeReviewStatusConfirmModal();
  if (tasksToMigrate && tasksToMigrate.length > 0) {
    const taskIds = tasksToMigrate.map((t2) => t2.id);
    tasks.forEach((task) => {
      if (taskIds.includes(task.id)) {
        task.status = "progress";
      }
    });
    await saveTasks2();
  }
  const enableReviewStatusToggle = document.getElementById("enable-review-status-toggle");
  if (enableReviewStatusToggle) {
    enableReviewStatusToggle.checked = false;
    window.enableReviewStatus = false;
    localStorage.setItem("enableReviewStatus", "false");
    settings.enableReviewStatus = false;
    await saveSettings2();
    applyReviewStatusVisibility();
    renderTasks();
  }
  const saveBtn = document.getElementById("save-settings-btn");
  window.initialSettingsFormState = null;
  window.settingsFormIsDirty = false;
  if (saveBtn) {
    saveBtn.classList.remove("dirty");
    saveBtn.disabled = true;
  }
  closeModal("settings-modal");
  showSuccessNotification(t("success.settingsSaved"));
}
function closeCalendarCreateModal() {
  document.getElementById("calendar-create-modal").classList.remove("active");
  window.pendingCalendarDate = null;
}
function confirmCreateTask() {
  const dateStr = window.pendingCalendarDate;
  closeCalendarCreateModal();
  if (dateStr) {
    openTaskModal();
    setTimeout(() => {
      const modal = document.getElementById("task-modal");
      if (!modal) return;
      const endInput = modal.querySelector('#task-form input[name="endDate"]');
      if (!endInput) return;
      const wrapper = endInput.closest(".date-input-wrapper");
      if (!wrapper) return;
      const displayInput = wrapper.querySelector(".date-display");
      if (!displayInput || !displayInput._flatpickr) return;
      endInput.value = dateStr;
      displayInput._flatpickr.setDate(new Date(dateStr), false);
    }, 100);
  }
}
document.addEventListener("DOMContentLoaded", function() {
  const calendarModal = document.getElementById("calendar-create-modal");
  if (calendarModal) {
    calendarModal.addEventListener("click", function(event) {
      if (event.target === calendarModal) {
        closeCalendarCreateModal();
      }
    });
  }
});
async function confirmProjectDelete() {
  const input = document.getElementById("project-confirm-input");
  const errorMsg = document.getElementById("project-confirm-error");
  const confirmText = input.value;
  const deleteTasksCheckbox = document.getElementById("delete-tasks-checkbox");
  if (confirmText !== "delete") {
    errorMsg.classList.add("show");
    input.focus();
    return;
  }
  const projectIdNum = parseInt(projectToDelete, 10);
  const projectToRecord = projects.find((p) => p.id === projectIdNum);
  const deleteTasks = deleteTasksCheckbox.checked;
  if (deleteTasks) {
    tasks = tasks.filter((t2) => t2.projectId !== projectIdNum);
  }
  const result = deleteProject(projectIdNum, projects, tasks, !deleteTasks);
  projects = result.projects;
  if (window.historyService && projectToRecord) {
    window.historyService.recordProjectDeleted(projectToRecord);
  }
  if (!deleteTasks && result.tasks) {
    tasks = result.tasks;
  }
  closeProjectConfirmModal();
  appState.projectsSortedView = null;
  window.location.hash = "#projects";
  showPage("projects");
  render();
  Promise.all([
    saveProjects2().catch((err) => {
      console.error("Failed to save projects:", err);
      showErrorNotification(t("error.saveChangesFailed"));
    }),
    deleteTasks ? saveTasks2().catch((err) => {
      console.error("Failed to save tasks:", err);
      showErrorNotification(t("error.saveChangesFailed"));
    }) : Promise.resolve()
  ]);
}
function showProjectDetails(projectId, referrer, context) {
  const detailsTimer = debugTimeStart("projects", "details", {
    projectId
  });
  if (referrer !== void 0) {
    projectNavigationReferrer = referrer;
    if (referrer === "calendar") {
      const month = context && Number.isInteger(context.month) ? context.month : currentMonth;
      const year = context && Number.isInteger(context.year) ? context.year : currentYear;
      calendarNavigationState = { month, year };
    }
  } else if (!projectNavigationReferrer) {
    projectNavigationReferrer = "projects";
  }
  window.location.hash = `project-${projectId}`;
  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    debugTimeEnd("projects", detailsTimer, { projectId, found: false });
    return;
  }
  if (getIsMobileCached()) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  document.getElementById("project-details").classList.add("active");
  const userMenu = document.querySelector(".user-menu");
  if (userMenu) userMenu.style.display = "none";
  const projectTasks = tasks.filter((t2) => t2.projectId === projectId);
  const completedTasks = projectTasks.filter((t2) => t2.status === "done");
  const inProgressTasks = projectTasks.filter((t2) => t2.status === "progress");
  const reviewTasks = projectTasks.filter((t2) => t2.status === "review");
  const todoTasks = projectTasks.filter((t2) => t2.status === "todo");
  const backlogTasks = projectTasks.filter((t2) => t2.status === "backlog");
  const completionPercentage = projectTasks.length > 0 ? Math.round(completedTasks.length / projectTasks.length * 100) : 0;
  const projectStatus = getProjectStatus(projectId);
  const startDate = project.startDate ? new Date(project.startDate) : null;
  const endDate = project.endDate ? new Date(project.endDate) : /* @__PURE__ */ new Date();
  const durationDays = startDate && Number.isFinite(startDate.getTime()) && Number.isFinite(endDate.getTime()) ? Math.ceil((endDate - startDate) / (1e3 * 60 * 60 * 24)) : null;
  const durationText = Number.isFinite(durationDays) ? t("projects.details.durationDays", { count: durationDays }) : "-";
  const detailsHTML = `
        <div class="project-details-header">
                    <div class="project-details-title">
                        <span id="project-title-display" data-action="editProjectTitle" data-param="${projectId}" data-param2="${escapeHtml(project.name).replace(/'/g, "&#39;")}" style="font-size: 32px; font-weight: 700; color: var(--text-primary); cursor: pointer;">${escapeHtml(project.name)}</span>
                        <div id="project-title-edit" style="display: none;">
                            <input type="text" id="project-title-input" class="editable-project-title" value="${escapeHtml(project.name)}" style="font-size: 32px; font-weight: 700;">
                            <button class="title-edit-btn confirm" data-action="saveProjectTitle" data-param="${projectId}">\u2713</button>
                            <button class="title-edit-btn cancel" data-action="cancelProjectTitle">\u2715</button>
                        </div>
                        <span class="project-status-badge ${projectStatus}" data-action="showStatusInfoModal">${getProjectStatusLabel(projectStatus).toUpperCase()}</span>
                        <button class="back-btn" data-action="${projectNavigationReferrer === "dashboard" ? "backToDashboard" : projectNavigationReferrer === "calendar" ? "backToCalendar" : "backToProjects"}" style="padding: 8px 12px; font-size: 14px; display: flex; align-items: center; gap: 6px; margin-left: 12px;">${projectNavigationReferrer === "dashboard" ? t("projects.backTo.dashboard") : projectNavigationReferrer === "calendar" ? t("projects.backTo.calendar") : t("projects.backTo.projects")}</button>
                        <div style="margin-left: auto; position: relative;">
                            <button type="button" class="options-btn" id="project-options-btn" data-action="toggleProjectMenu" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:20px;padding:4px;line-height:1;">\u22EF</button>
                            <div class="options-menu" id="project-options-menu" style="position:absolute;top:calc(100% + 8px);right:0;display:none;">
                                <button type="button" class="duplicate-btn" data-action="handleDuplicateProject" data-param="${projectId}" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:none;border:none;color:var(--text-primary);cursor:pointer;font-size:14px;width:100%;text-align:left;border-radius:4px;">\u{1F4CB} ${t("projects.duplicate.title")}</button>
                                <button type="button" class="delete-btn" data-action="handleDeleteProject" data-param="${projectId}">\u{1F5D1}\uFE0F ${t("projects.delete.title")}</button>
                            </div>
                        </div>
	                    </div>

	                    <div class="modal-tabs project-details-tabs">
	                        <button type="button" class="modal-tab active" data-tab="details">${t("projects.details.tab.details")}</button>
	                        <button type="button" class="modal-tab" data-tab="history">${t("projects.details.tab.history")}</button>
	                    </div>

	                    <div class="modal-tab-content active" id="project-details-tab">
		                    <div class="project-details-description">
		                        <textarea class="editable-description" id="project-description-editor">${project.description || ""}</textarea>
		                    </div>
                    <div class="project-timeline">
                        <div class="timeline-item">
                            <div class="timeline-label">${t("projects.details.startDate")}</div>
                            <input type="text" class="form-input date-display editable-date datepicker"
                                placeholder="dd/mm/yyyy" maxLength="10"
                                value="${project.startDate ? formatDate(project.startDate) : ""}"
                                data-project-id="${projectId}" data-field="startDate">
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-label">${t("projects.details.endDate")}</div>
                                <input type="text" class="form-input date-display editable-date datepicker"
                                    placeholder="dd/mm/yyyy" maxLength="10"
                                    value="${project.endDate ? formatDate(project.endDate) : ""}"
                                    data-project-id="${projectId}" data-field="endDate">
                        </div>
	                        <div class="timeline-item">
	                            <div class="timeline-label">${t("projects.details.duration")}</div>
	                            <div class="timeline-value">${durationText}</div>
	                        </div>
                        <div class="timeline-item">
                            <div class="timeline-label">${t("projects.details.created")}</div>
                            <div class="timeline-value">${formatDate(
    project.createdAt?.split("T")[0]
  )}</div>
                        </div>
                        <div class="timeline-item" style="position: relative;">
                            <div class="timeline-label">${t("projects.details.calendarColor")}</div>
                            <div class="color-picker-container" style="position: relative;">
                                <div class="current-color" 
                                     style="background-color: ${getProjectColor(projectId)}; width: 20px; height: 20px; border-radius: 4px; border: 2px solid var(--border-color); cursor: pointer; display: inline-block;"
                                     data-action="toggleProjectColorPicker" data-param="${projectId}">
                                </div>
                                <div class="color-picker-dropdown" id="color-picker-${projectId}" style="display: none; position: absolute; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; margin-top: 4px; z-index: 1000; left: 0; top: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                                    <div class="color-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;">
                                        ${PROJECT_COLORS.map((color) => `
                                            <div class="color-option" 
                                                 style="width: 24px; height: 24px; background-color: ${color}; border-radius: 4px; cursor: pointer; border: 2px solid ${color === getProjectColor(projectId) ? "white" : "transparent"};"
                                                 data-action="updateProjectColor" data-param="${projectId}" data-param2="${color}">
                                            </div>
                                        `).join("")}
                                    </div>
                                    <div class="color-picker-custom" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; gap: 8px; position: relative;">
                                        <span style="font-size: 12px; color: var(--text-muted);">${t("projects.details.customColor")}</span>
                                        <div 
                                            class="custom-color-swatch" 
                                            data-action="openCustomProjectColorPicker" 
                                            data-param="${projectId}"
                                            style="width: 24px; height: 24px; background-color: ${getProjectColor(projectId)}; border-radius: 4px; cursor: pointer; border: 2px solid transparent; box-sizing: border-box;">
                                        </div>
	                                        <input 
	                                            type="color" 
	                                            id="project-color-input-${projectId}"
	                                            class="project-color-input" 
	                                            data-project-id="${projectId}"
	                                            value="${getProjectColor(projectId)}"
	                                            style="position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0;">
	                                    </div>
	                                </div>
	                            </div>
	                        </div>
	                        <div class="timeline-item" style="grid-column: 1 / -1;">
	                            <div class="timeline-label">${t("projects.modal.tagsLabel")}</div>
	                            <div style="margin-top: 8px;">
	                                <div id="project-details-tags-display" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; min-height: 28px;"></div>
	                                <div style="display: flex; gap: 8px;">
	                                    <input type="text" id="project-details-tag-input" class="form-input" placeholder="${t("projects.modal.addTagPlaceholder")}" style="flex: 1;">
	                                    <button type="button" class="btn-secondary" data-action="addProjectDetailsTag" data-param="${projectId}">+</button>
	                                </div>
	                            </div>
	                        </div>
	                    </div>

	                    <div class="project-progress-section">
                    <div class="progress-header">
                        <div class="progress-title">${t("projects.details.progressOverview")}</div>
                        <div class="progress-percentage">${completionPercentage}%</div>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${completionPercentage}%"></div>
                    </div>
                    <div class="progress-stats">
                        <div class="progress-stat clickable" data-action="navigateToProjectStatus" data-param="${project.id}" data-param2="backlog" title="${t("projects.details.viewBacklog")}">
                            <div class="progress-stat-number" style="color: var(--text-muted);">${backlogTasks.length}</div>
                            <div class="progress-stat-label">${t("tasks.status.backlog")}</div>
                        </div>
                        <div class="progress-stat clickable" data-action="navigateToProjectStatus" data-param="${project.id}" data-param2="todo" title="${t("projects.details.viewTodo")}">
                            <div class="progress-stat-number" style="color: var(--text-muted);">${todoTasks.length}</div>
                            <div class="progress-stat-label">${t("tasks.status.todo")}</div>
                        </div>
                        <div class="progress-stat clickable" data-action="navigateToProjectStatus" data-param="${project.id}" data-param2="progress" title="${t("projects.details.viewProgress")}">
                            <div class="progress-stat-number" style="color: var(--accent-blue);">${inProgressTasks.length}</div>
                            <div class="progress-stat-label">${t("tasks.status.progress")}</div>
                        </div>
                        <div class="progress-stat clickable" data-action="navigateToProjectStatus" data-param="${project.id}" data-param2="review" title="${t("projects.details.viewReview")}">
                            <div class="progress-stat-number" style="color: var(--accent-amber);">${reviewTasks.length}</div>
                            <div class="progress-stat-label">${t("tasks.status.review")}</div>
                        </div>
                        <div class="progress-stat clickable" data-action="navigateToProjectStatus" data-param="${project.id}" data-param2="done" title="${t("projects.details.viewCompleted")}">
                            <div class="progress-stat-number" style="color: var(--accent-green);">${completedTasks.length}</div>
                            <div class="progress-stat-label">${t("tasks.status.done")}</div>
                        </div>
                    </div>
                </div>
                
                <div class="project-tasks-section">
                    <div class="section-header">
                        <div class="section-title">${t("projects.details.tasksTitle", { count: projectTasks.length })}</div>
                        <button class="add-btn" data-action="openTaskModalForProject" data-param="${projectId}">${t("tasks.addButton")}</button>
                    </div>
                    <div id="project-tasks-list">
                        ${projectTasks.length === 0 ? `<div class="empty-state">${t("tasks.empty.epic")}</div>` : projectTasks.sort((a, b) => {
    const priorityA = PRIORITY_ORDER[a.priority] || 1;
    const priorityB = PRIORITY_ORDER[b.priority] || 1;
    return priorityB - priorityA;
  }).map(
    (task) => `
                                        <div class="project-task-item" data-action="openTaskDetails" data-param="${task.id}">
                                            <div class="project-task-info">
                                                <div class="project-task-title">${task.title}</div>
                                                <div class="project-task-meta">${task.endDate ? `${t("tasks.endDatePrefix")}${formatDate(task.endDate)}` : t("tasks.noDatesSet")}</div>
                                                ${task.tags && task.tags.length > 0 ? `
                                                    <div class="task-tags" style="margin-top: 4px;">
                                                        ${task.tags.map((tag) => `<span style="background-color: ${getTagColor(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`).join(" ")}
                                                    </div>
                                                ` : ""}
                                            </div>
                                            <div class="project-task-priority">
                                                <div class="task-priority priority-${task.priority}"><span class="priority-dot ${task.priority}"></span> ${getPriorityLabel(task.priority)}</div>
                                            </div>
                                            <div class="project-task-status-col">
                                                <div class="status-badge ${task.status}">
                                                    ${getStatusLabel(task.status)}
                                                </div>
                                            </div>
                                        </div>
                            `
  ).join("")}
                    </div>
                </div>

                </div>

	                <div class="modal-tab-content" id="project-history-tab">
	                    <div class="project-history-section">
                    <div class="section-header">
                        <div class="section-title">\u{1F4DC} ${t("projects.details.changeHistory")}</div>
                    </div>
                    <div class="history-timeline-inline" id="project-history-timeline-${projectId}">
                        <!-- Timeline will be populated by JavaScript -->
                    </div>
                    <div class="history-empty-inline" id="project-history-empty-${projectId}" style="display: none;">
                        <div style="font-size: 36px; margin-bottom: 12px; opacity: 0.3;">\u{1F4DC}</div>
                        <p style="color: var(--text-muted); text-align: center;">${t("projects.details.noChanges")}</p>
                    </div>
	                    </div>
	                </div>
	        </div>
	            `;
  document.getElementById("project-details-content").innerHTML = detailsHTML;
  const descEl = document.getElementById("project-description-editor");
  if (descEl) {
    const saveNow = () => updateProjectField2(projectId, "description", descEl.value, { render: false });
    const saveDebounced = typeof debounce === "function" ? debounce(saveNow, 500) : saveNow;
    descEl.addEventListener("input", saveDebounced);
    descEl.addEventListener("blur", saveNow);
  }
  setupProjectDetailsTabs(projectId);
  const customColorInput = document.getElementById(`project-color-input-${projectId}`);
  if (customColorInput) {
    customColorInput.addEventListener("change", (e) => {
      handleProjectCustomColorChange(projectId, e.target.value);
    });
  }
  setTimeout(() => {
    document.querySelectorAll("input.datepicker").forEach((input) => {
      if (input._flatpickrInstance) {
        input._flatpickrInstance.destroy();
        delete input._flatpickrInstance;
      }
    });
    initializeDatePickers();
  }, 50);
  renderProjectDetailsTags(project.tags || [], projectId);
  const projectTagInput = document.getElementById("project-details-tag-input");
  if (projectTagInput) {
    projectTagInput.replaceWith(projectTagInput.cloneNode(true));
    const newInput = document.getElementById("project-details-tag-input");
    newInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addProjectDetailsTag(projectId);
      }
    });
  }
  debugTimeEnd("projects", detailsTimer, {
    projectId,
    taskCount: projectTasks.length,
    completionPercentage
  });
}
function setupProjectDetailsTabs(projectId) {
  const container = document.getElementById("project-details-content");
  if (!container) return;
  const tabsContainer = container.querySelector(".project-details-tabs");
  if (!tabsContainer) return;
  const detailsTab = container.querySelector("#project-details-tab");
  const historyTab = container.querySelector("#project-history-tab");
  if (!detailsTab || !historyTab) return;
  const setActive = (tabName) => {
    tabsContainer.querySelectorAll(".modal-tab").forEach((tab) => tab.classList.remove("active"));
    container.querySelectorAll(".modal-tab-content").forEach((content) => content.classList.remove("active"));
    const nextTab = tabsContainer.querySelector(`.modal-tab[data-tab="${tabName}"]`);
    if (nextTab) nextTab.classList.add("active");
    if (tabName === "history") {
      historyTab.classList.add("active");
      renderProjectHistory(projectId);
      const historyContainer = historyTab.querySelector(".project-history-section");
      if (historyContainer) historyContainer.scrollTop = 0;
    } else {
      detailsTab.classList.add("active");
    }
  };
  tabsContainer.querySelectorAll(".modal-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      setActive(tab.dataset.tab);
    });
  });
  setActive("details");
}
function handleDeleteProject(projectId) {
  projectToDelete = projectId;
  deleteProject2();
}
function deleteProject2() {
  const projectId = projectToDelete;
  if (!projectId) return;
  const projectTasks = tasks.filter((t2) => t2.projectId === projectId);
  const checkbox = document.getElementById("delete-tasks-checkbox");
  const checkboxContainer = checkbox ? checkbox.closest('div[style*="margin: 16px"]') : null;
  if (checkboxContainer) {
    if (projectTasks.length === 0) {
      checkboxContainer.style.display = "none";
    } else {
      checkboxContainer.style.display = "block";
    }
  }
  document.getElementById("project-confirm-modal").classList.add("active");
  const projectConfirmInput = document.getElementById("project-confirm-input");
  projectConfirmInput.value = "";
  projectConfirmInput.focus();
  const projectLowercaseHandler = function(e) {
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    e.target.value = e.target.value.toLowerCase();
    e.target.setSelectionRange(start, end);
  };
  projectConfirmInput.addEventListener("input", projectLowercaseHandler);
  document.addEventListener("keydown", function(e) {
    const projectConfirmModal = document.getElementById("project-confirm-modal");
    if (!projectConfirmModal || !projectConfirmModal.classList.contains("active")) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeProjectConfirmModal();
    } else if (e.key === "Enter") {
      e.preventDefault();
      confirmProjectDelete();
    }
  });
}
var projectToDuplicate = null;
function handleDuplicateProject(projectId) {
  projectToDuplicate = projectId;
  const modal = document.getElementById("project-duplicate-modal");
  const project = projects.find((p) => p.id === projectId);
  if (!project) return;
  const projectTasks = tasks.filter((t2) => t2.projectId === projectId);
  const includeTasksCheckbox = document.getElementById("duplicate-tasks-checkbox");
  const taskNamingOptions = document.getElementById("task-naming-options");
  if (projectTasks.length === 0) {
    if (includeTasksCheckbox) {
      includeTasksCheckbox.checked = false;
      includeTasksCheckbox.disabled = true;
    }
    if (taskNamingOptions) taskNamingOptions.style.display = "none";
  } else {
    if (includeTasksCheckbox) {
      includeTasksCheckbox.checked = true;
      includeTasksCheckbox.disabled = false;
    }
    if (taskNamingOptions) taskNamingOptions.style.display = "block";
  }
  const noneRadio = document.querySelector('input[name="task-naming"][value="none"]');
  if (noneRadio) noneRadio.checked = true;
  const prefixInput = document.getElementById("task-prefix-input");
  const suffixInput = document.getElementById("task-suffix-input");
  if (prefixInput) {
    prefixInput.value = "";
    prefixInput.disabled = true;
  }
  if (suffixInput) {
    suffixInput.value = "";
    suffixInput.disabled = true;
  }
  modal.classList.add("active");
  if (includeTasksCheckbox) {
    includeTasksCheckbox.addEventListener("change", function() {
      if (taskNamingOptions) {
        taskNamingOptions.style.display = this.checked ? "block" : "none";
      }
    });
  }
  const radios = document.querySelectorAll('input[name="task-naming"]');
  radios.forEach((radio) => {
    radio.addEventListener("change", function() {
      if (prefixInput) prefixInput.disabled = this.value !== "prefix";
      if (suffixInput) suffixInput.disabled = this.value !== "suffix";
      if (this.value === "prefix" && prefixInput) {
        setTimeout(() => prefixInput.focus(), 100);
      } else if (this.value === "suffix" && suffixInput) {
        setTimeout(() => suffixInput.focus(), 100);
      }
    });
  });
}
function closeDuplicateProjectModal() {
  const modal = document.getElementById("project-duplicate-modal");
  modal.classList.remove("active");
  projectToDuplicate = null;
}
async function confirmDuplicateProject() {
  const projectId = projectToDuplicate;
  if (!projectId) return;
  const project = projects.find((p) => p.id === projectId);
  if (!project) return;
  const includeTasksCheckbox = document.getElementById("duplicate-tasks-checkbox");
  const includeTasks = includeTasksCheckbox && includeTasksCheckbox.checked;
  let taskNameTransform = (name) => name;
  if (includeTasks) {
    const namingMode = document.querySelector('input[name="task-naming"]:checked')?.value || "none";
    if (namingMode === "prefix") {
      const prefix = document.getElementById("task-prefix-input")?.value || "";
      if (prefix) {
        taskNameTransform = (name) => `${prefix}${name}`;
      }
    } else if (namingMode === "suffix") {
      const suffix = document.getElementById("task-suffix-input")?.value || "";
      if (suffix) {
        taskNameTransform = (name) => `${name}${suffix}`;
      }
    }
  }
  const newProject = {
    id: projectCounter,
    name: `Copy - ${project.name}`,
    description: project.description || "",
    startDate: project.startDate || "",
    endDate: project.endDate || "",
    tags: project.tags ? [...project.tags] : [],
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  projectCounter++;
  projects.push(newProject);
  if (includeTasks) {
    const projectTasks = tasks.filter((t2) => t2.projectId === projectId);
    projectTasks.forEach((task) => {
      const newTask = {
        ...task,
        id: taskCounter,
        title: taskNameTransform(task.title),
        projectId: newProject.id,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        // Deep copy arrays
        tags: task.tags ? [...task.tags] : [],
        attachments: task.attachments ? JSON.parse(JSON.stringify(task.attachments)) : []
      };
      taskCounter++;
      tasks.push(newTask);
    });
  }
  if (window.historyService) {
    window.historyService.recordProjectCreated(newProject);
  }
  closeDuplicateProjectModal();
  appState.projectsSortedView = null;
  showSuccessNotification(
    includeTasks ? t("projects.duplicate.successWithTasks", { name: newProject.name }) : t("projects.duplicate.success", { name: newProject.name })
  );
  Promise.all([
    saveProjects2().catch((err) => {
      console.error("Failed to save projects:", err);
      showErrorNotification(t("error.saveChangesFailed"));
    }),
    includeTasks ? saveTasks2().catch((err) => {
      console.error("Failed to save tasks:", err);
      showErrorNotification(t("error.saveChangesFailed"));
    }) : Promise.resolve()
  ]);
  showProjectDetails(newProject.id, "projects");
}
function backToProjects() {
  document.getElementById("project-details").classList.remove("active");
  const userMenu = document.querySelector(".user-menu");
  if (userMenu) userMenu.style.display = "block";
  try {
    window.location.hash = "#projects";
  } catch (e) {
  }
  showPage("projects");
  document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
  document.querySelector('.nav-item[data-page="projects"]').classList.add("active");
  renderProjects();
}
function backToCalendar() {
  document.getElementById("project-details").classList.remove("active");
  const userMenu = document.querySelector(".user-menu");
  if (userMenu) userMenu.style.display = "block";
  if (calendarNavigationState && Number.isInteger(calendarNavigationState.month) && Number.isInteger(calendarNavigationState.year)) {
    currentMonth = calendarNavigationState.month;
    currentYear = calendarNavigationState.year;
    try {
      saveCalendarState();
    } catch (e) {
    }
  }
  showCalendarView();
  renderCalendar();
}
function openTaskModalForProject(projectId) {
  openTaskModal();
  const modal = document.getElementById("task-modal");
  const hiddenProject = modal.querySelector("#hidden-project");
  const projectTextSpan = modal.querySelector("#project-current .project-text");
  const proj = projects.find((p) => String(p.id) === String(projectId));
  if (hiddenProject) hiddenProject.value = String(projectId || "");
  if (projectTextSpan && proj) {
    const colorSquare = `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor(proj.id)}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>`;
    projectTextSpan.innerHTML = colorSquare + escapeHtml(proj.name);
  }
  if (typeof hideProjectDropdownPortal === "function") hideProjectDropdownPortal();
  setTimeout(() => captureInitialTaskFormState(), 150);
}
function openSettingsModal() {
  const modal = document.getElementById("settings-modal");
  if (!modal) return;
  const form = modal.querySelector("#settings-form");
  const userNameInput = form.querySelector("#user-name");
  const autoStartToggle = form.querySelector("#auto-start-date-toggle");
  const autoEndToggle = form.querySelector("#auto-end-date-toggle");
  const enableReviewStatusToggle = form.querySelector("#enable-review-status-toggle");
  const calendarIncludeBacklogToggle = form.querySelector("#calendar-include-backlog-toggle");
  const debugLogsToggle = form.querySelector("#debug-logs-toggle");
  const historySortOrderSelect = form.querySelector("#history-sort-order");
  const languageSelect = form.querySelector("#language-select");
  const currentUser = window.authSystem?.getCurrentUser();
  userNameInput.value = currentUser?.name || "";
  const emailInput = form.querySelector("#user-email");
  emailInput.value = currentUser?.email || settings.notificationEmail || "";
  const emailEnabledToggle = form.querySelector("#email-notifications-enabled");
  const emailWeekdaysOnlyToggle = form.querySelector("#email-notifications-weekdays-only");
  const emailIncludeStartDatesToggle = form.querySelector("#email-notifications-include-start-dates");
  const emailIncludeBacklogToggle = form.querySelector("#email-notifications-include-backlog");
  const emailTimeInput = form.querySelector("#email-notification-time");
  const emailTimeTrigger = form.querySelector("#email-notification-time-trigger");
  const emailTimeValueEl = form.querySelector("#email-notification-time-value");
  const emailTimeZoneSelect = form.querySelector("#email-notification-timezone");
  const emailTimeZoneTrigger = form.querySelector("#email-notification-timezone-trigger");
  const emailTimeZoneValueEl = form.querySelector("#email-notification-timezone-value");
  const emailDetails = form.querySelector("#email-notification-details");
  if (emailEnabledToggle) {
    emailEnabledToggle.checked = settings.emailNotificationsEnabled !== false;
  }
  if (emailWeekdaysOnlyToggle) {
    emailWeekdaysOnlyToggle.checked = !!settings.emailNotificationsWeekdaysOnly;
  }
  if (emailIncludeStartDatesToggle) {
    emailIncludeStartDatesToggle.checked = !!settings.emailNotificationsIncludeStartDates;
  }
  if (emailIncludeBacklogToggle) {
    emailIncludeBacklogToggle.checked = !!settings.emailNotificationsIncludeBacklog;
  }
  if (emailTimeInput) {
    const snapped = snapHHMMToStep(
      normalizeHHMM(settings.emailNotificationTime) || "09:00",
      30
    );
    emailTimeInput.value = clampHHMMToRange(snapped || "09:00", "08:00", "18:00") || "09:00";
    if (emailTimeValueEl) emailTimeValueEl.textContent = emailTimeInput.value;
  }
  if (emailTimeZoneSelect) {
    emailTimeZoneSelect.value = String(settings.emailNotificationTimeZone || "Atlantic/Canary");
    if (emailTimeZoneValueEl) {
      emailTimeZoneValueEl.textContent = emailTimeZoneSelect.options?.[emailTimeZoneSelect.selectedIndex]?.textContent || emailTimeZoneSelect.value || "";
    }
  }
  const applyEmailNotificationInputState = () => {
    const enabled = !!emailEnabledToggle?.checked;
    if (emailDetails) {
      emailDetails.classList.toggle("is-collapsed", !enabled);
      emailDetails.setAttribute("aria-hidden", enabled ? "false" : "true");
    }
    if (emailWeekdaysOnlyToggle) emailWeekdaysOnlyToggle.disabled = !enabled;
    if (emailIncludeStartDatesToggle) emailIncludeStartDatesToggle.disabled = !enabled;
    if (emailTimeInput) emailTimeInput.disabled = !enabled;
    if (emailTimeTrigger) emailTimeTrigger.disabled = !enabled;
    if (emailTimeZoneSelect) emailTimeZoneSelect.disabled = !enabled;
    if (emailTimeZoneTrigger) emailTimeZoneTrigger.disabled = !enabled;
  };
  applyEmailNotificationInputState();
  if (autoStartToggle) autoStartToggle.checked = !!settings.autoSetStartDateOnStatusChange;
  if (autoEndToggle) autoEndToggle.checked = !!settings.autoSetEndDateOnStatusChange;
  if (enableReviewStatusToggle) enableReviewStatusToggle.checked = !!settings.enableReviewStatus;
  if (calendarIncludeBacklogToggle) calendarIncludeBacklogToggle.checked = !!settings.calendarIncludeBacklog;
  if (debugLogsToggle) debugLogsToggle.checked = !!settings.debugLogsEnabled;
  historySortOrderSelect.value = settings.historySortOrder;
  if (languageSelect) languageSelect.value = getCurrentLanguage();
  const logoFileInput = form.querySelector("#workspace-logo-input");
  if (logoFileInput) {
    logoFileInput.value = "";
  }
  workspaceLogoDraft.hasPendingChange = false;
  workspaceLogoDraft.dataUrl = null;
  avatarDraft.hasPendingChange = false;
  avatarDraft.dataUrl = null;
  const logoPreview = form.querySelector("#workspace-logo-preview");
  const clearButton = form.querySelector("#workspace-logo-clear-btn");
  if (logoPreview && clearButton) {
    if (settings.customWorkspaceLogo) {
      logoPreview.style.display = "block";
      logoPreview.style.backgroundImage = `url(${settings.customWorkspaceLogo})`;
      clearButton.style.display = "inline-flex";
    } else {
      logoPreview.style.display = "none";
      logoPreview.style.backgroundImage = "";
      clearButton.style.display = "none";
    }
  }
  const refreshLogoEvent = new CustomEvent("refresh-workspace-logo-ui");
  document.dispatchEvent(refreshLogoEvent);
  const avatarFileInput = form.querySelector("#user-avatar-input");
  if (avatarFileInput) {
    avatarFileInput.value = "";
  }
  refreshUserAvatarSettingsUI();
  window.initialSettingsFormState = {
    userName: userNameInput.value || "",
    notificationEmail: emailInput.value || "",
    emailNotificationsEnabled: !!emailEnabledToggle?.checked,
    emailNotificationsWeekdaysOnly: !!emailWeekdaysOnlyToggle?.checked,
    emailNotificationsIncludeStartDates: !!emailIncludeStartDatesToggle?.checked,
    emailNotificationsIncludeBacklog: !!emailIncludeBacklogToggle?.checked,
    emailNotificationTime: emailTimeInput?.value || "",
    emailNotificationTimeZone: emailTimeZoneSelect?.value || "",
    autoSetStartDateOnStatusChange: !!settings.autoSetStartDateOnStatusChange,
    autoSetEndDateOnStatusChange: !!settings.autoSetEndDateOnStatusChange,
    enableReviewStatus: !!settings.enableReviewStatus,
    calendarIncludeBacklog: !!calendarIncludeBacklogToggle?.checked,
    debugLogsEnabled: !!debugLogsToggle?.checked,
    historySortOrder: settings.historySortOrder || "newest",
    language: getCurrentLanguage(),
    logoState: settings.customWorkspaceLogo ? "logo-set" : "logo-none",
    avatarState: window.authSystem?.getCurrentUser?.()?.avatarDataUrl ? "avatar-set" : "avatar-none"
  };
  const saveBtn = form.querySelector(".settings-btn-save");
  if (saveBtn) {
    saveBtn.classList.remove("dirty");
    saveBtn.disabled = true;
  }
  if (!form.__settingsDirtyBound) {
    form.__settingsDirtyBound = true;
    const markDirtyIfNeeded = () => {
      if (!window.initialSettingsFormState) return;
      const currentLogoState = workspaceLogoDraft.hasPendingChange ? "draft-changed" : settings.customWorkspaceLogo ? "logo-set" : "logo-none";
      const currentAvatarState = avatarDraft.hasPendingChange ? "draft-changed" : window.authSystem?.getCurrentUser?.()?.avatarDataUrl ? "avatar-set" : "avatar-none";
      const current = {
        userName: userNameInput.value || "",
        notificationEmail: emailInput.value || "",
        emailNotificationsEnabled: !!emailEnabledToggle?.checked,
        emailNotificationsWeekdaysOnly: !!emailWeekdaysOnlyToggle?.checked,
        emailNotificationsIncludeStartDates: !!emailIncludeStartDatesToggle?.checked,
        emailNotificationsIncludeBacklog: !!emailIncludeBacklogToggle?.checked,
        emailNotificationTime: emailTimeInput?.value || "",
        emailNotificationTimeZone: emailTimeZoneSelect?.value || "",
        autoSetStartDateOnStatusChange: !!autoStartToggle?.checked,
        autoSetEndDateOnStatusChange: !!autoEndToggle?.checked,
        enableReviewStatus: !!enableReviewStatusToggle?.checked,
        calendarIncludeBacklog: !!calendarIncludeBacklogToggle?.checked,
        debugLogsEnabled: !!debugLogsToggle?.checked,
        historySortOrder: historySortOrderSelect.value,
        language: languageSelect?.value || getCurrentLanguage(),
        logoState: currentLogoState,
        avatarState: currentAvatarState
      };
      const isDirty = current.userName !== window.initialSettingsFormState.userName || current.notificationEmail !== window.initialSettingsFormState.notificationEmail || current.emailNotificationsEnabled !== window.initialSettingsFormState.emailNotificationsEnabled || current.emailNotificationsWeekdaysOnly !== window.initialSettingsFormState.emailNotificationsWeekdaysOnly || current.emailNotificationsIncludeBacklog !== window.initialSettingsFormState.emailNotificationsIncludeBacklog || current.emailNotificationsIncludeStartDates !== window.initialSettingsFormState.emailNotificationsIncludeStartDates || current.emailNotificationTime !== window.initialSettingsFormState.emailNotificationTime || current.emailNotificationTimeZone !== window.initialSettingsFormState.emailNotificationTimeZone || current.autoSetStartDateOnStatusChange !== window.initialSettingsFormState.autoSetStartDateOnStatusChange || current.autoSetEndDateOnStatusChange !== window.initialSettingsFormState.autoSetEndDateOnStatusChange || current.enableReviewStatus !== window.initialSettingsFormState.enableReviewStatus || current.calendarIncludeBacklog !== window.initialSettingsFormState.calendarIncludeBacklog || current.debugLogsEnabled !== window.initialSettingsFormState.debugLogsEnabled || current.historySortOrder !== window.initialSettingsFormState.historySortOrder || current.language !== window.initialSettingsFormState.language || current.logoState !== window.initialSettingsFormState.logoState || current.avatarState !== window.initialSettingsFormState.avatarState;
      if (saveBtn) {
        if (isDirty) {
          saveBtn.classList.add("dirty");
          saveBtn.disabled = false;
        } else {
          saveBtn.classList.remove("dirty");
          saveBtn.disabled = true;
        }
      }
      window.settingsFormIsDirty = isDirty;
    };
    window.markSettingsDirtyIfNeeded = markDirtyIfNeeded;
    [userNameInput, emailInput, emailEnabledToggle, emailWeekdaysOnlyToggle, emailIncludeBacklogToggle, emailIncludeStartDatesToggle, emailTimeInput, emailTimeZoneSelect, autoStartToggle, autoEndToggle, enableReviewStatusToggle, calendarIncludeBacklogToggle, debugLogsToggle, historySortOrderSelect, languageSelect, logoFileInput, avatarFileInput].filter(Boolean).forEach((el) => {
      el.addEventListener("change", markDirtyIfNeeded);
      if (el.tagName === "INPUT" && el.type === "text" || el.type === "email") {
        el.addEventListener("input", markDirtyIfNeeded);
      }
    });
    if (emailEnabledToggle && !emailEnabledToggle.__emailInputsBound) {
      emailEnabledToggle.__emailInputsBound = true;
      emailEnabledToggle.addEventListener("change", () => {
        applyEmailNotificationInputState();
      });
    }
    if (emailTimeTrigger && !emailTimeTrigger.__notificationTimeBound) {
      emailTimeTrigger.__notificationTimeBound = true;
      emailTimeTrigger.addEventListener("click", (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        const enabled = !!emailEnabledToggle?.checked;
        if (!enabled) return;
        const isOpen = notificationTimePortalEl && notificationTimePortalEl.style.display !== "none";
        if (isOpen) {
          hideNotificationTimePortal();
          return;
        }
        showNotificationTimePortal(emailTimeTrigger, emailTimeInput, emailTimeValueEl);
      });
    }
    if (emailTimeZoneTrigger && emailTimeZoneSelect && !emailTimeZoneTrigger.__notificationTimeZoneBound) {
      emailTimeZoneTrigger.__notificationTimeZoneBound = true;
      emailTimeZoneTrigger.addEventListener("click", (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        const enabled = !!emailEnabledToggle?.checked;
        if (!enabled) return;
        const isOpen = notificationTimeZonePortalEl && notificationTimeZonePortalEl.style.display !== "none";
        if (isOpen) {
          hideNotificationTimeZonePortal();
          return;
        }
        showNotificationTimeZonePortal(emailTimeZoneTrigger, emailTimeZoneSelect, emailTimeZoneValueEl);
      });
    }
    if (emailTimeZoneSelect && emailTimeZoneValueEl && !emailTimeZoneSelect.__timezoneValueBound) {
      emailTimeZoneSelect.__timezoneValueBound = true;
      emailTimeZoneSelect.addEventListener("change", () => {
        emailTimeZoneValueEl.textContent = emailTimeZoneSelect.options?.[emailTimeZoneSelect.selectedIndex]?.textContent || emailTimeZoneSelect.value || "";
      });
    }
  }
  modal.classList.add("active");
  const body = modal.querySelector(".settings-modal-body");
  if (body) body.scrollTop = 0;
  const resetPinBtn = modal.querySelector("#reset-pin-btn");
  if (resetPinBtn && !resetPinBtn.dataset.listenerAttached) {
    resetPinBtn.dataset.listenerAttached = "true";
    resetPinBtn.addEventListener("click", function(e) {
      e.preventDefault();
      resetPINFlow();
    });
  }
}
function closeUserDropdown() {
  const dropdown = document.getElementById("shared-user-dropdown");
  if (dropdown) {
    dropdown.classList.remove("active");
  }
}
function setupUserMenus() {
  const avatar = document.getElementById("shared-user-avatar");
  const dropdown = document.getElementById("shared-user-dropdown");
  if (avatar && dropdown) {
    const newAvatar = avatar.cloneNode(true);
    avatar.parentNode.replaceChild(newAvatar, avatar);
    newAvatar.addEventListener("click", function(e) {
      e.stopPropagation();
      closeNotificationDropdown();
      dropdown.classList.toggle("active");
    });
    dropdown.addEventListener("click", function(e) {
      const item = e.target.closest(".dropdown-item:not(.disabled)");
      if (item) {
        closeUserDropdown();
      }
    });
  }
}
function updateUserDisplay(name, avatarDataUrl) {
  const nameEl = document.querySelector(".user-name");
  const avatarEl = document.getElementById("shared-user-avatar");
  if (nameEl) nameEl.textContent = name;
  if (avatarEl) {
    const parts = name.split(" ").filter(Boolean);
    let initials = "NL";
    if (parts.length > 0) {
      if (parts.length === 1) {
        initials = parts[0].slice(0, 2).toUpperCase();
      } else {
        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
    }
    if (avatarDataUrl) {
      avatarEl.classList.add("has-image");
      avatarEl.style.backgroundImage = `url(${avatarDataUrl})`;
      avatarEl.textContent = "";
    } else {
      avatarEl.classList.remove("has-image");
      avatarEl.style.backgroundImage = "";
      avatarEl.textContent = initials;
    }
  }
}
function hydrateUserProfile() {
  const currentUser = window.authSystem?.getCurrentUser();
  if (!currentUser) return;
  updateUserDisplay(currentUser.name, currentUser.avatarDataUrl);
  const emailEl = document.querySelector(".user-email");
  if (emailEl) emailEl.textContent = currentUser.email || currentUser.username;
}
document.addEventListener("click", function(event) {
  const clickedInUserMenu = event.target.closest(".user-menu");
  if (!clickedInUserMenu) {
    closeUserDropdown();
  }
  const clickedInNotifyMenu = event.target.closest(".notify-menu");
  if (!clickedInNotifyMenu) {
    closeNotificationDropdown();
  }
});
function updateLogos() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const logoSrc = isDark ? "Nautilus_logo.png" : "Nautilus_logo_light.png";
  document.querySelectorAll('img.logo, img[class*="boot-logo"]').forEach((logo) => {
    if (logo.closest(".overlay") || logo.closest(".auth-overlay")) {
      return;
    }
    logo.src = logoSrc;
  });
}
function updateThemeMenuText() {
  const themeText = document.getElementById("theme-text");
  if (!themeText) return;
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  themeText.textContent = isDark ? t("menu.lightMode") : t("menu.darkMode");
}
function toggleTheme() {
  const root = document.documentElement;
  if (root.getAttribute("data-theme") === "dark") {
    root.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
  } else {
    root.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  }
  updateThemeMenuText();
  updateLogos();
  if (typeof reflowCalendarBars === "function") {
    reflowCalendarBars();
  }
}
var savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
}
updateThemeMenuText();
updateLogos();
var isResizing = false;
document.querySelector(".resizer").addEventListener("mousedown", function(e) {
  isResizing = true;
  this.classList.add("dragging");
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  e.preventDefault();
});
document.addEventListener("mousemove", function(e) {
  if (!isResizing) return;
  const sidebar = document.querySelector(".sidebar");
  const newWidth = e.clientX;
  if (newWidth >= 200 && newWidth <= 500) {
    sidebar.style.width = newWidth + "px";
  }
});
document.addEventListener("mouseup", function() {
  if (isResizing) {
    isResizing = false;
    document.querySelector(".resizer").classList.remove("dragging");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }
});
function updateProjectField2(projectId, field, value, options) {
  const opts = options || {};
  const shouldRender = opts.render !== false;
  let updatedValue = value;
  if (field === "startDate" || field === "endDate") {
    if (looksLikeDMY(value)) {
      updatedValue = toISOFromDMY(value);
    }
  }
  const oldProject = projects.find((p) => p.id === projectId);
  const oldProjectCopy = oldProject ? JSON.parse(JSON.stringify(oldProject)) : null;
  if (oldProject) {
    const prev = oldProject[field];
    const prevStr = typeof prev === "string" ? prev : prev || "";
    const nextStr = typeof updatedValue === "string" ? updatedValue : updatedValue || "";
    if (prevStr === nextStr) return;
  }
  const result = updateProjectField(projectId, field, updatedValue, projects);
  if (result.project) {
    projects = result.projects;
    const project = result.project;
    project.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    appState.projectsSortedView = null;
    if (window.historyService && oldProjectCopy) {
      window.historyService.recordProjectUpdated(oldProjectCopy, project);
    }
    if (shouldRender) showProjectDetails(projectId);
    if (document.getElementById("calendar-view")?.classList.contains("active")) {
      reflowCalendarBars();
    }
    saveProjects2().catch((err) => {
      console.error("Failed to save project field:", err);
      showErrorNotification(t("error.saveChangesFailed"));
    });
  }
}
window.updateProjectField = updateProjectField2;
window.debouncedUpdateProjectField = typeof debouncedUpdateProjectField === "function" ? debouncedUpdateProjectField : void 0;
window.flushDebouncedProjectField = typeof flushDebouncedProjectField === "function" ? flushDebouncedProjectField : void 0;
function showCalendarView() {
  const alreadyOnCalendar = document.getElementById("tasks")?.classList.contains("active") && document.getElementById("calendar-view")?.classList.contains("active");
  if (window.location.hash !== "#calendar") {
    window.location.hash = "calendar";
  }
  if (!document.getElementById("tasks")?.classList.contains("active")) {
    showPage("tasks");
  }
  document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
  document.querySelector(".nav-item.calendar-nav").classList.add("active");
  const viewToggle = document.querySelector(".view-toggle");
  if (viewToggle) viewToggle.classList.add("hidden");
  const kanbanSettingsContainer = document.getElementById("kanban-settings-btn")?.parentElement;
  if (kanbanSettingsContainer) kanbanSettingsContainer.style.display = "none";
  const backlogBtn = document.getElementById("backlog-quick-btn");
  if (backlogBtn) backlogBtn.style.display = "none";
  const kanban = document.querySelector(".kanban-board");
  const list = document.getElementById("list-view");
  const calendar = document.getElementById("calendar-view");
  if (kanban && !kanban.classList.contains("hidden")) kanban.classList.add("hidden");
  if (list && list.classList.contains("active")) list.classList.remove("active");
  if (calendar && !calendar.classList.contains("active")) calendar.classList.add("active");
  try {
    document.querySelector(".kanban-header")?.classList.add("calendar-mode");
  } catch (e) {
  }
  const pageTitle = document.querySelector("#tasks .page-title");
  if (pageTitle) pageTitle.textContent = "Calendar";
  if (alreadyOnCalendar) {
    reflowCalendarBars();
  } else {
    renderCalendar();
  }
  try {
    updateSortUI();
  } catch (e) {
  }
}
function reflowCalendarBars() {
  if (!document.getElementById("calendar-view")?.classList.contains("active")) return;
  requestAnimationFrame(() => requestAnimationFrame(renderProjectBars));
}
async function addFeedbackItem() {
  const typeRadio = document.querySelector('input[name="feedback-type"]:checked');
  const type = typeRadio ? typeRadio.value : "bug";
  const description = document.getElementById("feedback-description").value.trim();
  const screenshotUrl = currentFeedbackScreenshotData || "";
  if (!description) return;
  const item = {
    id: feedbackCounter++,
    type,
    description,
    screenshotUrl,
    createdAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    status: "open"
  };
  feedbackItems.unshift(item);
  feedbackIndex.unshift(item.id);
  feedbackRevision++;
  document.getElementById("feedback-description").value = "";
  clearFeedbackScreenshot();
  updateCounts();
  renderFeedback();
  enqueueFeedbackDelta({ action: "add", item });
  persistFeedbackCacheDebounced();
}
document.addEventListener("DOMContentLoaded", function() {
  const feedbackTypeBtn = document.getElementById("feedback-type-btn");
  const feedbackTypeGroup = document.getElementById("feedback-type-group");
  const feedbackTypeLabel = document.getElementById("feedback-type-label");
  updateFeedbackSaveStatus();
  window.addEventListener("online", () => {
    updateFeedbackSaveStatus();
    scheduleFeedbackDeltaFlush(0);
  });
  window.addEventListener("offline", updateFeedbackSaveStatus);
  if (feedbackTypeBtn && feedbackTypeGroup) {
    feedbackTypeBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      feedbackTypeGroup.classList.toggle("open");
    });
    const typeRadios = document.querySelectorAll('input[name="feedback-type"]');
    typeRadios.forEach((radio) => {
      radio.addEventListener("change", function() {
        const labelMap = {
          bug: t("feedback.type.bugLabel"),
          idea: t("feedback.type.improvementOption")
        };
        const selectedLabel = labelMap[this.value] || this.closest("label").textContent.trim();
        feedbackTypeLabel.textContent = selectedLabel;
        feedbackTypeGroup.classList.remove("open");
      });
    });
    document.addEventListener("click", function(e) {
      if (!feedbackTypeGroup.contains(e.target)) {
        feedbackTypeGroup.classList.remove("open");
      }
    });
  }
  const feedbackInput = document.getElementById("feedback-description");
  if (feedbackInput) {
    feedbackInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addFeedbackItem();
      }
    });
    feedbackInput.addEventListener("paste", function(e) {
      if (!e.clipboardData) return;
      const file = Array.from(e.clipboardData.files || [])[0];
      if (file && file.type && file.type.startsWith("image/")) {
        e.preventDefault();
        handleFeedbackImageFile(file);
      }
    });
  }
  const screenshotInput = document.getElementById("feedback-screenshot-url");
  const screenshotFileInput = document.getElementById("feedback-screenshot-file");
  const screenshotButton = document.getElementById("feedback-screenshot-upload");
  const isMobileScreen = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 768px)").matches : getIsMobileCached();
  const screenshotDefaultText = isMobileScreen ? t("feedback.screenshotDropzoneTap") : t("feedback.screenshotDropzoneDefault");
  if (screenshotInput) {
    screenshotInput.textContent = screenshotDefaultText;
    screenshotInput.classList.add("feedback-screenshot-dropzone");
    screenshotInput.dataset.defaultText = screenshotDefaultText;
  }
  let screenshotPreview = document.getElementById("feedback-screenshot-preview");
  if (!screenshotPreview) {
    const feedbackBar = document.querySelector("#feedback .feedback-input-bar");
    if (feedbackBar && feedbackBar.parentNode) {
      screenshotPreview = document.createElement("div");
      screenshotPreview.id = "feedback-screenshot-preview";
      feedbackBar.parentNode.insertBefore(screenshotPreview, feedbackBar.nextSibling);
    }
  }
  function handleDropOrPasteFileList(fileList, event) {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    if (!file.type || !file.type.startsWith("image/")) {
      if (typeof showErrorNotification === "function") {
        showErrorNotification(t("error.feedbackAttachImage"));
      }
      return;
    }
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    handleFeedbackImageFile(file);
  }
  if (screenshotInput) {
    screenshotInput.addEventListener("dragover", function(e) {
      e.preventDefault();
      screenshotInput.classList.add("feedback-screenshot-dragover");
    });
    screenshotInput.addEventListener("dragleave", function(e) {
      e.preventDefault();
      screenshotInput.classList.remove("feedback-screenshot-dragover");
    });
    screenshotInput.addEventListener("drop", function(e) {
      screenshotInput.classList.remove("feedback-screenshot-dragover");
      const files = e.dataTransfer && e.dataTransfer.files;
      handleDropOrPasteFileList(files, e);
    });
    screenshotInput.addEventListener("paste", function(e) {
      if (!e.clipboardData) return;
      const files = e.clipboardData.files;
      if (files && files.length > 0) {
        handleDropOrPasteFileList(files, e);
      }
    });
    screenshotInput.addEventListener("click", function() {
      if (screenshotFileInput) {
        screenshotFileInput.click();
      }
    });
    screenshotInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (screenshotFileInput) {
          screenshotFileInput.click();
        }
      }
    });
  }
  if (screenshotButton) {
    screenshotButton.style.display = "none";
  }
  if (screenshotFileInput) {
    screenshotFileInput.addEventListener("change", function(e) {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleDropOrPasteFileList(files, e);
      }
      screenshotFileInput.value = "";
    });
  }
});
function handleFeedbackImageFile(file) {
  if (!file || !file.type || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const dataUrl = ev.target && ev.target.result;
    if (!dataUrl) return;
    currentFeedbackScreenshotData = dataUrl;
    const screenshotInput = document.getElementById("feedback-screenshot-url");
    if (screenshotInput && screenshotInput.dataset) {
      screenshotInput.dataset.hasInlineImage = "true";
    }
    const preview = document.getElementById("feedback-screenshot-preview");
    if (preview) {
      preview.innerHTML = `
                <div class="feedback-screenshot-preview-card">
                    <div class="feedback-screenshot-thumb">
                        <img src="${dataUrl}" alt="${t("feedback.screenshotPreviewAlt")}">
                    </div>
                    <div class="feedback-screenshot-meta">
                        <div class="feedback-screenshot-title">${t("feedback.screenshotPreviewTitle")}</div>
                        <div class="feedback-screenshot-subtitle">${t("feedback.screenshotPreviewSubtitle")}</div>
                    </div>
                    <button type="button" class="feedback-screenshot-remove">${t("feedback.screenshotRemove")}</button>
                </div>
            `;
      preview.style.display = "flex";
      const thumb = preview.querySelector(".feedback-screenshot-thumb");
      if (thumb && typeof viewImageLegacy === "function") {
        thumb.onclick = function() {
          viewImageLegacy(dataUrl, "Feedback Screenshot");
        };
      }
      const removeBtn = preview.querySelector(".feedback-screenshot-remove");
      if (removeBtn) {
        removeBtn.onclick = function(e) {
          e.preventDefault();
          clearFeedbackScreenshot();
        };
      }
    }
  };
  reader.onerror = function() {
    if (typeof showErrorNotification === "function") {
      showErrorNotification(t("error.feedbackReadImage"));
    }
  };
  reader.readAsDataURL(file);
}
function clearFeedbackScreenshot() {
  currentFeedbackScreenshotData = "";
  const screenshotInput = document.getElementById("feedback-screenshot-url");
  if (screenshotInput) {
    const defaultText = screenshotInput.dataset.defaultText || t("feedback.screenshotDropzoneDefault");
    screenshotInput.textContent = defaultText;
    if (screenshotInput.dataset) {
      delete screenshotInput.dataset.hasInlineImage;
    }
  }
  const preview = document.getElementById("feedback-screenshot-preview");
  if (preview) {
    preview.innerHTML = "";
    preview.style.display = "none";
  }
}
function toggleFeedbackItem(id) {
  const item = feedbackItems.find((f) => f.id === id);
  if (!item) return;
  const oldStatus = item.status;
  const oldResolvedAt = item.resolvedAt;
  const changeRevision = ++feedbackRevision;
  if (item.status === "open") {
    item.status = "done";
    item.resolvedAt = (/* @__PURE__ */ new Date()).toISOString();
  } else {
    item.status = "open";
    delete item.resolvedAt;
  }
  updateCounts();
  renderFeedback();
  enqueueFeedbackDelta(
    { action: "update", item: { id: item.id, status: item.status, resolvedAt: item.resolvedAt || null } },
    {
      onError: () => {
        if (feedbackRevision !== changeRevision) return;
        item.status = oldStatus;
        if (oldResolvedAt) {
          item.resolvedAt = oldResolvedAt;
        } else {
          delete item.resolvedAt;
        }
        updateCounts();
        renderFeedback();
        showErrorNotification(t("error.feedbackStatusFailed"));
      }
    }
  );
  persistFeedbackCacheDebounced();
}
function renderFeedback() {
  const pendingContainer = document.getElementById("feedback-list-pending");
  const doneContainer = document.getElementById("feedback-list-done");
  if (!pendingContainer || !doneContainer) return;
  const typeIcons = {
    bug: "\u{1F41E}",
    improvement: "\u{1F4A1}",
    // Legacy values for backward compatibility
    feature: "\u{1F4A1}",
    idea: "\u{1F4A1}"
  };
  const pendingItems = feedbackItems.filter((f) => f.status === "open").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const doneItems = feedbackItems.filter((f) => f.status === "done").sort((a, b) => new Date(b.resolvedAt || b.createdAt) - new Date(a.resolvedAt || a.createdAt));
  const pendingTotalPages = Math.ceil(pendingItems.length / FEEDBACK_ITEMS_PER_PAGE);
  if (feedbackPendingPage > pendingTotalPages && pendingTotalPages > 0) {
    feedbackPendingPage = pendingTotalPages;
  }
  const pendingStartIndex = (feedbackPendingPage - 1) * FEEDBACK_ITEMS_PER_PAGE;
  const pendingEndIndex = pendingStartIndex + FEEDBACK_ITEMS_PER_PAGE;
  const pendingPageItems = pendingItems.slice(pendingStartIndex, pendingEndIndex);
  const doneTotalPages = Math.ceil(doneItems.length / FEEDBACK_ITEMS_PER_PAGE);
  if (feedbackDonePage > doneTotalPages && doneTotalPages > 0) {
    feedbackDonePage = doneTotalPages;
  }
  const doneStartIndex = (feedbackDonePage - 1) * FEEDBACK_ITEMS_PER_PAGE;
  const doneEndIndex = doneStartIndex + FEEDBACK_ITEMS_PER_PAGE;
  const donePageItems = doneItems.slice(doneStartIndex, doneEndIndex);
  if (pendingItems.length === 0) {
    pendingContainer.innerHTML = `<div class="empty-state" style="padding: 20px;"><p>${t("feedback.empty.pending")}</p></div>`;
  } else {
    pendingContainer.innerHTML = pendingPageItems.map((item) => `
            <div class="feedback-item ${item.status === "done" ? "done" : ""}">
                <input type="checkbox" class="feedback-checkbox"
                       data-feedback-id="${item.id}"
                       ${item.status === "done" ? "checked" : ""}>
                <span class="feedback-type-icon">${typeIcons[item.type] || "\u{1F4A1}"}</span>
                ${item.screenshotUrl ? `<button type="button" class="feedback-screenshot-link" data-action="viewFeedbackScreenshot" data-param="${encodeURIComponent(item.screenshotUrl)}" title="${t("feedback.viewScreenshotTitle")}">\u{1F5BC}\uFE0F</button>` : ""}
                <div class="feedback-description">${escapeHtml(item.description)}</div>
                <div class="feedback-date">${formatDate(item.createdAt)}</div>
                <button class="feedback-delete-btn" data-action="deleteFeedbackItemWithStop" data-param="${item.id}">\u274C</button>
            </div>
        `).join("");
  }
  renderFeedbackPagination("pending", pendingItems.length, pendingTotalPages, feedbackPendingPage);
  if (doneItems.length === 0) {
    doneContainer.innerHTML = `<div class="empty-state" style="padding: 20px;"><p>${t("feedback.empty.done")}</p></div>`;
  } else {
    doneContainer.innerHTML = donePageItems.map((item) => `
            <div class="feedback-item done">
                <input type="checkbox" class="feedback-checkbox"
                       data-feedback-id="${item.id}"
                       checked>
                <span class="feedback-type-icon">${typeIcons[item.type] || "\u{1F4A1}"}</span>
                ${item.screenshotUrl ? `<button type="button" class="feedback-screenshot-link" data-action="viewFeedbackScreenshot" data-param="${encodeURIComponent(item.screenshotUrl)}" title="${t("feedback.viewScreenshotTitle")}">\u{1F5BC}\uFE0F</button>` : ""}
                <div class="feedback-description">${escapeHtml(item.description)}</div>
                <div class="feedback-date">${formatDate(item.createdAt)}</div>
                <button class="feedback-delete-btn" data-action="deleteFeedbackItemWithStop" data-param="${item.id}">\u274C</button>
            </div>
        `).join("");
  }
  renderFeedbackPagination("done", doneItems.length, doneTotalPages, feedbackDonePage);
}
function renderFeedbackPagination(section, totalItems, totalPages, currentPage) {
  const containerId = section === "pending" ? "feedback-pagination-pending" : "feedback-pagination-done";
  const container = document.getElementById(containerId);
  if (!container) return;
  if (totalPages <= 1) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }
  container.style.display = "flex";
  const startItem = (currentPage - 1) * FEEDBACK_ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * FEEDBACK_ITEMS_PER_PAGE, totalItems);
  let paginationHTML = `
        <div class="feedback-pagination-info">
            ${t("feedback.pagination.showing", { start: startItem, end: endItem, total: totalItems })}
        </div>
        <div class="feedback-pagination-controls">
            <button
                class="feedback-pagination-btn"
                onclick="changeFeedbackPage('${section}', 1)"
                ${currentPage === 1 ? "disabled" : ""}
                title="${t("feedback.pagination.first")}">
                &laquo;
            </button>
            <button
                class="feedback-pagination-btn"
                onclick="changeFeedbackPage('${section}', ${currentPage - 1})"
                ${currentPage === 1 ? "disabled" : ""}
                title="${t("feedback.pagination.prev")}">
                &lsaquo;
            </button>
            <span class="feedback-pagination-page">
                ${t("feedback.pagination.pageOf", { current: currentPage, total: totalPages })}
            </span>
            <button
                class="feedback-pagination-btn"
                onclick="changeFeedbackPage('${section}', ${currentPage + 1})"
                ${currentPage === totalPages ? "disabled" : ""}
                title="${t("feedback.pagination.next")}">
                &rsaquo;
            </button>
            <button
                class="feedback-pagination-btn"
                onclick="changeFeedbackPage('${section}', ${totalPages})"
                ${currentPage === totalPages ? "disabled" : ""}
                title="${t("feedback.pagination.last")}">
                &raquo;
            </button>
        </div>
    `;
  container.innerHTML = paginationHTML;
}
function changeFeedbackPage(section, newPage) {
  const scrollContainer = document.querySelector("#feedback .page-content");
  const activeEl = document.activeElement;
  const wasPaginationClick = !!(activeEl && activeEl.classList && activeEl.classList.contains("feedback-pagination-btn"));
  const wasNearBottom = !!(scrollContainer && scrollContainer.scrollHeight - (scrollContainer.scrollTop + scrollContainer.clientHeight) < 80);
  if (section === "pending") {
    feedbackPendingPage = newPage;
  } else {
    feedbackDonePage = newPage;
  }
  renderFeedback();
  const paginationId = section === "pending" ? "feedback-pagination-pending" : "feedback-pagination-done";
  const sectionId = section === "pending" ? "feedback-list-pending" : "feedback-list-done";
  const targetId = wasPaginationClick || wasNearBottom ? paginationId : sectionId;
  const target = document.getElementById(targetId);
  if (target) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: targetId === paginationId ? "end" : "start"
        });
      });
    });
  }
}
window.changeFeedbackPage = changeFeedbackPage;
function setupModalTabs() {
  document.querySelectorAll(".modal-content .modal-tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      const tabName = e.target.dataset.tab;
      const modalContent = e.target.closest(".modal-content");
      if (!modalContent) return;
      try {
        const isTaskModal = !!modalContent.closest("#task-modal");
        if (isTaskModal) {
          const footer = modalContent.querySelector("#task-footer");
          const inEditMode = footer && window.getComputedStyle(footer).display === "none";
          if (inEditMode) {
            if (tabName === "history") {
              const h = Math.round(modalContent.getBoundingClientRect().height);
              if (h > 0) {
                modalContent.style.minHeight = `${h}px`;
                modalContent.style.maxHeight = `${h}px`;
              }
            } else if (tabName === "general" || tabName === "details") {
              modalContent.style.minHeight = "";
              modalContent.style.maxHeight = "";
            }
          }
        }
      } catch (err) {
      }
      modalContent.querySelectorAll(".modal-tab").forEach((t2) => t2.classList.remove("active"));
      e.target.classList.add("active");
      if (tabName === "general" || tabName === "details") {
        const taskDetailsTab = modalContent.querySelector("#task-details-tab");
        const taskHistoryTab = modalContent.querySelector("#task-history-tab");
        if (taskDetailsTab && taskHistoryTab) {
          modalContent.querySelectorAll(".modal-tab-content").forEach((content) => {
            content.classList.remove("active");
          });
          taskDetailsTab.classList.add("active");
          if (tabName === "details") {
            document.body.classList.add("mobile-tab-details-active");
          } else {
            document.body.classList.remove("mobile-tab-details-active");
          }
          return;
        }
      }
      document.body.classList.remove("mobile-tab-details-active");
      modalContent.querySelectorAll(".modal-tab-content").forEach((content) => {
        content.classList.remove("active");
      });
      const targetTab = modalContent.querySelector(`#task-${tabName}-tab`);
      if (targetTab) {
        targetTab.classList.add("active");
        if (tabName === "history") {
          const form = document.getElementById("task-form");
          const editingTaskId = form?.dataset.editingTaskId;
          if (editingTaskId) {
            renderTaskHistory(parseInt(editingTaskId));
          }
          const historyContainer = document.querySelector(".task-history-container");
          if (historyContainer) {
            historyContainer.scrollTop = 0;
          }
        }
      }
    });
  });
}
function renderTaskHistory(taskId) {
  if (!window.historyService) return;
  const task = tasks.find((t2) => t2.id === taskId);
  if (!task) return;
  let history = window.historyService.getEntityHistory("task", taskId);
  const timeline = document.getElementById("task-history-timeline");
  const emptyState = document.getElementById("task-history-empty");
  if (!timeline) return;
  if (history.length === 0) {
    timeline.innerHTML = "";
    if (emptyState) {
      emptyState.style.display = "flex";
      emptyState.style.flexDirection = "column";
      emptyState.style.alignItems = "center";
      emptyState.style.padding = "48px 20px";
    }
    return;
  }
  if (emptyState) emptyState.style.display = "none";
  if (settings.historySortOrder === "oldest") {
    history = [...history].reverse();
  }
  let sortButton = document.getElementById("history-sort-toggle");
  if (!sortButton) {
    const historyContainer = timeline.parentElement;
    sortButton = document.createElement("button");
    sortButton.id = "history-sort-toggle";
    sortButton.className = "history-sort-toggle";
    sortButton.innerHTML = settings.historySortOrder === "newest" ? t("history.sort.newest") : t("history.sort.oldest");
    sortButton.onclick = () => toggleHistorySortOrder("task", taskId);
    historyContainer.insertBefore(sortButton, timeline);
  } else {
    sortButton.innerHTML = settings.historySortOrder === "newest" ? t("history.sort.newest") : t("history.sort.oldest");
  }
  timeline.innerHTML = history.map((entry) => renderHistoryEntryInline(entry)).join("");
}
function toggleHistorySortOrder(entityType, entityId) {
  settings.historySortOrder = settings.historySortOrder === "newest" ? "oldest" : "newest";
  saveSettings2();
  if (entityType === "task" && entityId) {
    renderTaskHistory(entityId);
  } else if (entityType === "project" && entityId) {
    renderProjectHistory(entityId);
  } else {
    const form = document.getElementById("task-form");
    const editingTaskId = form?.dataset.editingTaskId;
    if (editingTaskId) {
      renderTaskHistory(parseInt(editingTaskId));
    }
    const projectDetailsEl = document.getElementById("project-details");
    if (projectDetailsEl && projectDetailsEl.classList.contains("active")) {
      const projectIdMatch = projectDetailsEl.innerHTML.match(/renderProjectHistory\((\d+)\)/);
      if (projectIdMatch) {
        renderProjectHistory(parseInt(projectIdMatch[1]));
      }
    }
  }
}
function renderProjectHistory(projectId) {
  if (!window.historyService) return;
  const project = projects.find((p) => p.id === projectId);
  if (!project) return;
  let history = window.historyService.getEntityHistory("project", projectId);
  const timeline = document.getElementById(`project-history-timeline-${projectId}`);
  const emptyState = document.getElementById(`project-history-empty-${projectId}`);
  if (!timeline) return;
  if (history.length === 0) {
    timeline.innerHTML = "";
    if (emptyState) {
      emptyState.style.display = "flex";
      emptyState.style.flexDirection = "column";
      emptyState.style.alignItems = "center";
      emptyState.style.padding = "48px 20px";
    }
    return;
  }
  if (emptyState) emptyState.style.display = "none";
  if (settings.historySortOrder === "oldest") {
    history = [...history].reverse();
  }
  let sortButton = document.getElementById(`project-history-sort-toggle-${projectId}`);
  if (!sortButton) {
    const historyContainer = timeline.parentElement;
    sortButton = document.createElement("button");
    sortButton.id = `project-history-sort-toggle-${projectId}`;
    sortButton.className = "history-sort-toggle";
    sortButton.innerHTML = settings.historySortOrder === "newest" ? t("history.sort.newest") : t("history.sort.oldest");
    sortButton.onclick = () => toggleHistorySortOrder("project", projectId);
    historyContainer.insertBefore(sortButton, timeline);
  } else {
    sortButton.innerHTML = settings.historySortOrder === "newest" ? t("history.sort.newest") : t("history.sort.oldest");
  }
  timeline.innerHTML = history.map((entry) => renderHistoryEntryInline(entry)).join("");
}
function renderHistoryEntryInline(entry) {
  const actionIcons = {
    created: "\u2728",
    updated: "",
    deleted: "\u{1F5D1}\uFE0F"
  };
  const actionColors = {
    created: "var(--accent-green)",
    updated: "var(--text-secondary)",
    deleted: "var(--accent-red)"
  };
  const time = new Date(entry.timestamp).toLocaleString(getLocale(), {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const changes = Object.entries(entry.changes);
  const changeCount = changes.length;
  const fieldLabels = {
    title: t("history.field.title"),
    name: t("history.field.name"),
    description: t("history.field.description"),
    status: t("history.field.status"),
    priority: t("history.field.priority"),
    category: t("history.field.category"),
    startDate: t("history.field.startDate"),
    endDate: t("history.field.endDate"),
    link: t("history.field.link"),
    task: t("history.field.task"),
    projectId: t("history.field.projectId"),
    tags: t("history.field.tags"),
    attachments: t("history.field.attachments")
  };
  return `
        <div class="history-entry-inline">
            <div class="history-entry-header-inline">
                ${actionIcons[entry.action] ? `<span class="history-action-icon" style="color: ${actionColors[entry.action]};">${actionIcons[entry.action]}</span>` : ""}
                ${entry.action === "created" || entry.action === "deleted" ? `<span class="history-action-label-inline" style="color: ${actionColors[entry.action]};">${entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}</span>` : ""}
                <span class="history-time-inline">${time}</span>
            </div>

            ${changeCount > 0 ? `
                <div class="history-changes-compact">
                    ${changes.map(([field, { before, after }]) => {
    const label = fieldLabels[field] || field;
    if (field === "link" || field === "task") {
      const action = after && typeof after === "object" ? after.action : "";
      const entity = (after && typeof after === "object" ? after.entity : null) || "task";
      const title = after && typeof after === "object" ? after.title || after.id || t("tasks.table.task") : String(after);
      const icon = action === "removed" ? "\u274C" : "\u2795";
      const verb = action === "removed" ? t("history.link.removed") : t("history.link.added");
      const entityLabel = entity === "task" ? t("history.entity.task") : entity;
      const message = `${icon} ${verb} ${entityLabel} "${title}"`;
      return `
                                <div class="history-change-compact history-change-compact--single">
                                    <span class="change-field-label">${label}:</span>
                                    <span class="change-after-compact">${escapeHtml(message)}</span>
                                </div>
                            `;
    }
    if (field === "description") {
      const oldText = before ? before.replace(/<[^>]*>/g, "").trim() : "";
      const newText = after ? after.replace(/<[^>]*>/g, "").trim() : "";
      return `
                                <div class="history-change-description">
                                    <div class="change-field-label">${label}:</div>
                                    <div class="description-diff">
                                        ${oldText ? `<div class="description-before"><s>${escapeHtml(oldText)}</s></div>` : `<div class="description-before"><em style="opacity: 0.6;">${t("history.value.empty")}</em></div>`}
                                        ${newText ? `<div class="description-after">${escapeHtml(newText)}</div>` : `<div class="description-after"><em style="opacity: 0.6;">${t("history.value.empty")}</em></div>`}
                                    </div>
                                </div>
                            `;
    }
    const beforeValue = formatChangeValueCompact(field, before, true);
    const afterValue = formatChangeValueCompact(field, after, false);
    return `
                            <div class="history-change-compact">
                                <span class="change-field-label">${label}:</span>
                                ${beforeValue !== null ? `<span class="change-before-compact">${beforeValue}</span>` : '<span class="change-null">\u2014</span>'}
                                <span class="change-arrow-compact">${t("history.change.arrow")}</span>
                                ${afterValue !== null ? `<span class="change-after-compact">${afterValue}</span>` : '<span class="change-null">\u2014</span>'}
                            </div>
                        `;
  }).join("")}
                </div>
            ` : ""}
        </div>
    `;
}
function formatChangeValueCompact(field, value, isBeforeValue = false) {
  if (value === null || value === void 0) return null;
  if (value === "") return `<em style="opacity: 0.7;">${t("history.value.empty")}</em>`;
  if (field === "startDate" || field === "endDate") {
    const dateStr = formatDate(value);
    return isBeforeValue ? `<span style="opacity: 0.7;">${dateStr}</span>` : dateStr;
  }
  if (field === "link" || field === "task") {
    const action = value && typeof value === "object" ? value.action : "";
    const entity = (value && typeof value === "object" ? value.entity : null) || "task";
    const title = value && typeof value === "object" ? value.title || value.id || t("tasks.table.task") : String(value);
    const icon = action === "removed" ? "\u274C" : "\u2795";
    const verb = action === "removed" ? t("history.link.removed") : t("history.link.added");
    const entityLabel = entity === "task" ? t("history.entity.task") : entity;
    const text = `${icon} ${verb} ${entityLabel} "${title}"`;
    return isBeforeValue ? `<span style="opacity: 0.7;">${escapeHtml(text)}</span>` : escapeHtml(text);
  }
  if (field === "status") {
    const statusLabel = getStatusLabel(value).toUpperCase();
    const statusColors = {
      backlog: "#4B5563",
      todo: "#186f95",
      progress: "var(--accent-blue)",
      review: "var(--accent-amber)",
      done: "var(--accent-green)"
    };
    const bgColor = statusColors[value] || "#4B5563";
    return `<span style="background: ${bgColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11.5px; font-weight: 600; text-transform: uppercase;">${escapeHtml(statusLabel)}</span>`;
  }
  if (field === "priority") {
    const priorityLabel = getPriorityLabel(value);
    const priorityColor = PRIORITY_COLORS[value] || "var(--text-secondary)";
    return `<span style="color: ${priorityColor}; font-weight: 600; font-size: 12px;">\u25CF</span> <span style="font-weight: 500;">${escapeHtml(priorityLabel)}</span>`;
  }
  if (field === "projectId") {
    if (!value) return `<em style="opacity: 0.7;">${t("tasks.noProject")}</em>`;
    const project = projects.find((p) => p.id === value);
    const projectName = project ? escapeHtml(project.name) : `#${value}`;
    return isBeforeValue ? `<span style="opacity: 0.7;">${projectName}</span>` : projectName;
  }
  if (field === "tags") {
    if (!Array.isArray(value) || value.length === 0) return `<em style="opacity: 0.7;">${t("history.value.none")}</em>`;
    return value.slice(0, 2).map((tag) => {
      const tagColor = getTagColor(tag);
      return `<span style="background-color: ${tagColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`;
    }).join(" ") + (value.length > 2 ? " ..." : "");
  }
  if (field === "attachments") {
    if (!Array.isArray(value) || value.length === 0) return `<em style="opacity: 0.7;">${t("history.value.none")}</em>`;
    const attachStr = value.length === 1 ? t("history.attachments.countSingle", { count: value.length }) : t("history.attachments.countPlural", { count: value.length });
    return isBeforeValue ? `<span style="opacity: 0.7;">${attachStr}</span>` : attachStr;
  }
  if (field === "description") {
    const text = value.replace(/<[^>]*>/g, "").trim();
    const shortText = text.length > 50 ? escapeHtml(text.substring(0, 50)) + "..." : escapeHtml(text) || `<em>${t("history.value.empty")}</em>`;
    return isBeforeValue ? `<span style="opacity: 0.7;">${shortText}</span>` : shortText;
  }
  const escapedValue = escapeHtml(String(value));
  return isBeforeValue ? `<span style="opacity: 0.7;">${escapedValue}</span>` : escapedValue;
}
function toggleHistoryEntryInline(entryId) {
  const details = document.getElementById(`history-details-inline-${entryId}`);
  const btn = document.querySelector(`[data-action="toggleHistoryEntryInline"][data-param="${entryId}"]`);
  const icon = btn?.querySelector(".expand-icon-inline");
  if (details) {
    const isVisible = details.style.display !== "none";
    details.style.display = isVisible ? "none" : "block";
    if (icon) {
      icon.textContent = isVisible ? "\u25BC" : "\u25B2";
    }
  }
}
var feedbackItemToDelete = null;
function deleteFeedbackItem2(id) {
  feedbackItemToDelete = id;
  document.getElementById("feedback-delete-modal").classList.add("active");
}
function closeFeedbackDeleteModal() {
  document.getElementById("feedback-delete-modal").classList.remove("active");
  feedbackItemToDelete = null;
}
async function confirmFeedbackDelete() {
  if (feedbackItemToDelete !== null) {
    const deleteId = feedbackItemToDelete;
    feedbackItems = feedbackItems.filter((f) => f.id !== feedbackItemToDelete);
    feedbackIndex = feedbackIndex.filter((id) => id !== deleteId);
    feedbackRevision++;
    closeFeedbackDeleteModal();
    updateCounts();
    renderFeedback();
    enqueueFeedbackDelta({ action: "delete", targetId: deleteId });
    persistFeedbackCache2();
  }
}
document.addEventListener("click", function(e) {
  const checkbox = e.target.closest(".feedback-checkbox");
  if (checkbox) {
    const feedbackId = parseInt(checkbox.dataset.feedbackId, 10);
    if (feedbackId) {
      toggleFeedbackItem(feedbackId);
    }
  }
});
function editProjectTitle(projectId, currentName) {
  document.getElementById("project-title-display").style.display = "none";
  document.getElementById("project-title-edit").style.display = "flex";
  document.getElementById("project-title-input").focus();
  document.getElementById("project-title-input").select();
}
function saveProjectTitle(projectId) {
  const newTitle = document.getElementById("project-title-input").value.trim();
  if (newTitle) {
    updateProjectField2(projectId, "name", newTitle);
  } else {
    cancelProjectTitle();
  }
}
function cancelProjectTitle() {
  document.getElementById("project-title-display").style.display = "inline";
  document.getElementById("project-title-edit").style.display = "none";
}
function dismissKanbanTip() {
  document.getElementById("kanban-tip").style.display = "none";
  localStorage.setItem("kanban-tip-dismissed", "true");
}
function toggleProjectMenu(event) {
  event.stopPropagation();
  const menu = document.getElementById("project-options-menu");
  if (menu) {
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  }
}
document.addEventListener("click", function(e) {
  const menu = document.getElementById("project-options-menu");
  if (menu && !e.target.closest("#project-options-btn") && !e.target.closest("#project-options-menu")) {
    menu.style.display = "none";
  }
});
document.addEventListener("DOMContentLoaded", function() {
  if (localStorage.getItem("kanban-tip-dismissed") === "true") {
    const tip = document.getElementById("kanban-tip");
    if (tip) tip.style.display = "none";
  }
});
async function addAttachment() {
  const urlInput = document.getElementById("attachment-url");
  const nameInput = document.getElementById("attachment-name");
  const url = urlInput.value.trim();
  if (!url) {
    urlInput.style.border = "2px solid var(--accent-red, #ef4444)";
    urlInput.placeholder = "URL is required";
    urlInput.focus();
    setTimeout(() => {
      urlInput.style.border = "";
      urlInput.placeholder = "Paste link (Drive, Dropbox, etc.)";
    }, 2e3);
    return;
  }
  urlInput.style.border = "";
  const taskId = document.getElementById("task-form").dataset.editingTaskId;
  let name = nameInput.value.trim() || "Attachment";
  let icon = "\u{1F4C1}";
  if (!nameInput.value.trim()) {
    try {
      const urlObj = new URL(url);
      let path = urlObj.pathname.toLowerCase();
      if (urlObj.hostname.includes("docs.google.com")) {
        if (path.includes("/document/")) {
          name = t("tasks.attachments.googleDoc");
          icon = "\u{1F4C4}";
        } else if (path.includes("/spreadsheets/")) {
          name = t("tasks.attachments.googleSheet");
          icon = "\u{1F4CA}";
        } else if (path.includes("/presentation/")) {
          name = t("tasks.attachments.googleSlides");
          icon = "\u{1F4D1}";
        } else {
          name = t("tasks.attachments.googleDriveFile");
          icon = "\u{1F5C2}\uFE0F";
        }
      } else if (urlObj.hostname.includes("drive.google.com")) {
        name = t("tasks.attachments.googleDriveFile");
        icon = "\u{1F5C2}\uFE0F";
      } else if (path.endsWith(".pdf")) {
        name = path.split("/").pop() || t("tasks.attachments.pdf");
        icon = "\u{1F4D5}";
      } else if (path.endsWith(".doc") || path.endsWith(".docx")) {
        name = path.split("/").pop() || t("tasks.attachments.word");
        icon = "\u{1F4DD}";
      } else if (path.endsWith(".xls") || path.endsWith(".xlsx")) {
        name = path.split("/").pop() || t("tasks.attachments.excel");
        icon = "\u{1F4CA}";
      } else if (path.endsWith(".ppt") || path.endsWith(".pptx")) {
        name = path.split("/").pop() || t("tasks.attachments.powerpoint");
        icon = "\u{1F4D1}";
      } else {
        let lastPart = path.split("/").pop();
        name = lastPart && lastPart.length > 0 ? lastPart : urlObj.hostname;
        icon = "\u{1F4C1}";
      }
    } catch (e) {
      name = url.substring(0, 30);
      icon = "\u{1F4C1}";
    }
  }
  icon = "\u{1F310}";
  const attachment = { name, icon, type: "link", url, addedAt: (/* @__PURE__ */ new Date()).toISOString() };
  if (taskId) {
    const task = tasks.find((t2) => t2.id === parseInt(taskId));
    if (!task) return;
    if (!task.attachments) task.attachments = [];
    task.attachments.push(attachment);
    renderAttachments(task.attachments);
    reorganizeMobileTaskFields();
    saveTasks2().catch((error) => {
      console.error("Failed to save attachment:", error);
      showErrorNotification(t("error.attachmentSaveFailed"));
    });
  } else {
    tempAttachments.push(attachment);
    renderAttachments(tempAttachments);
  }
  urlInput.value = "";
  nameInput.value = "";
}
async function renderAttachments(attachments) {
  const filesContainer = document.getElementById("attachments-files-list");
  const linksContainer = document.getElementById("attachments-links-list");
  if (filesContainer && linksContainer) {
    await renderAttachmentsSeparated(attachments, filesContainer, linksContainer);
    return;
  }
  const container = document.getElementById("attachments-list");
  if (!container) return;
  if (!attachments || attachments.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; padding: 8px 0;">${t("tasks.attachments.none")}</div>`;
    return;
  }
  const getUrlHost = (rawUrl) => {
    if (!rawUrl) return "";
    try {
      const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawUrl);
      const url = new URL(hasScheme ? rawUrl : `https://${rawUrl}`);
      return (url.host || rawUrl).replace(/^www\./, "");
    } catch {
      return rawUrl;
    }
  };
  container.innerHTML = attachments.map((att, index) => {
    const sizeInKB = att.size ? Math.round(att.size / 1024) : 0;
    const sizeText = sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} MB` : `${sizeInKB} KB`;
    if (att.type === "file" && att.fileKey) {
      const isImage = att.fileType === "image";
      const thumbnailHtml = `<div id="thumbnail-${att.fileKey}" class="attachment-thumb" aria-hidden="true">${att.icon}</div>`;
      const primaryAction = isImage ? "viewFile" : "downloadFileAttachment";
      const primaryParams = isImage ? `data-param="${att.fileKey}" data-param2="${escapeHtml(att.name)}" data-param3="${att.fileType}"` : `data-param="${att.fileKey}" data-param2="${escapeHtml(att.name)}" data-param3="${att.mimeType}"`;
      return `
                <div class="attachment-item">
                    <button type="button" class="attachment-link" data-action="${primaryAction}" ${primaryParams}>
                        ${thumbnailHtml}
                        <span class="attachment-name">${escapeHtml(att.name)} <span class="attachment-meta">&middot; ${sizeText}</span></span>
                    </button>
                    <button type="button" class="attachment-remove" data-action="removeAttachment" data-param="${index}" aria-label="${t("tasks.attachments.remove")}" title="${t("tasks.attachments.removeTitle")}">&times;</button>
                </div>
            `;
    } else if (att.type === "image" && att.data) {
      return `
                <div class="attachment-item">
                    <button type="button" class="attachment-link" data-action="viewImageLegacy" data-param="${att.data}" data-param2="${escapeHtml(att.name)}">
                        <span class="attachment-thumb" aria-hidden="true"><img src="${att.data}" alt=""></span>
                        <span class="attachment-name">${escapeHtml(att.name)} <span class="attachment-meta">&middot; ${sizeText}</span></span>
                    </button>
                    <button type="button" class="attachment-remove" data-action="removeAttachment" data-param="${index}" aria-label="${t("tasks.attachments.remove")}" title="${t("tasks.attachments.removeTitle")}">&times;</button>
                </div>
            `;
    } else {
      return `
                <div class="attachment-item" style="display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border);">
                    <div style="width: 40px; height: 40px; background: transparent; border-radius: 0; display: flex; align-items: center; justify-content: center; font-size: 25px; line-height: 1;">\u{1F310}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 14px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(att.name)}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: none;">${escapeHtml(att.url)}</div>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button type="button" data-action="openUrlAttachment" data-param="${encodeURIComponent(att.url)}" style="padding: 0 12px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; appearance: none; -webkit-appearance: none;">${t("tasks.attachments.open")}</button>
                        <button type="button" class="attachment-remove" data-action="removeAttachment" data-param="${index}" aria-label="${t("tasks.attachments.removeLink")}" title="${t("tasks.attachments.removeTitle")}">&times;</button>
                    </div>
                </div>
            `;
    }
  }).join("");
  for (const att of attachments) {
    if (att.type === "file" && att.fileKey && att.fileType === "image") {
      try {
        const base64Data = await downloadFile(att.fileKey);
        const thumbnailEl = document.getElementById(`thumbnail-${att.fileKey}`);
        if (thumbnailEl && base64Data) {
          thumbnailEl.innerHTML = `<img src="${base64Data}" alt="${escapeHtml(att.name)}">`;
        }
      } catch (error) {
        console.error("Failed to load thumbnail:", error);
      }
    }
  }
}
async function renderAttachmentsSeparated(attachments, filesContainer, linksContainer) {
  if (!filesContainer || !linksContainer) return;
  const indexed = (attachments || []).map((att, index) => ({ att, index }));
  const fileItems = indexed.filter(({ att }) => {
    if (!att) return false;
    if (att.type === "file") return true;
    if (att.fileKey) return true;
    if (att.type === "image" && att.data) return true;
    return false;
  });
  const linkItems = indexed.filter(({ att }) => {
    if (!att) return false;
    if (att.type === "link") return true;
    if (att.url && att.type !== "file") return true;
    return false;
  });
  const getUrlHost = (rawUrl) => {
    if (!rawUrl) return "";
    try {
      const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawUrl);
      const url = new URL(hasScheme ? rawUrl : `https://${rawUrl}`);
      return (url.host || rawUrl).replace(/^www\./, "");
    } catch {
      return rawUrl;
    }
  };
  const fileRows = fileItems.map(({ att, index }) => {
    const sizeInKB = att.size ? Math.round(att.size / 1024) : 0;
    const sizeText = sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} MB` : `${sizeInKB} KB`;
    if (att.type === "file" && att.fileKey) {
      const isImage = att.fileType === "image";
      const thumbnailHtml = `<div id="thumbnail-${att.fileKey}" class="attachment-thumb" aria-hidden="true">${att.icon}</div>`;
      const primaryAction = isImage ? "viewFile" : "downloadFileAttachment";
      const primaryParams = isImage ? `data-param="${att.fileKey}" data-param2="${escapeHtml(att.name)}" data-param3="${att.fileType}"` : `data-param="${att.fileKey}" data-param2="${escapeHtml(att.name)}" data-param3="${att.mimeType}"`;
      return `
                <div class="attachment-item">
                    <button type="button" class="attachment-link" data-action="${primaryAction}" ${primaryParams}>
                        ${thumbnailHtml}
                        <span class="attachment-name">${escapeHtml(att.name)} <span class="attachment-meta">&middot; ${sizeText}</span></span>
                    </button>
                    <button type="button" class="attachment-remove" data-action="removeAttachment" data-param="${index}" aria-label="${t("tasks.attachments.remove")}" title="${t("tasks.attachments.removeTitle")}">&times;</button>
                </div>
            `;
    }
    if (att.type === "image" && att.data) {
      return `
                <div class="attachment-item">
                    <button type="button" class="attachment-link" data-action="viewImageLegacy" data-param="${att.data}" data-param2="${escapeHtml(att.name)}">
                        <span class="attachment-thumb" aria-hidden="true"><img src="${att.data}" alt=""></span>
                        <span class="attachment-name">${escapeHtml(att.name)} <span class="attachment-meta">&middot; ${sizeText}</span></span>
                    </button>
                    <button type="button" class="attachment-remove" data-action="removeAttachment" data-param="${index}" aria-label="${t("tasks.attachments.remove")}" title="${t("tasks.attachments.removeTitle")}">&times;</button>
                </div>
            `;
    }
    return "";
  }).filter(Boolean).join("");
  const linkRows = linkItems.map(({ att, index }) => `
        <div class="attachment-item" style="display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border);">
            <div style="width: 40px; height: 40px; background: transparent; border-radius: 0; display: flex; align-items: center; justify-content: center; font-size: 25px; line-height: 1;">\u{1F310}</div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-size: 14px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(att.name)}</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: none;">${escapeHtml(att.url)}</div>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
                <button type="button" data-action="openUrlAttachment" data-param="${encodeURIComponent(att.url)}" style="padding: 0 12px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; appearance: none; -webkit-appearance: none;">${t("tasks.attachments.open")}</button>
                <button type="button" class="attachment-remove" data-action="removeAttachment" data-param="${index}" aria-label="${t("tasks.attachments.removeLink")}" title="${t("tasks.attachments.removeTitle")}">&times;</button>
            </div>
        </div>
    `).join("");
  const hasAny = Boolean(fileRows) || Boolean(linkRows);
  if (!hasAny) {
    filesContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; padding: 8px 0;">${t("tasks.attachments.none")}</div>`;
    linksContainer.innerHTML = "";
  } else {
    filesContainer.innerHTML = fileRows || "";
    linksContainer.innerHTML = linkRows || "";
  }
  for (const att of attachments || []) {
    if (att && att.type === "file" && att.fileKey && att.fileType === "image") {
      try {
        const base64Data = await downloadFile(att.fileKey);
        const thumbnailEl = document.getElementById(`thumbnail-${att.fileKey}`);
        if (thumbnailEl && base64Data) {
          thumbnailEl.innerHTML = `<img src="${base64Data}" alt="${escapeHtml(att.name)}">`;
        }
      } catch (error) {
        console.error("Failed to load thumbnail:", error);
      }
    }
  }
}
async function viewFile(fileKey, fileName, fileType) {
  if (fileType !== "image") return;
  try {
    const base64Data = await downloadFile(fileKey);
    viewImageLegacy(base64Data, fileName);
  } catch (error) {
    showErrorNotification(t("error.attachmentLoadFailed", { message: error.message }));
  }
}
function viewImageLegacy(base64Data, imageName) {
  const modal = document.createElement("div");
  modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: pointer;
    `;
  modal.innerHTML = `
        <div style="max-width: 90%; max-height: 90%; display: flex; flex-direction: column; align-items: center;">
            <div style="color: white; padding: 16px; font-size: 18px; background: rgba(0,0,0,0.5); border-radius: 8px 8px 0 0; width: 100%; text-align: center;">
                ${escapeHtml(imageName)}
            </div>
            <img src="${base64Data}" alt="${escapeHtml(imageName)}" style="max-width: 100%; max-height: calc(90vh - 60px); object-fit: contain; border-radius: 0 0 8px 8px;">
        </div>
    `;
  modal.onclick = () => modal.remove();
  document.body.appendChild(modal);
}
async function downloadFileAttachment(fileKey, fileName, mimeType) {
  try {
    const base64Data = await downloadFile(fileKey);
    const base64Response = await fetch(base64Data);
    const blob = await base64Response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccessNotification(t("success.fileDownloaded"));
  } catch (error) {
    showErrorNotification(t("error.fileDownloadFailed", { message: error.message }));
  }
}
async function removeAttachment(index) {
  const taskId = document.getElementById("task-form").dataset.editingTaskId;
  if (taskId) {
    const task = tasks.find((t2) => t2.id === parseInt(taskId));
    if (!task || !task.attachments) return;
    const attachment = task.attachments[index];
    if (attachment.type === "file" && attachment.fileKey) {
      try {
        await deleteFile(attachment.fileKey);
        showSuccessNotification(t("success.attachmentDeletedFromStorage", { name: attachment.name }));
      } catch (error) {
        console.error("Failed to delete file from storage:", error);
        showErrorNotification(t("error.fileDeleteFailed"));
        return;
      }
    } else {
      showSuccessNotification(t("success.attachmentRemoved"));
    }
    task.attachments.splice(index, 1);
    renderAttachments(task.attachments);
    reorganizeMobileTaskFields();
    saveTasks2().catch((err) => {
      console.error("Failed to save attachment removal:", err);
      showErrorNotification(t("error.saveChangesFailed"));
    });
  } else {
    const attachment = tempAttachments[index];
    if (attachment.type === "file" && attachment.fileKey) {
      try {
        await deleteFile(attachment.fileKey);
        showSuccessNotification(t("success.attachmentDeletedFromStorage", { name: attachment.name }));
      } catch (error) {
        console.error("Failed to delete file from storage:", error);
        showErrorNotification(t("error.fileDeleteFailed"));
        return;
      }
    } else {
      showSuccessNotification(t("success.attachmentRemoved"));
    }
    tempAttachments.splice(index, 1);
    renderAttachments(tempAttachments);
  }
}
function initTaskAttachmentDropzone() {
  const dropzone = document.getElementById("attachment-file-dropzone");
  const fileInput = document.getElementById("attachment-file");
  if (!dropzone || !fileInput) return;
  const isMobileScreen = getIsMobileCached();
  const defaultText = isMobileScreen ? t("tasks.modal.attachmentsDropzoneTap") : t("tasks.modal.attachmentsDropzoneDefault");
  dropzone.dataset.defaultText = defaultText;
  function setDropzoneText(text) {
    dropzone.innerHTML = "";
    const textEl = document.createElement("span");
    textEl.className = "task-attachment-dropzone-text";
    textEl.textContent = text;
    dropzone.appendChild(textEl);
  }
  function applyDropzoneBaseStyles(el) {
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.gap = "10px";
    el.style.padding = "12px 16px";
    el.style.textAlign = "center";
    el.style.cursor = "pointer";
    el.style.userSelect = "none";
    el.style.minHeight = "48px";
    el.style.border = "2px dashed var(--border)";
    el.style.borderRadius = "10px";
    el.style.background = "var(--bg-tertiary)";
    el.style.boxShadow = "none";
    el.style.color = "var(--text-muted)";
    el.style.fontWeight = "500";
    el.style.transition = "border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease";
  }
  function setDropzoneDragoverStyles(el, isActive) {
    if (isActive) {
      el.style.borderColor = "var(--accent-blue)";
      el.style.background = "rgba(59, 130, 246, 0.08)";
      el.style.boxShadow = "0 0 0 1px var(--accent-blue)";
    } else {
      el.style.border = "2px dashed var(--border)";
      el.style.background = "var(--bg-tertiary)";
      el.style.boxShadow = "none";
    }
  }
  applyDropzoneBaseStyles(dropzone);
  setDropzoneText(defaultText);
  async function handleDropOrPasteFileList(fileList, event) {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    await uploadTaskAttachmentFile(file, dropzone);
  }
  let dragDepth = 0;
  dropzone.addEventListener("dragenter", function(e) {
    e.preventDefault();
    dragDepth += 1;
    dropzone.classList.add("task-attachment-dragover");
    setDropzoneDragoverStyles(dropzone, true);
  });
  dropzone.addEventListener("dragover", function(e) {
    e.preventDefault();
    dropzone.classList.add("task-attachment-dragover");
    setDropzoneDragoverStyles(dropzone, true);
  });
  dropzone.addEventListener("dragleave", function(e) {
    e.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) {
      dropzone.classList.remove("task-attachment-dragover");
      setDropzoneDragoverStyles(dropzone, false);
    }
  });
  dropzone.addEventListener("drop", function(e) {
    dragDepth = 0;
    dropzone.classList.remove("task-attachment-dragover");
    setDropzoneDragoverStyles(dropzone, false);
    handleDropOrPasteFileList(e.dataTransfer && e.dataTransfer.files, e);
  });
  dropzone.addEventListener("dragend", function() {
    dragDepth = 0;
    dropzone.classList.remove("task-attachment-dragover");
    setDropzoneDragoverStyles(dropzone, false);
  });
  dropzone.addEventListener("paste", function(e) {
    if (!e.clipboardData) return;
    const files = e.clipboardData.files;
    if (files && files.length > 0) {
      handleDropOrPasteFileList(files, e);
    }
  });
  dropzone.addEventListener("click", function() {
    fileInput.click();
  });
  dropzone.addEventListener("keydown", function(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener("change", function(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleDropOrPasteFileList(files, e);
    }
    fileInput.value = "";
  });
}
document.addEventListener("DOMContentLoaded", initTaskAttachmentDropzone);
async function uploadTaskAttachmentFile(file, uiEl) {
  if (!file) return;
  const fileType = getFileType(file.type || "", file.name || "");
  const maxSize = getMaxFileSize(fileType);
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    showErrorNotification(t("error.fileSizeTooLarge", { maxMB }));
    return;
  }
  const isButton = uiEl && uiEl.tagName === "BUTTON";
  const originalText = isButton ? uiEl.textContent || "\u{1F4C1} Upload File" : null;
  const defaultText = !isButton ? uiEl?.dataset?.defaultText || t("tasks.modal.attachmentsDropzoneDefault") : null;
  try {
    if (uiEl) {
      if (isButton) {
        uiEl.textContent = "\u23F3 Uploading...";
        uiEl.disabled = true;
      } else {
        uiEl.innerHTML = "";
        const textEl = document.createElement("span");
        textEl.className = "task-attachment-dropzone-text";
        textEl.textContent = `Uploading ${file.name}...`;
        uiEl.appendChild(textEl);
        uiEl.classList.add("task-attachment-uploading");
        uiEl.setAttribute("aria-busy", "true");
      }
    }
    const base64 = await convertFileToBase64(file);
    const fileKey = `file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await uploadFile(fileKey, base64);
    const attachment = {
      name: file.name,
      icon: getFileIcon(fileType),
      type: "file",
      fileType,
      fileKey,
      mimeType: file.type,
      size: file.size,
      addedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const taskId = document.getElementById("task-form").dataset.editingTaskId;
    if (taskId) {
      const task = tasks.find((t2) => t2.id === parseInt(taskId));
      if (!task) return;
      if (!task.attachments) task.attachments = [];
      task.attachments.push(attachment);
      renderAttachments(task.attachments);
      saveTasks2().catch((err) => {
        console.error("Failed to save attachment:", err);
        showErrorNotification(t("error.attachmentSaveFailed"));
      });
    } else {
      tempAttachments.push(attachment);
      renderAttachments(tempAttachments);
    }
    showSuccessNotification(t("success.fileUploaded"));
  } catch (error) {
    showErrorNotification(t("error.fileUploadFailed", { message: error.message }));
  } finally {
    if (uiEl) {
      if (isButton) {
        uiEl.textContent = originalText;
        uiEl.disabled = false;
      } else {
        uiEl.innerHTML = "";
        const textEl = document.createElement("span");
        textEl.className = "task-attachment-dropzone-text";
        textEl.textContent = defaultText;
        uiEl.appendChild(textEl);
        uiEl.classList.remove("task-attachment-uploading");
        uiEl.removeAttribute("aria-busy");
      }
    }
  }
}
async function addFileAttachment(event) {
  const fileInput = document.getElementById("attachment-file");
  const file = fileInput && fileInput.files ? fileInput.files[0] : null;
  if (!file) {
    showErrorNotification(t("error.selectFile"));
    return;
  }
  const uiEl = document.getElementById("attachment-file-dropzone") || event?.target || null;
  await uploadTaskAttachmentFile(file, uiEl);
  if (fileInput) fileInput.value = "";
}
function getFileType(mimeType, filename) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) return "pdf";
  if (mimeType.includes("spreadsheet") || filename.match(/\.(xlsx?|csv)$/i)) return "spreadsheet";
  if (mimeType.includes("document") || mimeType.includes("word") || filename.match(/\.docx?$/i)) return "document";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint") || filename.match(/\.pptx?$/i)) return "presentation";
  return "file";
}
function getMaxFileSize(fileType) {
  switch (fileType) {
    case "pdf":
      return 20 * 1024 * 1024;
    // 20MB for PDFs
    case "image":
    case "spreadsheet":
    case "document":
    case "presentation":
      return 10 * 1024 * 1024;
    // 10MB for others
    default:
      return 10 * 1024 * 1024;
  }
}
function getFileIcon(fileType) {
  switch (fileType) {
    case "image":
      return "\u{1F5BC}\uFE0F";
    case "pdf":
      return "\u{1F4C4}";
    case "spreadsheet":
      return "\u{1F4CA}";
    case "document":
      return "\u{1F4DD}";
    case "presentation":
      return "\u{1F4CA}";
    default:
      return "\u{1F5C2}\uFE0F";
  }
}
window.addFileAttachment = addFileAttachment;
window.viewFile = viewFile;
window.viewImageLegacy = viewImageLegacy;
window.downloadFileAttachment = downloadFileAttachment;
window.removeAttachment = removeAttachment;
window.kanbanShowBacklog = localStorage.getItem("kanbanShowBacklog") === "true";
window.kanbanShowProjects = localStorage.getItem("kanbanShowProjects") !== "false";
window.kanbanShowNoDate = localStorage.getItem("kanbanShowNoDate") !== "false";
window.kanbanUpdatedFilter = localStorage.getItem("kanbanUpdatedFilter") || "all";
window.enableReviewStatus = localStorage.getItem("enableReviewStatus") === "true";
function getKanbanUpdatedFilterLabel(value) {
  switch (value) {
    case "5m":
      return "5m";
    case "30m":
      return "30m";
    case "24h":
      return "24h";
    case "week":
      return t("filters.updated.week");
    case "month":
      return t("filters.updated.month");
    case "all":
    default:
      return "";
  }
}
function updateKanbanGridColumns() {
  const kanbanBoard = document.querySelector(".kanban-board");
  if (!kanbanBoard) return;
  let visibleColumns = 3;
  if (window.kanbanShowBacklog === true) visibleColumns++;
  if (window.enableReviewStatus !== false) visibleColumns++;
  kanbanBoard.style.gridTemplateColumns = `repeat(${visibleColumns}, 1fr)`;
}
function applyReviewStatusVisibility() {
  const enabled = window.enableReviewStatus !== false;
  const reviewColumn = document.getElementById("kanban-column-review");
  if (reviewColumn) {
    reviewColumn.style.display = enabled ? "" : "none";
  }
  const reviewFilter = document.getElementById("filter-status-review");
  if (reviewFilter) {
    reviewFilter.style.display = enabled ? "" : "none";
  }
  updateKanbanGridColumns();
  if (!enabled && filterState.statuses.has("review")) {
    filterState.statuses.delete("review");
    applyFilters();
  }
}
function applyBacklogColumnVisibility() {
  const enabled = window.kanbanShowBacklog === true;
  const backlogColumn = document.getElementById("kanban-column-backlog");
  if (backlogColumn) {
    backlogColumn.style.display = enabled ? "" : "none";
  }
  updateKanbanGridColumns();
}
function touchProjectUpdatedAt(projectId) {
  const pid = projectId ? parseInt(projectId, 10) : null;
  if (!pid) return null;
  const project = projects.find((p) => p.id === pid);
  if (!project) return null;
  project.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return project;
}
function recordProjectTaskLinkChange(projectId, action, task) {
  if (!window.historyService) return;
  const pid = projectId ? parseInt(projectId, 10) : null;
  if (!pid) return;
  const project = projects.find((p) => p.id === pid);
  if (!project) return;
  if (action === "added" && window.historyService.recordProjectTaskAdded) {
    window.historyService.recordProjectTaskAdded(project, task);
  } else if (action === "removed" && window.historyService.recordProjectTaskRemoved) {
    window.historyService.recordProjectTaskRemoved(project, task);
  }
}
function sanitizeKanbanUpdatedFilterButtonLabel() {
  const btn = document.getElementById("btn-filter-kanban-updated");
  if (!btn) return;
  const badge = btn.querySelector("#badge-kanban-updated");
  if (!badge) return;
  while (btn.firstChild) btn.removeChild(btn.firstChild);
  btn.appendChild(document.createTextNode(`${t("tasks.filters.updated")} `));
  btn.appendChild(badge);
  btn.appendChild(document.createTextNode(" "));
  const arrow = document.createElement("span");
  arrow.className = "filter-arrow";
  arrow.textContent = "\u25BC";
  btn.appendChild(arrow);
}
function updateKanbanUpdatedFilterUI() {
  try {
    sanitizeKanbanUpdatedFilterButtonLabel();
  } catch (e) {
  }
  const badge = document.getElementById("badge-kanban-updated");
  if (badge) {
    badge.textContent = getKanbanUpdatedFilterLabel(window.kanbanUpdatedFilter);
    const button = badge.closest(".filter-button");
    if (button) {
      if (window.kanbanUpdatedFilter !== "all") {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    }
  }
  try {
    document.querySelectorAll('input[type="radio"][data-filter="kanban-updated"][name="kanban-updated-filter"]').forEach((rb) => {
      rb.checked = rb.value === window.kanbanUpdatedFilter;
    });
  } catch (e) {
  }
}
function setKanbanUpdatedFilter(value, options = { render: true }) {
  const allowed = /* @__PURE__ */ new Set(["all", "5m", "30m", "24h", "week", "month"]);
  const normalized = allowed.has(value) ? value : value === "today" ? "24h" : "all";
  window.kanbanUpdatedFilter = normalized;
  try {
    localStorage.setItem("kanbanUpdatedFilter", normalized);
  } catch (e) {
  }
  updateKanbanUpdatedFilterUI();
  try {
    renderActiveFilterChips();
  } catch (e) {
  }
  try {
    syncURLWithFilters();
  } catch (e) {
  }
  if (options && options.render === false) return;
  const isKanban = !document.querySelector(".kanban-board")?.classList.contains("hidden");
  const isList = document.getElementById("list-view")?.classList.contains("active");
  const isCalendar = document.getElementById("calendar-view")?.classList.contains("active");
  if (isKanban) renderTasks();
  if (isList || getIsMobileCached()) renderListView();
  if (isCalendar) renderCalendar();
}
function toggleKanbanSettings(event) {
  event.stopPropagation();
  const panel = document.getElementById("kanban-settings-panel");
  const isActive = panel.classList.contains("active");
  if (isActive) {
    panel.classList.remove("active");
  } else {
    panel.classList.add("active");
    document.getElementById("kanban-show-backlog").checked = window.kanbanShowBacklog === true;
    document.getElementById("kanban-show-projects").checked = window.kanbanShowProjects !== false;
    document.getElementById("kanban-show-no-date").checked = window.kanbanShowNoDate !== false;
  }
}
function toggleKanbanBacklog() {
  const checkbox = document.getElementById("kanban-show-backlog");
  window.kanbanShowBacklog = checkbox.checked;
  localStorage.setItem("kanbanShowBacklog", checkbox.checked);
  const backlogColumn = document.getElementById("kanban-column-backlog");
  if (backlogColumn) {
    backlogColumn.style.display = checkbox.checked ? "" : "none";
  }
  updateKanbanGridColumns();
  renderTasks();
}
function toggleKanbanProjects() {
  const checkbox = document.getElementById("kanban-show-projects");
  window.kanbanShowProjects = checkbox.checked;
  localStorage.setItem("kanbanShowProjects", checkbox.checked);
  renderTasks();
}
function toggleKanbanNoDate() {
  const checkbox = document.getElementById("kanban-show-no-date");
  window.kanbanShowNoDate = checkbox.checked;
  localStorage.setItem("kanbanShowNoDate", checkbox.checked);
  renderTasks();
}
window.toggleKanbanSettings = toggleKanbanSettings;
window.toggleKanbanBacklog = toggleKanbanBacklog;
window.toggleKanbanProjects = toggleKanbanProjects;
window.toggleKanbanNoDate = toggleKanbanNoDate;
document.addEventListener("click", (e) => {
  const panel = document.getElementById("kanban-settings-panel");
  const btn = document.getElementById("kanban-settings-btn");
  if (panel && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
    panel.classList.remove("active");
  }
});
async function updateTaskField2(field, value) {
  const form = document.getElementById("task-form");
  const taskId = form?.dataset.editingTaskId;
  if (!taskId) return;
  const oldTask = tasks.find((t2) => t2.id === parseInt(taskId, 10));
  const oldTaskCopy = oldTask ? JSON.parse(JSON.stringify(oldTask)) : null;
  const normalizedValue = field === "description" ? autoLinkifyDescription(value) : value;
  if (oldTask) {
    const prev = oldTask[field];
    let isSame = false;
    if (field === "projectId") {
      const nextProjectId = normalizedValue === "" || normalizedValue === null || typeof normalizedValue === "undefined" ? null : parseInt(normalizedValue, 10);
      const prevProjectId2 = typeof oldTask.projectId === "number" ? oldTask.projectId : null;
      isSame = (Number.isNaN(nextProjectId) ? null : nextProjectId) === prevProjectId2;
    } else {
      const prevStr = typeof prev === "string" ? prev : prev || "";
      const nextStr = typeof normalizedValue === "string" ? normalizedValue : normalizedValue || "";
      isSame = prevStr === nextStr;
    }
    if (isSame) return;
  }
  const result = updateTaskField(parseInt(taskId, 10), field, normalizedValue, tasks, settings);
  if (!result.task) return;
  if (window.historyService && oldTaskCopy) {
    window.historyService.recordTaskUpdated(oldTaskCopy, result.task);
  }
  const prevProjectId = result.oldProjectId;
  tasks = result.tasks;
  const task = result.task;
  if (field === "projectId") {
    populateProjectOptions();
    const newProjectId = task.projectId;
    if (prevProjectId !== newProjectId) {
      if (prevProjectId) {
        touchProjectUpdatedAt(prevProjectId);
        recordProjectTaskLinkChange(prevProjectId, "removed", task);
      }
      if (newProjectId) {
        touchProjectUpdatedAt(newProjectId);
        recordProjectTaskLinkChange(newProjectId, "added", task);
      }
      saveProjects2().catch(() => {
      });
    }
  }
  if (field === "endDate") {
    updateNoDateOptionVisibility();
  }
  saveTasks2().catch((error) => {
    console.error("Failed to save task field update:", error);
    showErrorNotification(t("error.saveChangesFailed"));
  });
  const isInProjectDetails = document.getElementById("project-details").classList.contains("active");
  const affectsPlacement = field === "startDate" || field === "endDate" || field === "projectId" || field === "status" || field === "priority" || field === "title" || field === "tags";
  if (affectsPlacement) {
    reflowCalendarBars();
  }
  if (!affectsPlacement) return;
  if (isInProjectDetails) {
    if (field === "projectId") {
      const newProjectId = task.projectId;
      if (!newProjectId) {
        if (prevProjectId) {
          showProjectDetails(prevProjectId);
          return;
        }
      } else if (prevProjectId !== newProjectId) {
        showProjectDetails(newProjectId);
        return;
      } else {
        showProjectDetails(newProjectId);
        return;
      }
    } else {
      const currentProjectId = prevProjectId || (window.location.hash && window.location.hash.startsWith("#project-") ? parseInt(window.location.hash.replace("#project-", ""), 10) : null);
      if (currentProjectId) {
        showProjectDetails(currentProjectId);
        return;
      }
    }
  } else {
    renderTasks();
    const isMobile = getIsMobileCached();
    if (isMobile || document.getElementById("list-view").classList.contains("active")) renderListView();
    if (document.getElementById("projects").classList.contains("active")) {
      appState.projectsSortedView = null;
      renderProjects();
      updateCounts();
    }
  }
  if (field === "status" && (settings.autoSetStartDateOnStatusChange || settings.autoSetEndDateOnStatusChange)) {
    setTimeout(() => {
      const formNow = document.getElementById("task-form");
      if (!formNow) return;
      const startDateInput = formNow.querySelector('input[name="startDate"]');
      const endDateInput = formNow.querySelector('input[name="endDate"]');
      if (startDateInput && task.startDate) {
        const fpStart = startDateInput._flatpickrInstance;
        if (fpStart) {
          fpStart.setDate(new Date(task.startDate), false);
        }
        startDateInput.value = task.startDate;
        const displayStart = startDateInput.parentElement?.querySelector("input.date-display");
        if (displayStart) {
          displayStart.value = toDMYFromISO(task.startDate);
        }
      }
      if (endDateInput && task.endDate) {
        const fpEnd = endDateInput._flatpickrInstance;
        if (fpEnd) {
          fpEnd.setDate(new Date(task.endDate), false);
        }
        endDateInput.value = task.endDate;
        const displayEnd = endDateInput.parentElement?.querySelector("input.date-display");
        if (displayEnd) {
          displayEnd.value = toDMYFromISO(task.endDate);
        }
      }
    }, 50);
  }
}
var initialTaskFormState = null;
function captureInitialTaskFormState() {
  const form = document.getElementById("task-form");
  if (!form) return;
  initialTaskFormState = {
    title: form.querySelector('input[name="title"]')?.value.trim() || "",
    description: document.getElementById("task-description-hidden")?.value.trim() || "",
    projectId: form.querySelector('input[name="projectId"]')?.value || form.querySelector('select[name="projectId"]')?.value || "",
    startDate: form.querySelector('input[name="startDate"]')?.value || "",
    endDate: form.querySelector('input[name="endDate"]')?.value || "",
    priority: form.querySelector("#hidden-priority")?.value || "medium",
    status: form.querySelector("#hidden-status")?.value || "backlog",
    tags: window.tempTags ? [...window.tempTags] : [],
    attachments: tempAttachments ? tempAttachments.length : 0
  };
}
function hasUnsavedNewTask() {
  const form = document.getElementById("task-form");
  if (!form) return false;
  if (form.dataset.editingTaskId) return false;
  if (!initialTaskFormState) return false;
  const currentState = {
    title: form.querySelector('input[name="title"]')?.value.trim() || "",
    description: document.getElementById("task-description-hidden")?.value.trim() || "",
    projectId: form.querySelector('input[name="projectId"]')?.value || form.querySelector('select[name="projectId"]')?.value || "",
    startDate: form.querySelector('input[name="startDate"]')?.value || "",
    endDate: form.querySelector('input[name="endDate"]')?.value || "",
    priority: form.querySelector("#hidden-priority")?.value || "medium",
    status: form.querySelector("#hidden-status")?.value || "backlog",
    tags: window.tempTags ? [...window.tempTags] : [],
    attachments: tempAttachments ? tempAttachments.length : 0
  };
  return currentState.title !== initialTaskFormState.title || currentState.description !== initialTaskFormState.description || currentState.projectId !== initialTaskFormState.projectId || currentState.startDate !== initialTaskFormState.startDate || currentState.endDate !== initialTaskFormState.endDate || currentState.priority !== initialTaskFormState.priority || currentState.status !== initialTaskFormState.status || currentState.tags.length !== initialTaskFormState.tags.length || currentState.attachments !== initialTaskFormState.attachments;
}
function bindOverlayClose(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal || modal.__overlayBound) return;
  modal.__overlayBound = true;
  modal.addEventListener("pointerdown", (e) => {
    modal.__downOnOverlay = e.target === modal;
  });
  modal.addEventListener("click", (e) => {
    const releasedOnOverlay = e.target === modal;
    const startedOnOverlay = !!modal.__downOnOverlay;
    modal.__downOnOverlay = false;
    if (!releasedOnOverlay || !startedOnOverlay) return;
    if (modalId === "task-modal") {
      const form = document.getElementById("task-form");
      if (form && form.dataset.editingTaskId) {
        const descEditor = form.querySelector("#task-description-editor");
        if (descEditor) {
          updateTaskField2("description", descEditor.innerHTML);
        }
      }
    }
    if (modalId === "task-modal" && hasUnsavedNewTask()) {
      showUnsavedChangesModal(modalId);
      return;
    }
    closeModal(modalId);
  });
}
document.addEventListener("DOMContentLoaded", () => {
  bindOverlayClose("task-modal");
  bindOverlayClose("project-modal");
  bindOverlayClose("settings-modal");
});
document.addEventListener("keydown", async (e) => {
  if (e.key === "Escape") {
    const modals = document.querySelectorAll(".modal.active");
    modals.forEach((m) => {
      if (m.id === "task-modal") {
        if (hasUnsavedNewTask()) {
          showUnsavedChangesModal("task-modal");
        } else {
          const form = document.getElementById("task-form");
          if (form && form.dataset.editingTaskId) {
            const descEditor = form.querySelector("#task-description-editor");
            if (descEditor) {
              updateTaskField2("description", descEditor.innerHTML);
            }
          }
          closeModal(m.id);
        }
      } else {
        if (m.id === "settings-modal" && window.settingsFormIsDirty) {
          showUnsavedChangesModal("settings-modal");
        } else {
          closeModal(m.id);
        }
      }
    });
  }
  if (e.key === "n" || e.key === "N") {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) {
      return;
    }
    e.preventDefault();
    const dropdown = document.getElementById("notification-dropdown");
    const toggle = document.getElementById("notification-toggle");
    if (!dropdown || !toggle) return;
    const isOpen = dropdown.classList.contains("active");
    if (isOpen) {
      closeNotificationDropdown();
    } else {
      closeUserDropdown();
      const state = await fetchNotificationState({ force: true });
      renderNotificationDropdown(state);
      dropdown.classList.add("active");
      toggle.classList.add("active");
      await markNotificationsSeen(state);
    }
  }
});
async function addTag() {
  const input = document.getElementById("tag-input");
  const tagName = input.value.trim().toLowerCase();
  if (!tagName) {
    input.style.border = "2px solid var(--accent-red, #ef4444)";
    setTimeout(() => {
      input.style.border = "";
    }, 2e3);
    return;
  }
  const taskId = document.getElementById("task-form").dataset.editingTaskId;
  if (taskId) {
    const task = tasks.find((t2) => t2.id === parseInt(taskId));
    if (!task) return;
    if (!task.tags) task.tags = [];
    if (task.tags.includes(tagName)) {
      input.value = "";
      return;
    }
    const oldTaskCopy = JSON.parse(JSON.stringify(task));
    task.tags = [...task.tags, tagName];
    renderTags(task.tags);
    reorganizeMobileTaskFields();
    if (window.historyService) {
      window.historyService.recordTaskUpdated(oldTaskCopy, task);
    }
    const isInProjectDetails = document.getElementById("project-details").classList.contains("active");
    if (isInProjectDetails && task.projectId) {
      showProjectDetails(task.projectId);
    } else {
      renderTasks();
      const isMobile = getIsMobileCached();
      if (isMobile || document.getElementById("list-view").classList.contains("active")) {
        renderListView();
      }
      if (document.getElementById("projects").classList.contains("active")) {
        appState.projectsSortedView = null;
        renderProjects();
      }
    }
    populateTagOptions();
    updateNoDateOptionVisibility();
    saveTasks2().catch((error) => {
      console.error("Failed to save tag addition:", error);
      showErrorNotification(t("error.saveTagFailed"));
    });
  } else {
    if (!window.tempTags) window.tempTags = [];
    if (window.tempTags.includes(tagName)) {
      input.value = "";
      return;
    }
    window.tempTags = [...window.tempTags, tagName];
    renderTags(window.tempTags);
  }
  input.value = "";
}
async function removeTag(tagName) {
  const taskId = document.getElementById("task-form").dataset.editingTaskId;
  if (taskId) {
    const task = tasks.find((t2) => t2.id === parseInt(taskId));
    if (!task || !task.tags) return;
    const oldTaskCopy = JSON.parse(JSON.stringify(task));
    task.tags = task.tags.filter((t2) => t2 !== tagName);
    renderTags(task.tags);
    reorganizeMobileTaskFields();
    if (window.historyService) {
      window.historyService.recordTaskUpdated(oldTaskCopy, task);
    }
    saveTasks2().catch((error) => {
      console.error("Failed to save tag removal:", error);
      showErrorNotification(t("error.removeTagFailed"));
    });
    const isInProjectDetails = document.getElementById("project-details").classList.contains("active");
    if (isInProjectDetails && task.projectId) {
      showProjectDetails(task.projectId);
    } else {
      renderTasks();
      const isMobile = getIsMobileCached();
      if (isMobile || document.getElementById("list-view").classList.contains("active")) {
        renderListView();
      }
      if (document.getElementById("projects").classList.contains("active")) {
        appState.projectsSortedView = null;
        renderProjects();
      }
    }
    populateTagOptions();
    updateNoDateOptionVisibility();
  } else {
    if (!window.tempTags) window.tempTags = [];
    window.tempTags = window.tempTags.filter((t2) => t2 !== tagName);
    renderTags(window.tempTags);
  }
}
function renderTags(tags) {
  const container = document.getElementById("tags-display");
  const isMobile = getIsMobileCached();
  container.innerHTML = generateTagsDisplayHTML(tags, {
    isMobile,
    getTagColor,
    escapeHtml,
    noTagsText: t("tasks.tags.none")
  });
}
async function addProjectTag() {
  const input = document.getElementById("project-tag-input");
  const tagName = input.value.trim().toLowerCase();
  if (!tagName) {
    input.style.border = "2px solid var(--accent-red, #ef4444)";
    setTimeout(() => {
      input.style.border = "";
    }, 2e3);
    return;
  }
  const projectId = document.getElementById("project-form").dataset.editingProjectId;
  if (projectId) {
    const project = projects.find((p) => p.id === parseInt(projectId));
    if (!project) return;
    if (!project.tags) project.tags = [];
    if (project.tags.includes(tagName)) {
      input.value = "";
      return;
    }
    project.tags = [...project.tags, tagName];
    renderProjectTags(project.tags);
    appState.projectsSortedView = null;
    renderProjects();
    populateProjectTagOptions();
    saveProjects2().catch((error) => {
      console.error("Failed to save project tag addition:", error);
      showErrorNotification(t("error.saveTagFailed"));
    });
  } else {
    if (!window.tempProjectTags) window.tempProjectTags = [];
    if (window.tempProjectTags.includes(tagName)) {
      input.value = "";
      return;
    }
    window.tempProjectTags = [...window.tempProjectTags, tagName];
    renderProjectTags(window.tempProjectTags);
  }
  input.value = "";
}
async function removeProjectTag(tagName) {
  const projectId = document.getElementById("project-form").dataset.editingProjectId;
  if (projectId) {
    const project = projects.find((p) => p.id === parseInt(projectId));
    if (!project || !project.tags) return;
    project.tags = project.tags.filter((t2) => t2 !== tagName);
    renderProjectTags(project.tags);
    appState.projectsSortedView = null;
    renderProjects();
    populateProjectTagOptions();
    saveProjects2().catch((error) => {
      console.error("Failed to save project tag removal:", error);
      showErrorNotification(t("error.saveTagFailed"));
    });
  } else {
    if (!window.tempProjectTags) return;
    window.tempProjectTags = window.tempProjectTags.filter((t2) => t2 !== tagName);
    renderProjectTags(window.tempProjectTags);
  }
}
function renderProjectTags(tags) {
  const container = document.getElementById("project-tags-display");
  if (!tags || tags.length === 0) {
    container.innerHTML = `<span style="color: var(--text-muted); font-size: 13px;">${t("tasks.tags.none")}</span>`;
    return;
  }
  const projectId = document.getElementById("project-form")?.dataset.editingProjectId;
  const color = projectId ? getProjectColor(parseInt(projectId)) : "#6b7280";
  const isMobile = getIsMobileCached();
  const padding = isMobile ? "3px 6px" : "4px 8px";
  const fontSize = isMobile ? "11px" : "12px";
  const gap = isMobile ? "4px" : "4px";
  const buttonSize = isMobile ? "12px" : "14px";
  const lineHeight = isMobile ? "1.2" : "1.4";
  container.innerHTML = tags.map((tag) => {
    return `
            <span class="task-tag" style="background-color: ${color}; color: white; padding: ${padding}; border-radius: 4px; font-size: ${fontSize}; display: inline-flex; align-items: center; gap: ${gap}; line-height: ${lineHeight};">
                ${escapeHtml(tag.toUpperCase())}
                <button type="button" data-action="removeProjectTag" data-param="${escapeHtml(tag)}" style="background: none; border: none; color: white; cursor: pointer; padding: 0; margin: 0; font-size: ${buttonSize}; line-height: 1; display: inline-flex; align-items: center; justify-content: center; width: auto; min-width: auto;">\xD7</button>
            </span>
        `;
  }).join("");
}
function renderProjectDetailsTags(tags, projectId) {
  const container = document.getElementById("project-details-tags-display");
  if (!container) return;
  if (!tags || tags.length === 0) {
    container.innerHTML = `<span style="color: var(--text-muted); font-size: 13px;">${t("tasks.tags.none")}</span>`;
    return;
  }
  const color = projectId ? getProjectColor(projectId) : "#6b7280";
  const isMobile = getIsMobileCached();
  const padding = isMobile ? "3px 6px" : "4px 8px";
  const fontSize = isMobile ? "11px" : "12px";
  const gap = isMobile ? "4px" : "4px";
  const buttonSize = isMobile ? "12px" : "14px";
  const lineHeight = isMobile ? "1.2" : "1.4";
  container.innerHTML = tags.map((tag) => {
    return `
            <span class="task-tag" style="background-color: ${color}; color: white; padding: ${padding}; border-radius: 4px; font-size: ${fontSize}; display: inline-flex; align-items: center; gap: ${gap}; line-height: ${lineHeight};">
                ${escapeHtml(tag.toUpperCase())}
                <button type="button" data-action="removeProjectDetailsTag" data-param="${escapeHtml(tag)}" style="background: none; border: none; color: white; cursor: pointer; padding: 0; margin: 0; font-size: ${buttonSize}; line-height: 1; display: inline-flex; align-items: center; justify-content: center; width: auto; min-width: auto;">\xD7</button>
            </span>
        `;
  }).join("");
}
async function addProjectDetailsTag(projectId) {
  const input = document.getElementById("project-details-tag-input");
  if (!input) return;
  const tagName = input.value.trim().toLowerCase();
  if (!tagName) {
    input.style.border = "2px solid var(--accent-red, #ef4444)";
    setTimeout(() => {
      input.style.border = "";
    }, 2e3);
    return;
  }
  const project = projects.find((p) => p.id === parseInt(projectId));
  if (!project) return;
  if (!project.tags) project.tags = [];
  if (project.tags.includes(tagName)) {
    input.value = "";
    return;
  }
  project.tags = [...project.tags, tagName];
  renderProjectDetailsTags(project.tags, projectId);
  appState.projectsSortedView = null;
  renderProjects();
  populateProjectTagOptions();
  saveProjects2().catch((error) => {
    console.error("Failed to save project tag addition:", error);
    showErrorNotification(t("error.saveTagFailed"));
  });
  input.value = "";
}
async function removeProjectDetailsTag(tagName) {
  const titleDisplay = document.getElementById("project-title-display");
  if (!titleDisplay) return;
  const projectId = parseInt(titleDisplay.dataset.param);
  const project = projects.find((p) => p.id === projectId);
  if (!project || !project.tags) return;
  project.tags = project.tags.filter((t2) => t2 !== tagName);
  renderProjectDetailsTags(project.tags, projectId);
  appState.projectsSortedView = null;
  renderProjects();
  populateProjectTagOptions();
  saveProjects2().catch((error) => {
    console.error("Failed to save project tag removal:", error);
    showErrorNotification(t("error.saveTagFailed"));
  });
}
function initializeEventDelegation() {
  setupEventDelegation({
    toggleTheme,
    showCalendarView,
    toggleKanbanSettings,
    openProjectModal,
    openTaskModal,
    closeUserDropdown,
    openSettingsModal,
    openTaskModalForProject,
    openSelectedProjectFromTask,
    closeModal,
    closeTaskModal,
    closeConfirmModal,
    closeFeedbackDeleteModal,
    closeProjectConfirmModal,
    closeUnsavedChangesModal,
    closeDayItemsModal,
    closeDayItemsModalOnBackdrop,
    openTaskDetails,
    deleteTask: deleteTask2,
    duplicateTask: duplicateTask2,
    confirmDelete,
    showProjectDetails,
    toggleProjectExpand,
    toggleProjectMenu,
    editProjectTitle,
    saveProjectTitle,
    cancelProjectTitle,
    handleDeleteProject,
    handleDuplicateProject,
    toggleProjectColorPicker,
    updateProjectColor,
    openCustomProjectColorPicker,
    navigateToProjectStatus,
    deleteProject: deleteProject2,
    confirmProjectDelete,
    closeDuplicateProjectModal,
    confirmDuplicateProject,
    addFeedbackItem,
    deleteFeedbackItem: deleteFeedbackItem2,
    confirmFeedbackDelete,
    toggleHistoryEntryInline,
    formatTaskText,
    insertTaskHeading,
    insertTaskDivider,
    sortTable,
    toggleSortMode,
    animateCalendarMonthChange,
    goToToday,
    showDayTasks,
    addAttachment,
    addFileAttachment,
    addTag,
    removeTag,
    addProjectTag,
    removeProjectTag,
    addProjectDetailsTag,
    removeProjectDetailsTag,
    removeAttachment,
    downloadFileAttachment,
    viewFile,
    viewImageLegacy,
    showErrorNotification,
    t,
    backToProjects,
    showAllActivity,
    backToDashboard,
    backToCalendar,
    openUpdatesFromNotification,
    openDueTodayFromNotification,
    dismissKanbanTip,
    confirmDiscardChanges,
    closeReviewStatusConfirmModal,
    confirmDisableReviewStatus,
    closeCalendarCreateModal,
    confirmCreateTask,
    addTaskFromDayItemsModal,
    signOut,
    exportDashboardData,
    closeExportDataModal,
    confirmExportData,
    generateReport,
    getCurrentMonth: () => currentMonth,
    getCurrentYear: () => currentYear,
    showStatusInfoModal
  });
}
function clearAllFilters() {
  filterState.statuses.clear();
  filterState.priorities.clear();
  filterState.projects.clear();
  filterState.tags.clear();
  filterState.search = "";
  filterState.datePresets.clear();
  filterState.dateFrom = "";
  filterState.dateTo = "";
  const searchInput = document.getElementById("filter-search");
  if (searchInput) searchInput.value = "";
  const dueDateInput = document.getElementById("filter-due-date");
  const createdDateInput = document.getElementById("filter-created-date");
  if (dueDateInput) dueDateInput.value = "";
  if (createdDateInput) createdDateInput.value = "";
  const dateFilterGlobal = document.getElementById("filter-date-global");
  if (dateFilterGlobal) dateFilterGlobal.value = "";
  const allCheckboxes = document.querySelectorAll('#global-filters input[type="checkbox"]');
  allCheckboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });
  renderAfterFilterChange();
}
function filterProjectTasks(projectId, status) {
  showPage("tasks");
  window.location.hash = "tasks";
  document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
  const tasksNav = document.querySelector('.nav-item[data-page="tasks"]');
  if (tasksNav) tasksNav.classList.add("active");
  filterState.statuses.clear();
  filterState.priorities.clear();
  filterState.projects.clear();
  filterState.tags.clear();
  filterState.dateFrom = "";
  filterState.dateTo = "";
  filterState.search = "";
  const searchEl = document.getElementById("filter-search");
  if (searchEl) searchEl.value = "";
  filterState.statuses.add(status);
  filterState.projects.add(projectId.toString());
  document.querySelectorAll('input[type="checkbox"]').forEach((cb) => cb.checked = false);
  document.querySelectorAll(`input[data-filter="status"][value="${status}"]`).forEach((cb) => cb.checked = true);
  document.querySelectorAll(`input[data-filter="project"][value="${projectId}"]`).forEach((cb) => cb.checked = true);
  document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
  const listBtn = document.querySelector(".view-btn:nth-child(2)");
  if (listBtn) listBtn.classList.add("active");
  const kanban = document.querySelector(".kanban-board");
  const list = document.getElementById("list-view");
  if (kanban) kanban.classList.add("hidden");
  if (list) list.classList.add("active");
  updateFilterBadges();
  renderListView();
}
window.filterProjectTasks = filterProjectTasks;
function navigateToProjectStatus(projectId, status) {
  navigateToFilteredTasks("status", status);
  setTimeout(() => {
    const viewToggle = document.querySelector(".view-toggle");
    if (viewToggle) viewToggle.classList.remove("hidden");
    filterState.projects.add(projectId.toString());
    const projectCheckbox = document.querySelector(`input[data-filter="project"][value="${projectId}"]`);
    if (projectCheckbox) projectCheckbox.checked = true;
    updateFilterBadges();
    renderTasks();
  }, 200);
}
window.navigateToProjectStatus = navigateToProjectStatus;
function filterProjectPortalList(query) {
  const container = projectPortalEl && projectPortalEl.querySelector(".project-portal-options");
  if (!container) return;
  const hiddenProject = document.getElementById("hidden-project");
  const selectedId = hiddenProject ? hiddenProject.value || "" : "";
  const q = (query || "").toLowerCase();
  let items = "";
  if (selectedId) {
    items += `<div class="project-option" data-project-id="">${t("tasks.project.selectPlaceholder")}</div>`;
  }
  items += projects.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", void 0, { sensitivity: "base" })).filter((p) => selectedId === "" || String(p.id) !== String(selectedId)).filter((p) => !q || (p.name || "").toLowerCase().includes(q)).map((p) => `<div class="project-option" data-project-id="${p.id}">${p.name}</div>`).join("");
  container.innerHTML = items;
}
function updateNoDateOptionVisibility() {
  const sel = document.getElementById("filter-date-global");
  if (!sel) return;
  const noDateOpt = Array.from(sel.options).find((o) => o.value === "no-date");
  if (!noDateOpt) return;
  const hasNoDateTasks = tasks.some((t2) => !t2.endDate);
  noDateOpt.style.display = hasNoDateTasks ? "" : "none";
}
function updateProjectStatusBadge() {
  const badge = document.getElementById("badge-project-status");
  if (!badge) return;
  const count = projectFilterState.statuses.size;
  badge.textContent = count === 0 ? "" : count;
  const button = badge.closest(".filter-button");
  if (button) {
    if (count > 0) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  }
}
function updateProjectTagsBadge() {
  const badge = document.getElementById("badge-project-tags");
  if (!badge) return;
  const count = projectFilterState.tags.size;
  badge.textContent = count === 0 ? "" : count;
  const button = badge.closest(".filter-button");
  if (button) {
    if (count > 0) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  }
}
function populateProjectTagOptions() {
  const tagUl = document.getElementById("project-tags-options");
  if (!tagUl) return;
  const currentlySelected = new Set(projectFilterState.tags);
  const allTags = /* @__PURE__ */ new Set();
  projects.forEach((p) => {
    if (p.tags && p.tags.length > 0) {
      p.tags.forEach((tag) => allTags.add(tag));
    }
  });
  tagUl.innerHTML = "";
  if (allTags.size === 0) {
    const li = document.createElement("li");
    li.textContent = t("filters.noOtherTags");
    li.style.color = "var(--text-muted)";
    li.style.padding = "8px 12px";
    tagUl.appendChild(li);
  } else {
    Array.from(allTags).sort().forEach((tag) => {
      const li = document.createElement("li");
      const id = `project-tag-${tag}`;
      const checked = currentlySelected.has(tag) ? "checked" : "";
      li.innerHTML = `<label><input type="checkbox" id="${id}" value="${tag}" data-filter="project-tags" ${checked}> ${tag.toUpperCase()}</label>`;
      tagUl.appendChild(li);
    });
  }
  tagUl.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) {
        projectFilterState.tags.add(cb.value);
      } else {
        projectFilterState.tags.delete(cb.value);
      }
      updateProjectTagsBadge();
      applyProjectFilters();
    });
  });
}
function getProjectUpdatedFilterLabel(value) {
  switch (value) {
    case "5m":
      return "5m";
    case "30m":
      return "30m";
    case "24h":
      return "24h";
    case "week":
      return t("filters.updated.week");
    case "month":
      return t("filters.updated.month");
    case "all":
    default:
      return "";
  }
}
function getProjectsUpdatedCutoffTime(value) {
  const now = Date.now();
  switch (value) {
    case "5m":
      return now - 5 * 60 * 1e3;
    case "30m":
      return now - 30 * 60 * 1e3;
    case "24h":
      return now - 24 * 60 * 60 * 1e3;
    case "week":
      return now - 7 * 24 * 60 * 60 * 1e3;
    case "month":
      return now - 30 * 24 * 60 * 60 * 1e3;
    case "all":
    default:
      return null;
  }
}
function getProjectUpdatedTime(project) {
  const raw = project && (project.updatedAt || project.createdAt) || "";
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}
function updateProjectsUpdatedFilterUI() {
  const badge = document.getElementById("badge-project-updated");
  if (badge) {
    badge.textContent = getProjectUpdatedFilterLabel(projectFilterState.updatedFilter);
    const button = badge.closest(".filter-button");
    if (button) {
      if (projectFilterState.updatedFilter !== "all") {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    }
  }
  try {
    document.querySelectorAll('input[type="radio"][data-filter="project-updated"][name="project-updated-filter"]').forEach((rb) => {
      rb.checked = rb.value === projectFilterState.updatedFilter;
    });
  } catch (e) {
  }
}
function renderProjectsActiveFilterChips() {
  const wrap = document.getElementById("projects-active-filters");
  if (!wrap) return;
  wrap.innerHTML = "";
  const addChip = (label, value, onRemove) => {
    const chip = document.createElement("span");
    chip.className = "filter-chip";
    const text = document.createElement("span");
    text.className = "chip-text";
    text.textContent = value != null && value !== "" ? `${label}: ${value}` : label;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip-remove";
    btn.setAttribute("aria-label", t("filters.chip.removeAria", { label }));
    btn.textContent = "x";
    btn.addEventListener("click", onRemove);
    chip.appendChild(text);
    chip.appendChild(btn);
    wrap.appendChild(chip);
  };
  if (projectFilterState.search) {
    addChip(t("filters.chip.search"), projectFilterState.search, () => {
      projectFilterState.search = "";
      const el = document.getElementById("projects-search");
      if (el) el.value = "";
      const cur = loadProjectsViewState() || {};
      saveProjectsViewState({ ...cur, search: "" });
      applyProjectFilters();
    });
  }
  projectFilterState.statuses.forEach((v) => {
    addChip(t("projects.filters.status"), getProjectStatusLabel(v), () => {
      projectFilterState.statuses.delete(v);
      const cb = document.querySelector(`input[type="checkbox"][data-filter="project-status"][value="${v}"]`);
      if (cb) cb.checked = false;
      updateProjectStatusBadge();
      applyProjectFilters();
    });
  });
  if (projectFilterState.updatedFilter && projectFilterState.updatedFilter !== "all") {
    addChip(t("filters.chip.updated"), getProjectUpdatedFilterLabel(projectFilterState.updatedFilter), () => {
      projectFilterState.updatedFilter = "all";
      updateProjectsUpdatedFilterUI();
      const cur = loadProjectsViewState() || {};
      saveProjectsViewState({ ...cur, updatedFilter: "all" });
      applyProjectFilters();
    });
  }
  if (projectFilterState.taskFilter === "has-tasks" || projectFilterState.taskFilter === "no-tasks") {
    const label = projectFilterState.taskFilter === "has-tasks" ? t("projects.filters.hasTasks") : t("projects.filters.noTasks");
    addChip(label, "", () => {
      projectFilterState.taskFilter = "";
      document.querySelectorAll("#projects .projects-filters .pf-chip").forEach((c) => c.classList.remove("active"));
      const cur = loadProjectsViewState() || {};
      saveProjectsViewState({ ...cur, filter: "" });
      applyProjectFilters();
    });
  }
  projectFilterState.tags.forEach((tag) => {
    addChip(t("projects.filters.tags"), tag.toUpperCase(), () => {
      projectFilterState.tags.delete(tag);
      const cb = document.querySelector(`input[type="checkbox"][data-filter="project-tags"][value="${tag}"]`);
      if (cb) cb.checked = false;
      updateProjectTagsBadge();
      applyProjectFilters();
    });
  });
}
function applyProjectFilters() {
  const filterTimer = debugTimeStart("filters", "projects", {
    totalProjects: projects.length,
    statusCount: projectFilterState.statuses.size,
    tagCount: projectFilterState.tags.size,
    taskFilter: projectFilterState.taskFilter || "",
    updatedFilter: projectFilterState.updatedFilter || "all",
    hasSearch: !!projectFilterState.search
  });
  let filtered = projects.slice();
  if (projectFilterState.statuses.size > 0) {
    filtered = filtered.filter((p) => {
      const status = getProjectStatus(p.id);
      return projectFilterState.statuses.has(status);
    });
  }
  if (projectFilterState.taskFilter === "has-tasks") {
    filtered = filtered.filter((p) => tasks.some((t2) => t2.projectId === p.id));
  } else if (projectFilterState.taskFilter === "no-tasks") {
    filtered = filtered.filter((p) => !tasks.some((t2) => t2.projectId === p.id));
  }
  if (projectFilterState.tags.size > 0) {
    filtered = filtered.filter((p) => {
      if (!p.tags || p.tags.length === 0) return false;
      return Array.from(projectFilterState.tags).some((tag) => p.tags.includes(tag));
    });
  }
  if (projectFilterState.updatedFilter && projectFilterState.updatedFilter !== "all") {
    const cutoff = getProjectsUpdatedCutoffTime(projectFilterState.updatedFilter);
    if (cutoff != null) {
      filtered = filtered.filter((p) => getProjectUpdatedTime(p) >= cutoff);
    }
  }
  if (projectFilterState.search) {
    const q = projectFilterState.search.toLowerCase();
    filtered = filtered.filter((p) => ((p.name || "") + " " + (p.description || "")).toLowerCase().includes(q));
  }
  const saved = loadProjectsViewState() || { search: "", filter: "", sort: "default", sortDirection: "asc", updatedFilter: "all" };
  if (saved.sort && saved.sort !== "default") {
    applyProjectsSort(saved.sort, filtered);
  } else {
    applyProjectsSort("default", filtered);
  }
  updateProjectsClearButtonVisibility();
  try {
    renderProjectsActiveFilterChips();
  } catch (e) {
  }
  debugTimeEnd("filters", filterTimer, {
    totalProjects: projects.length,
    filteredCount: filtered.length
  });
}
function applyProjectsSort(value, base) {
  const view = base && Array.isArray(base) ? base.slice() : projects.slice();
  const direction = projectSortState.direction;
  const isDesc = direction === "desc";
  const normalizedValue = value === "name-asc" || value === "name-desc" ? "name" : value;
  if (!normalizedValue || normalizedValue === "default") {
    const statusOrder = { "active": 0, "planning": 1, "backlog": 2, "completed": 3 };
    view.sort((a, b) => {
      const statusA = getProjectStatus(a.id);
      const statusB = getProjectStatus(b.id);
      const result = (statusOrder[statusA] || 999) - (statusOrder[statusB] || 999);
      return isDesc ? -result : result;
    });
    appState.projectsSortedView = view;
    renderView(view);
    return;
  }
  if (normalizedValue === "name") {
    view.sort((a, b) => {
      const result = (a.name || "").localeCompare(b.name || "");
      return isDesc ? -result : result;
    });
  } else if (normalizedValue === "created-desc") {
    view.sort((a, b) => {
      const result = new Date(b.createdAt) - new Date(a.createdAt);
      return isDesc ? -result : result;
    });
  } else if (normalizedValue === "updated-desc") {
    view.sort((a, b) => {
      const aDate = new Date(a.updatedAt || a.createdAt);
      const bDate = new Date(b.updatedAt || b.createdAt);
      const result = bDate - aDate;
      return isDesc ? -result : result;
    });
  } else if (normalizedValue === "tasks-desc") {
    view.sort((a, b) => {
      const result = tasks.filter((t2) => t2.projectId === b.id).length - tasks.filter((t2) => t2.projectId === a.id).length;
      return isDesc ? -result : result;
    });
  } else if (normalizedValue === "completion-desc") {
    view.sort((a, b) => {
      const aTotal = tasks.filter((t2) => t2.projectId === a.id).length;
      const aDone = tasks.filter((t2) => t2.projectId === a.id && t2.status === "done").length;
      const aPercent = aTotal > 0 ? aDone / aTotal * 100 : 0;
      const bTotal = tasks.filter((t2) => t2.projectId === b.id).length;
      const bDone = tasks.filter((t2) => t2.projectId === b.id && t2.status === "done").length;
      const bPercent = bTotal > 0 ? bDone / bTotal * 100 : 0;
      const result = bPercent - aPercent;
      return isDesc ? -result : result;
    });
  }
  appState.projectsSortedView = view;
  const container = document.getElementById("projects-list");
  if (!container) return;
  const expandedProjects = /* @__PURE__ */ new Set();
  container.querySelectorAll(".project-list-item.expanded").forEach((item) => {
    const projectId = item.id.replace("project-item-", "");
    expandedProjects.add(projectId);
  });
  container.innerHTML = appState.projectsSortedView.map(generateProjectItemHTML2).join("");
  expandedProjects.forEach((projectId) => {
    const item = document.getElementById(`project-item-${projectId}`);
    if (item) {
      item.classList.add("expanded");
    }
  });
  renderMobileProjects(appState.projectsSortedView);
  scheduleExpandedTaskRowLayoutUpdate(container);
}
function getProjectSortLabel(sortKey) {
  const map = {
    "default": t("projects.sort.statusLabel"),
    "name": t("projects.sort.nameLabel"),
    "name-asc": t("projects.sort.nameLabel"),
    "name-desc": t("projects.sort.nameLabel"),
    "created-desc": t("projects.sort.newestLabel"),
    "updated-desc": t("projects.sort.lastUpdatedLabel"),
    "tasks-desc": t("projects.sort.mostTasksLabel"),
    "completion-desc": t("projects.sort.percentCompletedLabel")
  };
  return map[sortKey] || sortKey;
}
function refreshProjectsSortLabel() {
  const sortLabel = document.getElementById("projects-sort-label");
  if (!sortLabel) return;
  const sortKey = projectSortState?.lastSort || "default";
  const baseLabel = getProjectSortLabel(sortKey);
  const directionIndicator = projectSortState?.direction === "asc" ? "asc" : "desc";
  sortLabel.textContent = t("projects.sort.prefix", { label: baseLabel, direction: directionIndicator });
  const arrow = document.querySelector("#projects-sort-btn .sort-label-arrow");
  if (arrow) setProjectsSortArrow(arrow, directionIndicator);
  try {
    updateProjectsSortOptionsUI();
  } catch (e) {
  }
}
function setProjectsSortArrow(el, direction) {
  if (!el) return;
  el.classList.toggle("is-up", direction === "asc");
  el.classList.toggle("is-down", direction !== "asc");
  el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20 L6 14 H10 V4 H14 V14 H18 Z" fill="currentColor"/></svg>';
}
function applyProjectsSortSelection(sortKey, { toggleDirection = false } = {}) {
  const nextSortKey = sortKey || "default";
  const sameSort = projectSortState.lastSort === nextSortKey;
  if (toggleDirection || sameSort) {
    projectSortState.direction = projectSortState.direction === "asc" ? "desc" : "asc";
  } else {
    projectSortState.direction = "asc";
  }
  projectSortState.lastSort = nextSortKey;
  refreshProjectsSortLabel();
  try {
    updateProjectsSortOptionsUI();
  } catch (e) {
  }
  const saved = loadProjectsViewState() || { search: "", filter: "", sort: "default" };
  saveProjectsViewState({ ...saved, sort: nextSortKey, sortDirection: projectSortState.direction });
  applyProjectFilters();
}
function updateProjectsSortOptionsUI() {
  const panel = document.getElementById("projects-sort-panel");
  if (!panel) return;
  const current = projectSortState?.lastSort || "default";
  const directionIndicator = projectSortState?.direction === "asc" ? "asc" : "desc";
  panel.querySelectorAll(".projects-sort-option").forEach((opt) => {
    const isActive = opt.dataset.sort === current;
    opt.classList.toggle("is-active", isActive);
    let indicator = opt.querySelector(".sort-option-indicator");
    if (!indicator) {
      indicator = document.createElement("button");
      indicator.type = "button";
      indicator.className = "sort-option-indicator";
      indicator.setAttribute("aria-label", t("projects.sort.help"));
      opt.appendChild(indicator);
    }
    if (isActive) {
      setProjectsSortArrow(indicator, directionIndicator);
    }
    indicator.style.visibility = isActive ? "visible" : "hidden";
  });
}
document.addEventListener("DOMContentLoaded", () => {
  const sortBtn = document.getElementById("projects-sort-btn");
  const sortPanel = document.getElementById("projects-sort-panel");
  const sortLabel = document.getElementById("projects-sort-label");
  if (sortBtn && sortPanel) {
    sortBtn.addEventListener("click", (e) => {
      if (e.target.closest(".sort-label-arrow")) {
        e.preventDefault();
        e.stopPropagation();
        applyProjectsSortSelection(projectSortState?.lastSort || "default", { toggleDirection: true });
        return;
      }
      const open = sortBtn.getAttribute("aria-expanded") === "true";
      const willOpen = !open;
      sortBtn.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) {
        sortPanel.setAttribute("aria-hidden", "false");
        sortPanel.removeAttribute("inert");
      } else {
        if (sortPanel.contains(document.activeElement)) {
          sortBtn.focus();
        }
        sortPanel.setAttribute("aria-hidden", "true");
        sortPanel.setAttribute("inert", "");
      }
      try {
        updateProjectsSortOptionsUI();
      } catch (e2) {
      }
      e.stopPropagation();
    });
    const panel = document.getElementById("projects-sort-panel");
    if (!panel) return;
    panel.querySelectorAll(".projects-sort-option").forEach((opt) => {
      opt.addEventListener("click", (ev) => {
        const sortKey = opt.dataset.sort || "default";
        const clickedIndicator = ev.target && ev.target.classList && ev.target.classList.contains("sort-option-indicator");
        applyProjectsSortSelection(sortKey, { toggleDirection: clickedIndicator || projectSortState.lastSort === sortKey });
        if (!clickedIndicator) {
          sortBtn.setAttribute("aria-expanded", "false");
          if (sortPanel.contains(document.activeElement)) {
            sortBtn.focus();
          }
          sortPanel.setAttribute("aria-hidden", "true");
          sortPanel.setAttribute("inert", "");
        } else {
          sortPanel.removeAttribute("inert");
          ev.stopPropagation();
        }
      });
    });
    document.addEventListener("click", () => {
      sortBtn.setAttribute("aria-expanded", "false");
      if (sortPanel.contains(document.activeElement)) {
        sortBtn.focus();
      }
      sortPanel.setAttribute("aria-hidden", "true");
      sortPanel.setAttribute("inert", "");
    });
  }
  const statusFilterGroup = document.getElementById("group-project-status");
  if (statusFilterGroup) {
    const checkboxes = statusFilterGroup.querySelectorAll('input[type="checkbox"][data-filter="project-status"]');
    checkboxes.forEach((cb) => {
      cb.addEventListener("change", () => {
        if (cb.checked) projectFilterState.statuses.add(cb.value);
        else projectFilterState.statuses.delete(cb.value);
        updateProjectStatusBadge();
        applyProjectFilters();
        syncURLWithProjectFilters();
      });
    });
  }
  const search = document.getElementById("projects-search");
  if (search) {
    search.addEventListener("input", debounce((e) => {
      projectFilterState.search = (e.target.value || "").trim();
      applyProjectFilters();
      const cur = loadProjectsViewState() || {};
      saveProjectsViewState({ ...cur, search: e.target.value });
    }, 220));
  }
  const chips = Array.from(document.querySelectorAll(".pf-chip"));
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const v = chip.dataset.filter;
      if (chip.classList.contains("active")) {
        chip.classList.remove("active");
        projectFilterState.taskFilter = "";
      } else {
        chips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        projectFilterState.taskFilter = v;
      }
      applyProjectFilters();
      const cur = loadProjectsViewState() || {};
      saveProjectsViewState({ ...cur, filter: projectFilterState.taskFilter || "" });
    });
  });
  const clearBtn = document.getElementById("btn-clear-projects");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearProjectFilters);
  }
  updateProjectsClearButtonVisibility();
});
window.clearProjectFilters = clearProjectFilters;
function syncURLWithProjectFilters() {
  const params = new URLSearchParams();
  const state = loadProjectsViewState() || {};
  const searchValue = projectFilterState.search || state.search;
  if (searchValue && searchValue.trim() !== "") {
    params.set("search", searchValue.trim());
  }
  if (projectFilterState.statuses.size > 0) {
    params.set("status", Array.from(projectFilterState.statuses).join(","));
  }
  const chipFilter = projectFilterState.taskFilter || state.filter;
  if (chipFilter && ["has-tasks", "no-tasks"].includes(chipFilter)) {
    params.set("filter", chipFilter);
  }
  if (state.sort && state.sort !== "default") {
    params.set("sort", state.sort);
  }
  if (state.sortDirection && state.sortDirection !== "asc") {
    params.set("sortDirection", state.sortDirection);
  }
  const updatedFilter = projectFilterState.updatedFilter || state.updatedFilter;
  if (updatedFilter && updatedFilter !== "all") {
    params.set("updatedFilter", updatedFilter);
  }
  const queryString = params.toString();
  const newHash = queryString ? `#projects?${queryString}` : "#projects";
  if (window.location.hash !== newHash) {
    window.history.replaceState(null, "", newHash);
  }
}
function saveProjectsViewState(state) {
  try {
    localStorage.setItem("projectsViewState", JSON.stringify(state));
    syncURLWithProjectFilters();
  } catch (e) {
  }
}
function loadProjectsViewState() {
  try {
    const raw = localStorage.getItem("projectsViewState");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.filter === "clear") parsed.filter = "";
    if (parsed.filter && parsed.filter !== "has-tasks" && parsed.filter !== "no-tasks") parsed.filter = "";
    if (parsed.updatedFilter == null) parsed.updatedFilter = "all";
    if (parsed.updatedFilter && typeof parsed.updatedFilter === "string") {
      const allowed = /* @__PURE__ */ new Set(["all", "5m", "30m", "24h", "week", "month"]);
      if (!allowed.has(parsed.updatedFilter)) parsed.updatedFilter = "all";
    }
    return parsed;
  } catch (e) {
    return null;
  }
}
function renderView(view) {
  const container = document.getElementById("projects-list");
  if (!container) return;
  if (!view || view.length === 0) {
    container.innerHTML = `<div class="empty-state"><h3>${t("projects.empty.filteredTitle")}</h3></div>`;
    renderMobileProjects([]);
    return;
  }
  const expandedProjects = /* @__PURE__ */ new Set();
  container.querySelectorAll(".project-list-item.expanded").forEach((item) => {
    const projectId = item.id.replace("project-item-", "");
    expandedProjects.add(projectId);
  });
  container.innerHTML = view.map(generateProjectItemHTML2).join("");
  expandedProjects.forEach((projectId) => {
    const item = document.getElementById(`project-item-${projectId}`);
    if (item) {
      item.classList.add("expanded");
    }
  });
  renderMobileProjects(view);
}
function setupProjectsControls() {
  const sel = document.getElementById("projects-sort");
  const sortBtn = document.getElementById("projects-sort-btn");
  const sortLabel = document.getElementById("projects-sort-label");
  const search = document.getElementById("projects-search");
  const chips = Array.from(document.querySelectorAll(".pf-chip"));
  const saved = loadProjectsViewState() || { search: "", filter: "", sort: "default", sortDirection: "asc", updatedFilter: "all" };
  const urlFilters = window.urlProjectFilters || {};
  const mergedState = {
    search: urlFilters.search !== void 0 ? urlFilters.search : saved.search,
    filter: urlFilters.filter !== void 0 ? urlFilters.filter : saved.filter,
    sort: urlFilters.sort !== void 0 ? urlFilters.sort : saved.sort,
    sortDirection: urlFilters.sortDirection !== void 0 ? urlFilters.sortDirection : saved.sortDirection,
    updatedFilter: urlFilters.updatedFilter !== void 0 ? urlFilters.updatedFilter : saved.updatedFilter
  };
  if (mergedState.filter === "clear") mergedState.filter = "";
  if (mergedState.filter && mergedState.filter !== "has-tasks" && mergedState.filter !== "no-tasks") {
    mergedState.filter = "";
  }
  if (urlFilters.statuses && Array.isArray(urlFilters.statuses) && urlFilters.statuses.length > 0) {
    projectFilterState.statuses.clear();
    urlFilters.statuses.forEach((status) => projectFilterState.statuses.add(status));
    const statusCheckboxes = document.querySelectorAll('input[type="checkbox"][data-filter="project-status"]');
    statusCheckboxes.forEach((cb) => {
      cb.checked = projectFilterState.statuses.has(cb.value);
    });
    updateProjectStatusBadge();
  }
  if (mergedState.search) {
    projectFilterState.search = mergedState.search;
  }
  if (mergedState.filter) {
    projectFilterState.taskFilter = mergedState.filter;
  }
  window.urlProjectFilters = null;
  let restoredSort = mergedState.sort || "default";
  let restoredDirection = mergedState.sortDirection || "asc";
  if (restoredSort === "name-asc") {
    restoredSort = "name";
    restoredDirection = "asc";
  } else if (restoredSort === "name-desc") {
    restoredSort = "name";
    restoredDirection = "desc";
  }
  projectSortState.lastSort = restoredSort;
  projectSortState.direction = restoredDirection;
  if (search) search.value = mergedState.search || "";
  if (chips && chips.length) {
    chips.forEach((c) => c.classList.remove("active"));
    if (mergedState.filter && ["has-tasks", "no-tasks"].includes(mergedState.filter)) {
      const activeChip = chips.find((c) => c.dataset.filter === mergedState.filter);
      if (activeChip) activeChip.classList.add("active");
    }
  }
  let initialBase = appState.projectsSortedView && appState.projectsSortedView.length ? appState.projectsSortedView.slice() : projects.slice();
  if (search && search.value && search.value.trim() !== "") {
    const q = search.value.trim().toLowerCase();
    initialBase = initialBase.filter((p) => ((p.name || "") + " " + (p.description || "")).toLowerCase().includes(q));
  }
  if (projectFilterState.statuses.size > 0) {
    initialBase = initialBase.filter((p) => {
      const status = getProjectStatus(p.id);
      return projectFilterState.statuses.has(status);
    });
  }
  const chipFilter = mergedState.filter || projectFilterState.taskFilter;
  if (chipFilter === "has-tasks") {
    initialBase = initialBase.filter((p) => tasks.some((t2) => t2.projectId === p.id));
  } else if (chipFilter === "no-tasks") {
    initialBase = initialBase.filter((p) => !tasks.some((t2) => t2.projectId === p.id));
  }
  if (mergedState.updatedFilter && mergedState.updatedFilter !== "all") {
    const cutoff = getProjectsUpdatedCutoffTime(mergedState.updatedFilter);
    if (cutoff != null) {
      initialBase = initialBase.filter((p) => getProjectUpdatedTime(p) >= cutoff);
    }
  }
  if (sortBtn) {
    const sortKey = mergedState.sort || "default";
    const baseLabel = getProjectSortLabel(sortKey);
    const directionIndicator = projectSortState.direction === "asc" ? "asc" : "desc";
    const labelText = t("projects.sort.prefix", { label: baseLabel, direction: directionIndicator });
    if (sortLabel) sortLabel.textContent = labelText;
    const arrow = document.querySelector("#projects-sort-btn .sort-label-arrow");
    if (arrow) setProjectsSortArrow(arrow, directionIndicator);
  }
  {
    const allowed = /* @__PURE__ */ new Set(["all", "5m", "30m", "24h", "week", "month"]);
    const normalized = allowed.has(mergedState.updatedFilter) ? mergedState.updatedFilter : "all";
    projectFilterState.updatedFilter = normalized;
    updateProjectsUpdatedFilterUI();
    try {
      renderProjectsActiveFilterChips();
    } catch (e) {
    }
    document.querySelectorAll('input[type="radio"][data-filter="project-updated"][name="project-updated-filter"]').forEach((rb) => {
      if (rb.__projectUpdatedBound) return;
      rb.__projectUpdatedBound = true;
      rb.addEventListener("change", () => {
        if (!rb.checked) return;
        projectFilterState.updatedFilter = allowed.has(rb.value) ? rb.value : "all";
        updateProjectsUpdatedFilterUI();
        applyProjectFilters();
        const cur = loadProjectsViewState() || mergedState;
        saveProjectsViewState({ ...cur, updatedFilter: projectFilterState.updatedFilter });
        updateProjectsClearButtonVisibility();
      });
    });
  }
  const selSort = projectSortState.lastSort || "default";
  applyProjectsSort(selSort, initialBase);
  updateProjectsClearButtonVisibility();
}
function updateProjectsClearButtonVisibility() {
  const btn = document.getElementById("btn-clear-projects");
  if (!btn) return;
  const hasSearch = projectFilterState.search && projectFilterState.search.trim() !== "";
  const hasStatusFilter = projectFilterState.statuses.size > 0;
  const hasTaskFilter = projectFilterState.taskFilter !== "";
  const hasUpdatedFilter = projectFilterState.updatedFilter && projectFilterState.updatedFilter !== "all";
  const hasTagsFilter = projectFilterState.tags.size > 0;
  const shouldShow = hasSearch || hasStatusFilter || hasTaskFilter || hasUpdatedFilter || hasTagsFilter;
  btn.style.display = shouldShow ? "inline-flex" : "none";
}
function clearProjectFilters() {
  projectFilterState.search = "";
  projectFilterState.statuses.clear();
  projectFilterState.taskFilter = "";
  projectFilterState.updatedFilter = "all";
  projectFilterState.tags.clear();
  const searchEl = document.getElementById("projects-search");
  if (searchEl) searchEl.value = "";
  const chips = Array.from(document.querySelectorAll(".pf-chip"));
  chips.forEach((c) => c.classList.remove("active"));
  const checkboxes = document.querySelectorAll('input[type="checkbox"][data-filter="project-status"]');
  checkboxes.forEach((cb) => cb.checked = false);
  const tagCheckboxes = document.querySelectorAll('input[type="checkbox"][data-filter="project-tags"]');
  tagCheckboxes.forEach((cb) => cb.checked = false);
  document.querySelectorAll('input[type="radio"][data-filter="project-updated"][name="project-updated-filter"]').forEach((rb) => rb.checked = rb.value === "all");
  updateProjectsUpdatedFilterUI();
  updateProjectStatusBadge();
  updateProjectTagsBadge();
  applyProjectFilters();
}
function handleChecklistEnter(editor) {
  if (!editor) return false;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return false;
  const range = sel.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const checkText = container.nodeType === 1 ? container.closest?.(".check-text") : container.parentElement?.closest?.(".check-text");
  if (!checkText || !editor.contains(checkText)) return false;
  const row = checkText.closest(".checkbox-row");
  if (!row) return false;
  const beforeRange = range.cloneRange();
  beforeRange.selectNodeContents(checkText);
  beforeRange.setEnd(range.startContainer, range.startOffset);
  const beforeText = beforeRange.toString();
  const afterRange = range.cloneRange();
  afterRange.selectNodeContents(checkText);
  afterRange.setStart(range.endContainer, range.endOffset);
  const afterText = afterRange.toString();
  if (beforeText.length === 0 && afterText.length === 0) {
    const p = document.createElement("div");
    p.innerHTML = "<br>";
    row.parentNode.replaceChild(p, row);
    const r = document.createRange();
    r.setStart(p, 0);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    editor.focus();
    editor.dispatchEvent(new Event("input"));
    return true;
  }
  if (afterText.length === 0) {
    const id2 = "chk-" + Date.now() + "-" + Math.floor(Math.random() * 1e3);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<div class="checkbox-row" data-id="${id2}" contenteditable="false"><button type="button" class="checkbox-toggle variant-1" aria-pressed="false" title="${t("tasks.checklist.toggle")}" contenteditable="false"></button><div class="check-text" contenteditable="true"></div></div>`;
    const newRow = wrapper.firstChild;
    if (row && row.parentNode) {
      row.parentNode.insertBefore(newRow, row.nextSibling);
      const el = newRow.querySelector(".check-text");
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      el.focus();
      editor.dispatchEvent(new Event("input"));
    }
    return true;
  }
  document.execCommand("insertHTML", false, "<br><br>");
  editor.dispatchEvent(new Event("input"));
  return true;
}
function initMobileNav() {
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (!hamburgerBtn || !sidebar || !overlay) return;
  function toggleSidebar() {
    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
    document.body.style.overflow = sidebar.classList.contains("active") ? "hidden" : "";
  }
  function closeSidebar() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }
  hamburgerBtn.addEventListener("click", toggleSidebar);
  overlay.addEventListener("click", closeSidebar);
  const navItems = sidebar.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (getIsMobileCached()) {
        closeSidebar();
      }
    });
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      closeSidebar();
    }
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMobileNav);
} else {
  initMobileNav();
}
window.addEventListener("resize", () => {
  scheduleExpandedTaskRowLayoutUpdate();
});

// src/main.js
var NAV_START = typeof window !== "undefined" && typeof window.__pageLoadStart === "number" ? window.__pageLoadStart : performance.now();
var MAIN_JS_MODULES_LOADED = performance.now();
if (isDebugLogsEnabled2()) {
  console.log(`[perf] main.js: executed after ${Math.round(MAIN_JS_MODULES_LOADED - NAV_START)}ms since nav start`);
}
initializeEventDelegation();
if (isDebugLogsEnabled2()) {
  logPerformanceMilestone("event-delegation-setup");
}
document.addEventListener("DOMContentLoaded", () => {
  if (isDebugLogsEnabled2()) {
    logPerformanceMilestone("dom-content-loaded");
  }
  if (typeof init === "function") {
    init();
  }
});
//# sourceMappingURL=app.bundle.js.map
