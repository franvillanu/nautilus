// Restore data from production backup
const tasks = [
  {
    "id": 3,
    "title": "Tarea 1.1 y 1.2. Muestreos estacionales en el mar",
    "description": "<b><u>Tarea 1.1:</u>&nbsp;</b><div>5 colonias para PAM<div>10 colonias pequeñas (500-1g) para:</div><div><ul><li>Consumo energético</li><li>Análisis de capacidad antioxidante&nbsp;</li><li>Análisis de clases lipídicas y ácidos grasos</li><li>Expresion génica de elongasas y desaturasas&nbsp;</li></ul><div><b><u>Tarea 1.2:</u>&nbsp;</b></div><div>Sensores HOBO de temperatura en los sitios de muestreo</div></div></div>",
    "projectId": 1,
    "dueDate": "",
    "priority": "high",
    "status": "progress",
    "tags": ["tajao"],
    "attachments": [],
    "createdAt": "2025-10-06T21:07:53.399Z"
  },
  {
    "id": 4,
    "title": "Tarea 1.3. Consumo energético",
    "description": "<ul><li>Consumo energético (comsumo de oxígeno:&nbsp;<span data-start=\"486\" data-end=\"556\">actividad del sistema de transporte electrónico mitocondrial (ETS)</span>, que es un&nbsp;<span data-start=\"568\" data-end=\"644\">indicador directo de la tasa metabólica y del consumo energético celular</span>. Cuanto mayor es la actividad ETS, mayor es la capacidad metabólica del organismo (en este caso, del tejido del zoantídeo).</li></ul>",
    "projectId": 1,
    "dueDate": "",
    "priority": "medium",
    "status": "todo",
    "tags": [],
    "attachments": [],
    "createdAt": "2025-10-06T21:43:59.378Z"
  },
  {
    "id": 5,
    "title": "Tarea 1.4. Capacidad antioxidante ",
    "description": "Análisis de capacidad antioxidante (vamos a obtener % de eliminacion de radicales libres), actividad enzimática, concentración de MDA (es un producto de peroxidación lipídica, miden el daño oxidativo en membranas)",
    "projectId": 1,
    "dueDate": "",
    "priority": "medium",
    "status": "todo",
    "tags": [],
    "attachments": [],
    "createdAt": "2025-10-06T21:47:26.207Z"
  },
  {
    "id": 6,
    "title": "Tarea 1.6. Expresion génica de elongasas y desaturasas",
    "description": "Expresion génica de elongasas y desaturasas (fads and elovl): Mide&nbsp;<span data-start=\"325\" data-end=\"386\">qué tan activos están los genes que fabrican los lípidos</span>&nbsp;dentro de las células del zoantídeo.&nbsp;<div><ul><li><strong data-start=\"478\" data-end=\"487\">fads2</strong>&nbsp;→ codifica una&nbsp;<em data-start=\"503\" data-end=\"515\">desaturasa</em>, una enzima que añade dobles enlaces a los ácidos grasos (los convierte en más \"insaturados\").</li><li><strong data-start=\"615\" data-end=\"625\">elovl5</strong>&nbsp;→ codifica una&nbsp;<em data-start=\"641\" data-end=\"651\">elongasa</em>, una enzima que alarga la cadena de carbono de los ácidos grasos.&nbsp;</li></ul>Si vemos cambios en los ácidos grasos entre muestreos, con esto podemos ver si es a nivel génético o no. Esta tarea mide la <span data-start=\"1940\" data-end=\"2020\" style=\"\">actividad de los genes que controlan la síntesis de ácidos grasos esenciales</span>. Es importante porque permite entender si los cambios observados en la composición lipídica se deben a <span data-start=\"2124\" data-end=\"2152\" style=\"\">una regulación molecular</span>, proporcionando una visión más completa de la respuesta adaptativa de los zoantídeos.</div>",
    "projectId": 1,
    "dueDate": "",
    "priority": "medium",
    "status": "todo",
    "tags": [],
    "attachments": [],
    "createdAt": "2025-10-06T21:51:15.007Z"
  },
  {
    "id": 7,
    "title": "Tarea 1.5. Análisis del perfil de clases lipídicas y ácidos grasos",
    "description": "",
    "projectId": 1,
    "dueDate": "",
    "priority": "medium",
    "status": "todo",
    "tags": [],
    "attachments": [],
    "createdAt": "2025-10-06T21:58:12.369Z"
  },
  {
    "id": 8,
    "title": "Montar mesas de agua ",
    "description": "",
    "projectId": 2,
    "dueDate": "",
    "priority": "high",
    "status": "todo",
    "tags": [],
    "attachments": [],
    "createdAt": "2025-10-06T22:01:35.339Z"
  },
  {
    "id": 9,
    "title": "Fase aclimatación",
    "description": "Cuando termine esta fase de 1 mes:<div><ul><li>muestras para fisio&nbsp;</li><li>Fotos para fotogrametría</li></ul></div>",
    "projectId": 2,
    "dueDate": "",
    "priority": "high",
    "status": "progress",
    "tags": [],
    "attachments": [],
    "createdAt": "2025-10-06T22:08:03.741Z"
  },
  {
    "id": 10,
    "title": "1º MHW",
    "description": "Cuando termine esta fase de 1 mes:<div><ul><li>muestras para fisio&nbsp;</li><li>Fotos para fotogrametría</li></ul></div>",
    "projectId": 2,
    "dueDate": "",
    "priority": "high",
    "status": "todo",
    "tags": [],
    "attachments": [],
    "createdAt": "2025-10-06T22:09:26.276Z"
  },
  {
    "id": 11,
    "title": "Tarea 1.8: Solo si se ven cambios de perfil lipídico y expresión génica",
    "description": "Seguimiento metabólico in vivo de ácidos grasos precursores marcados radiactivamente con [1-14C], en condiciones de laboratorio",
    "projectId": 1,
    "dueDate": "",
    "priority": "low",
    "status": "todo",
    "tags": [],
    "attachments": [],
    "createdAt": "2025-10-06T22:18:07.306Z"
  },
  {
    "id": 12,
    "title": "Tarea 2.1. Incidencias de MHW en últimos años",
    "description": "",
    "projectId": 3,
    "dueDate": "",
    "priority": "low",
    "status": "todo",
    "tags": [],
    "attachments": [],
    "createdAt": "2025-10-06T22:19:28.493Z"
  },
  {
    "id": 13,
    "title": "Tarea 2.2. Fotogrametría en el campo",
    "description": "<br>",
    "projectId": 3,
    "dueDate": "2025-10-10",
    "priority": "high",
    "status": "progress",
    "tags": ["tajao", "tenerife"],
    "attachments": [],
    "createdAt": "2025-10-06T22:21:21.324Z"
  },
  {
    "id": 14,
    "title": "Tarea 1.1 y 1.2. Muestreos estacionales en el mar",
    "description": "<b><u>Tarea 1.1:</u>&nbsp;</b><div>5 colonias para PAM<div>10 colonias pequeñas (500-1g) para:</div><div><ul><li>Consumo energético</li><li>Análisis de capacidad antioxidante&nbsp;</li><li>Análisis de clases lipídicas y ácidos grasos</li><li>Expresion génica de elongasas y desaturasas&nbsp;</li></ul><div><b><u>Tarea 1.2:</u>&nbsp;</b></div><div>Sensores HOBO de temperatura en los sitios de muestreo</div></div></div><div><br></div>",
    "projectId": 1,
    "dueDate": "",
    "priority": "high",
    "status": "progress",
    "tags": ["los cristianos"],
    "attachments": [],
    "createdAt": "2025-10-06T22:32:22.009Z"
  },
  {
    "id": 15,
    "title": "Tarea 2.2. Fotogrametría en Tenerife",
    "description": "",
    "projectId": 3,
    "dueDate": "2025-10-10",
    "priority": "high",
    "status": "progress",
    "tags": ["tenerife"],
    "attachments": [],
    "createdAt": "2025-10-10T17:36:35.429Z"
  },
  {
    "id": 16,
    "title": "LOCALIDADES",
    "description": "📍Localidades:<div><div class=\"divider-row\"><hr style=\"border-top: 0.606061px solid rgb(55, 65, 81);\"></div><div class=\"checkbox-row\" data-id=\"chk-1760200598591-58\"><br><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"Toggle checkbox\" contenteditable=\"false\" style=\"border-color: rgb(55, 65, 81); border-style: solid; border-width: 0.606061px; border-image: none 100% / 1 / 0 stretch;\"></button><div class=\"check-text\">SAN JUAN</div></div><div class=\"checkbox-row\" data-id=\"chk-1760200601569-309\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"Toggle checkbox\" contenteditable=\"false\" style=\"border-color: rgb(55, 65, 81); border-style: solid; border-width: 0.606061px; border-image: none 100% / 1 / 0 stretch;\"></button><div class=\"check-text\">TAJAO</div></div><div class=\"checkbox-row\" data-id=\"chk-1760200611334-816\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"Toggle checkbox\" contenteditable=\"false\" style=\"border-color: rgb(55, 65, 81); border-style: solid; border-width: 0.606061px; border-image: none 100% / 1 / 0 stretch;\"></button><div class=\"check-text\">LOS CRISTIANOS</div></div><div class=\"checkbox-row\" data-id=\"chk-1760200620283-792\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"Toggle checkbox\" contenteditable=\"false\" style=\"border-color: rgb(55, 65, 81); border-style: solid; border-width: 0.606061px; border-image: none 100% / 1 / 0 stretch;\"></button><div class=\"check-text\">BOCACANGREJO</div></div><div class=\"checkbox-row\" data-id=\"chk-1760200900739-121\" contenteditable=\"true\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"Toggle checkbox\" contenteditable=\"false\"></button><div class=\"check-text\" contenteditable=\"true\">LAS TERESITAS</div></div><div class=\"checkbox-row\" data-id=\"chk-1760200647987-132\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"Toggle checkbox\" contenteditable=\"false\" style=\"border-color: rgb(55, 65, 81); border-style: solid; border-width: 0.606061px; border-image: none 100% / 1 / 0 stretch;\"></button><div class=\"check-text\">LA BOMBILLA</div></div><div class=\"checkbox-row\" data-id=\"chk-1760200654332-419\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"Toggle checkbox\" contenteditable=\"false\" style=\"border-color: rgb(55, 65, 81); border-style: solid; border-width: 0.606061px; border-image: none 100% / 1 / 0 stretch;\"></button><div class=\"check-text\">LOS CANCAJOS</div></div><div class=\"checkbox-row\" data-id=\"chk-1760200822833-343\" contenteditable=\"true\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"Toggle checkbox\" contenteditable=\"false\"></button><div class=\"check-text\" contenteditable=\"true\">LOS CUARTELES (CANCAJOS)</div></div><div class=\"checkbox-row\" data-id=\"chk-1760200659846-150\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"Toggle checkbox\" contenteditable=\"false\" style=\"border-color: rgb(55, 65, 81); border-style: solid; border-width: 0.606061px; border-image: none 100% / 1 / 0 stretch;\"></button><div class=\"check-text\">MORRO JABLE</div></div><div class=\"checkbox-row\" data-id=\"chk-1760200666393-350\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"Toggle checkbox\" contenteditable=\"false\" style=\"border-color: rgb(55, 65, 81); border-style: solid; border-width: 0.606061px; border-image: none 100% / 1 / 0 stretch;\"></button><div class=\"check-text\">FUERTEVENTURA (❓)</div></div><div class=\"checkbox-row\" data-id=\"chk-1760200677801-412\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"Toggle checkbox\" contenteditable=\"false\" style=\"border-color: rgb(55, 65, 81); border-style: solid; border-width: 0.606061px; border-image: none 100% / 1 / 0 stretch;\"></button><div class=\"check-text\">ORZOLA</div></div><div class=\"checkbox-row\" data-id=\"chk-1760200741838-450\" contenteditable=\"true\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"Toggle checkbox\" contenteditable=\"false\"></button><div class=\"check-text\" contenteditable=\"true\">LA BAJITA</div></div><div><div class=\"divider-row\"><hr></div><div><br></div></div><div><div class=\"checkbox-row\" data-id=\"chk-1760229214610-643\" contenteditable=\"false\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"Toggle checkbox\" contenteditable=\"false\"></button><div class=\"check-text\" contenteditable=\"true\">T</div></div><div><br></div></div><div><div><div></div></div></div></div>",
    "projectId": null,
    "dueDate": "",
    "priority": "medium",
    "status": "review",
    "tags": ["san juan", "tajao", "los cristianos", "bocacangrejo", "las teresitas", "la bombilla", "los cancajos", "los cuarteles (cancajos)", "morro jable", "fuerteventura", "orzola", "la bajita"],
    "attachments": [],
    "createdAt": "2025-10-11T02:31:42.629Z"
  }
];

const projects = [
  {
    "id": 2,
    "name": "Objetivo 1: Experimento en el laboratorio",
    "description": "",
    "startDate": "2025-10-03",
    "endDate": "2026-01-12",
    "createdAt": "2025-10-06T22:04:54.876Z"
  },
  {
    "id": 1,
    "name": "Objetivo 1. Efectos de temperatura en el desempeño fisiológico de zoantídeos",
    "description": "",
    "startDate": "2025-10-01",
    "endDate": "2027-10-01",
    "createdAt": "2025-10-01T18:20:54.691Z"
  },
  {
    "id": 3,
    "name": "Objetivo 2. Monitoreo de zonas dominadas por zoantídeos y el efecto de MHW",
    "description": "",
    "startDate": "2025-10-06",
    "endDate": "2026-01-12",
    "createdAt": "2025-10-06T22:16:22.413Z"
  }
];

const feedbackItems = [
  {
    "id": 8,
    "type": "idea",
    "description": "Search a way to upload images in descriptions and manage attachments for free",
    "screenshotUrl": "",
    "createdAt": "2025-10-03",
    "status": "open"
  },
  {
    "id": 6,
    "type": "idea",
    "description": "Make quick links to drive and dropbox with icons for faster upload",
    "screenshotUrl": "",
    "createdAt": "2025-10-03",
    "status": "open"
  }
];

console.log('📦 Restoring data to local KV...\n');

async function restoreData() {
  try {
    // Save tasks
    console.log('💾 Saving tasks...');
    const tasksRes = await fetch('/api/storage?key=tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tasks)
    });
    if (!tasksRes.ok) throw new Error('Failed to save tasks');
    console.log(`✅ Saved ${tasks.length} tasks`);

    // Save projects
    console.log('💾 Saving projects...');
    const projectsRes = await fetch('/api/storage?key=projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projects)
    });
    if (!projectsRes.ok) throw new Error('Failed to save projects');
    console.log(`✅ Saved ${projects.length} projects`);

    // Save feedback
    console.log('💾 Saving feedback...');
    const feedbackRes = await fetch('/api/storage?key=feedbackItems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackItems)
    });
    if (!feedbackRes.ok) throw new Error('Failed to save feedback');
    console.log(`✅ Saved ${feedbackItems.length} feedback items`);

    console.log('\n🎉 Data restored successfully!');
    console.log('🔄 Please refresh the page to see your data.');
  } catch (error) {
    console.error('❌ Error restoring data:', error);
  }
}

restoreData();
